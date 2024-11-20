import React, { useState, useEffect, useCallback } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faTrashCan, faShare, faBan } from '@fortawesome/free-solid-svg-icons';
import Modal from '../modals/Modal';
import Eventmodal from '../modals/EventModal';
import { Link } from 'react-router-dom';
import '../../styles/Event.css';
import EllipsisMenu from '../EllipsisMenu';
import NotificationBadge from '../NotificationBadge';
import { useAuth } from '../auth/AuthContext';

function Event({ event, handleClick, updateEvents, selected }) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [creator, setCreator] = useState('');
    const colors = ['color1', 'color2', 'color3', 'color4', 'color5', 'color6', 'color7', 'color8', 'color9'];
    const [color] = useState(() => colors[Math.floor(Math.random() * colors.length)]);
    const axiosInstance = useAxios();
    const descriptionMax = 70;
    const { user } = useAuth();
    
    const buttonItems = [
        {
            content: <><FontAwesomeIcon icon={faShare} /> Share Event</>,
            onClick: () => handleShare(),
            isDisabled: event.has_shared_event,
        },
        {
            content: <><FontAwesomeIcon icon={faTrashCan} /> Unsubscribe</>,
            onClick: () => handleRemoveParticipationOrEvent(),
            isDisabled: event.status !== 'opted_in',
        },
        {
            content: <><FontAwesomeIcon icon={faBan} /> Block User</>,
            onClick: () => handleBlockUser(),
            isDisabled: false,
        },
    ];

    const fetchCreator = useCallback(async () => {
        try {
            const result = await axiosInstance.get(`/user/${event.created_by}`);
            setCreator(result.data);
        } catch (err) {
            console.error('Error fetching creator:', err);
        }
    }, [axiosInstance, event.created_by]);

    useEffect(() => {
        fetchCreator();
    }, [fetchCreator]);

    const handleMenuToggle = (e) => {
        setShowMenu(!showMenu);
    };

    const handleLike = async () => {
        try {
            await axiosInstance.post(`/events/${event.event_id}/like`);
            updateEvents(event.event_id);
        } catch (err) {
            console.error('Error liking event:', err);
        }
    };

    const handleShare = async () => {
        try {
            await axiosInstance.post(`/events/${event.event_id}/share`);
            updateEvents();
        } catch (error) {
            console.error('Error sharing the event:', error);
        }
    };

    const handleRemoveParticipationOrEvent = async () => {
        try {
            await axiosInstance.post(`/deleteevent/${event.event_id}`);

            updateEvents();
        } catch (error) {
            console.error('Error removing participation or event:', error);
        }
    };

    const handleBlockUser = async (e) => {
        e.stopPropagation();
        try {
            await axiosInstance.post('/block-user', {
                userId: user.id,
                blockedId: event.created_by,
            });
            alert('User has been blocked.');
        } catch (err) {
            console.error('Error blocking user:', err);
        }
    };

    return (
        <>
        <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={() => console.log("Delete event")} />
        <Eventmodal show={showEventModal} onClose={() => setShowEventModal(false)} event={event} creator={creator.username} />
        <div 
            onClick={() => handleClick(event)} 
            className={`event-container ${selected ? 'selected' : ''} ${color}`}
            onMouseLeave={() => setShowMenu(false)}
        >
            <div className="event-header">
                <div className="like-button" onClick={handleLike}>
                    <FontAwesomeIcon icon={faHeart} />
                </div>
                    <EllipsisMenu 
                        buttonItems={buttonItems}
                        onToggle={handleMenuToggle}
                        isOpen={showMenu}
                    />
            </div>
            <div className="event-content">
                <h3>{event.title}</h3>
                <Link to={`/profile/${event.created_by}`} className="creator-link"><img className='creator-profile-pic' src={creator.profile_picture} alt="Profile" /></Link>
                <p>
                    {event.description.length > descriptionMax ? (
                        <>
                            {event.description.substring(0, descriptionMax)}
                            <span onClick={() => setShowEventModal(true)} className="read-more">... Read more</span>
                        </>
                    ) : (
                        event.description
                    )}
                </p>
                <div className="event-footer">
                    <Link to={`/profile/${event.created_by}`} className="creator-link">{creator.username}</Link>
                    {event.seen === false && <NotificationBadge count="new" />}
                </div>
            </div>
        </div>
        </>
    );
}

export default Event;