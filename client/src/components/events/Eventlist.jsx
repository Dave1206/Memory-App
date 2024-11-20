import React, { useState, useEffect, useCallback } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import Memory from './Memory';
import Event from './Event';
import SearchAndFilter from '../SearchAndFilter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import '../../styles/Eventlist.css';

function EventList({ events, getEvents, userId }) {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [memories, setMemories] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState(events);
    const [shared, setShared] = useState(false);
    const [isDescriptionVisible, setDescriptionVisible] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [sortOrder, setSortOrder] = useState("asc");
    const axiosInstance = useAxios();

    useEffect(() => {
        setFilteredEvents(events);
    }, [events]);

    const getMemories = async (eventId) => {
        try {
            const response = await axiosInstance.get(`/events/${eventId}/memories`);
            setMemories(response.data);
        } catch (err) {
            console.log("Error fetching memories: " + (err.response?.data || err.message));
        }
    };

    const updateEvents = useCallback(() => {
        getEvents();
        setSelectedEvent(null);
    }, [getEvents]);

    const updateSharedState = useCallback((newValue) => {
        setShared(newValue);
        getEvents();
    }, [getEvents]);

    const handleClick = (event) => {
        setSelectedEvent(event);
        setShared(event.has_shared_memory);
        getMemories(event.event_id);
    };

    const toggleDescription = () => {
        setDescriptionVisible((prev) => !prev);
    };

    const filterOptions = [
        {
            key: 'filterByType',
            label: '--Event Type--',
            options: [
                { value: 'regular', label: 'Regular' },
                { value: 'time_capsule', label: 'Time Capsule' },
            ]
        }
    ];

    const sortOptions = [
        { value: 'creation_date', label: 'Creation Date' },
        { value: 'memories_shared', label: 'Number of Memories' },
        { value: 'event_type', label: 'Event Type' }
    ];

    useEffect(() => {
        let updatedEvents = [...events];
        updatedEvents = updatedEvents.filter(
            (event) =>
                (event.title?.toLowerCase().includes(searchTerm.toLowerCase()) || "") ||
                (event.username?.toLowerCase().includes(searchTerm.toLowerCase()) || "") ||
                (event.description?.toLowerCase().includes(searchTerm.toLowerCase()) || "")
        );

        if (filters.filterByType) {
            updatedEvents = updatedEvents.filter((event) => event.event_type === filters.filterByType);
        }

        const isAsc = sortOrder === "asc";
        if (filters.sortBy === 'creation_date') {
            updatedEvents.sort((a, b) => isAsc ? 
                new Date(a.creation_date) - new Date(b.creation_date) :
                new Date(b.creation_date) - new Date(a.creation_date));
        } else if (filters.sortBy === 'memories_shared') {
            updatedEvents.sort((a, b) => isAsc ? 
                (a.memories_count || 0) - (b.memories_count || 0) :
                (b.memories_count || 0) - (a.memories_count || 0));
        } else if (filters.sortBy === 'event_type') {
            updatedEvents.sort((a, b) => isAsc ? 
                a.event_type.localeCompare(b.event_type) :
                b.event_type.localeCompare(a.event_type));
        }

        setFilteredEvents(updatedEvents);
    }, [searchTerm, filters, sortOrder, events]);

    return (
        <div className="event-wrapper">
            {!selectedEvent ? (
                <>
                    <SearchAndFilter
                        onSearch={setSearchTerm}
                        onFilterChange={(newFilters) => setFilters(newFilters)}
                        onSortOrderChange={setSortOrder}
                        filterOptions={filterOptions}
                        sortOptions={sortOptions}
                    />

                    <div className="event-list-container">
                        <div className="event-list">
                            {filteredEvents.map((event) => (
                                <div className="event-item-wrapper" key={event.event_id}>
                                    <Event
                                        id={event.event_id}
                                        userId={userId}
                                        handleClick={() => handleClick(event)}
                                        event={event}
                                        updateEvents={updateEvents}
                                        selected={false}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div className="selected-event">
                    <button className="back-button" onClick={() => setSelectedEvent(null)}>
                        Back to Events
                    </button>
                    <h2>{selectedEvent.title}</h2>
                    <div>{`by ${selectedEvent.username}`}
                        <div
                            className="description-toggle-link"
                            onClick={toggleDescription}
                        >   description
                            <span className="arrow">
                                {isDescriptionVisible ? <FontAwesomeIcon icon={faChevronUp} /> : <FontAwesomeIcon icon={faChevronDown} />}
                            </span>
                        </div>
                    </div>
                    {isDescriptionVisible && (
                        <div className="description">{selectedEvent.description}</div>
                    )}
                    {selectedEvent.reveal_date < Date.now() ? (
                        <div className='memories-container'>
                            <Memory
                                key={selectedEvent.event_id}
                                eventId={selectedEvent.event_id}
                                userId={userId}
                                event={selectedEvent}
                                hasShared={shared}
                                getMemories={getMemories}
                                updateSharedState={updateSharedState}
                                memories={memories}
                            />
                        </div>
                    ) : (
                        <h3>{`This time capsule will open on ${new Date(selectedEvent.reveal_date).toLocaleDateString()}`}</h3>
                    )}
                </div>
            )}
        </div>
    );
}

export default EventList;
