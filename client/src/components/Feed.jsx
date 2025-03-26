import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAxios } from "./auth/AxiosProvider";
import { useAuth } from "./auth/AuthContext";
import { useEventUpdate } from "./events/EventContext";
import "../styles/Feed.css";
import useInteractionTracking from "../hooks/useInteractionTracking";
import SearchAndFilter from "./SearchAndFilter";
import FeedPost from "./FeedPost";
import backgroundLogo from "../assets/Logo_transparent.png";

function Feed({ onFeedTabView }) {
    const { axiosInstance,isPageLoaded } = useAxios();
    const { handleSelectEvent } = useInteractionTracking(null, "/feed");
    const { user } = useAuth();
    const { newEvent } = useEventUpdate();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("feed");
    const [content, setContent] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [sortOrder, setSortOrder] = useState("desc");
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
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
//runs fetchContent(true) which resets the feed data when switching tabs or search
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
//Makes sure that data is fetched once the page has fully loaded
    useEffect(() => {
        if (isPageLoaded) {
            fetchContent(true);
        }
    }, [isPageLoaded, fetchContent]);
//Inserts created events into the feed
    useEffect(() => {
        if (newEvent) {
            setContent((prevContent) => {
                const shouldInclude = (
                    (activeTab === "feed") ||
                    (activeTab === "myEvents") 
                );
    
                if (!shouldInclude) return prevContent;

                const updatedContent = [newEvent, ...prevContent];
                const uniqueContent = Array.from(new Map(updatedContent.map(post => [post.event_id, post])).values());

                return uniqueContent.sort((a, b) => {
                    if (filters.sortBy === "age_in_hours") {
                        return sortOrder === "asc"
                            ? a.age_in_hours - b.age_in_hours
                            : b.age_in_hours - a.age_in_hours;
                    }
                    if (filters.sortBy === "hot_score") {
                        return sortOrder === "asc" ? a.hot_score - b.hot_score : b.hot_score - a.hot_score;
                    }
                    if (filters.sortBy === "likes_count") {
                        return sortOrder === "asc" ? a.likes_count - b.likes_count : b.likes_count - a.likes_count;
                    }
                    if (filters.sortBy === "shares_count") {
                        return sortOrder === "asc" ? a.shares_count - b.shares_count : b.shares_count - a.shares_count;
                    }
                    if (filters.sortBy === "memories_count") {
                        return sortOrder === "asc" ? a.memories_count - b.memories_count : b.memories_count - a.memories_count;
                    }
                    return 0;
                });
            });
        }
    }, [newEvent, activeTab, filters, sortOrder, user]);

    useEffect(() => {
        if (activeTab === "feed" && typeof onFeedTabView === "function") {
          onFeedTabView();
        }
      }, [activeTab, onFeedTabView]);

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

    const handlePostClick = async (post) => {
        const path = `/event/${post.event_id}`;
            await handleSelectEvent(post, path);
            navigate(path);
    }

    return (
            <div className="feed-wrapper">
                <SearchAndFilter
                    onSearch={setSearchTerm}
                    onFilterChange={setFilters}
                    onSortOrderChange={setSortOrder}
                    sortOptions={[
                        { value: 'hot_score', label: 'Trending' },
                        { value: 'age_in_hours', label: 'New' },
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

                <div className="feed-bg" style={{
                            backgroundImage: `url(${backgroundLogo})`,
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                        }}>
                </div>
                    <div className="feed-container" ref={feedContainerRef}>
                        {content.length === 0 && !loading ? <p>No results...</p> : content.map((post) => (
                            <FeedPost
                                key={post.event_id}
                                post={post}
                                handleClick={() => handlePostClick(post)}
                                onLike={handleLike}
                                onShare={handleShare}
                                onAddEvent={handleOptIn}
                                onRemoveEvent={handleRemove}
                                onBlock={handleBlockUser}
                                colorClass={post.colorClass || postColorsRef.current[post.event_id]}
                            />
                        ))}
                    </div>
               
            </div>
    );
}

export default Feed;
