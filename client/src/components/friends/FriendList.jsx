import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useNavigate } from 'react-router-dom';
import '../../styles/FriendList.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faMessage, faChevronDown, faChevronUp, faClock } from '@fortawesome/free-solid-svg-icons';
import EllipsisMenu from '../EllipsisMenu';
import { useMessenger } from '../messenger/MessengerContext';

function FriendList({ userId }) {
    const [friends, setFriends] = useState([]);
    const [pendingFriends, setPendingFriends] = useState([]);
    const [onlineExpanded, setOnlineExpanded] = useState(true);
    const [offlineExpanded, setOfflineExpanded] = useState(false);
    const [pendingExpanded, setPendingExpanded] = useState(false);
    const { axiosInstance } = useAxios();
    const navigate = useNavigate();
    const [openMenuFriendId, setOpenMenuFriendId] = useState(null);
    const { toggleMessenger } = useMessenger();

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const response = await axiosInstance.get(`/friends/${userId}`);
                setFriends(response.data[0]);
                setPendingFriends(response.data[1]);
            } catch (error) {
                console.error('Error fetching friends:', error);
            }
        };
        fetchFriends();
    }, [userId, axiosInstance]);

    const handleUnfriend = async (friendId) => {
        try {
            await axiosInstance.post('/friends/remove', {
                userId,
                friendId,
            });
            setFriends(prev => prev.filter(friend => friend.id !== friendId));
        } catch (error) {
            console.error('Error unfriending:', error);
        }
    };

    const onlineFriends = friends.filter(friend => friend.online);
    const offlineFriends = friends.filter(friend => !friend.online);

    const formatLastOnline = (timestamp) => {
        const lastOnlineDate = new Date(timestamp);
        const now = new Date();
        const diffInMs = now - lastOnlineDate;
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        } else {
            const diffInDays = Math.floor(diffInHours / 24);
            return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
        }
    };

    const getButtonItemsForFriend = (friend) => {
        const items = [];
        items.push({
            content: "Profile",
            onClick: () => navigate(`/profile/${Number(friend.id)}`),
        });
        items.push({
            content: "Message",
            onClick: () => toggleMessenger(friend.id),
        });
        if (friend.last_online) {
            items.push({
                content: "Unfriend",
                onClick: () => handleUnfriend(friend.id),
            });
        }

        return items;
    };

    return (
        <div className="friends-list-wrapper">
            <div className="friends-list-heading">
                <h2>Friends</h2>
            </div>

            {/* Online Friends Section */}
            {onlineFriends.length > 0 && <div className="friends-section">
                <button
                    className="toggle-section-button"
                    onClick={() => setOnlineExpanded(!onlineExpanded)}
                >
                    Online Friends ({onlineFriends.length})
                    <FontAwesomeIcon icon={onlineExpanded ? faChevronUp : faChevronDown} />
                </button>
                {onlineExpanded && (
                    <div className="friends-list">
                        {onlineFriends.map((friend) => (
                            <div
                                className="friends-list-item"
                                key={friend.id}
                            >
                                <div className='profile-image-container'>
                                    <img src={friend.profile_picture || '/default-avatar.jpg'} alt="Profile" className="friend-profile-picture" />
                                    <p className="status-dot online"></p>
                                </div>
                                <div className='friend-info'>
                                    <p className="friend-username">{friend.username}</p>
                                </div>
                                <div className="friend-actions"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <FontAwesomeIcon icon={faUser} onClick={() => navigate(`/profile/${Number(friend.id)}`)} />
                                    <FontAwesomeIcon icon={faMessage} onClick={() => toggleMessenger(friend.id)} />
                                    <EllipsisMenu
                                        buttonItems={getButtonItemsForFriend(friend)}
                                        isOpen={openMenuFriendId === friend.id}
                                        onToggle={() => {
                                            setOpenMenuFriendId(openMenuFriendId === friend.id ? null : friend.id);
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>}

            {/* Offline Friends Section */}
            {offlineFriends.length > 0 && <div className="friends-section">
                <button
                    className="toggle-section-button"
                    onClick={() => setOfflineExpanded(!offlineExpanded)}
                >
                    Offline Friends ({offlineFriends.length})
                    <FontAwesomeIcon icon={offlineExpanded ? faChevronUp : faChevronDown} />
                </button>
                {offlineExpanded && (
                    <div className="friends-list">
                        {offlineFriends.map((friend) => (
                            <div
                                className="friends-list-item"
                                key={friend.id}
                            >
                                <div className='profile-image-container'>
                                    <img src={friend.profile_picture || '/default-avatar.jpg'} alt="Profile" className="friend-profile-picture" />
                                    <p className="status-dot offline"></p>
                                </div>
                                <div className='friend-info'>
                                    <p className="friend-username">{friend.username}</p>
                                </div>
                                <div className="friend-actions"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <FontAwesomeIcon icon={faUser} onClick={() => navigate(`/profile/${Number(friend.id)}`)} />
                                    <FontAwesomeIcon icon={faMessage} onClick={() => toggleMessenger(friend.id)} />
                                    <EllipsisMenu
                                        buttonItems={getButtonItemsForFriend(friend)}
                                        isOpen={Number(openMenuFriendId) === Number(friend.id)}
                                        onToggle={() => {
                                            setOpenMenuFriendId(Number(openMenuFriendId) === Number(friend.id) ? null : Number(friend.id));
                                        }}
                                    />
                                </div>
                                <p className="last-online">
                                    <FontAwesomeIcon icon={faClock} /> {formatLastOnline(friend.last_online)}
                                </p>

                            </div>
                        ))}
                    </div>
                )}
            </div>}

            {/* Pending Friends Section */}
            {pendingFriends.length > 0 && <div className="friends-section">
                <button
                    className="toggle-section-button"
                    onClick={() => setPendingExpanded(!pendingExpanded)}
                >
                    Pending Friends ({pendingFriends.length})
                    <FontAwesomeIcon icon={pendingExpanded ? faChevronUp : faChevronDown} />
                </button>
                {pendingExpanded && (
                    <div className="friends-list">
                        {pendingFriends.map((friend) => (
                            <div
                                className="friends-list-item"
                                key={friend.id}
                            >
                                <div className='profile-image-container'>
                                    <img src={friend.profile_picture || '/default-avatar.jpg'} alt="Profile" className="friend-profile-picture" />
                                    {/* For pending requests, you might display a special indicator */}
                                    <p className="pending-indicator">Pending</p>
                                </div>
                                <p className="friend-username">{friend.username}</p>
                                <div className="friend-actions" onClick={(e) => e.stopPropagation()}>
                                    <EllipsisMenu
                                        buttonItems={getButtonItemsForFriend(friend)}
                                        isOpen={Number(openMenuFriendId) === Number(friend.id)}
                                        onToggle={() => {
                                            setOpenMenuFriendId(Number(openMenuFriendId) === Number(friend.id) ? null : Number(friend.id));
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>}
        </div>
    );
}

export default FriendList;
