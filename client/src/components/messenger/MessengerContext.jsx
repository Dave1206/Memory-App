import { createContext, useState, useContext } from "react";

const MessengerContext = createContext();

export const MessengerProvider = ({ children }) => {
    const [isMessengerOpen, setIsMessengerOpen] = useState(false);

    const toggleMessenger = () => {
        setIsMessengerOpen(prev => !prev);
    };

    return (
        <MessengerContext.Provider value={{ isMessengerOpen, toggleMessenger }}>
            {children}
        </MessengerContext.Provider>
    );
};

export const useMessenger = () => useContext(MessengerContext);
