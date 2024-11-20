import React, { useState, useRef } from 'react';
import '../../styles/MemoryModal.css';

function MemoryModal({ show, onClose, onCreate, eventId }) {
    const [newMemory, setNewMemory] = useState("");
    const [isEmojiToolbarVisible, setIsEmojiToolbarVisible] = useState(false);
    const textAreaRef = useRef(null);  // Reference to the text area
    const maxCharacters = 200;  // Set character limit here

    // Define a set of emojis for the toolbar
    const emojis = ["😊", "😢", "😂", "😎", "🎉", "❤️", "👍", "🙌", "💡"];

    // Calculate length treating each emoji as a single character
    const calculateLength = (str) => [...str].length;

    // Handle adding an emoji at the cursor position
    const addEmoji = (emoji) => {
        const textArea = textAreaRef.current;
        const cursorPosition = textArea.selectionStart;
        const updatedMemory = 
            newMemory.slice(0, cursorPosition) + emoji + newMemory.slice(cursorPosition);

        if (calculateLength(updatedMemory) <= maxCharacters) {
            setNewMemory(updatedMemory);

            // Set cursor position after the inserted emoji
            setTimeout(() => {
                textArea.selectionStart = textArea.selectionEnd = cursorPosition + emoji.length;
                textArea.focus();
            }, 0);
        }
    };

    // Handle changes in the textarea with character limit enforcement
    const handleChange = (e) => {
        const inputText = e.target.value;
        if (calculateLength(inputText) <= maxCharacters) {
            setNewMemory(inputText);
        } else {
            // Trim the text to the max length if exceeded
            const trimmedText = [...inputText].slice(0, maxCharacters).join('');
            setNewMemory(trimmedText);
        }
    };

    // Function to handle sharing the memory
    const handleCreate = () => {
        onCreate(newMemory);
        setNewMemory("");
        onClose();
    };

    // Close the modal when clicking outside the modal container
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
                    <h2>What do you remember of this event?</h2>

                    {/* Toggle button for emoji toolbar */}
                    <button 
                        type="button" 
                        className="emoji-toggle-button" 
                        onClick={() => setIsEmojiToolbarVisible(!isEmojiToolbarVisible)}
                        aria-label="Toggle Emoji Toolbar"
                    >
                        {isEmojiToolbarVisible ? "🔽" : "😊"}
                    </button>

                    {/* Expandable emoji toolbar */}
                    {isEmojiToolbarVisible && (
                        <div className="emoji-toolbar">
                            {emojis.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    className="emoji-button"
                                    onClick={() => addEmoji(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Text area with character limit */}
                    <textarea
                        ref={textAreaRef}
                        name="memory"
                        placeholder="Your memory"
                        value={newMemory}
                        onChange={handleChange}
                    />

                    {/* Character counter */}
                    <div className="character-counter">
                        {calculateLength(newMemory)}/{maxCharacters} characters
                    </div>

                    {/* Action buttons */}
                    <div className="button-container">
                        <button onClick={handleCreate}>Share Memory</button>
                        <button onClick={onClose}>Cancel</button>
                    </div>
                </div>
                
            </div>
        </div>
    );
}

export default MemoryModal;
