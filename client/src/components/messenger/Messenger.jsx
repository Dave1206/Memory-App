import React, { useState, useEffect, useRef } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { useAuth } from '../auth/AuthContext';
import WebSocketInstance from '../../utils/WebSocket';
import '../../styles/Messenger.css';

function Messenger() {
    const { user } = useAuth();
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [lastSeenMessageId, setLastSeenMessageId] = useState(null);
    const userId = useRef(user.id);

    useEffect(() => {
            const userIdTemp = userId.current
            console.log("Connecting WebSocket for user:", userId.current);
            WebSocketInstance.disconnect();
            WebSocketInstance.connect(userIdTemp, "messenger");

        return () => {
            WebSocketInstance.disconnect();
            console.log("Messenger component unmounted.")
            WebSocketInstance.connect(userIdTemp, "navbar");
        };
    }, []);

    const handleSelectConversation = (conversation) => {
        setSelectedConversation(conversation);
        setLastSeenMessageId(conversation.last_seen_message_id);
    };

    const handleCloseChatWindow = () => {
        setSelectedConversation(null);
    };

    return (
        <div className="messenger-container" onClick={(e) => e.stopPropagation()}>
            <ConversationList 
                lastSeenMessageId={lastSeenMessageId}
                onSelectConversation={handleSelectConversation} 
            />
            {selectedConversation && (
                <ChatWindow
                    conversationId={selectedConversation.conversation_id}
                    lastSeenMessageId={lastSeenMessageId}
                    participants = {selectedConversation.participants}
                    onClose={handleCloseChatWindow}
                    userId={user.id}
                    onUpdateLastSeen={(newId) => {
                        setLastSeenMessageId(newId)
                    }}
                />
            )}
        </div>
);
}

export default Messenger;
