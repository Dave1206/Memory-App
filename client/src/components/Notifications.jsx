import React from 'react';
import { useAxios } from './auth/AxiosProvider';
import { useAuth } from './auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMessenger } from './messenger/MessengerContext';
import useInteractionTracking from '../hooks/useInteractionTracking';
import '../styles/Notifications.css';

function Notifications({ notifications, setNotifications }) {
    const { axiosInstance } = useAxios();
    const { user } = useAuth();
    const { toggleMessenger } = useMessenger();
    const navigate = useNavigate();
    const userId = user.id;
    const { friendRequests = [], eventInvites = [], generalNotifications = [] } = notifications;
    const { handleSelectEvent } = useInteractionTracking(null)

    const markAsRead = async (notificationId) => {
        const noteIds = [notificationId];
        try {
            await axiosInstance.post(`/notifications/mark-read`, { ids: noteIds });
            setNotifications((prev) => ({
                ...prev,
                generalNotifications: prev.generalNotifications.map((note) =>
                    note.id === notificationId ? { ...note, read: true } : note
                )
            }));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const deleteNotification = async (notificationId) => {
        const noteIds = [notificationId];
        try {
            await axiosInstance.delete(`/notifications`, {data: { ids: noteIds }});
            setNotifications((prev) => ({
                ...prev,
                generalNotifications: prev.generalNotifications.filter((note) => note.id !== notificationId)
            }));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleNotificationClick = async (note) => {
        if (!note.read) markAsRead(note.id);
        if (note.memory_id) navigate(`/memory/${note.memory_id}`);
        if (note.event) {
            const path = `/event/${note.event.event_id}`;
            await handleSelectEvent(note.event, path);
            navigate(path);
        }
        if (note.message?.toLowerCase().includes("message")) toggleMessenger();
    };

    const handleAcceptRequest = async (friendId) => {
        try {
            await axiosInstance.post('/friends/accept', { userId, friendId });
            setNotifications((prev) => ({
                ...prev,
                friendRequests: prev.friendRequests.filter((req) => req.id !== friendId)
            }));
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    };

    const handleRejectRequest = async (friendId) => {
        try {
            await axiosInstance.post('/friends/reject', { userId, friendId });
            setNotifications((prev) => ({
                ...prev,
                friendRequests: prev.friendRequests.filter((req) => req.id !== friendId)
            }));
        } catch (error) {
            console.error('Error rejecting friend request:', error);
        }
    };

    const handleInviteResponse = async (eventId, action) => {
        try {
            await axiosInstance.post(`/events/${eventId}/${action}`, {
                status: action === 'opt-in' ? 'opted_in' : 'rejected'
            });
            setNotifications((prev) => ({
                ...prev,
                eventInvites: prev.eventInvites.filter((invite) => invite.event_id !== eventId)
            }));
        } catch (error) {
            console.error(`Error ${action === 'opt-in' ? 'accepting' : 'rejecting'} event invite:`, error);
        }
    };

    const markAllAsRead = async () => {
        const unreadIds = generalNotifications.filter(note => !note.read).map(note => note.id);
        try {
            await axiosInstance.post(`/notifications/mark-read`, { ids: unreadIds });
            setNotifications((prev) => ({
                ...prev,
                generalNotifications: prev.generalNotifications.map((note) => ({ ...note, read: true }))
            }));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const clearAllNotifications = async () => {
        const idsToDelete = generalNotifications.map(note => note.id);
        try {
            await axiosInstance.delete(`/notifications`, { data: {ids: idsToDelete }});
            setNotifications((prev) => ({
                ...prev,
                generalNotifications: []
            }));
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    return (
        <div className="notifications-dropdown">
            <div className="notification-controls">
                <button onClick={markAllAsRead}>Mark All as Read</button>
                <button onClick={clearAllNotifications}>Clear All</button>
            </div>

            {friendRequests.length > 0 && (
                <div className="notification-section">
                    <h4>Friend Requests</h4>
                    {friendRequests.map((req) => (
                        <div key={req.id} className="notification-item">
                            <p>{req.username}</p>
                            <div className="action-buttons">
                                <button onClick={() => handleAcceptRequest(req.id)}>Accept</button>
                                <button onClick={() => handleRejectRequest(req.id)}>Reject</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {eventInvites.length > 0 && (
                <div className="notification-section">
                    <h4>Event Invites</h4>
                    {eventInvites.map((invite) => (
                        <div key={invite.event_id} className="notification-item">
                            <p><strong>{invite.title}</strong> — Invited by {invite.inviter_username}</p>
                            <div className="action-buttons">
                                <button onClick={() => handleInviteResponse(invite.event_id, 'opt-in')}>Accept</button>
                                <button onClick={() => handleInviteResponse(invite.event_id, 'reject')}>Reject</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {generalNotifications.length > 0 && (
                <div className="notification-section">
                    <h4>Notifications</h4>
                    {generalNotifications.map((note) => (
                        <div
                            key={note.id || note.created_at}
                            className={`notification-item ${note.read ? 'read' : 'unread'}`}
                            onClick={() => handleNotificationClick(note)}
                        >
                            <p>{note.message}</p>
                            <span className="timestamp">{new Date(note.created_at).toLocaleString()}</span>
                            <button className="delete-notification" onClick={(e) => { e.stopPropagation(); deleteNotification(note.id); }}>✖</button>
                        </div>
                    ))}
                </div>
            )}

            {friendRequests.length === 0 && eventInvites.length === 0 && generalNotifications.length === 0 && (
                <p className="no-notifications">No new notifications</p>
            )}
        </div>
    );
}

export default Notifications;
