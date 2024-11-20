import React from 'react';
import '../../styles/ProfileHeader.css';

function ProfileHeader({ user }) {
    return (
        <div className="profile-header">
            <img src={user.profile_picture} alt={`${user.username}'s profile`} />
            <h1>{user.username}</h1>
        </div>
    );
}

export default ProfileHeader;
