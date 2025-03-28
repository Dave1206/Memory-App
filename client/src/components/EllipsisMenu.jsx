import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faChevronRight, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import '../styles/EllipsisMenu.css';

function EllipsisMenu({ isOpen, buttonItems, onToggle, toggleClass = '', menuClass = '', colorClass }) {
    const [activeSubmenuIndex, setActiveSubmenuIndex] = useState(null);
    const [submenuDirection, setSubmenuDirection] = useState('right');
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const toggleRef = useRef(null);

    const handleItemMouseEnter = (index, event) => {
        if (buttonItems[index].submenu && buttonItems[index].submenu.length > 0) {
            const rect = event.currentTarget.getBoundingClientRect();
            const estimatedSubmenuWidth = 200;
            if (rect.right + estimatedSubmenuWidth > window.innerWidth) {
                setSubmenuDirection('left');
            } else {
                setSubmenuDirection('right');
            }
            setActiveSubmenuIndex(index);
        }
    };

    const handleItemMouseLeave = (index) => {
        if (activeSubmenuIndex === index) {
            setActiveSubmenuIndex(null);
        }
    };

    const handleItemClick = (event, button, index) => {
        event.stopPropagation();
        if (!button.submenu || button.submenu.length === 0) {
            button.onClick();
            onToggle();
        }
    };

    const handleToggle = (event) => {
        event.stopPropagation();
        onToggle();
    };

    useEffect(() => {
        if (isOpen && toggleRef.current) {
            const rect = toggleRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.top + rect.height + window.scrollY,
                left: rect.left + window.scrollX - 125
            });
        }
    }, [isOpen]);

    const menuContent = (<div className={`ellipsis-menu ${menuClass}`} style={{ top: menuPosition.top, left: menuPosition.left }}>
        {buttonItems.map((button, index) => (
            <div
                key={index}
                className="ellipsis-menu-item"
                onMouseEnter={(e) => handleItemMouseEnter(index, e)}
                onMouseLeave={() => handleItemMouseLeave(index)}
            >
                <button
                    className="ellipsis-menu-button"
                    onClick={(event) => handleItemClick(event, button, index)}
                    disabled={button.isDisabled}
                >
                    {button.submenu && button.submenu.length > 0 && submenuDirection === 'left' && (
                        <span className="submenu-arrow">
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </span>
                    )}
                    {button.content}
                    {button.submenu && button.submenu.length > 0 && submenuDirection === 'right' && (
                        <span className="submenu-arrow">
                            <FontAwesomeIcon icon={faChevronRight} />
                        </span>
                    )}
                </button>
                {button.submenu && activeSubmenuIndex === index && (
                    <div className={`ellipsis-submenu ${submenuDirection === 'left' ? 'open-left' : 'open-right'}`}>
                        <div className='ellipsis-submenu-item'>
                            {button.submenuTitle && (
                                <div className="ellipsis-submenu-title">{button.submenuTitle}</div>
                            )}
                            {button.submenu.map((subItem, subIndex) => (
                                <button
                                    key={subIndex}
                                    className="ellipsis-submenu-button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        subItem.onClick();
                                        onToggle();
                                    }}
                                    disabled={subItem.isDisabled}
                                >
                                    {subItem.content}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        ))}
    </div>)

    return (
        <div className={`ellipsis-menu-container ${toggleClass}`}>
            <button
                ref={toggleRef}
                className={`ellipsis-menu-toggle ${colorClass}`}
                onClick={handleToggle}
            >
                <FontAwesomeIcon icon={faEllipsisV} />
            </button>
            {isOpen && ReactDOM.createPortal(menuContent, document.body)}
        </div>
    );
}

export default EllipsisMenu;
