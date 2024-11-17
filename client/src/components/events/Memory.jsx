import React, { useState } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from '../auth/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import MemoryModal from '../modals/MemoryModal';
import InviteModal from '../modals/InviteModal';
import ModOptionsButton from '../Moderation/ModOptionsButton';
import '../../styles/Memory.css';

function Memory({
    event,
    eventId,
    userId,
    hasShared,
    memories,
    getMemories,
    updateSharedState,
}) {
    const [showModal, setShowModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const axiosInstance = useAxios();
    const { user } = useAuth();

    const currentDate = new Date();
    const revealDate = new Date(event.reveal_date);
    const isTimeCapsuleRevealed = event.event_type !== 'time_capsule' || revealDate <= currentDate;

    const shareMemory = async (newMemory) => {
        try {
            await axiosInstance.post(`/events/${eventId}/memories`, { content: newMemory });
            getMemories(eventId);
            updateSharedState(true);
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
            <div className='event-button-container'>
                {event.created_by === userId && (
                    <button className="invite-button" onClick={openInviteModal}>
                        Invite others to share
                    </button>
                )}
                {!hasShared && (
                    <button className='share-button' onClick={() => setShowModal(true)}>
                        Share Memory
                    </button>
                )}
            </div>

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
                eventId={eventId}
            />

            {!hasShared ? (
                <div>
                    <h3>Share your memory to reveal others' memories.</h3>
                    <div className="memory-container">
                        {memories.length === 0 && (
                            <p>No one has shared a memory for this event yet. Be the first!</p>
                        )}
                        {memories.map((memory, index) => (
                            <div key={index} className='memory-parent'>
                                {user.role !== 'user' && (
                                    <ModOptionsButton type='memory' contentId={memory.memory_id} />
                                )}
                                <div className="memory">
                                    <p style={{ visibility: 'hidden' }}>{memory.content}</p>
                                </div>
                                <strong className="memory-username">{memory.username}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                isTimeCapsuleRevealed ? (
                    <div>
                        <h3>Here's what everyone remembers of this event.</h3>
                        <div className="memory-container">
                            {memories.map((memory, index) => (
                                <div key={index} className='memory-parent'>
                                    {user.role !== 'user' && (
                                        <ModOptionsButton type='memory' contentId={memory.memory_id} />
                                    )}
                                    <div className="memory">
                                        <p>{memory.content}</p>
                                    </div>
                                    <strong className="memory-username">{memory.username}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                    <h2>This time capsule will be available on {revealDate.toLocaleDateString()}.</h2>
                    <FontAwesomeIcon icon={faLock} className="lock-icon-overlay" />
                    </>
                )
            )}
        </div>
    );
}

export default Memory;
