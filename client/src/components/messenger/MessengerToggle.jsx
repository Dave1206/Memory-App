import React, { useState, useEffect } from 'react';
import ReactDOM from "react-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage } from '@fortawesome/free-solid-svg-icons';
import NotificationBadge from '../NotificationBadge';
import Messenger from './Messenger';
import { v4 as uuidv4} from 'uuid';
import '../../styles/MessengerToggle.css';

function MessengerToggle({ notifications, isMobile, variant }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = (e) => {
        e.stopPropagation();
        setIsExpanded((prev) => !prev);
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            setIsExpanded(false);
        }
    };

    useEffect(() => {
        if (!isExpanded) return;

        const closeMessengerOnNavClick = (e) => {
            const isNavbarClick = e.target.closest('.nav-item') || e.target.closest('.nav-toggle');
            if (isNavbarClick) {
                setIsExpanded(false);
            }
        };

        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.addEventListener('click', closeMessengerOnNavClick);
        }

        return () => {
            if (navbar) {
                navbar.removeEventListener('click', closeMessengerOnNavClick);
            }
        };
    }, [isExpanded]);

    return (
        <>
        <div className={`nav-toggle`} onClick={toggleExpand}>
                <div className={variant === 'navbar' ? 'nav-item-icon' : 'toggleable-button'}><FontAwesomeIcon icon={faMessage} /></div>
                {!isMobile && <div className='nav-item-name'>Messages</div> }
                {notifications &&<div className="nav-item-notif"><NotificationBadge key={`nb-${uuidv4()}`} count={notifications} /> </div>}
        </div>
                    
        {isExpanded && ReactDOM.createPortal(
            <div className="messenger-overlay" onClick={handleBackdropClick}>
                <Messenger key={uuidv4()} isOpen={isExpanded} />
            </div>, document.getElementById("modal-root")
        )}
        </>
    );
}

export default MessengerToggle;
