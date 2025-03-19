import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAxios } from "./auth/AxiosProvider";
import { useAuth } from "./auth/AuthContext";
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

    const { user } = useAuth();
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

    const updatePostInFeed = (postId, updateData) => {
        setContent((prevFeed) =>
            prevFeed.map((post) =>
                post.event_id === postId
                    ? typeof updateData === 'function'
                        ? { ...post, ...updateData(post) }
                        : { ...post, ...updateData }
                    : post
            )
        );
    };

    const handleLike = async (postId) => {
        try {
            await axiosInstance.post(`/events/${postId}/like`);
            updatePostInFeed(postId, (prevPost) => ({
                has_liked: !prevPost.has_liked,
                likes_count: prevPost.has_liked ? Number(prevPost.likes_count) - 1 : Number(prevPost.likes_count) + 1,
            }));
        } catch (error) {
            console.error('Error liking the event:', error);
        }
    };

    const handleShare = async (postId) => {
        try {
            await axiosInstance.post(`/events/${postId}/share`);
            updatePostInFeed(postId, (prevPost) => ({
                has_shared_event: !prevPost.has_shared_event,
                shares_count: Number(prevPost.shares_count) + 1,
            }));
        } catch (error) {
            console.error('Error sharing the event:', error);
        }
    };

    const handleOptIn = async (postId) => {
        try {
            await axiosInstance.post(`/events/${postId}/opt-in`);
            updatePostInFeed(postId, { event_status: 'opted_in' });
        } catch (error) {
            console.error('Error opting into the event:', error);
        }
    };

    const handleRemove = async (postId) => {
        try {
            const response = await axiosInstance.post(`/deleteevent/${postId}`);
            const { isCreator } = response.data;
    
            setContent((prevFeed) => {
                if (isCreator) {
                    return prevFeed.filter((post) => post.event_id !== postId);
                } else {
                    return prevFeed.map((post) =>
                        post.event_id === postId
                            ? { ...post, event_status: null }
                            : post
                    );
                }
            });
            fetchContent(true);
        } catch (error) {
            console.error('Error removing participation or event:', error);
        }
    };    

    const handleBlockUser = async (blockedId, e) => {
        try {
            await axiosInstance.post('/block-user', {
                userId: user.id,
                blockedId: blockedId,
            });
            alert('User has been blocked.');
        } catch (err) {
            console.error('Error blocking user:', err);
        }
    };

    return (
        !selectedEvent ? (
            <div className="feed-wrapper">
                <SearchAndFilter
                    onSearch={setSearchTerm}
                    onFilterChange={setFilters}
                    onSortOrderChange={setSortOrder}
                    sortOptions={[
                        { value: 'age_in_hours', label: 'New' },
                        { value: 'hot_score', label: 'Trending' },
                        { value: 'likes_count', label: 'Likes' },
                        { value: 'shares_count', label: 'Shares' },
                        { value: 'memories_count', label: 'Memories' }
                    ]}
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
                            onLike={handleLike}
                            onShare={handleShare}
                            onAddEvent={handleOptIn}
                            onRemoveEvent={handleRemove}
                            onBlock={handleBlockUser}
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
