import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faSortUp, faSortDown, faSearch } from '@fortawesome/free-solid-svg-icons';
import '../styles/SearchAndFilter.css';

function SearchAndFilter({ onSearch, onFilterChange, onSortOrderChange, sortOptions }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [sortOrder, setSortOrder] = useState("desc");
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSearch = (event) => {
        const value = event.target.value;
        setSearchTerm(value);
        onSearch(value);
    };

    const handleFilterChange = (filterKey, value) => {
        setFilters((prevFilters) => {
            const newFilters = { ...prevFilters, [filterKey]: value };
            onFilterChange(newFilters, sortOrder);
            return newFilters;
        });
    };

    const handleSortChange = (value) => {
        handleFilterChange("sortBy", value);
    };

    const toggleSortOrder = () => {
        const newSortOrder = sortOrder === "asc" ? "desc" : "asc";
        setSortOrder(newSortOrder);
        onSortOrderChange(newSortOrder);
    };

    return (
        <div className="search-filter-container">
            <button
                className="toggle-button"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
            >
                <FontAwesomeIcon icon={faFilter} />
            </button>
            {isExpanded && (
                <div className="search-filter-wrapper">
                    <div className="search-bar-container">
                        <FontAwesomeIcon icon={faSearch} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="search-bar"
                        />
                    </div>
                
                    <div className="sort-controls">
                        <select
                            value={filters.sortBy || ""}
                            onChange={(e) => handleSortChange(e.target.value)}
                            className="sort-dropdown"
                        >
                            <option value="">--Sort By--</option>
                            {sortOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button onClick={toggleSortOrder} className="sort-order-button">
                            <FontAwesomeIcon icon={sortOrder === "asc" ? faSortUp : faSortDown} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SearchAndFilter;
