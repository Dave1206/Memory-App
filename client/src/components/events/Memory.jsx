import React, { useState } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from '../auth/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faCrown } from '@fortawesome/free-solid-svg-icons';
import ModOptionsButton from '../moderation/ModOptionsButton';
import '../../styles/Memory.css';

function Memory({ event, memory, getMemories, hasSharedMemory }) {
    const { axiosInstance } = useAxios();
    const { user } = useAuth();
    const [enlargedImage, setEnlargedImage] = useState(null);
    const memoryId = memory.memory_id;

    const currentDate = new Date();
    const revealDate = new Date(event.reveal_date);
    const isTimeCapsule = event.event_type === 'time_capsule';
    const shouldBlur = isTimeCapsule ? (currentDate < revealDate) : (!hasSharedMemory);

    const handleDelete = async () => {
        try {
            await axiosInstance.delete(`/memories/${memoryId}`);
            getMemories(event.event_id);
        } catch (error) {
            console.error("Error deleting memory:", error.response?.data || error.message);
        }
    };

    const isMainMemory = memory.user_id === event.created_by;

    const handleImageClick = (e, url) => {
        e.stopPropagation();
        setEnlargedImage(url);
    };

    const handleCloseImage = () => setEnlargedImage(null);

    const scrambleText = (text) => {
        return text
          .split(" ")
          .map(word => {
            return word
              .split("")
              .sort(() => 0.5 - Math.random())
              .join("");
          })
          .join(" ");
      };      

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
                <p>{shouldBlur? scrambleText(memory.content) : memory.content}</p>
            </div>
            {memory.media_urls && memory.media_urls.length > 0 ? (
                    <div className={`memory-media-collage ${shouldBlur ? 'blurred-memory' : ''}`}>
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
                                        <img 
                                            src={url} 
                                            alt="Memory media" 
                                            className="collage-media" 
                                            onClick={(e) => !shouldBlur && handleImageClick(e, url)}
                                        />
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
            {enlargedImage && (
                <div className="lightbox" onClick={handleCloseImage}>
                    <img src={enlargedImage} alt="enlarged" />
                </div>
            )}
        </div>
    );
}

export default Memory;
