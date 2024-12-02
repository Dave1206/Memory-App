import React, { useState, useEffect, useCallback } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faTrashCan, faShare, faBan, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import Modal from '../modals/Modal';
import Eventmodal from '../modals/EventModal';
import { Link } from 'react-router-dom';
import '../../styles/Event.css';
import EllipsisMenu from '../EllipsisMenu';
import NotificationBadge from '../NotificationBadge';
import LikeButton from '../LikeButton';
import { useAuth } from '../auth/AuthContext';

function Event({ event, handleClick, updateEvents, selected }) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [creator, setCreator] = useState('');
    const [shared, setShared] = useState('');
    const colors = ['color1', 'color2', 'color3', 'color4', 'color5', 'color6', 'color7', 'color8', 'color9'];
    const [color] = useState(() => colors[Math.floor(Math.random() * colors.length)]);
    const { axiosInstance } = useAxios();
    const descriptionMax = 150;
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

    const handleMenuToggle = () => {
        setShowMenu(!showMenu);
    };

    const handleLike = async () => {
        try {
            await axiosInstance.post(`/events/${event.event_id}/like`);
            event.has_liked = !event.has_liked;
        } catch (err) {
            console.error('Error liking event:', err);
        }
    };

    const handleShare = async () => {
        try {
            await axiosInstance.post(`/events/${event.event_id}/share`);
            setShared(true);
            event.has_shared_event = true;
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
        <Eventmodal show={showEventModal} onClose={() => setShowEventModal(false)} event={event} creator={creator} />
            <div 
                onClick={() => handleClick(event)} 
                className={`event-container ${selected ? 'selected' : ''} ${color}`}
                onMouseLeave={() => setShowMenu(false)}
            >
                <img 
                        className="creator-profile-pic" 
                        src={creator.profile_picture} 
                        alt="Profile" 
                    />

                <div className="event-header-left">
                    
                    <Link 
                        to={`/profile/${event.created_by}`} 
                        className={`creator-link ${color}`}
                    >
                        {creator.username}
                    </Link>
                    
                </div>

                <div className='event-header-right'>
                    <EllipsisMenu 
                        isOpen={showMenu}
                        onToggle={handleMenuToggle}
                        buttonItems={buttonItems} 
                    />
                </div>

                <div className="event-content">
                    <h3 className={`${color}`}>{event.title}</h3>
                    <p className={`${color}`}>
                        {event.description.length > descriptionMax ? (
                            <>
                                {event.description.substring(0, descriptionMax)}
                                <span>
                                    . . .
                                </span>
                                <FontAwesomeIcon 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowEventModal(true);
                                        }
                                    } 
                                    className='view-event-icon' 
                                    icon={faMagnifyingGlass} 
                                />
                            </>
                        ) : (
                            <>
                                {event.description}
                                <FontAwesomeIcon 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowEventModal(true);
                                        }
                                    } 
                                    className='view-event-icon' 
                                    icon={faMagnifyingGlass} 
                                />
                            </>

                        )}
                    </p>
                </div>

                <div className="event-footer">
                    <div className="stats">
                        <div className='stats-counter'>
                            <LikeButton 
                                onLike={handleLike} />
                        </div>
                        <div className={`stats-counter ${color}`}>
                            <FontAwesomeIcon 
                                className={shared ? 'shared' : ''} 
                                icon={faShare} />
                        </div>
                        <div className={`stats-counter ${color}`}>
                            <FontAwesomeIcon icon={faBook} /> {event.memories_count}
                        </div>
                    </div>
                    {event.seen === false && <NotificationBadge count="new" />}
                </div>
            </div>
        </>
    );
}

export default Event;