import React, { useState, useEffect, useCallback } from "react";
import Memory from './Memory';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useAxios } from "../auth/AxiosProvider";
import { useAuth } from "../auth/AuthContext";
import '../../styles/SelectedEvent.css';

function SelectedEvent({ event, handleBackButton, getEvents }) {
    const [memories, setMemories] = useState([]);
    const [hasSharedMemory, setHasSharedMemory] = useState(false);
    const { axiosInstance } = useAxios();
    const { user } = useAuth();

    const getMemories = useCallback(
        async (eventId) => {
            try {
                const response = await axiosInstance.get(`/events/${eventId}/memories?markChecked=true`);
                setMemories(response.data);
            } catch (err) {
                console.error("Error fetching memories: " + (err.response?.data || err.message));
            }
        },
        [axiosInstance, setMemories]
    );

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
                <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <h2>{event.title}</h2>
            <div><span>{`Shared by ${event.username}`}</span>
            </div>

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
        </div>
    )
}

export default SelectedEvent;
