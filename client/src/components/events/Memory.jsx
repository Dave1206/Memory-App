import React from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from '../auth/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faCrown } from '@fortawesome/free-solid-svg-icons';
import ModOptionsButton from '../moderation/ModOptionsButton';
import '../../styles/Memory.css';

function Memory({ event, memory, getMemories }) {
    const { axiosInstance } = useAxios();
    const { user } = useAuth();
    const memoryId = memory.memory_id;

    const currentDate = new Date();
    const revealDate = new Date(event.reveal_date);
    const isTimeCapsule = event.event_type === 'time_capsule';
    const shouldBlur = isTimeCapsule ? (currentDate < revealDate) : (!event.has_shared_memory);

    const handleDelete = async () => {
        try {
            await axiosInstance.delete(`/memories/${memoryId}`);
            getMemories(event.event_id);
        } catch (error) {
            console.error("Error deleting memory:", error.response?.data || error.message);
        }
    };

    const isMainMemory = memory.user_id === event.created_by;

    return (
        <div className={`memory-entry ${memory.colorClass} ${isMainMemory ? 'main-memory' : ''}`}>
            {isMainMemory && (
                <div className="crown-icon" title="Main Memory">
                    <FontAwesomeIcon icon={faCrown} />
                </div>
            )}
            <div className="memory-header">
                <strong className="memory-username">{`${memory.username} remembers . . .`}</strong>
                {(!isMainMemory && memory.user_id === user.id) && (
                    <button
                        className="delete-memory-button"
                        onClick={handleDelete}
                        title="Delete Memory"
                    >
                        <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                )}
                {user.role !== 'user' && (
                    <ModOptionsButton type="memory" contentId={memory.memory_id} />
                )}
            </div>
            <div className={`memory-content ${shouldBlur ? 'blurred-memory' : ''}`}>
                <p>{memory.content}</p>
            </div>
            {memory.media_urls && memory.media_urls.length > 0 ? (
                    <div className="memory-media-collage">
                        {memory.media_urls.map((url, i) => {
                            const isVideo = url.toLowerCase().endsWith('.mp4') || url.includes('video');
                            return (
                                <div key={i} className={`collage-item ${isVideo ? 'collage-item-video' : ''}`}>
                                    {isVideo ? (
                                        <video
                                            src={url}
                                            controls
                                            className="collage-media"
                                        />
                                    ) : (
                                        <img src={url} alt="Memory media" className="collage-media" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
            ) : (
                memory.media_token && (
                    <div className="pending-media-placeholder">
                        <p>Media awaiting moderator approval...</p>
                    </div>
                )
            )}
        </div>
    );
}

export default Memory;
