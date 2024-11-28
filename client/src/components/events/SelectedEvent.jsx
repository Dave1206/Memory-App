import React, { useState, useEffect, useCallback } from "react";
import Memory from './Memory';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { useAxios } from "../auth/AxiosProvider";
import { useAuth } from "../auth/AuthContext";

function SelectedEvent({ event, handleBackButton, getEvents }) {
    const [memories, setMemories] = useState([]);
    const [isDescriptionVisible, setDescriptionVisible] = useState(false);
    const [hasSharedMemory, setHasSharedMemory] = useState(false);
    const axiosInstance = useAxios();
    const { user } = useAuth();

    const getMemories = useCallback(
        async (eventId) => {
            try {
                const response = await axiosInstance.get(`/events/${eventId}/memories`);
                setMemories(response.data);
            } catch (err) {
                console.error("Error fetching memories: " + (err.response?.data || err.message));
            }
        },
        [axiosInstance, setMemories]
    );

    const toggleDescription = () => {
        setDescriptionVisible((prev) => !prev);
    };

    const updateSharedState = useCallback((newValue) => {
        setHasSharedMemory(newValue);
        getEvents();
    }, [getEvents]);

    useEffect(() => {
        setHasSharedMemory(event.has_shared_memory);
        getMemories(event.event_id);
    }, [getMemories, event])

    return (
        <div className="selected-event">
            <button className="back-button" onClick={handleBackButton}>
                Back to Events
            </button>
            <h2>{event.title}</h2>
            <div>{`by ${event.username}`}
                <div
                    className="description-toggle-link"
                    onClick={toggleDescription}
                >   description
                    <span className="arrow">
                        {isDescriptionVisible ? <FontAwesomeIcon icon={faChevronUp} /> : <FontAwesomeIcon icon={faChevronDown} />}
                    </span>
                </div>
            </div>
            {isDescriptionVisible && (
                <div className="description">{event.description}</div>
            )}
            {event.reveal_date < Date.now() ? (
                <div className='memories-container'>
                    <Memory
                        key={event.event_id}
                        eventId={event.event_id}
                        userId={user.id}
                        event={event}
                        hasShared={hasSharedMemory}
                        getMemories={getMemories}
                        updateSharedState={updateSharedState}
                        memories={memories}
                    />
                </div>
            ) : (
                <h3>{`This time capsule will open on ${new Date(event.reveal_date).toLocaleDateString()}`}</h3>
            )}
            </div>
    )
}

export default SelectedEvent;
