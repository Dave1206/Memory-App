import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import '../../styles/PrivacySettings.css';

function PrivacySettings({ user }) {
  const [privacySetting, setPrivacySetting] = useState("public");
  const [statusMessage, setStatusMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const { axiosInstance } = useAxios();
  const userId = user.id;

  const handleSave = async () => {
    const privacySettings = { visibility: privacySetting };
    try {
      await axiosInstance.put(`/user/preferences/${userId}`, { privacySettings });
      setStatusMessage('Settings saved successfully.');
      setHasChanges(false);
    } catch (error) {
      setStatusMessage('Error saving settings.');
      console.error("Error saving privacy settings:", error);
    }
  };

  const handlePrivacyChange = (event) => {
    setPrivacySetting(event.target.value);
    setHasChanges(true);
  };

  useEffect(() => {
    const fetchAccountSettings = async () => {
      try {
        const response = await axiosInstance.get(`/user/preferences/${userId}`);
        const { privacy_settings } = response.data;
        setPrivacySetting(privacy_settings.visibility || 'public');
      } catch (error) {
        console.error("Error fetching account settings:", error);
      }
    };
    fetchAccountSettings();
  }, [axiosInstance, userId]);

  return (
    <div className='privacy-settings-wrapper'>
      <h2>Privacy Settings</h2>
      <div className="privacy-settings">
        <div className='privacy-settings-group'>
          <label htmlFor="privacySetting">Profile Visibility:</label>
          <select
            id="privacySetting"
            value={privacySetting}
            onChange={handlePrivacyChange}
          >
            <option value="public">Public</option>
            <option value="friends_only">Friends Only</option>
            <option value="private">Only Me</option>
          </select>
        </div>
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

export default PrivacySettings;
