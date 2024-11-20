import React, { useState } from 'react';

function InviteModal({ show, onClose, onConfirm, eventId }) {
    const [input, setInput] = useState("");
    
    const handleConfirm = () => {
        console.log("logging input:", input);

        let tempStr = input.trim();
        if (tempStr.includes(" ")) tempStr = tempStr.replace(/ /g, "");
        const inviteList = tempStr.includes(",") ? tempStr.split(",") : [tempStr];
      
        console.log("Current invites:", inviteList);
      
        onConfirm(inviteList);
        onClose();
      };
    

    if (!show) {
        return null;
    }

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <div className='modal-left-column'>
                    <h2>Enter the usernames of who you would like to invite.
                        If there are multiple, separate them by commas.
                    </h2>
                    <textarea
                        name="input"
                        placeholder="Usernames separated by commas: John_doe, Jane_doe, Cool_dude549"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button onClick={handleConfirm}>Send Invites</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

export default InviteModal;