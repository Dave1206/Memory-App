import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from '../auth/AuthContext';
import WebSocketInstance from '../../utils/WebSocket';
import '../../styles/ConversationList.css';

function ConversationList({ onSelectConversation }) {
    const { axiosInstance } = useAxios();
    const { user } = useAuth();
    const userId = user.id;
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const response = await axiosInstance.get('/conversations');
                setConversations(response.data);
            } catch (error) {
                console.error("Error fetching conversations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();

        WebSocketInstance.connect(userId);

        // Listen for conversation updates
        WebSocketInstance.on('conversation_update', (updatedConversation) => {
            setConversations((prevConversations) =>
                prevConversations.map((conv) =>
                    conv.conversation_id === updatedConversation.conversation_id
                        ? { ...conv, ...updatedConversation }
                        : conv
                )
            );
        });

        // Listen for new conversations
        WebSocketInstance.on('new_conversation', (newConversation) => {
            setConversations((prevConversations) => [newConversation, ...prevConversations]);
        });

        return () => {
            WebSocketInstance.disconnect();
        };
    }, [axiosInstance, userId]);

    if (loading) {
        return <p>Loading conversations...</p>;
    }

    return (
        <div className="conversation-list">
            {conversations.map((conversation) => (
                <div
                    key={conversation.conversation_id}
                    className={`conversation-item ${conversation.unread_messages > 0 ? 'unread' : ''}`}
                    onClick={() => onSelectConversation(conversation.conversation_id)}
                >
                    <div className="conversation-info">
                        <h3>{conversation.title || 'Private Message'}</h3>
                        <p>{conversation.last_message_time && new Date(conversation.last_message_time).toLocaleString()}</p>
                        <span className="unread-badge">{conversation.unread_messages > 0 && conversation.unread_messages}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ConversationList;
