import React, { useState, useEffect, useRef, memo } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { useAuth } from '../auth/AuthContext';
import WebSocketInstance from '../../utils/WebSocket';
import { v4 as uuidv4 } from 'uuid';
import '../../styles/Messenger.css';

function Messenger() {
    const { user } = useAuth();
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [lastSeenMessageId, setLastSeenMessageId] = useState(null);
    const [title, setTitle] = useState(null);
    const userId = useRef(user.id);

    useEffect(() => {
            const userIdTemp = userId.current
            console.log("Connecting WebSocket for user:", userId.current);
            WebSocketInstance.connect(userIdTemp, "messenger");

        return () => {
            WebSocketInstance.disconnect("messenger");
            console.log("Messenger component unmounted.")
        };
    }, []);

    const handleSelectConversation = (conversation) => {
        setSelectedConversation(conversation);
        setLastSeenMessageId(conversation.last_seen_message_id);

        const title =
            conversation.title ||
            ((conversation.participants || [])
                .filter((participant) => participant.user_id !== userId.current)
                .map((participant) => participant.username)
                .join(', '));

        setTitle(title);
    };

    const handleCloseChatWindow = () => {
        setSelectedConversation(null);
    };

    return (
        <div className="messenger-container" onClick={(e) => e.stopPropagation()}>
            <ConversationList 
                key={uuidv4()}
                lastSeenMessageId={lastSeenMessageId}
                onSelectConversation={handleSelectConversation} 
            />
            {selectedConversation && (
                <ChatWindow
                    key={uuidv4()}
                    title={title}
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

export default memo(Messenger);
