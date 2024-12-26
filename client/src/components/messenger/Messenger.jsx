import React, { useState } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { useAuth } from '../auth/AuthContext';
import '../../styles/Messenger.css';

function Messenger() {
    const { user } = useAuth();
    const [selectedConversation, setSelectedConversation] = useState(null);

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
