import React, { createContext, useContext, useState } from "react";

const EventUpdateContext = createContext();

export const EventUpdateProvider = ({ children }) => {
    const [newEvent, setNewEvent] = useState(null);

    const addNewEvent = (eventData) => {
        setNewEvent(eventData);
    };

    return (
        <EventUpdateContext.Provider value={{ newEvent, addNewEvent }}>
            {children}
        </EventUpdateContext.Provider>
    );
};

// Hook to use this context
export const useEventUpdate = () => useContext(EventUpdateContext);
