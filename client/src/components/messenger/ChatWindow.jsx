import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from '../auth/AuthContext';
import WebSocketInstance from '../../utils/WebSocket';
import '../../styles/ChatWindow.css';

function ChatWindow({ conversationId, onClose, userId, participants }) {
    const { axiosInstance } = useAxios();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const chatContainerRef = useRef(null);
    const oldestMessageTime = messages.length > 0 ? messages[0].sent_at : null;
    const chatContainer = chatContainerRef.current;

    const fetchMessages = useCallback(async (before = null) => {
        try {
            const response = await axiosInstance.get(`/conversations/${conversationId}/messages`, {
                params: { limit: 20, before },
            });
            if (before) {
                setMessages((prevMessages) => [...response.data, ...prevMessages]);
            } else {
                setMessages(response.data);
            }
            setHasMoreMessages(response.data.length === 20);
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    }, [axiosInstance, conversationId]);
    
    useEffect(() => {
        fetchMessages();

        const handleNewMessage = (message) => {
            if (message.conversation_id === conversationId) {
                setMessages((prevMessages) => [...prevMessages, message]);
            }
        };

        WebSocketInstance.on('new_message', handleNewMessage);

        return () => {
            WebSocketInstance.off('new_message', handleNewMessage);
        };
    }, [conversationId, fetchMessages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            WebSocketInstance.sendMessage('send_message', {
                conversation_id: conversationId,
                content: newMessage,
                media_url: null,
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleScroll = useCallback(() => {
        if (chatContainer.scrollTop === 0 && hasMoreMessages) {
            setLoading(true);
            fetchMessages(oldestMessageTime);
        }

        if (
            chatContainer.scrollTop + chatContainer.clientHeight >=
            chatContainer.scrollHeight
        ) {
            const unseenMessages = messages.filter((msg) => !((msg.seen_status || []).includes(userId)));
            if (unseenMessages.length > 0) {
                WebSocketInstance.sendMessage('mark_seen', {
                    conversationId,
                    messageIds: unseenMessages.map((msg) => msg.message_id),
                });
            }
        }
    }, [setLoading, fetchMessages, chatContainer, conversationId, hasMoreMessages, messages, oldestMessageTime, userId]);

    useEffect(() => {
        if (chatContainer) {
            chatContainer.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (chatContainer) {
                chatContainer.removeEventListener('scroll', handleScroll);
            }
        };
    }, [chatContainer, handleScroll]);

    return (
        <div className="chat-window">
            <button className="close-btn" onClick={onClose}>Close</button>
            <div className="chat-container" ref={chatContainerRef}>
                {loading && <p>Loading messages...</p>}
                {messages && messages.length > 0 ? (
                    messages.map((msg) => {
                        const isSent = msg.sender_id === userId;
                        const senderInfo = isSent 
                        ? { username: user.username, profile_picture: user.profile_picture } 
                        : (participants.find(p => Number(p.user_id) === Number(msg.sender_id)) || {});

                        const formattedTime = new Date(msg.sent_at).toLocaleString([], { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          });

                        const seenParticipants = (msg.seen_status || [])
                        .filter(status => status.user_id !== userId)
                        .map(status => participants.find(p => Number(p.user_id) === Number(status.user_id)))
                        .filter(p => p !== undefined);

                        return (
                            <div
                                key={msg.message_id}
                                className={`message-wrapper ${isSent ? 'sent' : 'received'}`}
                            >
                                <div className={`chat-message ${isSent ? 'sent' : 'received'}`}>
                                    <img
                                        className="profile-pic"
                                        src={senderInfo.profile_picture}
                                        alt="Profile"
                                        title={senderInfo.username}
                                    />

                                    <div className="message-content">
                                        {msg.content}
                                    </div>
                                </div>
                                <div className="meta-info">
                                    <span className="timestamp">
                                        {formattedTime}
                                    </span>
                                    {seenParticipants.length > 0 ? (
                                        <div className="seen-profiles">
                                            Seen by
                                            {seenParticipants.map((participant, idx) => (
                                            <img
                                                key={idx}
                                                src={participant.profile_picture}
                                                alt={participant.username}
                                                className="seen-profile-pic"
                                                title={participant.username}
                                            />
                                            ))}
                                        </div>
                                    ) : (<span>Unseen</span>)}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    !loading && <p>No messages yet. Say something!</p>
                )}
            </div>
            <div className="chat-input">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && newMessage.trim()) {
                            handleSendMessage();
                        }
                    }}
                />
                <button onClick={handleSendMessage}>Send</button>
            </div>
        </div>
    );
}

export default ChatWindow;