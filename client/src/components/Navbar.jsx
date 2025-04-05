import React, { useState, useEffect, useCallback, useRef } from "react";
import FriendList from "./friends/FriendList";
import FriendRequest from "./friends/FriendRequest";
import Notifications from "./Notifications";
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

function Navbar({ registerClearFeed }) {
    const { axiosInstance } = useAxios();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isMobile = useMediaQuery("(max-width: 768px)");

    const [activeRoute, setActiveRoute] = useState(0);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [notifications, setNotifications] = useState({});
    const dropdownRef = useRef(null);

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
                const data = response.data;
                setNotifications(response.data);

                setNavItems(prev => {
                    if (
                        prev.feed.notifications === data.unseenPosts &&
                        prev.messages.notifications === data.unreadMessages &&
                        prev.friends.notifications === data.onlineFriends.length &&
                        prev.notifications.notifications ===
                        Number(data.friendRequests.length) +
                        Number(data.eventInvites.length) +
                        Number(data.newMemories) +
                        Number(data.likes) +
                        Number(data.shares)
                    ) {
                        return prev;
                    }

                    return {
                        ...prev,
                        feed: { ...prev.feed, notifications: data.unseenPosts },
                        messages: { ...prev.messages, notifications: data.unreadMessages },
                        friends: { ...prev.friends, notifications: data.onlineFriends.length },
                        notifications: {
                            ...prev.notifications,
                            notifications:
                                Number(data.friendRequests.length) +
                                Number(data.eventInvites.length) +
                                Number(data.newMemories) +
                                Number(data.likes) +
                                Number(data.shares)
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

            setNotifications(prev => {
                const updated = { ...prev };
        
                switch (notification.type) {
                    case "new_post":
                        updated.generalNotifications = [
                            notification,
                            ...(prev.generalNotifications || [])
                        ];
                        updated.unseenPosts = Number(prev.unseenPosts) + 1;
                        break;
                    case "message":
                        const alreadyExists = (prev.generalNotifications || []).some(
                            (note) =>
                                note.message?.toLowerCase().includes("message") &&
                                note.sender_username === notification.sender_username
                        );

                        if (!alreadyExists) {
                            updated.generalNotifications = [
                                notification,
                                ...(prev.generalNotifications || [])
                            ];
                        }
                        updated.unreadMessages = Number(prev.unreadMessages) + 1;
                        break;
                    case "message_seen":
                        updated.unreadMessages = Math.max(0, Number(prev.unreadMessages) - notification.read_messages);
                        updated.generalNotifications = (prev.generalNotifications || []).filter(
                            note => !(note.message && note.message.toLowerCase().includes("message"))
                        );
                        break;
                    case "reaction":
                        updated.generalNotifications = [
                            notification,
                            ...(prev.generalNotifications || [])
                        ];
                        break;
                    case "friend_request":
                        updated.friendRequests = [
                            ...(prev.friendRequests || []),
                            {
                                id: notification.sender_id,
                                username: notification.sender_username
                            }
                        ];
                        break;
                    case "event_invite":
                        updated.eventInvites = [
                            ...(prev.eventInvites || []),
                            {
                                event_id: notification.event_id,
                                title: notification.event_title,
                                inviter_username: notification.sender_username
                            }
                        ];
                        break;
                    default:
                        break;
                }
        
                return updated;
            });
        });

        fetchNotifications();

        return () => {
            WebSocketInstance.off("new_notification");
            WebSocketInstance.disconnect("navbar");
        };
    }, [userId, fetchNotifications]);

    useEffect(() => {
        if (!notifications) return;
      
        setNavItems(prev => ({
          ...prev,
          feed: {
            ...prev.feed,
            notifications: notifications.unseenPosts || 0,
          },
          messages: {
            ...prev.messages,
            notifications: notifications.unreadMessages || 0,
          },
          friends: {
            ...prev.friends,
            notifications: notifications.onlineFriends?.length || 0,
          },
          notifications: {
            ...prev.notifications,
            notifications:
              (notifications.friendRequests?.length || 0) +
              (notifications.eventInvites?.length || 0) +
              (notifications.generalNotifications?.filter(note => !note.read).length || 0),
          }
        }));
      }, [notifications]);      

    useEffect(() => {
        if (registerClearFeed) {
          registerClearFeed(() => {
            setNavItems((prev) => ({
              ...prev,
              feed: { ...prev.feed, notifications: 0 }
            }));
          });
        }
      }, [registerClearFeed]);      

    const handleRouteClick = (index, path) => {
        setActiveRoute(index);
        setActiveDropdown(null);
        navigate(path);
    };

    const handleDropdownClick = (dropdown) => {
        setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
          if (
            dropdownRef.current &&
            !dropdownRef.current.contains(e.target) &&
            !e.target.closest(".nav-toggle") &&
            !e.target.closest(".ellipsis-menu")
          ) {
            setActiveDropdown(null);
          }
        };
      
        if (activeDropdown) {
          document.addEventListener("mousedown", handleClickOutside);
        }
      
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }, [activeDropdown]);      

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

                            <div className={`nav-item ${activeRoute === '/home' ? 'active' : ''}`} onClick={() => handleRouteClick(0, "/home")}>
                                <div className="nav-item-icon"><FontAwesomeIcon key={`feed-${uuidv4()}`} icon={navItems.feed.icon} /></div>
                                <div className="nav-item-name">{!isMobile && navItems.feed.name}</div>
                                <div className="nav-item-notif">{navItems.feed.notifications > 0 && <NotificationBadge key={`nb-${uuidv4()}`} count={navItems.feed.notifications} />}</div>
                            </div>
                            <MessengerToggle key={`mt-navbar`} notifications={navItems.messages.notifications} />

                            <div className={`nav-toggle ${activeDropdown === "friends" ? "active" : ""}`} onClick={() => handleDropdownClick("friends")}>
                                <div className="nav-item-icon"><FontAwesomeIcon key={`friends-${uuidv4()}`} icon={navItems.friends.icon} /></div>
                                <div className="nav-item-name">Friends</div>
                                <div className="nav-item-notif"></div>
                            </div>

                            <div className={`nav-toggle ${activeDropdown === "notifications" ? "active" : ""}`} onClick={() => handleDropdownClick("notifications")}>
                                <div className="nav-item-icon"><FontAwesomeIcon key={`notifications-${uuidv4()}`} icon={navItems.notifications.icon} /> </div>
                                <div className="nav-item-name">Notifications</div>
                                <div className="nav-item-notif">{navItems.notifications.notifications > 0 && <NotificationBadge key={`nb-${uuidv4()}`} count={parseInt(navItems.notifications.notifications, 10)} />}</div>
                            </div>

                            {activeDropdown === "friends" && (
                                <div className="nav-dropdown" ref={dropdownRef}>
                                    <FriendRequest userId={userId} />
                                    <FriendList userId={userId} />
                                </div>
                            )}

                            {activeDropdown === "notifications" && (
                                <div className="nav-dropdown" ref={dropdownRef}>
                                    <Notifications notifications={notifications} setNotifications={setNotifications} />
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
                        <div className={`nav-item`} onClick={() => handleRouteClick(0, "/home")}>
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
