import React, { useState, useEffect, useRef } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { useAuth } from '../auth/AuthContext';
import { useMessenger } from './MessengerContext';
import WebSocketInstance from '../../utils/WebSocket';
import { v4 as uuidv4 } from 'uuid';
import '../../styles/Messenger.css';

function Messenger() {
    const { user } = useAuth();
    const { isMessengerOpen, toggleMessenger} = useMessenger();
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [lastSeenMessageId, setLastSeenMessageId] = useState(null);
    const [title, setTitle] = useState(null);
    const userId = useRef(user.id);

    useEffect(() => {
        const userIdTemp = userId.current
        if (isMessengerOpen) {
            WebSocketInstance.connect(userIdTemp, "messenger");
        } else {
            WebSocketInstance.disconnect("messenger");
        }
        return () => {
            WebSocketInstance.disconnect("messenger");
        };
    }, [isMessengerOpen]);

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

    useEffect(() => {
        if (!isMessengerOpen) return;

        const closeMessengerOnNavClick = (e) => {
            const isNavbarClick = e.target.closest('.nav-item') || e.target.closest('.nav-toggle');
            if (isNavbarClick) {
                toggleMessenger();
            }
        };

        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.addEventListener('click', closeMessengerOnNavClick);
        }

        return () => {
            if (navbar) {
                navbar.removeEventListener('click', closeMessengerOnNavClick);
            }
        };
    }, [isMessengerOpen, toggleMessenger]);

    const handleBackdropClick = (e) => {
            if (e.target === e.currentTarget) {
                toggleMessenger()
            }
        };

    if (!isMessengerOpen) return null;

    return (
        <div className="messenger-overlay" onClick={handleBackdropClick}>
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
                        participants={selectedConversation.participants}
                        onClose={handleCloseChatWindow}
                        userId={user.id}
                        onUpdateLastSeen={(newId) => {
                            setLastSeenMessageId(newId)
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default Messenger;
