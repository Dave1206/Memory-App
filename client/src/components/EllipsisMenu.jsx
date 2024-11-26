// EllipsisMenu.js
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import '../styles/EllipsisMenu.css';

function EllipsisMenu({ isOpen, buttonItems, onToggle, toggleClass = '', menuClass = '', colorClass }) {
    const handleToggle = (event) => {
        event.stopPropagation();
        onToggle();
    };
    
    return (
        <div className={`ellipsis-menu-container ${toggleClass}`}>
            <button className={`ellipsis-menu-toggle ${colorClass}`} onClick={handleToggle}>
                <FontAwesomeIcon icon={faEllipsisV} />
            </button>
            {isOpen && (
                <div className={`ellipsis-menu ${menuClass}`}>
                    {buttonItems.map((button, index) => (
                        <button
                            key={index}
                            className="ellipsis-menu-button"
                            onClick={(event) => {
                                event.stopPropagation();
                                button.onClick();
                                onToggle();
                            }}
                            disabled={button.isDisabled}
                        >
                            {button.content}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default EllipsisMenu;
