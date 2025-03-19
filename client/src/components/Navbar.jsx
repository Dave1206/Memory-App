import React, { useState, useEffect, useCallback } from "react";
import FriendList from "./friends/FriendList";
import FriendRequest from "./friends/FriendRequest";
import PendingRequests from "./friends/PendingRequests";
import EventInvites from "./events/EventInvites";
import NotificationBadge from "./NotificationBadge";
import MessengerToggle from "./messenger/MessengerToggle";
import EventCreator from "./events/EventCreator";
import { v4 as uuidv4 } from 'uuid';
import { useAxios } from './auth/AxiosProvider';
import { useAuth } from "./auth/AuthContext";
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper, faUsers, faBell, faRightFromBracket, faCog, faGavel } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import useMediaQuery from "../hooks/useMediaQuery";
import WebSocketInstance from '../utils/WebSocket';
import "../styles/Navbar.css";

function Navbar({ onEventUpdate, events }) {
    const { axiosInstance } = useAxios();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isMobile = useMediaQuery("(max-width: 768px)");

    const [activeRoute, setActiveRoute] = useState(0);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [navItems, setNavItems] = useState({
        feed: { name: "Feed", icon: faNewspaper, notifications: 0 },
        messages: { name: "Messages", icon: faNewspaper, notifications: 0 },
        friends: { name: "Friends", icon: faUsers, notifications: 0 },
        notifications: { name: "Notifications", icon: faBell, notifications: 0 }
    });

    const userId = user.id;

    const fetchNotifications = useCallback(async () => {
        try {
                const response = await axiosInstance.get(`/notifications/${userId}`);
                const notifications = response.data;

                setNavItems(prev => {
                    if (
                        prev.feed.notifications === notifications.unseenPosts.length &&
                        prev.messages.notifications === notifications.unreadMessages &&
                        prev.friends.notifications === notifications.onlineFriends.length &&
                        prev.notifications.notifications ===
                        Number(notifications.friendRequests.length) +
                        Number(notifications.eventInvites.length) +
                        Number(notifications.newMemories) +
                        Number(notifications.likes) +
                        Number(notifications.shares)
                    ) {
                        return prev;
                    }

                    return {
                        ...prev,
                        feed: { ...prev.feed, notifications: notifications.unseenPosts.length },
                        messages: { ...prev.messages, notifications: notifications.unreadMessages },
                        friends: { ...prev.friends, notifications: notifications.onlineFriends.length },
                        notifications: {
                            ...prev.notifications,
                            notifications:
                                Number(notifications.friendRequests.length) +
                                Number(notifications.eventInvites.length) +
                                Number(notifications.newMemories) +
                                Number(notifications.likes) +
                                Number(notifications.shares)
                        }
                    };
                });

        } catch (error) {
            console.error("❌ Error fetching notifications:", error);
        }
    }, [axiosInstance, userId]);

    useEffect(() => {
        if (!userId) return;

        WebSocketInstance.connect(userId, "navbar");

        WebSocketInstance.off("new_notification");
        WebSocketInstance.on("new_notification", (notification) => {
            console.log("New notification received:", notification);

            setNavItems(prev => {
                const newNavItems = { ...prev };
                let shouldUpdate = false;

                switch (notification.type) {
                    case "post":
                        newNavItems.feed.notifications = Number(newNavItems.feed.notifications || 0) + 1;
                        shouldUpdate = true;
                        break;
                    case "message":
                        newNavItems.messages.notifications = Number(newNavItems.messages.notifications || 0) + 1;
                        shouldUpdate = true;
                        break;
                    case "message_seen":
                        newNavItems.messages.notifications = Number(Math.max(0, newNavItems.messages.notifications - notification.read_messages));
                        shouldUpdate = true;
                        break;
                    case "user_online":
                        newNavItems.friends.notifications = Number(newNavItems.friends.notifications || 0) + 1;
                        shouldUpdate = true;
                        break;
                    case "user_offline":
                        newNavItems.friends.notifications = Math.max(0, Number(newNavItems.friends.notifications || 1) - 1);
                        shouldUpdate = true;
                        break;
                    case "friend_request":
                        newNavItems.notifications.notifications = Number(newNavItems.notifications.notifications || 0) + 1;
                        shouldUpdate = true;
                        break
                    case "invite":
                        newNavItems.notifications.notifications = Number(newNavItems.notifications.notifications || 0) + 1;
                        shouldUpdate = true;
                        break;
                    case "reaction":
                        newNavItems.notifications.notifications = Number(newNavItems.notifications.notifications || 0) + 1;
                        shouldUpdate = true;
                        break;
                    default:
                        newNavItems.notifications.notifications = Number(newNavItems.notifications.notifications || 0) + 1;
                        shouldUpdate = true;
                        break;
                }

                if (shouldUpdate && prev !== newNavItems) {
                    console.log("📌 Updated notifications:", newNavItems);
                    return newNavItems;
                } else {
                    console.log("⚠️ Skipping redundant state update.");
                    return prev;
                }
            });
        });

        fetchNotifications();

        return () => {
            WebSocketInstance.off("new_notification");
            WebSocketInstance.disconnect("navbar");
        };
    }, [userId, fetchNotifications]);

    const handleRouteClick = (index, path) => {
        setActiveRoute(index);
        setActiveDropdown(null);
        navigate(path);
    };

    const handleDropdownClick = (dropdown) => {
        setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
    };

    return (
        <div className="navbar-wrapper">
            <nav className="navbar">
                {!isMobile && (
                    <>
                        <div className="profile-link">
                            <Link to={`/profile/${userId}`}>
                                <img src={user.profile_picture} alt={`${user.username}'s profile}`} className="toggleable-profile-picture" />
                            </Link>
                            <Link to={`/profile/${userId}`}>
                                <p>{user.username}</p>
                            </Link>
                        </div>
                        <div className="nav-items">
                            <EventCreator key={`ec-navbar`} userId={userId} />

                            <div className={`nav-item ${activeRoute === '/feed' ? 'active' : ''}`} onClick={() => handleRouteClick(0, "/feed")}>
                                <div className="nav-item-icon"><FontAwesomeIcon key={`feed-${uuidv4()}`} icon={navItems.feed.icon} /></div>
                                <div className="nav-item-name">{!isMobile && navItems.feed.name}</div>
                                <div className="nav-item-notif">{navItems.feed.notifications > 0 && <NotificationBadge key={`nb-${uuidv4()}`} count={navItems.feed.notifications} />}</div>
                            </div>
                            <MessengerToggle key={`mt-navbar`} notifications={navItems.messages.notifications} />

                            <div className={`nav-toggle ${activeDropdown === "friends" ? "active" : ""}`} onClick={() => handleDropdownClick("friends")}>
                                <div className="nav-item-icon"><FontAwesomeIcon key={`friends-${uuidv4()}`} icon={navItems.friends.icon} /></div>
                                <div className="nav-item-name">Friends</div>
                                <div className="nav-item-notif">{navItems.friends.notifications > 0 && <NotificationBadge key={`nb-${uuidv4()}`} count={navItems.friends.notifications} />}</div>
                            </div>

                            <div className={`nav-toggle ${activeDropdown === "notifications" ? "active" : ""}`} onClick={() => handleDropdownClick("notifications")}>
                                <div className="nav-item-icon"><FontAwesomeIcon key={`notifications-${uuidv4()}`} icon={navItems.notifications.icon} /> </div>
                                <div className="nav-item-name">Notifications</div>
                                <div className="nav-item-notif">{navItems.notifications.notifications > 0 && <NotificationBadge key={`nb-${uuidv4()}`} count={parseInt(navItems.notifications.notifications, 10)} />}</div>
                            </div>

                            {activeDropdown === "friends" && (
                                <div className="nav-dropdown">
                                    <FriendRequest userId={userId} />
                                    <FriendList userId={userId} />
                                </div>
                            )}

                            {activeDropdown === "notifications" && (
                                <div className="nav-dropdown">
                                    {navItems.notifications.notifications === 0 ? (
                                        <p>No new notifications</p>
                                    ) : (
                                        <>
                                            <PendingRequests userId={userId} />
                                            <EventInvites events={events} onUpdate={onEventUpdate} />
                                        </>
                                    )}
                                </div>
                            )}

                            <div className={`nav-item ${activeRoute === `/settings/${userId}` ? 'active' : ''}`} onClick={() => handleRouteClick(0, `/settings/${userId}`)}>
                                <div className="nav-item-icon"><FontAwesomeIcon key={`settings-${uuidv4()}`} icon={faCog} /></div>
                                <div className="nav-item-name">Settings</div>
                            </div>

                            {user.role === 'admin' && <div className={`nav-item ${activeRoute === '/moderator-tools' ? 'active' : ''}`} onClick={() => handleRouteClick(0, "/moderator-tools")}>
                                <div className="nav-item-icon"><FontAwesomeIcon key={`moderator-${uuidv4()}`} icon={faGavel} /></div>
                                <div className="nav-item-name">Mod Controls</div>
                            </div>}

                            <div className="nav-toggle" onClick={logout}>
                                <div className="nav-item-icon"><FontAwesomeIcon key={`logout-${uuidv4()}`} icon={faRightFromBracket} /></div>
                                <div className="nav-item-name">Logout</div>
                            </div>
                        </div>

                    </>
                )}

                {isMobile && (
                    <>
                        <div className={`nav-item`} onClick={() => handleRouteClick(0, "/feed")}>
                            <div className="nav-item-icon"><FontAwesomeIcon icon={navItems.feed.icon} /></div>
                        </div>
                        <EventCreator key={"ec-navbar-mobile"} userId={userId} isMobile={isMobile} />
                        <MessengerToggle key={"mt-navbar-mobile"} isMobile={isMobile} variant={'navbar'} />
                    </>
                )}

            </nav>
        </div>
    );
}

export default Navbar;
