import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBasketballBall,
    faMusic,
    faFlask,
    faLaptopCode,
    faPalette,
    faBookOpen,
    faUtensils
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/TagsInput.css";

const commonTags = [
    { name: "Sports", icon: faBasketballBall },
    { name: "Music", icon: faMusic },
    { name: "Science", icon: faFlask },
    { name: "Technology", icon: faLaptopCode },
    { name: "Art", icon: faPalette },
    { name: "Education", icon: faBookOpen },
    { name: "Food", icon: faUtensils }
];

function TagsInput({ selectedTags, setSelectedTags }) {
    const [customTag, setCustomTag] = useState("");

    const addTag = (tag) => {
        const trimmed = tag.trim();
        if (trimmed && !selectedTags.includes(trimmed)) {
            setSelectedTags([...selectedTags, trimmed]);
        }
    };

    const removeTag = (tagToRemove) => {
        setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
    };

    const toggleCommonTag = (tag) => {
        if (selectedTags.includes(tag)) {
            removeTag(tag);
        } else {
            addTag(tag);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag(customTag);
            setCustomTag("");
        }
    };

    return (
        <div className="tags-input-container">
            <div className="custom-tag-input">
                <input
                    type="text"
                    placeholder="Type a tag and press Enter"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button onClick={() => { addTag(customTag); setCustomTag(""); }}>Add Tag</button>
            </div>

            <div className="common-tags">
                <h3>Common Tags</h3>
                {commonTags.map(tag => (
                    <button
                        key={tag.name}
                        className={selectedTags.includes(tag.name) ? "tag-selected" : "tag-unselected"}
                        onClick={() => toggleCommonTag(tag.name)}
                    >
                        <FontAwesomeIcon icon={tag.icon} /> {tag.name}
                    </button>
                ))}
            </div>

            <div className="selected-tags">
                <h3>Selected Tags</h3>
                {selectedTags?.map(tag => (
                    <span key={tag} className="tag-badge" onClick={() => removeTag(tag)}>
                        {tag} &times;
                    </span>
                ))}
            </div>
        </div>
    );
}

export default TagsInput;