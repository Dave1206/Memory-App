import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAxios } from "./auth/AxiosProvider";
import "../styles/Feed.css";
import useInteractionTracking from "../hooks/useInteractionTracking";
import SearchAndFilter from "./SearchAndFilter";
import FeedPost from "./FeedPost";
import SelectedEvent from "./events/SelectedEvent";

function Feed({ getEvents }) {
    const { axiosInstance } = useAxios();
    const { selectedEvent, handleSelectEvent, handleBackButton } = useInteractionTracking(null, "/feed");

    const [activeTab, setActiveTab] = useState("feed");
    const [content, setContent] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [sortOrder, setSortOrder] = useState("desc");
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const postColorsRef = useRef({});
    const feedContainerRef = useRef(null);
    const isFirstRender = useRef(true);

    const tabEndpoints = useMemo(() => ({
        feed: "/feed",
        myEvents: "/events/mine",
        followedEvents: "/events/followed",
        trending: "/explore/trending",
        forYou: "/explore/personalized",
    }), []);

    const assignColors = useCallback((posts) => {
        const colors = ["color1", "color2", "color3"];
        let lastColor = null;
    
        posts.forEach((post) => {
            if (!postColorsRef.current[post.event_id]) {
                let availableColors = colors.filter(color => color !== lastColor);
                let selectedColor = availableColors[Math.floor(Math.random() * availableColors.length)];
                postColorsRef.current[post.event_id] = selectedColor;
                lastColor = selectedColor;
            }
        });
    }, []);
    
    const fetchContent = useCallback(async (reset = false) => {
        setLoading(prevLoading => {
            if (prevLoading || !tabEndpoints[activeTab]) return true;
            return true;
        });

        try {
            const response = await axiosInstance.get(tabEndpoints[activeTab], {
                params: {
                    search: searchTerm,
                    filters: JSON.stringify(filters),
                    sortOrder,
                    limit: 10,
                    offset: reset ? 0 : offset,
                },
            });

            const newData = response.data;
            setContent(prevContent => {
                if (reset) return newData;

                const updatedContent = [...prevContent, ...newData];
                const uniqueContent = Array.from(new Map(updatedContent.map(post => [post.event_id, post])).values());
                return uniqueContent;
            });

            setHasMore(newData.length === 10);
            setOffset(prevOffset => reset ? 10 : prevOffset + 10);
            assignColors(newData);
        } catch (error) {
            console.error(`Error fetching ${activeTab} data:`, error);
        } finally {
            setLoading(false);
        }
    }, [axiosInstance, searchTerm, filters, sortOrder, activeTab, offset, assignColors, tabEndpoints]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (feedContainerRef.current) {
            feedContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
        fetchContent(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, searchTerm, filters, sortOrder]);

    useEffect(() => {
        let debounceTimer;

        const handleScroll = () => {
            if (debounceTimer) clearTimeout(debounceTimer);

            debounceTimer = setTimeout(() => {
                if (!feedContainerRef.current) return;
                const { scrollTop, scrollHeight, clientHeight } = feedContainerRef.current;

                if (scrollTop + clientHeight >= scrollHeight - 200 && hasMore && !loading) {
                    fetchContent(false);
                }
            }, 300);
        };

        const container = feedContainerRef.current;
        if (container) {
            container.addEventListener("scroll", handleScroll);
        }

        return () => {
            if (container) container.removeEventListener("scroll", handleScroll);
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    }, [fetchContent, hasMore, loading]);

    return (
        !selectedEvent ? (
            <div className="feed-wrapper">
                <SearchAndFilter
                    onSearch={setSearchTerm}
                    onFilterChange={setFilters}
                    onSortOrderChange={setSortOrder}
                    filterOptions={[{ key: 'filterByType', label: '--Event Type--', options: [{ value: 'regular', label: 'Regular' }, { value: 'time_capsule', label: 'Time Capsule' }] }]}
                    sortOptions={[{ value: 'creation_date', label: 'Creation Date' }, { value: 'memories_count', label: 'Number of Memories' }, { value: 'likes_count', label: 'Likes' }]}
                />

                <div className="feed-nav">
                    {Object.entries({
                        feed: "Feed",
                        myEvents: "My Posts",
                        followedEvents: "Followed",
                        trending: "Trending",
                        forYou: "For You",
                    }).map(([tabKey, tabLabel]) => (
                        <button
                            key={tabKey}
                            className={`feed-nav-button ${activeTab === tabKey ? "active" : ""}`}
                            onClick={() => setActiveTab(tabKey)}
                        >
                            {tabLabel}
                        </button>
                    ))}
                </div>

                <div className="feed-container" ref={feedContainerRef}>
                    {content.length === 0 && !loading ? <p>No results...</p> : content.map((post) => (
                        <FeedPost
                            key={post.event_id}
                            post={post}
                            handleClick={() => handleSelectEvent(post)}
                            onLike={() => {}}
                            onShare={() => {}}
                            onAddEvent={() => {}}
                            onRemoveEvent={() => {}}
                            colorClass={postColorsRef.current[post.event_id]}
                        />
                    ))}
                </div>
            </div>
        ) : (
            <SelectedEvent event={selectedEvent} handleBackButton={handleBackButton} getEvents={getEvents} />
        )
    );
}

export default Feed;
