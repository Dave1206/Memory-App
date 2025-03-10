import React, { useState, useEffect, useCallback, useMemo } from "react";
import FriendList from "./friends/FriendList";
import FriendRequest from "./friends/FriendRequest";
import PendingRequests from "./friends/PendingRequests";
import EventInvites from "./events/EventInvites";
import NotificationBadge from "./NotificationBadge";
import { useAxios } from './auth/AxiosProvider';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faCompass, faNewspaper, faUsers, faBell } from '@fortawesome/free-solid-svg-icons';
import "../styles/Navbar.css";

function Navbar({ userId, events, onEventUpdate }) {
    const [activeRoute, setActiveRoute] = useState(0);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [navItems, setNavItems] = useState([]);
    const { axiosInstance } = useAxios();
    const navigate = useNavigate();

    const invites = useMemo(() => events.filter(event => event.status === 'invited'), [events]);

    const fetchNotifications = useCallback(async () => {
        const initialNavItems = [
            { name: "Events", icon: faCalendarAlt, notifications: 0 },
            { name: "Explore", icon: faCompass, notifications: 0 },
            { name: "Feed", icon: faNewspaper, notifications: 0 },
            { name: "Friends", icon: faUsers, notifications: 0 },
            { name: "Alerts", icon: faBell, notifications: 0 }
        ];
        try {
            const response = await axiosInstance.get(`/notifications/${userId}`);
            const notifications = response.data;
            const pendingInvitesCount = invites.length;
            const modNotifications = notifications.modNotifications;
            const addedNotifications = pendingInvitesCount + modNotifications;

            const updatedNavItems = initialNavItems.map((item, index) => ({
                ...item,
                notifications: (notifications[index]?.length || 0) + (index === 4 ? addedNotifications : 0)
            }));

            setNavItems(updatedNavItems);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    }, [axiosInstance, userId, invites.length]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleRouteClick = (index, path) => {
        setActiveRoute(index);
        setActiveDropdown(null);
        navigate(path);
    };

    const handleDropdownClick = (index) => {
        setActiveDropdown(activeDropdown === index ? null : index);
    };

    const navigateToProfile = (friendId) => {
        navigate(`/profile/${friendId}`);
    };

    const handleInviteUpdate = (eventId) => {
        onEventUpdate(eventId);
    };

    return (
        <div className="navbar-wrapper">
            <nav className="navbar">
                {navItems.slice(0, 3).map((item, index) => (
                    <div
                        key={index}
                        className={`nav-item ${index === activeRoute ? "active" : ""}`}
                        onClick={() => handleRouteClick(index, `/${item.name.toLowerCase()}`)}
                    >
                        <FontAwesomeIcon icon={item.icon} />
                        {item.name}
                        {item.notifications > 0 && <NotificationBadge count={parseInt(item.notifications, 10)} />}
                    </div>
                ))}
                
                <div
                    className={`nav-dropdown-toggle ${activeDropdown === 3 ? "active" : ""}`}
                    onClick={() => handleDropdownClick(3)}
                >
                    <FontAwesomeIcon icon={faUsers} />
                    {navItems[3]?.notifications > 0 && <NotificationBadge count={parseInt(navItems[3].notifications, 10)} />}
                </div>
                
                <div
                    className={`nav-dropdown-toggle ${activeDropdown === 4 ? "active" : ""}`}
                    onClick={() => handleDropdownClick(4)}
                >
                    <FontAwesomeIcon icon={faBell} />
                    {navItems[4]?.notifications > 0 && <NotificationBadge count={parseInt(navItems[4].notifications, 10)} />}
                </div>

                {activeDropdown === 3 && (
                    <div className="nav-dropdown-content">
                        <FriendRequest userId={userId} />
                        <FriendList userId={userId} navigateToProfile={navigateToProfile} />
                    </div>
                )}

                {activeDropdown === 4 && (
                    <div className="nav-dropdown-content">
                        {navItems[4].notifications === 0 ? (
                            <p>No new notifications</p>
                        ) : (
                            <>
                                <PendingRequests userId={userId} />
                                <EventInvites events={invites} onUpdate={handleInviteUpdate} />
                            </>
                        )}
                    </div>
                )}
            </nav>
        </div>
    );
}

export default Navbar;
