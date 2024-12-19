import React, { useState, useEffect, useRef } from 'react';
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

    useEffect(() => {
        const fetchMessages = async (before = null) => {
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
        };

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
            WebSocketInstance.disconnect();
        };
    }, [axiosInstance, conversationId, userId]);

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

    const handleScroll = () => {
        if (chatContainerRef.current.scrollTop === 0 && hasMoreMessages) {
            setLoading(true);
            fetchMessages(oldestMessageTime);
        }

        if (
            chatContainerRef.current.scrollTop + chatContainerRef.current.clientHeight >=
            chatContainerRef.current.scrollHeight
        ) {
            const unseenMessages = messages.filter((msg) => !msg.seen_by.includes(userId));
            if (unseenMessages.length > 0) {
                WebSocketInstance.sendMessage('mark_seen', {
                    conversationId,
                    messageIds: unseenMessages.map((msg) => msg.message_id),
                });
            }
        }
    };

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (chatContainerRef.current) {
                chatContainerRef.current.removeEventListener('scroll', handleScroll);
            }
        };
    }, [messages]);

    return (
        <div className="chat-window">
            <button className="close-btn" onClick={onClose}>Close</button>
            <div className="chat-container" ref={chatContainerRef}>
                {loading && <p>Loading messages...</p>}
                {messages.map((msg) => (
                    <div key={msg.message_id} className={`chat-message ${msg.sender_id === userId ? 'sent' : 'received'}`}>
                        <p>{msg.content}</p>
                        <span className="timestamp">{new Date(msg.sent_at).toLocaleString()}</span>
                        <span className="seen-status">
                            {msg.seen_by.length > 0 ? `Seen by ${msg.seen_by.length}` : 'Unseen'}
                        </span>
                    </div>
                ))}
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
