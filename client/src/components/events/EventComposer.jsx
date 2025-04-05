import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { useAxios } from "../auth/AxiosProvider";
import { useAuth } from "../auth/AuthContext";
import { useEventUpdate } from "../events/EventContext";
import { v4 as uuidv4 } from "uuid";
import DOMPurify from "dompurify";
import { Filter } from "bad-words";
import MediaUploader from "./MediaUploader";
import "../../styles/EventComposer.css";
import "../../styles/Modal.css";
import TagsInput from "./TagsInput";

const MAX_TITLE = 150;
const MAX_MEMORY = 500;

function EventComposer({ show, onClose }) {
    const { axiosInstance } = useAxios();
    const { user } = useAuth();
    const { addNewEvent } = useEventUpdate();

    const [eventDetails, setEventDetails] = useState({
        title: "",
        invites: [],
        eventType: "regular",
        revealDate: "",
        visibility: "public",
        tags: [],
        location: ""
    });

    const [selectedTags, setSelectedTags] = useState([]);
    const [friends, setFriends] = useState([]);
    const [autoLocation, setAutoLocation] = useState(false);

    const [memory, setMemory] = useState("");
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadMediaFn, setUploadMediaFn] = useState(null);

    const today = new Date().toISOString().split("T")[0];
    const userId = user.id;
    const textRef = useRef(null);
    const filter = new Filter();
    const emojis = ["😊", "😢", "😂", "😎", "🎉", "❤️", "👍", "🙌", "💡"];

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const response = await axiosInstance.get(`/friends/${userId}`);
                setFriends(response.data);
            } catch (error) {
                console.error("Error fetching friends:", error);
            }
        };
        if (show) {
            fetchFriends();
        }
    }, [axiosInstance, userId, show]);

    const handleEmoji = (emoji) => {
        const cursor = textRef.current.selectionStart;
        const updated = memory.slice(0, cursor) + emoji + memory.slice(cursor);
        setMemory(updated);
        setTimeout(() => {
            textRef.current.selectionStart = textRef.current.selectionEnd = cursor + emoji.length;
            textRef.current.focus();
        }, 0);
    };

    const sanitizeInput = (text) => {
        const cleaned = DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        return filter.clean(cleaned);
    };

    const handleAutoDetectLocation = async () => {
        try {
            if (!autoLocation) {
            const response = await axiosInstance.get("/location");
            const { city, region, country } = response.data;
            setEventDetails((prev) => ({
                ...prev,
                location: `${city}, ${region}, ${country}`
            }));
            setAutoLocation(true);
        } else {
            setEventDetails((prev) => ({
                ...prev,
                location: ''
            }));
            setAutoLocation(false);
        }
        } catch (error) {
            console.error("Error auto-detecting location:", error);
            setAutoLocation(false);
        }
    };

    const handleFriendSelect = (friendId) => {
        setEventDetails((prev) => {
            const alreadyInvited = prev.invites.includes(friendId);
            const updatedInvites = alreadyInvited
                ? prev.invites.filter(id => id !== friendId)
                : [...prev.invites, friendId];
            return { ...prev, invites: updatedInvites };
        });
    };

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

    const handleSubmit = async () => {
        if (!eventDetails.title.trim() || memory.split(" ").length < 20) {
            alert("Title is required and memory must be at least 20 words.");
            return;
        }

        if (eventDetails.visibility === "private" && eventDetails.invites.length === 0) {
            alert("You must invite at least one friend for a private event.");
            return;
        }

        setLoading(true);

        const colors = ["color1", "color2", "color3"];
        const selectedColor = colors[Math.floor(Math.random() * colors.length)];

        try {
            const sanitizedTitle = sanitizeInput(eventDetails.title);
            const sanitizedMemory = sanitizeInput(memory);
            const sanitizedTags = selectedTags?.map(tag => sanitizeInput(tag));

            let token = null;
            if (uploadMediaFn) {
                const mediaResponses = await uploadMediaFn();
                token = mediaResponses && mediaResponses.length ? mediaResponses[0].token : null;
            }

            let newEventData = {
                event_id: uuidv4(),
                title: sanitizedTitle,
                description: "No description provided",
                creation_date: new Date().toISOString(),
                event_type: eventDetails.eventType,
                reveal_date: eventDetails.eventType === "time_capsule" ? eventDetails.revealDate : null,
                created_by: userId,
                username: user.username,
                profile_picture: user.profile_picture || "",
                visibility: eventDetails.visibility,
                has_shared_memory: true,
                has_liked: false,
                has_shared_event: false,
                event_status: "opted_in",
                likes_count: 0,
                shares_count: 0,
                memories_count: 1,
                tags: sanitizedTags,
                location: eventDetails.location,
                age_in_hours: 0,
                hot_score: calculateHotScore(0, 0, 1, 0, 0, 0),
                colorClass: selectedColor,
            };

            const response = await axiosInstance.post("/events/compose", {
                newEvent: newEventData,
                memoryContent: sanitizedMemory,
                mediaToken: token
            });

            console.log("Event & Memory Created:", response.data);
            addNewEvent(response.data.newEvent);

            setEventDetails({
                title: "",
                invites: [],
                eventType: "regular",
                revealDate: "",
                visibility: "public",
                tags: [],
                location: ""
            });
            setMemory("");
            setSelectedTags("");
            setAutoLocation(false);
            onClose();
        } catch (err) {
            console.error("Failed to create event:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    if (!show) return null;

    return ReactDOM.createPortal(
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="event-composer" onClick={(e) => e.stopPropagation()}>
                <h2>Create an Event</h2>

                {/* Title Input */}
                <textarea
                    className="title-input"
                    placeholder="Descriptive Event Title"
                    value={eventDetails.title}
                    onChange={(e) =>
                        setEventDetails({ ...eventDetails, title: e.target.value.slice(0, MAX_TITLE) })
                    }
                />
                <div className="character-counter">
                    {eventDetails.title.length}/{MAX_TITLE} characters
                </div>

                {/* Memory Input and Emoji Toolbar */}
                <div className="memory-section">
                    <div className="memory-toolbar">
                        <button className="emoji-toggle-button" onClick={() => setEmojiOpen(!emojiOpen)} title="Emoji Picker">
                            {"😊"}
                        </button>
                    </div>
                    {emojiOpen && (
                        <div className="emoji-toolbar">
                            {emojis.map((e) => (
                                <button className="emoji-button" key={e} onClick={() => handleEmoji(e)}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}
                    <textarea
                        ref={textRef}
                        className="memory-input"
                        placeholder="Your memory of the event..."
                        value={memory}
                        onChange={(e) => setMemory(e.target.value.slice(0, MAX_MEMORY))}
                    />
                    <div className="character-counter">
                        {memory.length}/{MAX_MEMORY} characters
                    </div>
                </div>

                {/* Media Uploader */}
                <MediaUploader
                    visibility={eventDetails.visibility}
                    onRegisterUpload={(fn) => setUploadMediaFn(() => fn)}
                />

                {/* Event Type and Reveal Date */}
                <div className="checkbox-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={eventDetails.eventType === "time_capsule"}
                            onChange={() =>
                                setEventDetails((prev) => ({
                                    ...prev,
                                    eventType: prev.eventType === "regular" ? "time_capsule" : "regular"
                                }))
                            }
                        />
                        Time Capsule
                    </label>
                    {eventDetails.eventType === "time_capsule" && (
                        <label>
                            Reveal Date:
                            <input
                                type="date"
                                min={today}
                                value={eventDetails.revealDate || ""}
                                onChange={(e) =>
                                    setEventDetails({ ...eventDetails, revealDate: e.target.value })
                                }
                            />
                        </label>
                    )}
                </div>

                {/* Visibility Options */}
                <div className="checkbox-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={eventDetails.visibility === "friends_only"}
                            onChange={() =>
                                setEventDetails((prev) => ({
                                    ...prev,
                                    visibility: prev.visibility === "public" ? "friends_only" : "public"
                                }))
                            }
                        />
                        Friends-Only
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={eventDetails.visibility === "private"}
                            onChange={() =>
                                setEventDetails((prev) => ({
                                    ...prev,
                                    visibility: prev.visibility === "private" ? "public" : "private"
                                }))
                            }
                        />
                        Private
                    </label>
                </div>

                {/* Friend Invites for Private Events */}
                {eventDetails.visibility === "private" && (
                    <div className="friend-select">
                        <h3>You must invite someone to a private event.</h3>
                        <ul>
                            {friends.map((friend) => (
                                <li key={friend.id}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={eventDetails.invites.includes(friend.id)}
                                            onChange={() => handleFriendSelect(friend.id)}
                                        />
                                        {friend.username}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Location Detection */}
                <div className="location-toggle">
                    <button
                        type="button"
                        onClick={() => { 
                            handleAutoDetectLocation();
                            }}
                        className={`icon-button ${autoLocation ? 'enabled' : ''}`}
                        title="Auto-detect location"
                    >
                        <FontAwesomeIcon icon={faLocationDot} />
                    </button>
                    <span>Use auto-detected location</span>
                </div>

                {/* Tag Selection */}
                <TagsInput 
                    selectedTags={selectedTags}
                    setSelectedTags={setSelectedTags}
                />

                {/* Submit and Cancel Buttons */}
                <div className="composer-actions">
                    <button className="modal-button" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Posting..." : "Post Event"}
                    </button>
                    <button className="modal-button" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>,
        document.getElementById("modal-root")
    );
}

export default EventComposer;
