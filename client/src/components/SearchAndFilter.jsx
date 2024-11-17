import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import '../styles/SearchAndFilter.css';

function SearchAndFilter({ onSearch, onFilterChange, onSortOrderChange, filterOptions, sortOptions }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [sortOrder, setSortOrder] = useState("asc");

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

    const filteredSortOptions = filters.filterByType
        ? sortOptions.filter(option => option.value !== "event_type")
        : sortOptions;

    return (
        <div className="search-filter-wrapper">
            <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-bar"
            />

            {filterOptions.map((filter) => (
                <select
                    key={filter.key}
                    value={filters[filter.key] || ""}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="filter-dropdown"
                >
                    <option value="">{filter.label}</option>
                    {filter.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ))}

            <div className="sort-controls">
                <select
                    value={filters.sortBy || ""}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="sort-dropdown"
                >
                    <option value="">--Sort By--</option>
                    {filteredSortOptions.map((option) => (
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
    );
}

export default SearchAndFilter;