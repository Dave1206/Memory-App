import { createContext, useState, useContext } from "react";

const MessengerContext = createContext();

export const MessengerProvider = ({ children }) => {
    const [isMessengerOpen, setIsMessengerOpen] = useState(false);
    const [selectedConversationUserId, setSelectedConversationUserId] = useState(null);

    const toggleMessenger = (optionalUserId) => {
        if (optionalUserId !== undefined) {
            setSelectedConversationUserId(optionalUserId);
        }
        setIsMessengerOpen(prev => !prev);
    };

    return (
        <MessengerContext.Provider value={{ isMessengerOpen, toggleMessenger, selectedConversationUserId }}>
            {children}
        </MessengerContext.Provider>
    );
};

export const useMessenger = () => useContext(MessengerContext);
