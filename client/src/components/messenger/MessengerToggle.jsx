import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import ConversationList from './ConversationList';
import '../../styles/MessengerToggle.css';

function MessengerToggle() {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className={`messenger-toggle ${isExpanded ? 'expanded' : 'compact'}`}>
            <button className="messenger-toggle-button" onClick={toggleExpand}>
                <FontAwesomeIcon icon={isExpanded ? faChevronDown : faMessage} />
            </button>

            {isExpanded && (
                <div className="messenger-overlay">
                    <button className="close-overlay-btn" onClick={toggleExpand}>
                        Close
                    </button>
                    <ConversationList onSelectConversation={(id) => console.log(`Open chat ${id}`)} />
                </div>
            )}
        </div>
    );
}

export default MessengerToggle;
