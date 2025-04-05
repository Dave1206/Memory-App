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
    const [enlargedImage, setEnlargedImage] = useState(null);
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

    const buttonItems = [];

if (!post.has_shared_event) {
  buttonItems.push({
    content: (
      <>
        <FontAwesomeIcon icon={faShare} /> Share Event
      </>
    ),
    onClick: () => onShare(post.event_id)
  });
}

if (post.event_status !== 'opted_in') {
  buttonItems.push({
    content: (
      <>
        <FontAwesomeIcon icon={faPlus} /> Subscribe
      </>
    ),
    onClick: () => onAddEvent(post.event_id)
  });
} else {
  buttonItems.push({
    content: (
      <>
        <FontAwesomeIcon icon={faTrashCan} /> Unsubscribe
      </>
    ),
    onClick: () => onRemoveEvent(post.event_id)
  });
}

if (user.id !== post.created_by) {
  buttonItems.push({
          content: <><FontAwesomeIcon icon={faBan} /> Block User</>,
          submenuTitle: "Are you sure?",
          submenu: [
            {
              content: "Yes, Block User",
              onClick: onBlock,
              isDisabled: false
            }
          ],
          isDisabled: false
        });
}


    const handleToggleMenu = () => setShowMenu(!showMenu);

    useEffect(() => {
        setTimeAgo(getTimeAgo(post.creation_date));

        const fetchCreatorMemory = async () => {
            try {
                const response = await axiosInstance.get(`/events/${post.event_id}/memories?markChecked=false`);
                const creatorMemoryPost = response.data.find(memory => memory.user_id === post.created_by);

                if (creatorMemoryPost) {
                    setCreatorMemory(creatorMemoryPost);
                }

                setIsBlurred(!post.has_shared_memory);
            } catch (err) {
                console.error("Error fetching event creator's memory:", err.response?.data || err.message);
            }
        };

        fetchCreatorMemory();
    }, [axiosInstance, post, post.has_shared_memory, post.memories_count]);

    const handlePostClick = (e) => {
        if (
            e.target.tagName === "VIDEO" ||
            e.target.tagName === "IMG" ||
            e.target.closest(".media-preview")
        ) {
            return;
        }
        handleClick();
    };

    const handleImageClick = (e, url) => {
        e.stopPropagation();
        setEnlargedImage(url);
    };

    const handleCloseImage = () => setEnlargedImage(null);

    const scrambleText = (text) => {
        return text
          .split(" ")
          .map(word => {
            return word
              .split("")
              .sort(() => 0.5 - Math.random())
              .join("");
          })
          .join(" ");
      };      

    return (
        <div className='feed-post-wrapper'>
            <div className={`feed-post ${colorClass}`}
                onMouseLeave={() => setShowMenu(false)}
                onClick={handlePostClick}
            >
                {post.is_new_post && <div className='post-notif'><NotificationBadge count='new' /></div>}
                {!post.is_new_post && post.new_memories_count > 0 && <div className='post-notif'><NotificationBadge count={post.new_memories_count} /></div>}
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
                        <div className={`creator-memory ${isBlurred ? 'blurred-memory' : ''}`}>
                            <div className="memory-text">{isBlurred ? scrambleText(creatorMemory.content) : creatorMemory.content}</div>
                            {creatorMemory.media_urls && creatorMemory.media_urls.length > 0 ? (
                                <div className="memory-media-collage">
                                    {creatorMemory.media_urls.map((url, i) => {
                                        const isVideo = url.toLowerCase().endsWith('.mp4') || url.includes('video');
                                        return (
                                            <div key={i} className={`collage-item ${isVideo ? 'collage-item-video' : ''}`}>
                                                {isVideo ? (
                                                    <video
                                                        src={url}
                                                        controls
                                                        className="collage-media"
                                                    />
                                                ) : (
                                                    <img
                                                        src={url}
                                                        alt="Memory media"
                                                        className={isBlurred ? "blurred collage-media" : "collage-media"}
                                                        onClick={(e) => !isBlurred && handleImageClick(e, url)}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : creatorMemory.media_token && (
                                <div className="pending-media-placeholder">
                                    <p>Media awaiting moderator approval...</p>
                                </div>
                            )}
                        </div>
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
            {enlargedImage && (
                <div className="lightbox" onClick={handleCloseImage}>
                    <img src={enlargedImage} alt="enlarged" />
                </div>
            )}
        </div>
    );
}

export default FeedPost;
