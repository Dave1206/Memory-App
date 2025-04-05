import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from '../auth/AuthContext';
import WebSocketInstance from '../../utils/WebSocket';
import debounce from '../../utils/Debounce';
import '../../styles/ChatWindow.css';

function ChatWindow({
  title,
  conversationId,
  onClose,
  userId,
  participants,
  lastSeenMessageId,
  onUpdateLastSeen,
  incomingMessages,
  onClearIncomingMessages,
  incomingSeen,
  onClearIncomingSeen,
  style,
}) {
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
  const oldestMessageRef = useRef(null);
  const offsetRef = useRef(0);

  const deduplicateMessages = (arr) => {
    const map = new Map();
    arr.forEach(msg => {
      map.set(msg.message_id, msg);
    });
    return Array.from(map.values());
  };

  const fetchMessages = useCallback(async () => {
    try {
      const before = oldestMessageRef.current;
      const offset = offsetRef.current;
      const response = await axiosInstance.get(`/conversations/${conversationId}/messages`, {
        params: { limit: 20, offset, before },
      });
      const fetched = response.data;
      oldestMessageRef.current = fetched[0].sent_at;
      offsetRef.current = offsetRef.current + 20;
      if (before) {
        const container = chatContainerRef.current;
        const previousHeight = container ? container.scrollHeight : 0;
        const previousScrollTop = container ? container.scrollTop : 0;
        setMessages(prev => deduplicateMessages([...fetched, ...prev]));
        setTimeout(() => {
          const newHeight = container ? container.scrollHeight : 0;
          container.scrollTop = previousScrollTop + (newHeight - previousHeight);
          isPrependingRef.current = false;
        }, 300);
      } else {
        setMessages(prev => deduplicateMessages([...prev, ...fetched]));
      }
      setHasMoreMessages(fetched.length === 20);
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
    offsetRef.current = 0;
    oldestMessageRef.current = null;
    fetchMessages();
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (incomingMessages && incomingMessages.length > 0) {
      setMessages(prev => deduplicateMessages([...prev, ...incomingMessages]));
      if (chatContainerRef.current && wasAtBottomRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
      if (typeof onClearIncomingMessages === 'function') {
        onClearIncomingMessages(conversationId);
      }
    }
  }, [incomingMessages, conversationId, onClearIncomingMessages]);

  useEffect(() => {
    if (incomingSeen && incomingSeen.messageIds.length > 0) {
      if (!incomingSeen?.messageIds || !Array.isArray(incomingSeen.messageIds)) {
        console.error("❌ Invalid incoming seen data:", incomingSeen);
        return;
      }
      setMessages(prevMessages => {
        const updatedMessages = prevMessages.map(msg => {
          if (
            incomingSeen.messageIds.includes(msg.message_id) &&
            parseInt(msg.sender_id) !== parseInt(incomingSeen.seenUser)
          ) {
            const updatedSeen = msg.seen_status ? [...msg.seen_status] : [];
            if (!updatedSeen.some(status => status.user_id === incomingSeen.seenUser)) {
              updatedSeen.push({ user_id: Number(incomingSeen.seenUser), seen_at: new Date().toISOString() });
            }
            return { ...msg, seen_status: updatedSeen };
          }
          return msg;
        });
  
        const seenMessages = updatedMessages.filter(msg =>
          (msg.seen_status && msg.seen_status.some(status => status.user_id === userId)) ||
          msg.sender_id === userId
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
  
      if (typeof onClearIncomingSeen === 'function') {
        onClearIncomingSeen(conversationId);
      }
    }
  }, [incomingSeen, conversationId, onClearIncomingSeen, onUpdateLastSeen, userId]);  

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
        if (lastSeenElem) {
          lastSeenElem.scrollIntoView({ block: 'end', behavior: 'instant' });
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop += 20;
            }
          }, 50);
        }
      }, 50);
      initialLoadRef.current = true;
    }
  }, [lastSeenMessageId]);

  const handleScroll = debounce(useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const threshold = 20;

    if (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold) {
      setIsAtBottom(true);

      const unseenMessages = messages.filter(msg =>
        (!msg.seen_status || !msg.seen_status.some(status => status.user_id === userId)) &&
        msg.sender_id !== userId
      );

      if (unseenMessages.length > 0) {
        WebSocketInstance.sendMessage('messenger', 'mark_seen', {
          conversationId,
          messageIds: unseenMessages.map(msg => msg.message_id),
        });
      }
    } else {
      setIsAtBottom(false);
    }

    if (container.scrollTop === 0 && hasMoreMessages) {
      isPrependingRef.current = true;
      setLoading(true);
      fetchMessages(oldestMessageRef.current);
    }
  }, [fetchMessages, hasMoreMessages, messages, conversationId, userId]), 500);

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
      const threshold = 50;
      wasAtBottomRef.current = (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold);
    }

    try {
      WebSocketInstance.sendMessage('messenger', 'send_message', {
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
    <div className="chat-window" style={style}>
      <div className='chat-header'>
        <div className='title-pictures'>
          {participants.length < 3 ? (
            participants
              .filter((p) => p.user_id !== userId)
              .map((p) => (
                <img
                  key={p.user_id}
                  className="title-profile-pic-lg"
                  src={p.profile_picture}
                  alt={p.username}
                  title={p.username}
                />
              ))
          ) : (
            participants.map((p) => (
              <img
                key={p.user_id}
                className="title-profile-pic"
                src={p.profile_picture}
                alt={p.username}
                title={p.username}
              />
            ))
          )}
        </div>
        <h2 className={participants.length < 3 ? 'title-dm' : 'title-group'}>{title}</h2>
        <button className="close-btn" onClick={onClose}>X</button>
      </div>
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