import React, { useState, useEffect } from 'react';
import ReactDOM from "react-dom";
import MemoryModal from './MemoryModal';
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from '../auth/AuthContext';
import { useEventUpdate } from '../events/EventContext';
import { v4 as uuidv4 } from 'uuid';
import '../../styles/Modal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic, faBasketballBall, faFlask, faLaptopCode, faPalette, faBookOpen, faUtensils } from '@fortawesome/free-solid-svg-icons';

function CreateModal({ show, onClose, userId }) {
    const { axiosInstance } = useAxios();
    const { user } = useAuth();
    const { addNewEvent } = useEventUpdate();
    const [friends, setFriends] = useState([]); 
    const [showMemoryModal, setShowMemoryModal] = useState(false);
    const [newEvent, setNewEvent] = useState({ 
        title: "", 
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
    
    const maxTitle = 150;

    const calculateHotScore = (likes, shares, memories, interactions, interactionDuration, ageInHours) => {
        return (
            (likes * 1.5 + 
             shares * 1.2 + 
             memories * 1.0 + 
             interactions * 1.1 + 
             Math.log(Math.max(interactionDuration + 1, 1)) * 0.7)
            / Math.pow(ageInHours + 2, 1.2)
        );
    };

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

    const handleShareMemory = () => {
        setShowMemoryModal(true); 
    };

    const handleCreate = async (memory) => {
        const parsedCustomTags = customTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);

        const allTags = [...new Set([...newEvent.tags, ...parsedCustomTags])]
        setNewEvent({ ...newEvent, tags: allTags })

        const colors = ["color1", "color2", "color3"];
        let selectedColor = colors[Math.floor(Math.random() * colors.length)];

        let newEventData = {
            event_id: uuidv4(),
            title: newEvent.title,
            description: "No description provided",
            creation_date: new Date().toISOString(),
            event_type: newEvent.eventType,
            reveal_date: newEvent.revealDate,
            created_by: userId,
            username: user.username,
            profile_picture: user.profile_picture || "",
            visibility: newEvent.visibility,
            has_shared_memory: true,
            has_liked: false,
            has_shared_event: false,
            event_status: "opted_in",
            likes_count: 0,
            shares_count: 0,
            memories_count: 1,
            tags: newEvent.tags,
            age_in_hours: 0,
            hot_score: calculateHotScore(0, 0, 1, 0, 0, 0),
            colorClass: selectedColor,
        };

        try {
            const response = await axiosInstance.post("/events", {
                newEvent: newEvent, 
                memoryContent: memory
            });

            console.log("Event & Memory Created:", response.data);
            newEventData.event_id = response.data.eventId;
            addNewEvent(newEventData);

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
            setShowMemoryModal(false);
            onClose();
        } catch (err) {
            console.error("Error creating event & memory:", err);
        }
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

    return ReactDOM.createPortal(
        <>
            <div className="modal-backdrop" onClick={handleBackdropClick}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <h2>Create a New Event</h2>

                    <textarea
                        className='title-input'
                        name="title"
                        placeholder="Descriptive Event Title"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        maxLength={maxTitle}
                    />

                    <div className="character-counter">
                        {newEvent.title.length}/{maxTitle} characters
                    </div>

                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={newEvent.eventType === "time_capsule"}
                                onChange={() => setNewEvent(prev => ({ ...prev, eventType: prev.eventType === "regular" ? "time_capsule" : "regular" }))}
                            />
                            Time Capsule
                        </label>

                        {newEvent.eventType === "time_capsule" && (
                            <label>
                                Reveal Date:
                                <input
                                    type="date"
                                    value={newEvent.revealDate || ""}
                                    onChange={(e) => setNewEvent({ ...newEvent, revealDate: e.target.value })}
                                />
                            </label>
                        )}
                    </div>

                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={newEvent.visibility === "friends_only"}
                                onChange={() => setNewEvent(prev => ({ ...prev, visibility: prev.visibility === "public" ? "friends_only" : "public" }))}
                            />
                            Friends-Only
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={newEvent.visibility === "private"}
                                onChange={() => setNewEvent(prev => ({ ...prev, visibility: prev.visibility === "private" ? "public" : "private" }))}
                            />
                            Private
                        </label>
                    </div>
                    {newEvent.visibility === 'private' && (
                        <div className="friend-select">
                            <h3>You must invite someone to a private event.</h3>
                            <ul>
                                {friends.map(friend => (
                                    <li key={`${friend.id}-${uuidv4()}`}>
                                        <label key={`${friend.id}-${uuidv4()}`} for="invites">
                                            <input
                                                key={`${friend.id}-${uuidv4()}`}
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

                    <div>
                        <h3>Select Tags</h3>
                        <div className="tag-buttons">
                            {commonTags.map(tag => (
                                <button
                                    key={`${tag.name}-${uuidv4()}`}
                                    className={newEvent.tags.includes(tag) ? "tag-selected" : "tag-unselected"}
                                    onClick={() => handleTagToggle(tag)}
                                >
                                    <FontAwesomeIcon key={`${tag.name}-${uuidv4()}`} icon={tag.icon} />
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                        <textarea
                            name="custom-tags"
                            placeholder="Add custom tags separated by commas."
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

                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                onChange={handleAutoDetectLocation}
                                disabled={autoLocation}
                            />
                            Detect Location
                        </label>
                    </div>

                    <div>
                        <button className='modal-button' onClick={handleShareMemory}>
                            Share Memory
                        </button>
                        <button className='modal-button' onClick={onClose}>Cancel</button>
                    </div>

                </div>
            </div>

            {showMemoryModal && (
                <MemoryModal
                    key={uuidv4()}
                    show={showMemoryModal}
                    onClose={() => setShowMemoryModal(false)}
                    onCreate={handleCreate}
                />
            )}
        </>,
        document.getElementById("modal-root")
    );
}

export default CreateModal;
