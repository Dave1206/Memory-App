import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { useNavigate } from 'react-router-dom';
import '../../styles/FriendList.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faClock } from '@fortawesome/free-solid-svg-icons';

function FriendList({ userId }) {
    const [friends, setFriends] = useState([]);
    const [onlineExpanded, setOnlineExpanded] = useState(true);
    const [offlineExpanded, setOfflineExpanded] = useState(false);
    const axiosInstance = useAxios();
    const navigate = useNavigate();

    const navigateToProfile = (friendId) => {
        navigate(`/profile/${friendId}`);
    };

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const response = await axiosInstance.get(`/friends/${userId}`);
                setFriends(response.data);
            } catch (error) {
                console.error('Error fetching friends:', error);
            }
        };
        fetchFriends();
    }, [userId, axiosInstance]);

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

    return (
        <div className="friends-list-wrapper">
            <div className="friends-list-heading">
                <h2>Friends</h2>
            </div>

            {/* Online Friends Section */}
            <div className="friends-section">
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
                                onClick={() => navigateToProfile(friend.id)} 
                                className="friends-list-item" 
                                key={friend.id}
                            >
                                <div className='profile-image-container'>
                                    <img src={friend.profile_picture || '/default-avatar.jpg'} alt="Profile" className="friend-profile-picture" />
                                    <p className="status-dot online"></p>
                                </div>
                                <p className="friend-username">{friend.username}</p>
                                
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Offline Friends Section */}
            <div className="friends-section">
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
                                onClick={() => navigateToProfile(friend.id)} 
                                className="friends-list-item" 
                                key={friend.id}
                            >
                                <div className='profile-image-container'>
                                    <img src={friend.profile_picture || '/default-avatar.jpg'} alt="Profile" className="friend-profile-picture" />
                                    <p className="status-dot offline"></p>
                                </div>
                                <div className='friend-info'>
                                    <p className="friend-username">{friend.username}</p>
                                    <p className="last-online">
                                
                                    <FontAwesomeIcon icon={faClock} /> {formatLastOnline(friend.last_online)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default FriendList;
