import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAxios } from '../auth/AxiosProvider';
import ProfileHeader from './ProfileHeader';
import FriendsList from '../friends/FriendList';
import ActivityFeed from './ActivityFeed';
import UserPreferences from './UserPreferences';
import EditProfile from './EditProfile';
import '../../styles/UserProfile.css';
import ModOptionsButton from '../moderation/ModOptionsButton';

function UserProfile({ user }) {
    const { userId } = useParams();
    const [profileUser, setProfileUser] = useState(null);
    const [activeTab, setActiveTab] = useState("profile");
    const [isBlocked, setIsBlocked] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const { axiosInstance } = useAxios();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axiosInstance.get(`/user/${userId}`, {
                    params: { purpose: 'profile' }
                });

                if (response.data.blocked) {
                    setIsBlocked(true);
                    setIsPrivate(false); // If blocked, ignore privacy setting
                } else if (response.data.private) {
                    setIsPrivate(true);
                    setIsBlocked(false); // If private, ignore blocked setting
                } else {
                    setProfileUser(response.data);
                    setIsBlocked(false);
                    setIsPrivate(false);
                }
            } catch (err) {
                console.error("Error fetching user data", err.response?.data || err.message);
                setIsBlocked(true); // Assume blocked or inaccessible on server error
            }
        };
        fetchUserData();
    }, [userId, axiosInstance]);

    if (isBlocked) {
        return (
            <div className="profile-wrapper">
                <h2>This profile is not accessible.</h2>
                <p>This user has blocked you.</p>
            </div>
        );
    }

    if (isPrivate) {
        return (
            <div className="profile-wrapper">
                <h2>This profile is private.</h2>
            </div>
        );
    }

    if (!profileUser) return <p>Loading...</p>;

    return (
        <div className="profile-wrapper">
            {profileUser.id === user.id && (
                <div className="profile-sidebar">
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`tab-button ${activeTab === "profile" ? "active" : ""}`}
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab("accountSettings")}
                        className={`tab-button ${activeTab === "accountSettings" ? "active" : ""}`}
                    >
                        Account Settings
                    </button>
                    <button
                        onClick={() => setActiveTab("editProfile")}
                        className={`tab-button ${activeTab === "editProfile" ? "active" : ""}`}
                    >
                        Edit Profile
                    </button>
                </div>
            )}
            <div className="profile-content">
                {activeTab === "profile" && (
                    <div className="profile-container">
                        <ProfileHeader user={profileUser} />
                        <div className="profile-sections">
                            <section className="profile-overview">
                                {user.role !== 'user' && (
                                    <ModOptionsButton type="bio" contentId={profileUser.id} />
                                )}
                                <h2>About Me</h2>
                                <p>{profileUser.bio}</p>
                            </section>
                            <section className="profile-activity">
                                <ActivityFeed userId={profileUser.id} />
                            </section>
                            <section className="profile-friends">
                                <h2>Friends</h2>
                                <FriendsList userId={profileUser.id} />
                            </section>
                        </div>
                    </div>
                )}
                {activeTab === "accountSettings" && (
                    <div className="settings-container">
                        <UserPreferences user={user} />
                    </div>
                )}
                {activeTab === "editProfile" && (
                    <div>
                        <EditProfile
                            user={user}
                            onSave={() => {
                                setActiveTab("profile");
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserProfile;
