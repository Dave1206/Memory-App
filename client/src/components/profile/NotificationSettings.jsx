import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import '../../styles/NotificationSettings.css';

function NotificationSettings({ user }) {
  const [activityNotifications, setActivityNotifications] = useState(true);
  const [frNotifications, setFrNotifications] = useState(true);
  const [eventInviteNotifications, setEventInviteNotifications] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const { axiosInstance } = useAxios();
  const userId = user.id;

  const handleSave = async () => {
    const notificationSettings = {
      activity: activityNotifications,
      friend_request: frNotifications,
      event_invite: eventInviteNotifications
    };
    try {
      await axiosInstance.put(`/user/preferences/${userId}`, { notificationSettings });
      setStatusMessage('Settings saved successfully.');
      setHasChanges(false);
    } catch (error) {
      setStatusMessage('Error saving settings.');
    }
  };

  const handleCheckboxChange = (setter) => {
    setter(prev => !prev);
    setHasChanges(true);
  };

  useEffect(() => {
    const fetchAccountSettings = async () => {
      try {
        const response = await axiosInstance.get(`/user/preferences/${userId}`);
        const { notification_settings } = response.data;
        setActivityNotifications(notification_settings.activity);
        setFrNotifications(notification_settings.friend_request);
        setEventInviteNotifications(notification_settings.event_invite);
      } catch (error) {
        console.error("Error fetching account settings:", error);
      }
    };
    fetchAccountSettings();
  }, [axiosInstance, userId]);

  return (
    <div className='notification-settings-wrapper'>
      <h2>Notification Settings</h2>
      <div className="notification-settings">
          <label htmlFor="activityNotifications">
            <input
              id="activityNotifications"
              type="checkbox"
              checked={activityNotifications}
              onChange={() => handleCheckboxChange(setActivityNotifications)}
            />
            Activity Notifications
          </label>
          <label htmlFor="frNotifications">
            <input
              id="frNotifications"
              type="checkbox"
              checked={frNotifications}
              onChange={() => handleCheckboxChange(setFrNotifications)}
            />
            Friend Request Notifications
          </label>
          <label htmlFor="eventInviteNotifications">
            <input
              id="eventInviteNotifications"
              type="checkbox"
              checked={eventInviteNotifications}
              onChange={() => handleCheckboxChange(setEventInviteNotifications)}
            />
            Event Invite Notifications
          </label>
        <button
          className='settings-button save-button'
          onClick={handleSave}
          disabled={!hasChanges}
        >
          Save Changes
        </button>
        <p aria-live="polite">{statusMessage}</p>
      </div>
    </div>
  );
}

export default NotificationSettings;
