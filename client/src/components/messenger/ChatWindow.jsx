import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import WebSocketInstance from '../../utils/WebSocket';
import '../../styles/ChatWindow.css';

function ChatWindow({ conversationId, onClose, userId }) {
    const { axiosInstance } = useAxios();
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
            setMessages((prevMessages) => [...response.data.reverse(), ...prevMessages]);
            setHasMoreMessages(response.data.length === 20);
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    }, [axiosInstance, conversationId]);
    
    useEffect(() => {
        fetchMessages();

        WebSocketInstance.connect(userId);

        WebSocketInstance.on('new_message', (message) => {
            if (message.conversation_id === conversationId) {
                setMessages((prevMessages) => [...prevMessages, message]);
            }
        });

        WebSocketInstance.on('message_seen', (seenData) => {
            if (seenData.conversation_id === conversationId) {
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        seenData.messageIds.includes(msg.message_id)
                            ? { ...msg, seen_by: seenData.seenBy }
                            : msg
                    )
                );
            }
        });

        return () => {
            WebSocketInstance.off('new_message');
            WebSocketInstance.off('message_seen');
            WebSocketInstance.disconnect();
        };
    }, [conversationId, userId, fetchMessages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            const response = await axiosInstance.post(`/conversations/${conversationId}/messages`, {
                content: newMessage,
            });
            WebSocketInstance.sendMessage('send_message', response.data);
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
            const unseenMessages = messages.filter((msg) => !msg.seen_by.includes(userId));
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
                    messages.map((msg) => (
                        <div
                            key={msg.message_id}
                            className={`chat-message ${msg.sender_id === userId ? 'sent' : 'received'}`}
                        >
                            <p>{msg.content}</p>
                            <span className="timestamp">{new Date(msg.sent_at).toLocaleString()}</span>
                            <span className="seen-status">
                                {msg.seen_by?.length > 0 ? `Seen by ${msg.seen_by.length}` : 'Unseen'}
                            </span>
                        </div>
                    ))
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
                />
                <button onClick={handleSendMessage}>Send</button>
            </div>
        </div>
    );
}

export default ChatWindow;
