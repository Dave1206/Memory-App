import React, { useState, useEffect, useRef } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { useAuth } from '../auth/AuthContext';
import { useMessenger } from './MessengerContext';
import WebSocketInstance from '../../utils/WebSocket';
import '../../styles/Messenger.css';

function Messenger() {
  const { user } = useAuth();
  const { isMessengerOpen, toggleMessenger, selectedConversationUserId } = useMessenger();
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [preselectedChatId, setPreselectedChatId] = useState(null);
  const userId = useRef(user.id);
  const [incomingMessages, setIncomingMessages] = useState({});
  const [incomingSeen, setIncomingSeen] = useState({});
  const gridAreaMapping = ['chat1', 'chat2', 'chat3', 'chat4', 'chat5', 'chat6'];

  useEffect(() => {
    if (selectedConversationUserId) {
      setPreselectedChatId(selectedConversationUserId);
    }
  }, [selectedConversationUserId]);

  useEffect(() => {
    const userIdTemp = userId.current;
    if (isMessengerOpen) {
      WebSocketInstance.connect(userIdTemp, "messenger");
    } else {
      WebSocketInstance.disconnect("messenger");
    }
    return () => {
      WebSocketInstance.disconnect("messenger");
    };
  }, [isMessengerOpen, userId]);

  //new message listener
  useEffect(() => {
    if (!isMessengerOpen) return;

    const handleNewMessage = (message) => {
      setIncomingMessages(prev => {
        const convId = message.conversation_id;
        const existing = prev[convId] || [];
        return {
          ...prev,
          [convId]: [...existing, message],
        };
      });
    };

    WebSocketInstance.on('new_message', handleNewMessage);

    return () => {
      WebSocketInstance.off('new_message', handleNewMessage);
    };
  }, [isMessengerOpen]);

  //mark seen listener
  useEffect(() => {
    if (!isMessengerOpen) return;
  
    const handleNewSeen = (message) => {
      const convId = message.conversationId;
      if (convId === undefined || convId === null) {
        console.error("Received message_seen event with invalid conversationId:", message);
        return;
      }
      setIncomingSeen(prev => ({
        ...prev,
        [convId]: message,
      }));
    };
  
    WebSocketInstance.on('message_seen', handleNewSeen);
  
    return () => {
      WebSocketInstance.off('message_seen', handleNewSeen);
    };
  }, [isMessengerOpen]);  

  //callback to clear new messages for conversation
  const clearIncomingMessagesForConversation = (conversationId) => {
    setIncomingMessages(prev => {
      const newState = { ...prev };
      delete newState[conversationId];
      return newState;
    });
  };

  //callback to clear mark seen for conversation
  const clearIncomingSeenForConversation = (conversationId) => {
    setIncomingSeen(prev => {
      const newState = { ...prev };
      delete newState[conversationId];
      return newState;
    });
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversations(prev => {
      const exists = prev.some(conv => conv.conversation_id === conversation.conversation_id);
      if (!exists) {
        return [...prev, conversation];
      }
      return prev;
    });
  };

  const handleCloseChatWindow = (conversationId) => {
    setSelectedConversations(prev =>
      prev.filter(conv => conv.conversation_id !== conversationId)
    );

    if (Number(preselectedChatId) === Number(conversationId)) {
      setPreselectedChatId(null);
    }
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
      toggleMessenger();
    }
  };

  if (!isMessengerOpen) return null;

  return (
    <div className="messenger-overlay" onClick={handleBackdropClick}>
      <div className="messenger-container" onClick={handleBackdropClick}>
        <ConversationList 
          onSelectConversation={handleSelectConversation} 
          preselectedChatId={preselectedChatId} 
          clearPreselectedChat={() => setPreselectedChatId(null)}
        />

        {/* Render multiple ChatWindows in a grid */}
        {selectedConversations.length > 0 && (
          <div className="chat-windows-grid">
            {selectedConversations.map((conv, index) => {
              const title =
                conv.title ||
                (conv.participants
                  .filter(p => p.user_id !== userId.current)
                  .map(p => p.username)
                  .join(', '));
              return (
                <ChatWindow
                  key={conv.conversation_id}
                  title={title}
                  conversationId={conv.conversation_id}
                  participants={conv.participants}
                  lastSeenMessageId={conv.lastSeenMessageId}
                  onClose={() => handleCloseChatWindow(conv.conversation_id)}
                  userId={user.id}
                  incomingMessages={incomingMessages[conv.conversation_id] || []}
                  onClearIncomingMessages={clearIncomingMessagesForConversation}
                  incomingSeen={incomingSeen[conv.conversation_id]}
                  onClearIncomingSeen={clearIncomingSeenForConversation}
                  style={{ gridArea: gridAreaMapping[index] }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Messenger;
