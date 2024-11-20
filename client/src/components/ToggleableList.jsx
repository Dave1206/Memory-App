import React, { useState } from 'react';
import { useAuth } from './auth/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisH, faChevronUp, faGavel } from '@fortawesome/free-solid-svg-icons';
import EventCreator from './events/EventCreator';
import { Link } from 'react-router-dom';
import ToggleModMode from './moderation/ToggleModMode';
import '../styles/ToggleableList.css';

function ToggleableList({ getEvents, user, onLogout }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { isModMode } = useAuth();

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className={`toggleable-list ${isExpanded ? 'expanded' : 'compact'}`}>
            <button className="toggleable-toggle-button" onClick={toggleExpand}>
                <FontAwesomeIcon icon={isExpanded ? faChevronUp : faEllipsisH} />
            </button>

            {isExpanded ? (
                <Link to={`/profile/${user.id}`}>
                    <img src={user.profile_picture} alt={`${user.username}'s profile}`}
                         className="toggleable-profile-picture" />
                    {user.username}
                </Link>
            ) : (    
                <img src={user.profile_picture} alt={`${user.username}'s profile}`} className="toggleable-profile-picture" />
            )}

            {isExpanded && (
                <div className="toggleable-list-content">
                    {(user.role === "moderator" || user.role === "admin") && (
                        <>
                            <ToggleModMode />
                            {isModMode && (
                                <Link to={'/moderator-tools'}>
                                    <button className="toggleable-button mod-button">
                                        Mod tools <FontAwesomeIcon icon={faGavel} />
                                    </button>
                                </Link>
                            )}
                        </>
                    )}
                    <EventCreator getEvents={getEvents} userId={user.id} />
                    <button className="toggleable-button logout-button" onClick={onLogout}>
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}

export default ToggleableList;