import React, { useState, useEffect } from 'react';
import { useAuth } from './auth/AuthContext';
import { useAxios } from './auth/AxiosProvider';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faCheckCircle, faShare, faPlus, faBan, faTrashCan, faBook } from '@fortawesome/free-solid-svg-icons';
import NotificationBadge from './NotificationBadge';
import ModOptionsButton from './moderation/ModOptionsButton';
import EllipsisMenu from './EllipsisMenu';
import LikeButton from './LikeButton';
import '../styles/FeedPost.css';

function FeedPost({ post, onLike, onShare, onAddEvent, onRemoveEvent, onBlock, colorClass, handleClick }) {
    const [showMenu, setShowMenu] = useState(false);
    const { user, isModMode } = useAuth();
    const { axiosInstance } = useAxios();
    const [creatorMemory, setCreatorMemory] = useState(null);
    const [isBlurred, setIsBlurred] = useState(false);
    const [timeAgo, setTimeAgo] = useState("");
    const titleChecker = 75;

    const getTimeAgo = (creationDate) => {
        const now = new Date();
        const createdAt = new Date(creationDate);
        const diffInSeconds = Math.floor((now - createdAt) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays} days ago`;
        const diffInWeeks = Math.floor(diffInDays / 7);
        if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) return `${diffInMonths} months ago`;
        return `${Math.floor(diffInMonths / 12)} years ago`;
    };

    const buttonItems = [
        {
            content: <><FontAwesomeIcon icon={faShare} /> Share Event</>,
            onClick: () => onShare(post.event_id),
            isDisabled: post.has_shared_event,
        },
        {
            content: <><FontAwesomeIcon icon={faPlus} /> Subscribe</>,
            onClick: () => onAddEvent(post.event_id),
            isDisabled: post.event_status === 'opted_in',
        },
        {
            content: <><FontAwesomeIcon icon={faTrashCan} /> Unsubscribe</>,
            onClick: () => onRemoveEvent(post.event_id),
            isDisabled: post.event_status !== 'opted_in',
        },
        {
            content: <><FontAwesomeIcon icon={faBan} /> Block User</>,
            onClick: () => onBlock(),
            isDisabled: user.id === post.created_by,
        },
    ];

    const handleToggleMenu = () => setShowMenu(!showMenu);

    useEffect(() => {
        setTimeAgo(getTimeAgo(post.creation_date));
        
        const fetchCreatorMemory = async () => {
            try {
                const response = await axiosInstance.get(`/events/${post.event_id}/memories`);
                const creatorMemoryPost = response.data.find(memory => memory.user_id === post.created_by);

                if (creatorMemoryPost) {
                    setCreatorMemory(creatorMemoryPost.content);
                }

                setIsBlurred(!post.has_shared_memory);
            } catch (err) {
                console.error("Error fetching event creator's memory:", err.response?.data || err.message);
            }
        };

        fetchCreatorMemory();
    }, [axiosInstance, post]);

    return (
        <div className='feed-post-wrapper'>
            <div className={`feed-post ${colorClass}`}
                onMouseLeave={() => setShowMenu(false)}
                onClick={handleClick}
            >
                <div className='post-notif'><NotificationBadge count={post.seen === 1 ? '' : 'new'} /></div>
                {isModMode && (user.role === 'moderator' || user.role === 'admin') &&
                    <ModOptionsButton />
                }
                <div className="feed-post-header">
                    <img src={post.profile_picture || '/default-avatar.jpg'} alt="Profile" className="profile-picture" />
                    <div className='user-info'>
                    <Link to={`/profile/${post.created_by}`} className={`feed-post-username`}>
                        {post.username}
                    </Link>
                    <span className='time-ago'>{timeAgo}</span>
                    </div>
                    
                    {post.event_status === 'opted_in' && post.created_by !== user.id ? (
                        <span className="opted-in-icon" title="You have opted in to this event">
                            <FontAwesomeIcon icon={faCheckCircle} />
                        </span>
                    ) : post.created_by === user.id ? (
                        <span className='opted-in-icon' title="This is your event"><FontAwesomeIcon icon={faCrown} /></span>
                    ) : ''}

                    <EllipsisMenu
                        colorClass={colorClass}
                        buttonItems={buttonItems}
                        onToggle={handleToggleMenu}
                        isOpen={showMenu}
                    />

                </div>

                {creatorMemory ? (
                    <div className={`feed-post-content`}>
                        <h3 className={`${post.title.length > titleChecker ? 'long-title' : ''}`}>{post.title}</h3>
                        <p className={` ${isBlurred ? 'blurred-memory' : ''}`}>{creatorMemory}</p>
                    </div>
                ) : (
                    <p className="feed-post-content no-memory">Event creator hasn't shared a memory yet.</p>
                )}

                <div className='feed-post-stats'>
                    <span className='stats-counter'>
                        <FontAwesomeIcon icon={faBook} /> {post.memories_count}
                    </span>
                    <span className='stats-counter'>
                        <FontAwesomeIcon
                            className={post.has_shared_event ? 'shared' : ''}
                            icon={faShare} /> {post.shares_count}
                    </span>
                    <LikeButton
                        isLiked={post.has_liked}
                        likeCount={post.likes_count}
                        onLike={() => onLike(post.event_id)}
                    />
                    <span className="feed-post-timestamp">
                        {new Date(post.creation_date).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        })}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default FeedPost;
