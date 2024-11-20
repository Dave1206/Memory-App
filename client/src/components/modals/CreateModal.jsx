import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import '../../styles/Modal.css';

function CreateModal({ show, onClose, onCreate, userId }) {
    const axiosInstance = useAxios();
    const [friends, setFriends] = useState([]); 
    const [newEvent, setNewEvent] = useState({ 
        title: "", 
        description: "", 
        invites: [],
        eventType: "regular",
        revealDate: Date,
        visibility: 'public',
    });
    const maxDescription = 500;
    const maxTitle = 50;

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const response = await axiosInstance.get(`/friends/${userId}`);
                setFriends(response.data);
            } catch (error) {
                console.error("Error fetching friends:", error);
            }
        };

        if (show) fetchFriends();
    }, [axiosInstance, userId, show]);

    const handleCreate = () => {
        onCreate(newEvent);
        setNewEvent({ 
            title: "", 
            description: "", 
            invites: [],
            eventType: "regular",
            revealDate: Date,
            visibility: 'public',
        });
        onClose();
    };

    const handleFriendSelect = (friendId) => {
        setNewEvent(prevEvent => {
            const isAlreadyInvited = prevEvent.invites.includes(friendId);
            const updatedInvites = isAlreadyInvited
                ? prevEvent.invites.filter(id => id !== friendId) 
                : [...prevEvent.invites, friendId]; 

            return { ...prevEvent, invites: updatedInvites };
        });
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!show) {
        return null;
    }

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className='modal-left-column'>
                    <h2>Create a New Event</h2>
                    
                    <textarea
                        className='title-input'
                        name="title"
                        placeholder="Title"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        maxLength={maxTitle}
                    />
                    
                    <div className="character-counter">
                        {newEvent.title.length}/{maxTitle} characters
                    </div>
                    
                    <textarea
                        name="description"
                        placeholder="Description"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        maxLength={maxDescription}
                    />
                    
                    <div className="character-counter">
                        {newEvent.description.length}/{maxDescription} characters
                    </div>

                    <label>
                        {"Event type: "}
                        <select 
                            value={newEvent.eventType} 
                            onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value })} 
                        >
                            <option value="regular">Regular</option>
                            <option value="time_capsule">Time Capsule</option>
                        </select>
                    </label>

                    {newEvent.eventType === 'time_capsule' && (
                        <label>
                            {"Reveal Date: "} 
                            <input
                                type="date"
                                value={newEvent.revealDate}
                                onChange={(e) => setNewEvent({ ...newEvent, revealDate: e.target.value })}
                            />
                        </label>
                    )}

                    <label>
                        {"Event visibility: "}
                        <select 
                            value={newEvent.visibility} 
                            onChange={(e) => setNewEvent({ ...newEvent, visibility: e.target.value })} 
                        >
                            <option value="public">Public</option>
                            <option value="friends_only">Friends-only</option>
                            <option value="private">Private</option>
                        </select>
                    </label>
                    <div className='button-container'>
                        <button className='modal-button' onClick={handleCreate}>Create Event</button>
                        <button className='modal-button' onClick={onClose}>Cancel</button>
                    </div>
                </div>
                <div className='modal-right-column'>
                    {newEvent.visibility === 'private' && (
                        <div className="friend-select">
                            <h3>Invites</h3>
                            <ul>
                                {friends.map(friend => (
                                    <li key={friend.id}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={newEvent.invites.includes(friend.id)}
                                                onChange={() => handleFriendSelect(friend.id)}
                                            />
                                            {friend.username}
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
  
            </div>
        </div>
    );
}

export default CreateModal;
