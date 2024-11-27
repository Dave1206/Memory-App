import React, { useState } from 'react';
import { useAuth } from './auth/AuthContext';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShare, faBook, faPlus, faTrashCan, faBan } from '@fortawesome/free-solid-svg-icons';
import LikeButton from './LikeButton';
import EllipsisMenu from './EllipsisMenu';
import NotificationBadge from './NotificationBadge';
import '../styles/ExplorePost.css';

function ExplorePost({ post, onLike, onShare, onAddEvent, onRemoveEvent, onBlock, colorClass }) {
    const [showMenu, setShowMenu] = useState(false);
    const { user } = useAuth();

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
            isDisabled: false,
        },
    ];

    const handleToggleMenu = () => setShowMenu(!showMenu);

    return (
        <div className={`explore-post ${colorClass}`}
            onMouseLeave={() => setShowMenu(false)}>
            <div className="explore-post-header">
                <img src={post.profile_picture || '/default-avatar.jpg'} alt="Profile" className="profile-picture" />
                <div className="explore-post-header-details">
                    <Link to={`/profile/${post.created_by}`} className={`explore-post-username ${colorClass}`}>
                        {post.username}
                    </Link>
                    <h3 className={`${colorClass}`}>{post.title}</h3>
                </div>

                {post.created_by !== user.id && (
                    <EllipsisMenu
                        colorClass={colorClass}
                        buttonItems={buttonItems}
                        onToggle={handleToggleMenu}
                        isOpen={showMenu}
                    />
                )}
            </div>

            <div className="explore-post-content">
                <p className={`${colorClass}`}>{post.description}</p>
            </div>

            <div className="explore-post-stats">
                <span className="explore-post-timestamp">
                    {new Date(post.creation_date).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                    })}
                </span>
                <span className="stats-counter">
                    <FontAwesomeIcon icon={faBook} /> {post.memories_count}
                </span>
                <span className="stats-counter">
                    <FontAwesomeIcon icon={faShare} className={post.has_shared_event ? 'shared' : ''} /> {post.shares_count}
                </span>
                <LikeButton
                    isLiked={post.has_liked}
                    likeCount={post.likes_count}
                    onLike={() => onLike(post.event_id)}
                />
                <NotificationBadge count={post.seen > 1 ? '' : 'new'} />
            </div>
        </div>
    );
}

export default ExplorePost;
