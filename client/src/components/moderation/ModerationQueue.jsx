import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faImage } from '@fortawesome/free-solid-svg-icons';
import '../../styles/ModerationQueue.css';

function ModerationQueue() {
    const { axiosInstance } = useAxios();
    const [profileQueue, setProfileQueue] = useState([]);
    const [mediaQueue, setMediaQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'media'

    // Fetch both queues on component mount
    useEffect(() => {
        const fetchQueues = async () => {
            try {
                const profileRes = await axiosInstance.get('/moderate/profile-picture/queue');
                const mediaRes = await axiosInstance.get('/moderate/media/queue');
                setProfileQueue(profileRes.data);
                setMediaQueue(mediaRes.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching moderation queues:", error);
                setLoading(false);
            }
        };
        fetchQueues();
    }, [axiosInstance]);

    // Handle approve or deny action for a given item.
    const handleAction = async (queueId, action, type) => {
        try {
            const endpoint = type === 'profile'
                ? `/moderate/profile-picture/${queueId}`
                : `/moderate/media/${queueId}`;
            await axiosInstance.post(endpoint, { action });
            if (type === 'profile') {
                setProfileQueue(prevQueue => prevQueue.filter(item => item.id !== queueId));
            } else {
                setMediaQueue(prevQueue => prevQueue.filter(item => item.id !== queueId));
            }
        } catch (error) {
            console.error(`Error processing ${action} action for ${type}:`, error);
        }
    };

    if (loading) return <p>Loading moderation queue...</p>;

    return (
        <div className="moderation-queue">
            <h2>Moderation Queue</h2>
            <div className="tabs">
                <button
                    className={activeTab === 'profile' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('profile')}
                >
                    Profile Pictures ({profileQueue.length})
                </button>
                <button
                    className={activeTab === 'media' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('media')}
                >
                    Media ({mediaQueue.length})
                </button>
            </div>
            <div className="queue-list">
                {activeTab === 'profile' && (
                    <>
                        {profileQueue.length === 0 ? (
                            <p>No profile pictures pending moderation.</p>
                        ) : (
                            profileQueue.map((item, index) => (
                                <div key={item.id} className="queue-item">
                                    <span className="queue-index">{index + 1}.</span>
                                    <FontAwesomeIcon className='queue-item-overlay' icon={faImage} />
                                    <img src={item.image_url} alt="Pending Approval" className="queue-image" />
                                    <div className="mod-action-buttons">
                                        <button
                                            onClick={() => handleAction(item.id, 'approve', 'profile')}
                                            className="approve-button"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleAction(item.id, 'deny', 'profile')}
                                            className="deny-button"
                                        >
                                            Deny
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
                {activeTab === 'media' && (
                    <>
                        {mediaQueue.length === 0 ? (
                            <p>No media pending moderation.</p>
                        ) : (
                            mediaQueue.map((item, index) => (
                                <div key={item.id} className="queue-item">
                                    <span className="queue-index">{index + 1}.</span>
                                    {item.media_type === 'video' ? (
                                        <>
                                            <FontAwesomeIcon className='queue-item-overlay' icon={faVideo} />
                                            <video
                                                src={item.media_url}
                                                controls
                                                width="100"
                                                className="queue-image"
                                                onLoadedMetadata={(e) => { e.target.playbackRate = 2; }}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon className='queue-item-overlay' icon={faImage} />
                                            <img src={item.media_url} alt="Pending Approval" className="queue-image" />
                                        </>
                                    )}
                                    <div className="mod-action-buttons">
                                        <button
                                            onClick={() => handleAction(item.id, 'approve', 'media')}
                                            className="approve-button"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleAction(item.id, 'deny', 'media')}
                                            className="deny-button"
                                        >
                                            Deny
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default ModerationQueue;
