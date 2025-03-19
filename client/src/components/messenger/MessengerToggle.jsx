import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage } from '@fortawesome/free-solid-svg-icons';
import NotificationBadge from '../NotificationBadge';
import { useMessenger } from './MessengerContext';
import { v4 as uuidv4} from 'uuid';
import '../../styles/MessengerToggle.css';

function MessengerToggle({ notifications, isMobile, variant }) {
    const { toggleMessenger } = useMessenger();

    const toggleExpand = (e) => {
        e.stopPropagation();
        toggleMessenger();
    };

    return (
        <div className={`nav-toggle`} onClick={toggleExpand}>
                <div className={variant === 'navbar' ? 'nav-item-icon' : 'toggleable-button'}><FontAwesomeIcon icon={faMessage} /></div>
                {!isMobile && <div className='nav-item-name'>Messages</div> }
                {notifications > 0 && <div className="nav-item-notif"><NotificationBadge key={`nb-${uuidv4()}`} count={notifications} /> </div>}
        </div>
    );
}

export default MessengerToggle;
