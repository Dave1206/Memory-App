import React, { useState, useEffect, useCallback } from 'react';
import Event from './Event';
import SearchAndFilter from '../SearchAndFilter';
import SelectedEvent from './SelectedEvent';
import '../../styles/Eventlist.css';
import useInteractionTracking from '../../hooks/useInteractionTracking';

function EventList({ events, getEvents, userId }) {
    const [filteredEvents, setFilteredEvents] = useState(events);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [sortOrder, setSortOrder] = useState("asc");
    const { selectedEvent, setSelectedEvent, handleSelectEvent, handleBackButton} = useInteractionTracking(null, '/events');

    useEffect(() => {
        setFilteredEvents(events);
    }, [events]);

    const updateEvents = useCallback(() => {
        getEvents();
        setSelectedEvent(null);
    }, [getEvents, setSelectedEvent]);

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
                                        handleClick={() => handleSelectEvent(event)}
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
                <SelectedEvent 
                    event={selectedEvent}
                    handleBackButton={handleBackButton}
                    getEvents={getEvents}
                />
            )}
        </div>
    );
}

export default EventList;
