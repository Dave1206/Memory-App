// EventCreator.js
import React, { useState } from "react";
// import CreateModal from "../modals/CreateModal";
import EventComposer from "./EventComposer";
import '../../styles/EventCreator.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus} from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';

function EventCreator({ isMobile }) {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div className="nav-toggle" onClick={() => setShowModal(true)}>
                <div className={`nav-item-icon ${isMobile ? 'lg' : ''}`}><FontAwesomeIcon icon={faPlus} /></div> 
                {!isMobile &&<div className="nav-item-name">Create</div>}
            </div>
            {showModal && (
                <EventComposer key={`composer-${uuidv4()}`} show={showModal} onClose={() => setShowModal(false)} />
            )}
        </>
    );
}

export default EventCreator;
