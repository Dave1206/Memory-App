import React from 'react';
import '../../styles/ProfileHeader.css';

function ProfileHeader({ user }) {
    return (
        <div className="profile-header">
            <div className="profile-image">
                <img src={user.profile_picture} alt={`${user.username}'s profile`} />
            </div>
            <div className="profile-info">
                <h1>{user.username}</h1>
                <p className="profile-bio">{user.bio}</p>
            </div>
        </div>
    );
}

export default ProfileHeader;
