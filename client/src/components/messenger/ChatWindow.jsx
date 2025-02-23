import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from '../auth/AuthContext';
import WebSocketInstance from '../../utils/WebSocket';
import '../../styles/ChatWindow.css';

function ChatWindow({ conversationId, onClose, userId, participants, lastSeenMessageId, onUpdateLastSeen }) {
    const { axiosInstance } = useAxios();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const chatContainerRef = useRef(null);
    const wasAtBottomRef = useRef(false);
    const isPrependingRef = useRef(false);
    const initialLoadRef = useRef(false);

    const oldestMessageTime = messages.length > 0 ? messages[0].sent_at : null;

    const deduplicateMessages = (arr) => {
        const map = new Map();
        arr.forEach(msg => {
          map.set(msg.message_id, msg);
        });
        return Array.from(map.values());
      };

    const fetchMessages = useCallback(async (before = null) => {
        try {
            const response = await axiosInstance.get(`/conversations/${conversationId}/messages`, {
                params: { limit: 20, before },
            });
            const fetched = response.data;
            if (before) {
                const container = chatContainerRef.current;
                const previousHeight = container ? container.scrollHeight : 0;
                const previousScrollTop = container ? container.scrollTop : 0;
                setMessages(prev => deduplicateMessages([...fetched, ...prev]));
                setTimeout(() => {
                    const newHeight = container ? container.scrollHeight : 0;
                    container.scrollTop = previousScrollTop + (newHeight - previousHeight);
                    isPrependingRef.current = false;
                  }, 50);
            } else {
                setMessages(prev => deduplicateMessages([...prev, ...fetched]));
                }
            setHasMoreMessages(response.data.length === 20);
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    }, [axiosInstance, conversationId]);

    useEffect(() => {
      setMessages([]);
      setLoading(true);
      setHasMoreMessages(true);
      initialLoadRef.current = false;
      fetchMessages();
    }, [conversationId, fetchMessages]);
    
    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    useEffect(() => {
        const handleNewMessage = (message) => {
            if (message.conversation_id === conversationId) {
              setMessages(prev => {
                if (prev.some((m) => m.message_id === message.message_id)) {
                  return prev;
                }
                if (chatContainerRef.current && !isPrependingRef.current) {
                  const container = chatContainerRef.current;
                  const threshold = 0;
                  wasAtBottomRef.current = (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold);
                }
                return deduplicateMessages([...prev, message]);
              });
            }
          };

        WebSocketInstance.on('new_message', handleNewMessage);

        return () => {
            WebSocketInstance.off('new_message', handleNewMessage);
        };
    }, [conversationId]);

    useEffect(() => {
      const handleMessageSeen = (data) => {
        setMessages(prevMessages => {
          const updatedMessages = prevMessages.map(msg => {
            if (
              msg.conversation_id === data.conversationId &&
              data.messageIds.includes(msg.message_id) &&
              parseInt(msg.sender_id) !== parseInt(data.seenUser)
            ) {
              const updatedSeen = msg.seen_status ? [...msg.seen_status] : [];
              if (!updatedSeen.some(status => status.user_id === data.seenUser)) {
                updatedSeen.push({ user_id: data.seenUser, seen_at: new Date().toISOString() });
              }
              return { ...msg, seen_status: updatedSeen };
            }
            return msg;
          });
          
          const seenMessages = updatedMessages.filter(msg =>
            msg.sender_id !== userId &&
            msg.seen_status &&
            msg.seen_status.some(status => status.user_id === userId)
          );
          
          if (seenMessages.length > 0) {
            seenMessages.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
            const newLastSeen = seenMessages[0].message_id;
            if (typeof onUpdateLastSeen === 'function') {
              onUpdateLastSeen(newLastSeen);
            }
          }
          
          return updatedMessages;
        });
      };
    
      WebSocketInstance.on('message_seen', handleMessageSeen);
      return () => {
        WebSocketInstance.off('message_seen', handleMessageSeen);
      };
    }, [conversationId, userId, onUpdateLastSeen]);    

    useEffect(() => {
        const container = chatContainerRef.current;
        if (container && !isPrependingRef.current && wasAtBottomRef.current) {
            container.scrollTop = container.scrollHeight;
        }
        wasAtBottomRef.current = false;
    }, [messages]);

    useEffect(() => {
      if (!initialLoadRef.current && chatContainerRef.current && lastSeenMessageId) {
        setTimeout(() => {
          const lastSeenElem = document.getElementById(`message-${String(lastSeenMessageId)}`);
          console.log(lastSeenMessageId);
          if (lastSeenElem) {
            lastSeenElem.scrollIntoView({ block: 'center' });
          }
        }, 100);
        initialLoadRef.current = true;
      }
    }, [lastSeenMessageId]);

      const handleScroll = useCallback(() => {
        const container = chatContainerRef.current;
        if (!container) return;
        const threshold = 20;
    
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold) {
          setIsAtBottom(true);
            const unseenMessages = messages.filter((msg) => !((msg.seen_status || []).includes(userId)));
          if (unseenMessages.length > 0) {
            WebSocketInstance.sendMessage('mark_seen', {
              conversationId,
              messageIds: unseenMessages.map((msg) => msg.message_id),
            });
          }
        } else {
            setIsAtBottom(false);
        }
        
        if (container.scrollTop === 0 && hasMoreMessages) {
            isPrependingRef.current = true;
            setLoading(true);
            fetchMessages(oldestMessageTime);
          }
      }, [fetchMessages, hasMoreMessages, messages, oldestMessageTime, conversationId, userId]);

      useEffect(() => {
        const container = chatContainerRef.current;
        if (container) {
          container.addEventListener('scroll', handleScroll);
        }
        return () => {
          if (container) {
            container.removeEventListener('scroll', handleScroll);
          }
        };
      }, [handleScroll]);

      const scrollToBottom = () => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      };
    
      const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        if (chatContainerRef.current) {
            const container = chatContainerRef.current;
            const threshold = 20;
            wasAtBottomRef.current = (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold);
        }

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

    return (
        <div className="chat-window">
          <button className="close-btn" onClick={onClose}>Close</button>
          <div className="chat-container" ref={chatContainerRef}>
            {loading && <p>Loading messages...</p>}
            {messages && messages.length > 0 ? (
              messages.map((msg, index) => {
                const isSent = msg.sender_id === userId;
                const key = `${msg.message_id}-${index}`;
                const messageIdAttr = `message-${msg.message_id}`;
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
                    key={key}
                    id={messageIdAttr}
                    className={`message-wrapper ${isSent ? 'sent' : 'received'}`}
                  >
                    <div className={`chat-message ${isSent ? 'sent' : 'received'}`}>
                      <img
                        className="profile-pic"
                        src={senderInfo.profile_picture}
                        alt={senderInfo.username}
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
                      ) : (
                        ((participants && participants.length > 2) || msg.sender_id === userId) ? 
                      <span>Unseen</span> : null
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              !loading && <p>No messages yet. Say something!</p>
            )}
          </div>
            {!isAtBottom && (
                <button className="scroll-to-bottom" onClick={scrollToBottom}>↓</button>
            )}
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