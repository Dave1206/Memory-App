import React from "react";
import '../../styles/EventModal.css';

function EventModal({ show, onClose, event, creator }) {
    
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!show) {
        return null;
    }

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-left-column">
                    <div className="modal-header">
                        <img 
                            src={creator.profile_picture || '/default-avatar.jpg'} 
                            alt={`${creator.username}'s profile`} 
                            className="creator-profile-picture" 
                        />
                        <h2 className="creator-username">{creator.username}</h2>
                    </div>

                    <div className="modal-body">
                        <h3 className="event-title">{event.title}</h3>
                        <p className="event-description">{event.description}</p>
                    </div>

                    <div className="modal-footer">
                        <span className="event-memories-count">
                            {event.memories_count === 1 ? `${event.memories_count} memory.` : `${event.memories_count} memories`}
                        </span>
                        <div className="button-container">
                            <button className="modal-button" onClick={onClose}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>  
            </div>
        </div>
    );
}

export default EventModal;