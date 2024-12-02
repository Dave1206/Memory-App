import React, { useState } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import '../../styles/FriendRequest.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus } from '@fortawesome/free-solid-svg-icons';

function FriendRequest({ userId }) {
    const [friendUsername, setFriendUsername] = useState('');
    const [message, setMessage] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const { axiosInstance } = useAxios();

    const toggleExpand = () => setIsExpanded(!isExpanded);

    const sendFriendRequest = async () => {
        try {
            const response = await axiosInstance.post('/friends/request', {
                userId,
                friendUsername,
            });
            setMessage(response.data.message);
            setFriendUsername('');  // Clear input after sending request
            setTimeout(() => {
                setMessage('');
                setIsExpanded(false); // Collapse after showing message
            }, 2000); // Message stays for 2 seconds before collapsing
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error sending friend request.');
        }
    };

    return (
        <div className={`add-friend-wrapper ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {!isExpanded ? (
                <button className="add-friend-icon" onClick={toggleExpand}>
                    <FontAwesomeIcon icon={faUserPlus} />
                </button>
            ) : (
                <>
                    <input
                        className="add-friend-input"
                        type="text"
                        placeholder="New friend"
                        value={friendUsername}
                        onChange={(e) => setFriendUsername(e.target.value)}
                    />
                    <button className="add-friend-button" onClick={sendFriendRequest}>+</button>
                    {message && <p className="friend-message">{message}</p>}
                </>
            )}
        </div>
    );
}

export default FriendRequest;
