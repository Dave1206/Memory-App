import React, { useState } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from '../auth/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import MemoryModal from '../modals/MemoryModal';
import InviteModal from '../modals/InviteModal';
import ModOptionsButton from '../moderation/ModOptionsButton';
import '../../styles/Memory.css';

function Memory({ event, userId, memories, getMemories }) {
    const [showModal, setShowModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const { axiosInstance } = useAxios();
    const { user } = useAuth();

    const currentDate = new Date();
    const revealDate = new Date(event.reveal_date);
    const isTimeCapsule = event.event_type === 'time_capsule';
    const isTimeCapsuleRevealed = !isTimeCapsule || revealDate <= currentDate;
    const shouldBlurMemories = !event.has_shared_memory || !isTimeCapsuleRevealed;

    const shareMemory = async (newMemory) => {
        try {
            await axiosInstance.post(`/events/${event.event_id}/memories`, { content: newMemory });
            getMemories(event.event_id);
            event.has_shared_memory = true;
        } catch (err) {
            console.error("Error sharing memory:", err.response?.data || err.message);
        }
    };

    const openInviteModal = () => setShowInviteModal(true);
    const closeInviteModal = () => setShowInviteModal(false);

    const confirmInvites = (usernames) => {
        closeInviteModal();
        sendInvites(event.event_id, usernames);
    };

    const sendInvites = async (eventId, usernames) => {
        try {
            await axiosInstance.post(`/invite/${eventId}`, { usernames });
        } catch (err) {
            console.error("Error sending invites:", err.response?.data || err.message);
        }
    };

    return (
        <div className="memories-wrapper">
            {/* Event Buttons */}
            <div className='event-button-container'>
                {event.created_by === userId && (
                    <button className="invite-button" onClick={openInviteModal}>
                        Invite others to share
                    </button>
                )}
                {!event.has_shared_memory && (
                    <button className='share-button' onClick={() => setShowModal(true)}>
                        Share Memory
                    </button>
                )}
            </div>

            {/* Modals */}
            <InviteModal 
                show={showInviteModal}
                onClose={closeInviteModal}
                onConfirm={confirmInvites}
                eventId={event.event_id}
            />

            <MemoryModal
                show={showModal}
                onCreate={shareMemory}
                onClose={() => setShowModal(false)}
                eventId={event.event_id}
            />

            {/* Time Capsule Information */}
            {isTimeCapsule && (
                <div className="time-capsule-info">
                    <span>This time capsule will be available on {revealDate.toLocaleDateString()}.</span>
                    {!isTimeCapsuleRevealed && <FontAwesomeIcon icon={faLock} className="lock-icon-overlay" />}
                </div>
            )}

            {/* Memories Section */}
            <h3>{event.has_shared_memory ? "Memories" : "Hidden"}</h3>
            <div className="memory-container">
                {memories.length === 0 ? (
                    <p>No one has shared a memory for this event yet. Be the first!</p>
                ) : (
                    memories.map((memory, index) => (
                        <div key={index} className='memory-parent'>
                            {user.role !== 'user' && <ModOptionsButton type='memory' contentId={memory.memory_id} />}
                            
                            <div className={`memory`}>
                                <p className={`${shouldBlurMemories ? 'blurred-memory' : ''}`} >{memory.content}</p>
                            </div>

                            <strong className="memory-username">{memory.username}</strong>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Memory;