import React, { useState, useEffect, useCallback } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import Memory from './Memory';
import Event from './Event';
import SearchAndFilter from '../SearchAndFilter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import '../../styles/Eventlist.css';

function EventList({ events, getEvents, userId }) {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [memories, setMemories] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState(events);
    const [shared, setShared] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [sortOrder, setSortOrder] = useState("asc"); // 'asc' or 'desc'
    const axiosInstance = useAxios();

    useEffect(() => {
        setFilteredEvents(events);
    }, [events]);

    const handleToggleExpand = () => {
        setExpanded(!expanded);
    };

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
        if (selectedEvent !== event) {
            setSelectedEvent(event);
            setShared(event.has_shared);
            getMemories(event.event_id);
        } else {
            setSelectedEvent(null);
        }
    };

    useEffect(() => {
        updateEvents();
    }, [updateEvents]);

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

    return (
        <div className={`event-wrapper ${expanded ? 'expanded' : ''}`}>
            <SearchAndFilter
                onSearch={setSearchTerm}
                onFilterChange={(newFilters) => setFilters(newFilters)}
                onSortOrderChange={setSortOrder}
                filterOptions={filterOptions}
                sortOptions={sortOptions}
            />

            <div className={`event-list-container ${expanded ? 'expanded' : ''}`}>
                <div className={`event-list ${expanded ? 'expanded' : ''}`}>
                    {filteredEvents.map((event) => (
                        <div className="event-item-wrapper" key={event.event_id}>
                            <Event
                                id={event.event_id}
                                userId={userId}
                                handleClick={() => handleClick(event)}
                                event={event}
                                updateEvents={updateEvents}
                                selected={selectedEvent ? event.event_id === selectedEvent.event_id : null}
                            />
                        </div>
                    ))}
                </div>
                <button className="expand-button" onClick={handleToggleExpand}>
                    <FontAwesomeIcon
                        icon={faChevronRight}
                        style={{
                            transform: expanded ? 'rotate(180deg)' : 'rotate(0)'
                        }}
                    />
                </button>
            </div>

            {selectedEvent ? (
                selectedEvent.reveal_date < Date.now() ? (
                    <div className="selected-event">
                        <h2>Selected Event: {selectedEvent.title}</h2>
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
                    <div className="selected-event">
                        <h2>Selected Event: {selectedEvent.title}</h2>
                        <h2>{`This time capsule will open on ${new Date(selectedEvent.reveal_date).toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        })}`}</h2> 
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
                )
            ) : (
                <div className="selected-event">
                    <h2>Once you select an event it will appear here.</h2>
                </div>
            )}
        </div>
    );
}

export default EventList;