import React from 'react';
import { useAxios } from '../auth/AxiosProvider';

function EventInvites({ events, onUpdate }) {
    const axiosInstance = useAxios();

    const acceptInvite = async (eventId) => {
        try {
            await axiosInstance.post(`/events/${eventId}/opt-in`, {
                status: 'opted_in'
            });
            onUpdate(eventId); // Notify parent to update invites
        } catch (error) {
            console.error("Error accepting event invite:", error);
        }
    };

    const rejectInvite = async (eventId) => {
        try {
            await axiosInstance.post(`/events/${eventId}/reject`, {
                status: 'rejected'
            });
            onUpdate(eventId); // Notify parent to update invites
        } catch (error) {
            console.error("Error rejecting event invite:", error);
        }
    };

    return (
        <div className="event-invites">
            <h3>Event Invites</h3>
            {events.length > 0 ? (
                events.map((event) => (
                    <div key={event.event_id} className="event-invite-item">
                        <div>
                            <p><strong>{event.title}</strong></p>
                            <p>Invited by: {event.inviter_username}</p>
                        </div>
                        <div>
                            <button onClick={() => acceptInvite(event.event_id)}>Accept</button>
                            <button onClick={() => rejectInvite(event.event_id)}>Reject</button>
                        </div>
                    </div>
                ))
            ) : (
                <p>No new event invites</p>
            )}
        </div>
    );
}

export default EventInvites;
