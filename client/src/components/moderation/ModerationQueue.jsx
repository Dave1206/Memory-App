import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import '../../styles/ModerationQueue.css';

function ModerationQueue() {
    const axiosInstance = useAxios();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch the moderation queue on component mount
    useEffect(() => {
        const fetchQueue = async () => {
            try {
                const response = await axiosInstance.get('/moderate/profile-picture/queue');
                setQueue(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching moderation queue:", error);
                setLoading(false);
            }
        };
        fetchQueue();
    }, [axiosInstance]);

    // Handle approve or deny action
    const handleAction = async (queueId, action) => {
        try {
            await axiosInstance.post(`/moderate/profile-picture/${queueId}`, { action });
            // Remove the processed image from the queue
            setQueue(prevQueue => prevQueue.filter(item => item.id !== queueId));
        } catch (error) {
            console.error(`Error processing ${action} action:`, error);
        }
    };

    if (loading) return <p>Loading moderation queue...</p>;
    if (queue.length === 0) return <p>No profile pictures pending moderation.</p>;

    return (
        <div className="moderation-queue">
            <h2>Profile Picture Moderation Queue</h2>
            <div className="queue-list">
                {queue.map((picture) => (
                    <div key={picture.id} className="queue-item">
                        <img src={picture.image_url} alt="Pending Approval" className="queue-image" />
                        <div className="action-buttons">
                            <button 
                                onClick={() => handleAction(picture.id, 'approve')}
                                className="approve-button"
                            >
                                Approve
                            </button>
                            <button 
                                onClick={() => handleAction(picture.id, 'deny')}
                                className="deny-button"
                            >
                                Deny
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ModerationQueue;
