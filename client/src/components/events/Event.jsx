import React, { useState, useEffect, useCallback } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faEllipsisV, faShare, faUserPlus, faBan, faTrash } from '@fortawesome/free-solid-svg-icons';
import Modal from '../modals/Modal';
import Eventmodal from '../modals/EventModal';
import { Link } from 'react-router-dom';
import '../../styles/Event.css';
import NotificationBadge from '../NotificationBadge';

function Event({ event, handleClick, updateEvents, selected, userId }) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [creator, setCreator] = useState('');
    const axiosInstance = useAxios();
    const descriptionMax = 70;
    const isCreator = event.created_by === userId;

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
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    const handleLike = async (e) => {
        e.stopPropagation();
        try {
            await axiosInstance.post(`/events/${event.event_id}/like`);
            updateEvents(event.event_id);
        } catch (err) {
            console.error('Error liking event:', err);
        }
    };

    const handleShareEvent = async (e) => {
        e.stopPropagation();
        try {
            await axiosInstance.post(`/events/${event.event_id}/share`, { userId });
            updateEvents();
        } catch (err) {
            console.error('Error sharing event:', err);
        }
    };

    const handleAddFriend = async (e) => {
        e.stopPropagation();
        try {
            await axiosInstance.post('/friends/request', {
                userId,
                friendUsername: creator.username,
            });
            alert('Friend request sent.');
        } catch (err) {
            console.error('Error adding friend:', err);
        }
    };

    const handleRemoveEvent = async (e) => {
        e.stopPropagation();
        try {
            if (isCreator) {
                // Delete event if user is the creator
                await axiosInstance.delete(`/events/${event.event_id}`);
            } else {
                // Remove participation if user is not the creator
                await axiosInstance.post(`/events/${event.event_id}/remove-participation`, { userId });
                await axiosInstance.delete(`/memories/${event.event_id}/remove-shared-memories`, { data: { userId } });
                await axiosInstance.delete(`/activity-log/remove`, { data: { userId, eventId: event.event_id } });
            }
            updateEvents();
        } catch (err) {
            console.error('Error removing event or participation:', err);
        }
    };

    return (
        <>
            <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={() => console.log("Delete event")} />
            <Eventmodal show={showEventModal} onClose={() => setShowEventModal(false)} event={event} creator={creator.username} />
            <div 
                onClick={() => handleClick(event)} 
                className={`event-container ${selected ? 'selected' : ''}`}
            >
                <div className="event-header">
                    {!isCreator && (
                        <div className="like-button" onClick={handleLike}>
                            <FontAwesomeIcon icon={faHeart} />
                        </div>
                    )}
                    <div className="ellipsis-menu-toggle" onClick={handleMenuToggle}>
                        <FontAwesomeIcon icon={faEllipsisV} />
                    </div>
                    {showMenu && (
                        <div className="ellipsis-menu" onClick={(e) => e.stopPropagation()}>
                            <button onClick={handleShareEvent}>
                                <FontAwesomeIcon icon={faShare} /> Share Event
                            </button>
                            <button onClick={handleAddFriend}>
                                <FontAwesomeIcon icon={faUserPlus} /> Add Friend
                            </button>
                            <button onClick={handleRemoveEvent}>
                                <FontAwesomeIcon icon={faTrash} /> {isCreator ? 'Delete Event' : 'Remove Participation'}
                            </button>
                        </div>
                    )}
                </div>
                <div className="event-content">
                    <h3>{event.title}</h3>
                    <Link to={`/profile/${event.created_by}`} className="creator-link">
                        <img className='creator-profile-pic' src={creator.profile_picture} alt="Profile" />
                    </Link>
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
                    </div>
                </div>
            </div>
        </>
    );
}

export default Event;
