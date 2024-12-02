import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import '../../styles/Modal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic, faBasketballBall, faFlask, faLaptopCode, faPalette, faBookOpen, faUtensils } from '@fortawesome/free-solid-svg-icons';

function CreateModal({ show, onClose, onCreate, userId }) {
    const { axiosInstance } = useAxios();
    const [friends, setFriends] = useState([]); 
    const [newEvent, setNewEvent] = useState({ 
        title: "", 
        description: "", 
        invites: [],
        eventType: "regular",
        revealDate: Date,
        visibility: 'public',
        tags: [],
        location: "",
    });
    const [customTags, setCustomTags] = useState("");
    const [autoLocation, setAutoLocation] = useState(false);
    const commonTags = [
        { name: "Sports", icon: faBasketballBall },
        { name: "Music", icon: faMusic },
        { name: "Science", icon: faFlask },
        { name: "Technology", icon: faLaptopCode },
        { name: "Art", icon: faPalette },
        { name: "Education", icon: faBookOpen },
        { name: "Food", icon: faUtensils }
    ]
    
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

    const handleAutoDetectLocation = async () => {
        try {
            const response = await axiosInstance.get("/location");
            const { city, region, country } = response.data;
            setNewEvent((prevEvent) => ({
                ...prevEvent,
                location: `${city}, ${region}, ${country}`
            }));
            setAutoLocation(true);
        } catch (error) {
            console.error("Error auto-detecting location:", error);
            setAutoLocation(false);
        }
    };

    const handleCreate = () => {
        const parsedCustomTags = customTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);

        const allTags = [...new Set([...newEvent.tags, ...parsedCustomTags])]
        
        onCreate({ ...newEvent, tags: allTags });

        setNewEvent({ 
            title: "", 
            description: "", 
            invites: [],
            eventType: "regular",
            revealDate: Date,
            visibility: 'public',
            tags: [],
            location: "",
        });
        setCustomTags("");
        setAutoLocation(false);
        onClose();
    };

    const handleTagToggle = (tag) => {
        setNewEvent((prevEvent) => {
            const isSelected = prevEvent.tags.includes(tag.name);
            const updatedTags = isSelected
                ? prevEvent.tags.filter(t => t !== tag.name)
                : [...prevEvent.tags, tag.name];
            
            setCustomTags(updatedTags.join(', '));

            return {
                ...prevEvent,
                tags: updatedTags
            };
        });
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

                    <label for='event-type'>
                        {"Event type: "}
                        <select 
                            id="event-type"
                            value={newEvent.eventType} 
                            onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value })} 
                        >
                            <option value="regular">Regular</option>
                            <option value="time_capsule">Time Capsule</option>
                        </select>
                    </label>

                    {newEvent.eventType === 'time_capsule' && (
                        <label for="reveal-date">
                            {"Reveal Date: "} 
                            <input
                                id="reveal-date"
                                type="date"
                                value={newEvent.revealDate}
                                onChange={(e) => setNewEvent({ ...newEvent, revealDate: e.target.value })}
                            />
                        </label>
                    )}

                    <label for="visibility">
                        {"Event visibility: "}
                        <select 
                            id="visibility"
                            value={newEvent.visibility} 
                            onChange={(e) => setNewEvent({ ...newEvent, visibility: e.target.value })} 
                        >
                            <option value="public">Public</option>
                            <option value="friends_only">Friends-only</option>
                            <option value="private">Private</option>
                        </select>
                    </label>
                    {newEvent.visibility === 'private' && (
                        <div className="friend-select">
                            <h3>Invites</h3>
                            <ul>
                                {friends.map(friend => (
                                    <li key={friend.id}>
                                        <label for="invites">
                                            <input
                                                name="invites"
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

                <div className='modal-right-column'>
                    <div>
                        <h3>Select Tags</h3>
                        <div className="tag-buttons">
                            {commonTags.map(tag => (
                                <button
                                    key={tag}
                                    className={newEvent.tags.includes(tag) ? "tag-selected" : "tag-unselected"}
                                    onClick={() => handleTagToggle(tag)}
                                >
                                    <FontAwesomeIcon icon={tag.icon} />
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                        <textarea
                            name="custom-tags"
                            placeholder="Add custom tags, separated by commas"
                            value={customTags}
                            onChange={(e) => {
                                setCustomTags(e.target.value);
                                const parsedCustomTags = e.target.value.split(',').map((tag) => tag.trim());
                                setNewEvent((prevEvent) => ({
                                    ...prevEvent,
                                    tags: [...new Set([...prevEvent.tags, ...parsedCustomTags])],
                                }));
                            }}
                        />
                    </div>

                    <div>
                        <h3>Location</h3>
                        <textarea
                            className='location-input'
                            placeholder="City, Region, Country"
                            value={newEvent.location}
                            onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                            disabled={autoLocation}
                        />
                        <button onClick={handleAutoDetectLocation} disabled={autoLocation}>
                            Auto-Detect Location
                        </button>
                        {autoLocation && <span>Auto-detected location enabled</span>}
                    </div>


                </div>
                <div className='button-container'>
                    <button className='modal-button' onClick={handleCreate}>Create Event</button>
                    <button className='modal-button' onClick={onClose}>Cancel</button>
                </div>
  
            </div>
        </div>
    );
}

export default CreateModal;
