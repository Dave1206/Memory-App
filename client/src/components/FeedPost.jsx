import React, { useState } from 'react';
import { useAuth } from './auth/AuthContext';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faCheckCircle, faShare, faPlus, faBan, faTrashCan, faBook } from '@fortawesome/free-solid-svg-icons';
import NotificationBadge from './NotificationBadge';
import ModOptionsButton from './moderation/ModOptionsButton';
import EllipsisMenu from './EllipsisMenu';
import LikeButton from './LikeButton';
import '../styles/FeedPost.css';

function FeedPost({ post, onLike, onShare, onAddEvent, onRemoveEvent, onBlock, colorClass }) {
    const [showMenu, setShowMenu] = useState(false);
    const { user, isModMode } = useAuth();

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
        <div className={`feed-post ${colorClass}`} 
            onMouseLeave={() => setShowMenu(false)}
            >
            {isModMode && (user.role === 'moderator' || user.role === 'admin') &&
            <ModOptionsButton />
            }
            <div className="feed-post-header">
                <img src={post.profile_picture || '/default-avatar.jpg'} alt="Profile" className="profile-picture" />
                <Link to={`/profile/${post.created_by}`} className={`feed-post-username ${colorClass}`}>
                    {post.username}
                </Link>
                <h3 className={`${colorClass}`}>{post.title}</h3>
                {post.event_status === 'opted_in' && post.created_by !== user.id ? (
                    <span className="opted-in-icon" title="You have opted in to this event">
                        <FontAwesomeIcon icon={faCheckCircle} />
                    </span>
                ) : post.created_by === user.id ? (
                    <span className='opted-in-icon' title="This is your event"><FontAwesomeIcon icon={faCrown} /></span>
                ) : ''}
                
                {post.created_by !== user.id &&
                <EllipsisMenu 
                    colorClass={colorClass}
                    buttonItems={buttonItems} 
                    onToggle={handleToggleMenu}
                    isOpen={showMenu}    
                />
                }
                
            </div>

            <div className="feed-post-content"
                 style={{ transform: `translateY(-3px)` }}>
                <p className={`${colorClass}`}>{post.description}</p>
            </div>

            <div className='feed-post-stats'>
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
                <NotificationBadge count={post.seen === 1 ? '' : 'new'} /> 
            </div>
        </div>
    );
}

export default FeedPost;
