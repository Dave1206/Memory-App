import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from '../auth/AuthContext';
import WebSocketInstance from '../../utils/WebSocket';
import '../../styles/ConversationList.css';

function ConversationList({ onSelectConversation, lastSeenMessageId, preselectedChatId, clearPreselectedChat }) {
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
        setFriends(response.data[0]);
      } catch (error) {
        console.error("Error fetching friends:", error);
      }
    };

    fetchConversations();
    fetchFriends();
  }, [axiosInstance, userId, lastSeenMessageId]);

  useEffect(() => {
    if (preselectedChatId && conversations.length > 0) {
      const openedChat = conversations.find((conv) =>
        conv.participants.some(
          (participant) => Number(participant.user_id) === Number(preselectedChatId)
        )
      );
      if (openedChat) {
        onSelectConversation(openedChat);
        clearPreselectedChat();
      }
    }
  }, [preselectedChatId, conversations, onSelectConversation, clearPreselectedChat]);

  const handleNewConversation = async () => {
    if (!newConversationUser.trim() || !isValidFriend()) return;

    try {
      const friend = friends.find(f => f.username === newConversationUser);
      if (!friend) return;
      const response = await axiosInstance.post('/conversations', {
        participantIds: [friend.id],
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
        friend.username.toLowerCase().includes(input.toLowerCase()) && !hasConversationWith(friend.id)
      );
      setSuggestedFriends(matches);
    } else {
      setSuggestedFriends([]);
    }
  };

  const hasConversationWith = (friendId) => {
    return conversations.some(conversation => 
      conversation.participants.some(participant => participant.user_id === friendId)
    );
  };

  const isValidFriend = () => {
    return friends.some(friend => friend.username.toLowerCase() === newConversationUser.toLowerCase());
  };

  useEffect(() => {
    const handleConversationUpdate = (data) => {
      setConversations(prevConversations =>
        prevConversations.map(conv => {
          if (conv.conversation_id === data.conversation_id) {
            return {
              ...conv,
              last_seen_message_id: data.last_seen_message_id ?? conv.last_seen_message_id,
              last_message_content: data.last_message_content ?? conv.last_message_content,
              last_message_sender: data.last_message_sender ?? conv.last_message_sender,
              last_message_time: data.last_message_time ?? conv.last_message_time,
              unread_messages: (() => {
                if (parseInt(data.seen_user) !== parseInt(userId))
                  return conv.unread_messages;
                if (data.last_message_content !== undefined) {
                  return (conv.unread_messages || 0) + 1;
                }
                if (data.seen_messages !== undefined) {
                  return Math.max((conv.unread_messages || 0) - data.seen_messages.length, 0);
                }
                if (data.unread_messages !== undefined) {
                  return data.unread_messages;
                }
                return conv.unread_messages;
              })(),
            };
          }
          return conv;
        })
      );
    };

    WebSocketInstance.on('conversation_update', handleConversationUpdate);

    return () => {
      WebSocketInstance.off('conversation_update', handleConversationUpdate);
    };
  }, [setConversations, userId]);

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
          disabled={!isValidFriend()}
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
          {[...conversations]
            .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time))
            .map((conversation) => {
              const title =
                conversation.title ||
                ((conversation.participants || [])
                  .filter((participant) => participant.user_id !== userId)
                  .map((participant) => participant.username)
                  .join(', '));

              const formattedTime = conversation.last_message_time
                ? new Date(conversation.last_message_time).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : '';

              const lastMessage = conversation.last_message_content || '';
              const preview =
                lastMessage.length > 12
                  ? lastMessage.substring(0, 12) + '...'
                  : lastMessage;

              const previewText = conversation.last_message_sender
                ? `${conversation.last_message_sender}: ${preview}`
                : preview;

              const colorIndex = (parseInt(conversation.conversation_id, 10) % 3) + 1;
              const colorClass = `color${colorIndex}`;

              return (
                <div
                  key={conversation.conversation_id}
                  className={`conv-item ${colorClass} ${conversation.unread_messages > 0 ? 'unread' : ''}`}
                  onClick={() => onSelectConversation(conversation)}
                >
                  <div className="conv-item-info">
                    <div className='conv-item-header'>
                      <h3>{title}</h3>
                      <div className="participants-avatars">
                        {conversation.participants
                          .filter((participant) => participant.user_id !== user.id)
                          .map((participant, idx) => (
                            <img
                              key={idx}
                              src={participant.profile_picture}
                              alt={participant.username}
                              title={participant.username}
                              className="participant-avatar"
                            />
                          ))}
                      </div>
                    </div>
                    <div className='conv-item-preview'>
                      <p className="last-message-preview">{previewText}</p>
                      <p className="timestamp">{formattedTime}</p>
                    </div>
                    {conversation.unread_messages > 0 && (
                      <span className="unread-badge">
                        {conversation.unread_messages}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
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
