import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import '../../styles/MemoryModal.css';

function MemoryModal({ show, onClose, onCreate, eventId }) {
    const [newMemory, setNewMemory] = useState("");
    const [isEmojiToolbarVisible, setIsEmojiToolbarVisible] = useState(false);
    const textAreaRef = useRef(null);
    const maxCharacters = 200;

    const emojis = ["😊", "😢", "😂", "😎", "🎉", "❤️", "👍", "🙌", "💡"];

    const calculateLength = (str) => [...str].length;

    const addEmoji = (emoji) => {
        const textArea = textAreaRef.current;
        const cursorPosition = textArea.selectionStart;
        const updatedMemory = 
            newMemory.slice(0, cursorPosition) + emoji + newMemory.slice(cursorPosition);

        if (calculateLength(updatedMemory) <= maxCharacters) {
            setNewMemory(updatedMemory);

            setTimeout(() => {
                textArea.selectionStart = textArea.selectionEnd = cursorPosition + emoji.length;
                textArea.focus();
            }, 0);
        }
    };

    const handleChange = (e) => {
        const inputText = e.target.value;
        if (calculateLength(inputText) <= maxCharacters) {
            setNewMemory(inputText);
        } else {
            const trimmedText = [...inputText].slice(0, maxCharacters).join('');
            setNewMemory(trimmedText);
        }
    };

    const handleCreate = () => {
        onCreate(newMemory);
        setNewMemory("");
        onClose();
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
                    <h2>What do you remember of this event?</h2>

                    <button 
                        type="button" 
                        className="emoji-toggle-button" 
                        onClick={() => setIsEmojiToolbarVisible(!isEmojiToolbarVisible)}
                        aria-label="Toggle Emoji Toolbar"
                    >
                        {isEmojiToolbarVisible ? <FontAwesomeIcon icon={faChevronDown} /> : "😊"}
                    </button>

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

                    <textarea
                        ref={textAreaRef}
                        name="memory"
                        placeholder="Your memory"
                        value={newMemory}
                        onChange={handleChange}
                    />

                    <div className="character-counter">
                        {calculateLength(newMemory)}/{maxCharacters} characters
                    </div>

                    <div className="button-container">
                        <button className='modal-button' onClick={handleCreate}>Share Memory</button>
                        <button className='modal-button'  onClick={onClose}>Cancel</button>
                    </div>
                </div>
                
            </div>
        </div>
    );
}

export default MemoryModal;
