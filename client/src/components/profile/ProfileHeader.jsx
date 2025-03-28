import React, { useState, useEffect } from 'react';
import '../../styles/ProfileHeader.css';
import { useAuth } from '../auth/AuthContext';
import { useAxios } from '../auth/AxiosProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faUserPlus, faUserMinus, faBan } from '@fortawesome/free-solid-svg-icons';
import EllipsisMenu from '../EllipsisMenu';

function ProfileHeader({ user }) {
  const { user: currentUser } = useAuth();
  const { axiosInstance } = useAxios();
  const [isFriend, setIsFriend] = useState(false);
  const [requestStatus, setRequestStatus] = useState('');
  const [friendLoaded, setFriendLoaded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (currentUser.id === user.id) return;

    const checkFriendStatus = async () => {
      try {
        const response = await axiosInstance.get(`/friends/${currentUser.id}`);
        const friends = response.data;
        const friendExists = friends.some(friend => Number(friend.id) === Number(user.id));
        setIsFriend(friendExists);
      } catch (error) {
        console.error("Error fetching friends list:", error);
      } finally {
        setFriendLoaded(true);
      }
    };

    checkFriendStatus();
  }, [currentUser.id, user.id, axiosInstance]);

  const handleAddFriend = async () => {
    try {
      await axiosInstance.post('/friends/request', {
        userId: currentUser.id,
        friendUsername: user.username
      });
      setRequestStatus('pending');
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const handleRemoveFriend = async () => {
    try {
      await axiosInstance.post('/friends/remove', {
        userId: currentUser.id,
        friendId: user.id
      });
      setIsFriend(false);
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  const handleBlockUser = async () => {
    try {
      await axiosInstance.post('/block-user', {
        blockedId: user.id
      });
      // Optionally update UI or notify user
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  const toggleMenu = () => setIsMenuOpen(prev => !prev);

  // Build the menu buttons based on friend status.
  const buttonItems = [];
  if (isFriend) {
    buttonItems.push({
      content: <><FontAwesomeIcon icon={faUserMinus} /> Remove Friend</>,
      onClick: handleRemoveFriend,
      isDisabled: false
    });
    buttonItems.push({
        content: <><FontAwesomeIcon icon={faBan} /> Block User</>,
        submenuTitle: "Are you sure?",
        submenu: [
          {
            content: "Yes, Block User",
            onClick: handleBlockUser,
            isDisabled: false
          }
        ],
        isDisabled: false
      });
    } else {
    if (requestStatus === 'pending') {
      buttonItems.push({
        content: <><FontAwesomeIcon icon={faUser} /> Pending...</>,
        onClick: () => {},
        isDisabled: true
      });
    } else {
      buttonItems.push({
        content: <><FontAwesomeIcon icon={faUserPlus} /> Add Friend</>,
        onClick: handleAddFriend,
        isDisabled: false
      });
    }
  }

  return (
    <div className="profile-header" onMouseLeave={() => {
        if (isMenuOpen){
        toggleMenu();
    }}}>
      <div className="profile-image">
        <img src={user.profile_picture} alt={`${user.username}'s profile`} />
      </div>
      <div className="profile-info">
        <h1>{user.username}</h1>
        <p className="profile-bio">{user.bio}</p>
        {currentUser.id !== user.id && friendLoaded && (
          <EllipsisMenu
            isOpen={isMenuOpen}
            buttonItems={buttonItems}
            onToggle={toggleMenu}
            toggleClass="friend-toggle"
            menuClass="friend-menu"
            colorClass="friend-color"
          />
        )}
      </div>
    </div>
  );
}

export default ProfileHeader;
