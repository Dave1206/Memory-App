import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAxios } from '../auth/AxiosProvider';
import ProfileHeader from './ProfileHeader';
import ActivityFeed from './ActivityFeed';
import FeedPost from '../FeedPost';
import '../../styles/UserProfile.css';
import ModOptionsButton from '../moderation/ModOptionsButton';
import useInteractionTracking from '../../hooks/useInteractionTracking';
import useMediaQuery from '../../hooks/useMediaQuery';

function UserProfile({ user }) {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [profileUser, setProfileUser] = useState(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [topPosts, setTopPosts] = useState([]);
    const { axiosInstance } = useAxios();
    const { handleSelectEvent } = useInteractionTracking(null);
    const isMobile = useMediaQuery('(max-width: 768px)');

    // For mobile: tab selection state ("activity" or "topPosts")
    const [activeTab, setActiveTab] = useState('activity');

    const colorOptions = ["color1", "color2", "color3"];
    let previousColor = null;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axiosInstance.get(`/user/${userId}`, {
                    params: { purpose: 'profile' }
                });
                if (response.data.blocked) {
                    setIsBlocked(true);
                    setIsPrivate(false);
                } else if (response.data.private) {
                    setIsPrivate(true);
                    setIsBlocked(false);
                } else {
                    setProfileUser(response.data);
                    setIsBlocked(false);
                    setIsPrivate(false);
                }
            } catch (err) {
                console.error("Error fetching user data", err.response?.data || err.message);
                setIsBlocked(true);
            }
        };
        fetchUserData();
    }, [userId, axiosInstance]);

    useEffect(() => {
        const fetchTopPosts = async () => {
            try {
                const response = await axiosInstance.get(`/posts/top/${userId}`, {
                    params: { limit: 10 }
                });
                setTopPosts(response.data);
            } catch (err) {
                console.error("Error fetching top rated posts", err.response?.data || err.message);
            }
        };
        if (profileUser) {
            fetchTopPosts();
        }
    }, [profileUser, axiosInstance, userId]);

    const handlePostClick = async (post) => {
        const path = `/event/${post.event_id}`;
        await handleSelectEvent(post, path);
        navigate(path);
    };

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

    // Render top posts with color assignment
    const renderTopPosts = (
        <div className="profile-top-posts-wrapper">
            <div className="top-posts-header">
                {!isMobile && <h2>Top Posts</h2>}
            </div>
            <div className="profile-top-posts">
                <div className="top-posts-container">
                    {topPosts.length > 0 ? (
                        topPosts.map((post) => {
                            const availableColors = colorOptions.filter(color => color !== previousColor);
                            const randomIndex = Math.floor(Math.random() * availableColors.length);
                            const chosenColor = availableColors[randomIndex];
                            previousColor = chosenColor;
                            return (
                                <FeedPost
                                    key={post.post_id}
                                    post={post}
                                    colorClass={chosenColor}
                                    handleClick={() => handlePostClick(post)}
                                />
                            );
                        })
                    ) : (
                        <p>No top posts to display.</p>
                    )}
                </div>
            </div>
        </div>
    );

    // Render activity feed section
    const renderActivityFeed = (
        <div className="profile-activity-wrapper">
            {!isMobile && <h2 className="profile-activity-header">Activity Feed</h2>}
            <div className="profile-activity">
                <ActivityFeed userId={profileUser.id} />
            </div>
        </div>
    );

    // Desktop layout
    const desktopLayout = (
        <div className="profile-body">
            <div className="profile-left">
                <div className="profile-header-container">
                    <ProfileHeader user={profileUser} />
                    {user.role !== 'user' && (
                        <ModOptionsButton type="bio" contentId={profileUser.id} />
                    )}
                </div>
                {renderActivityFeed}
            </div>
            <div className="profile-right">
                {renderTopPosts}
            </div>
        </div>
    );

    // Mobile layout
    const mobileLayout = (
        <div className="profile-body mobile">
            <div className="profile-header-container">
                <ProfileHeader user={profileUser} />
                {user.role !== 'user' && (
                    <ModOptionsButton type="bio" contentId={profileUser.id} />
                )}
            </div>
            <div className="profile-tabs">
                <button
                    className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('activity')}
                >
                    Activity Feed
                </button>
                <button
                    className={`tab-button ${activeTab === 'topPosts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('topPosts')}
                >
                    Top Posts
                </button>
            </div>
            <div className="profile-tab-content">
                {activeTab === 'activity' ? renderActivityFeed : renderTopPosts}
            </div>
        </div>
    );

    return (
        <div className="profile-wrapper">
            <div className="profile-content">
                {isMobile ? mobileLayout : desktopLayout}
            </div>
        </div>
    );
}

export default UserProfile;
