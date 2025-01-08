import React, { useState, useEffect } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { useAuth } from '../auth/AuthContext';
import WebSocketInstance from '../../utils/WebSocket';
import '../../styles/Messenger.css';

function Messenger({ isOpen }) {
    const { user } = useAuth();
    const [selectedConversation, setSelectedConversation] = useState(null);

    useEffect(() => {
        if (isOpen) {
            console.log("Connecting WebSocket for user:", user.id);
            WebSocketInstance.connect(user.id);
        } else {
            console.log("Disconnecting WebSocket for user:", user.id);
            WebSocketInstance.disconnect();
        }

        return () => {
            WebSocketInstance.disconnect();
        };
    }, [isOpen, user.id]);

    const handleSelectConversation = (conversationId) => {
        setSelectedConversation(conversationId);
    };

    const handleCloseChatWindow = () => {
        setSelectedConversation(null);
    };

    return (
        <div className="messenger-container">
            <ConversationList onSelectConversation={handleSelectConversation} />
            {selectedConversation && (
                <ChatWindow
                    conversationId={selectedConversation}
                    onClose={handleCloseChatWindow}
                    userId={user.id}
                />
            )}
        </div>
    );
}

export default Messenger;
