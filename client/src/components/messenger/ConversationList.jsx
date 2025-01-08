import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from '../auth/AuthContext';
import '../../styles/ConversationList.css';

function ConversationList({ onSelectConversation }) {
    const { axiosInstance } = useAxios();
    const { user } = useAuth();
    const userId = user.id;
    const [conversations, setConversations] = useState([]);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newConversationUser, setNewConversationUser] = useState('');
    const [suggestedFriends, setSuggestedFriends] = useState([]);

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

        const fetchFriends = async () => {
            try {
                const response = await axiosInstance.get(`/friends/${userId}`);
                setFriends(response.data);
            } catch (error) {
                console.error("Error fetching friends:", error);
            }
        };

        fetchConversations();
        fetchFriends();
    }, [axiosInstance, userId]);

    const handleNewConversation = async () => {
        if (!newConversationUser.trim()) return;

        try {
            const response = await axiosInstance.post('/conversations', {
                participantIds: [friends.find(f => f.username === newConversationUser)?.id],
                title: null,
            });

            setConversations((prevConversations) => [response.data, ...prevConversations]);
            setNewConversationUser('');
            setSuggestedFriends([]);
        } catch (error) {
            console.error("Error starting a new conversation:", error);
        }
    };

    const handleInputChange = (input) => {
        setNewConversationUser(input);
        if (input.trim()) {
            const matches = friends.filter((friend) =>
                friend.username.toLowerCase().includes(input.toLowerCase())
            );
            setSuggestedFriends(matches);
        } else {
            setSuggestedFriends([]);
        }
    };

    if (loading) {
        return <p>Loading conversations...</p>;
    }

    return (
        <div className="conversation-dropdown">
            <div className="new-conversation">
                <input
                    type="text"
                    value={newConversationUser}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Start a conversation by username..."
                    className="conversation-input"
                />
                <button
                    className="start-conversation-btn"
                    onClick={handleNewConversation}
                    disabled={!newConversationUser.trim()}
                >
                    Start
                </button>
                {suggestedFriends.length > 0 && (
                    <ul className="friend-suggestions">
                        {suggestedFriends.map((friend) => (
                            <li
                                key={friend.id}
                                onClick={() => {
                                    setNewConversationUser(friend.username);
                                    setSuggestedFriends([]);
                                }}
                            >
                                {friend.username}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {conversations.length > 0 ? (
                <div className="conversation-list">
                    {conversations.map((conversation) => (
                        <div
                            key={conversation.conversation_id}
                            className={`conversation-item ${conversation.unread_messages > 0 ? 'unread' : ''}`}
                            onClick={() => onSelectConversation(conversation.conversation_id)}
                        >
                            <div className="conversation-info">
                                <h3>{conversation.title || 'Private Message'}</h3>
                                <p>
                                    {conversation.last_message_time &&
                                        new Date(conversation.last_message_time).toLocaleString()}
                                </p>
                                <span className="unread-badge">
                                    {conversation.unread_messages > 0 && conversation.unread_messages}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-conversations">
                    <p>No conversations yet. Start a new one!</p>
                </div>
            )}
        </div>
    );
}

export default ConversationList;
