// LikeButton.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import '../styles/LikeButton.css';

function LikeButton({ isLiked, likeCount, onLike }) {
    const [clickAnimation, setClickAnimation] = useState(false);
    const [liked, setLiked] = useState(isLiked);

    const handleLikeClick = () => {
        if (!liked) {
            setClickAnimation(true);
        }
        setLiked(!liked);
        onLike();
    };

    const handleAnimationEnd = () => {
        setClickAnimation(false);
    };

    return (
        <span 
            className='stat-counter'
            onClick={handleLikeClick}
            onAnimationEnd={handleAnimationEnd}
        >
            <FontAwesomeIcon 
                className={`like-button ${liked ? 'liked' : ''} ${clickAnimation ? 'clicked' : ''}`}
                icon={faHeart} />
            {likeCount}
        </span>
    );
}

export default LikeButton;
