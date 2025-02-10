import React, { useState, useEffect, useRef } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { useAuth } from '../auth/AuthContext';
import WebSocketInstance from '../../utils/WebSocket';
import '../../styles/Messenger.css';

function Messenger() {
    const { user } = useAuth();
    const [selectedConversation, setSelectedConversation] = useState(null);
    const userId = useRef(user.id);

    useEffect(() => {
            console.log("Connecting WebSocket for user:", userId.current);
            WebSocketInstance.connect(userId.current);

        return () => {
            WebSocketInstance.disconnect();
            console.log("Messenger component unmounted.")
        };
    }, []);

    const handleSelectConversation = (conversation) => {
        setSelectedConversation(conversation);
    };

    const handleCloseChatWindow = () => {
        setSelectedConversation(null);
    };

    return (
        <div className="messenger-container">
            <ConversationList onSelectConversation={handleSelectConversation} />
            {selectedConversation && (
                <ChatWindow
                    conversationId={selectedConversation.conversation_id}
                    participants = {selectedConversation.participants}
                    onClose={handleCloseChatWindow}
                    userId={user.id}
                />
            )}
        </div>
    );
}

export default Messenger;
