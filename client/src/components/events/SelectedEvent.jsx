import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faLock } from '@fortawesome/free-solid-svg-icons';
import { useAxios } from "../auth/AxiosProvider";
import { useAuth } from "../auth/AuthContext";
import MemoryModal from "../modals/MemoryModal";
import InviteModal from "../modals/InviteModal";
import Memory from "./Memory";
import '../../styles/SelectedEvent.css';

function SelectedEvent({ event, handleBackButton }) {
    const { axiosInstance } = useAxios();
    const { user } = useAuth();
    const [memories, setMemories] = useState([]);
    const [showMemoryModal, setShowMemoryModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [hasSharedMemory, setHasSharedMemory] = useState(event.has_shared_memory);

    const fetchMemories = useCallback(async () => {
        try {
            const response = await axiosInstance.get(`/events/${event.event_id}/memories?markChecked=true`);
            setMemories(response.data);
        } catch (err) {
            console.error("Error fetching memories:", err.response?.data || err.message);
        }
    }, [axiosInstance, event.event_id]);

    const currentDate = new Date();
    const revealDate = new Date(event.reveal_date);
    const isTimeCapsule = event.event_type === 'time_capsule';
    const isRevealed = !isTimeCapsule || (currentDate >= revealDate);

    const shareMemory = useCallback(async (newMemory, mediaToken) => {
        try {
            await axiosInstance.post(`/events/${event.event_id}/memories`, { content: newMemory, mediaToken: mediaToken });
            fetchMemories();
            setHasSharedMemory(true);
        } catch (err) {
            console.error("Error sharing memory:", err.response?.data || err.message);
        }
    }, [fetchMemories, axiosInstance, event.event_id]);

    useEffect(() => {
        fetchMemories();
    }, [fetchMemories, shareMemory]);

    const coloredMemories = useMemo(() => {
        let lastColor = "";
        const colorOptions = ["color1", "color2", "color3"];
        return memories.map(memory => {
          const availableColors = colorOptions.filter(color => color !== lastColor);
          const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
          lastColor = randomColor;
          return { ...memory, colorClass: randomColor };
        });
      }, [memories]);      

    return (
        <div className="selected-event">
            <button className="back-button" onClick={handleBackButton}>
                <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <h2>{event.title}</h2>
            <div className="event-info">
                <span>{`Shared by ${event.username}`}</span>
            </div>

            <div className="selected-event-actions">
                {event.created_by === user.id && (
                    <button className="invite-button" onClick={() => setShowInviteModal(true)}>
                        Invite others to share
                    </button>
                )}
                {(!hasSharedMemory) && (
                    <button className="share-button" onClick={() => setShowMemoryModal(true)}>
                        Share Memory
                    </button>
                )}
                {isTimeCapsule && !isRevealed && (
                    <div className="time-capsule-info">
                        <span>This time capsule will be available on {revealDate.toLocaleDateString()}.</span>
                        <FontAwesomeIcon icon={faLock} className="lock-icon" />
                    </div>
                )}
            </div>

            {/* Invite and Memory modals */}
            <InviteModal
                show={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                eventId={event.event_id}
            />
            <MemoryModal
                show={showMemoryModal}
                onCreate={shareMemory}
                onClose={() => setShowMemoryModal(false)}
                event={event}
            />

            <div className="memories-container">
                {coloredMemories.length === 0 ? (
                    <p>No memories yet. Be the first to share!</p>
                ) : (
                    coloredMemories.map((memory) => (
                        <Memory
                            key={memory.memory_id}
                            event={event}
                            memory={memory}
                            getMemories={fetchMemories}
                            hasSharedMemory={hasSharedMemory}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

    export default SelectedEvent;
