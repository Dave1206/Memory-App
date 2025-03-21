import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisH, faChevronUp, faRightFromBracket, faBell, faUserFriends, faCog } from '@fortawesome/free-solid-svg-icons';
import MessengerToggle from './messenger/MessengerToggle';
import FriendList from './friends/FriendList';
import FriendRequest from './friends/FriendRequest';
import Notifications from './Notifications';
import NotificationBadge from './NotificationBadge';
import LandingToggle from './LandingToggle';
import { useAuth } from './auth/AuthContext';
import { useAxios } from './auth/AxiosProvider';
import WebSocketInstance from '../utils/WebSocket';
import '../styles/ToggleableList.css';

function ToggleableList() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeRoute, setActiveRoute] = useState(0);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [notifications, setNotifications] = useState(null);
    const { axiosInstance } = useAxios();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const toggleExpand = (e) => {
        e.stopPropagation();
        setIsExpanded((prev) => !prev);
    };

    const handleRouteClick = (index, path) => {
        setActiveRoute(index);
        setActiveDropdown(null);
        navigate(path);
    };

    const handleDropdownClick = (e, dropdown) => {
        e.stopPropagation();
        setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
    };

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await axiosInstance.get(`/notifications/${user.id}`);
            setNotifications(response.data);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    }, [axiosInstance, user.id]);

    useEffect(() => {
        if (!user.id) return;

        WebSocketInstance.off("new_notification");
        WebSocketInstance.on("new_notification", (notification) => {
            console.log("New notification received in Mobile Menu:", notification);
            
            let friendUserId = null;

        if (notification.type === "user_online" || notification.type === "user_offline") {
            const matchedUserId = notification.message.match(/User (\d+) is (online|offline)/);
            friendUserId = matchedUserId ? parseInt(matchedUserId[1], 10) : null;

            if (!friendUserId) {
                console.warn("⚠️ Could not extract user ID from message:", notification.message);
                return;
            }
        }

            setNotifications((prev) => {
                let updatedNotifications = { ...prev };

                switch (notification.type) {
                    case "post":
                        updatedNotifications.unseenPosts = Number(prev.unseenPosts || 0) + 1;
                        break;
                    case "message":
                        updatedNotifications.unreadMessages = Number(prev.unreadMessages || 0) + 1;
                        break;
                    case "user_online":
                        if (!updatedNotifications.onlineFriends.includes(friendUserId)) {
                            updatedNotifications.onlineFriends.push(friendUserId);
                        }
                        break;
                    case "user_offline":
                        updatedNotifications.onlineFriends = updatedNotifications.onlineFriends.filter(id => id !== friendUserId);
                        break;
                    case "invite":
                    case "reaction":
                        updatedNotifications.notifications = Number(prev.notifications || 0) + 1;
                        break;
                    default:
                        updatedNotifications.notifications = Number(prev.notifications || 0) + 1;
                        break;
                }
                return updatedNotifications;
            });
        });

        fetchNotifications();

        return () => {
            WebSocketInstance.off("new_notification");
        };
    }, [user.id, fetchNotifications]);

    useEffect(() => {
        if (!isExpanded) return;

        const closeListOnNavClick = (e) => {
            const isNavbarClick = e.target.closest('.nav-toggle') || e.target.closest('.nav-item');
            const isDropdownClick = e.target.closest('.nav-dropdown');

            if (isNavbarClick && !isDropdownClick) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('click', closeListOnNavClick);

        return () => {
            document.removeEventListener('click', closeListOnNavClick);
        };
    }, [isExpanded]);

    return (
        <>
            <button className="toggleable-toggle-button" onClick={toggleExpand}>
                <FontAwesomeIcon icon={isExpanded ? faChevronUp : faEllipsisH} />
            </button>
            <div className={`toggleable-list ${isExpanded ? 'expanded' : 'compact'}`}>


                {isExpanded && (
                    <>
                        <LandingToggle />
                        <Link to={`/profile/${user.id}`} className="profile-link" onClick={toggleExpand}>
                            <img src={user.profile_picture} alt={`${user.username}`} className="toggleable-profile-picture" />
                            <p>{user.username}</p>
                        </Link>

                        <div className='toggleable-list-content'>
                            <div className={`nav-item ${activeDropdown === "notifications" ? "active" : ""}`} onClick={(e) => handleDropdownClick(e, "notifications")}>
                                <div className='toggleable-button'><FontAwesomeIcon icon={faBell} /> </div>
                                <div className='nav-item-name'>Notifications</div>
                                {notifications?.notifications > 0 && (
                                    <div className='nav-item-notif'><NotificationBadge count={notifications.notifications} /> </div>
                                )}
                            </div>

                            <MessengerToggle key={`mt-mobile`} notifications={notifications?.unreadMessages} />

                            <div className={`nav-item ${activeDropdown === "friends" ? "active" : ""}`} onClick={(e) => handleDropdownClick(e, "friends")}>
                                <div className='toggleable-button'><FontAwesomeIcon icon={faUserFriends} /> </div>
                                <div className='nav-item-name'>Friends</div>
                                {notifications?.onlineFriends?.length > 0 && (
                                    <div className='nav-item-notif'><NotificationBadge count={notifications.onlineFriends.length} /></div>
                                )}
                            </div>

                            <div className={`nav-item ${activeRoute === `/settings/${user.id}` ? 'active' : ''}`} onClick={() => handleRouteClick(0, `/settings/${user.id}`)}>
                                <div className='toggleable-button'><FontAwesomeIcon icon={faCog} /></div>
                                <div className='nav-item-name'>Settings</div>
                            </div>
                            <div className="nav-item" onClick={logout}>
                                <div className='toggleable-button'><FontAwesomeIcon icon={faRightFromBracket} /> </div>
                                <div className='nav-item-name'>Logout</div>
                            </div>
                        </div>

                        {activeDropdown === "friends" && (
                            <div className="menu-dropdown">
                                <div className='close-dropdown' onClick={() => setActiveDropdown(null)}>X</div>
                                <FriendRequest userId={user.id} />
                                <FriendList userId={user.id} />
                            </div>
                        )}

                        {activeDropdown === "notifications" && (
                            <div className="menu-dropdown">
                                <div className='close-dropdown' onClick={() => setActiveDropdown(null)}>X</div>
                                <Notifications notifications={notifications} setNotifications={setNotifications} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

export default ToggleableList;
