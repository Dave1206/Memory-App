import React from 'react';

function ProfileHeader({ user }) {
    return (
        <div className="profile-header">
            <img src={user.profile_picture} alt={`${user.username}'s profile`} className="profile-picture" />
            <h1>{user.username}</h1>
            <p>{user.bio}</p>
        </div>
    );
}

export default ProfileHeader;
