// EventCreator.js
import React, { useState } from "react";
import CreateModal from "../modals/CreateModal";
import '../../styles/EventCreator.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus} from '@fortawesome/free-solid-svg-icons';

function EventCreator({ userId, isMobile }) {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div className="nav-toggle" onClick={() => setShowModal(true)}>
                <div className={`nav-item-icon ${isMobile ? 'lg' : ''}`}><FontAwesomeIcon icon={faPlus} /></div> 
                {!isMobile &&<div className="nav-item-name">Create</div>}
            </div>
            {showModal && (
                <CreateModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    userId={userId}
                />
            )}
        </>
    );
}

export default EventCreator;
