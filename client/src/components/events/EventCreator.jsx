// EventCreator.js
import React, { useState } from "react";  
import EventModal from "../modals/EventModal";
import '../../styles/EventCreator.css';
import { useAxios } from '../auth/AxiosProvider';

function EventCreator({ getEvents, userId }) {
    const [showModal, setShowModal] = useState(false);
    const axiosInstance = useAxios();

    // Create a new event and refresh events list
    const createEvent = async (newEvent) => {
        try {
            await axiosInstance.post("/events", { newEvent });
            getEvents(); // Refresh events after creating a new event
        } catch (err) {
            console.error("Error creating event", err.response?.data || err.message);
        }
    };

    return (
        <div className="event-creator">
            <button className="event-button" onClick={() => setShowModal(true)}>
                Create new event
            </button>
            <EventModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onCreate={createEvent}
                userId={userId}
            />
        </div>
    );
}

export default EventCreator;
