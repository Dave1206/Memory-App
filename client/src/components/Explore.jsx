import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAxios } from './auth/AxiosProvider';
import '../styles/Explore.css';
import SearchAndFilter from './SearchAndFilter';
import ExplorePost from './ExplorePost';
import SelectedEvent from './events/SelectedEvent';

function Explore({ getEvents }) {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [activeTab, setActiveTab] = useState("trending");
    const [trendingPosts, setTrendingPosts] = useState([]);
    const [personalizedPosts, setPersonalizedPosts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [sortOrder, setSortOrder] = useState("desc");
    const [trendingOffset, setTrendingOffset] = useState(0);
    const [personalizedOffset, setPersonalizedOffset] = useState(0);
    const [loadingTrending, setLoadingTrending] = useState(false);
    const [loadingPersonalized, setLoadingPersonalized] = useState(false);
    const [hasMoreTrending, setHasMoreTrending] = useState(true);
    const [hasMorePersonalized, setHasMorePersonalized] = useState(true);

    const axiosInstance = useAxios();

    const trendingColorsRef = useRef({});
    const personalizedColorsRef = useRef({});
    const trendingContainerRef = useRef(null);
    const personalizedContainerRef = useRef(null);

    const handleTabClick = (tab) => {
        setActiveTab(tab);
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
        { value: 'memories_count', label: 'Number of Memories' },
        { value: 'likes_count', label: 'Event Type' }
    ];

    const assignColors = useCallback((posts, ref) => {
        const colors = ["color1", "color2", "color3", "color4", "color5", "color6", "color7", "color8", "color9"];
        posts.forEach((post) => {
            if (!ref.current[post.event_id]) {
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                ref.current[post.event_id] = randomColor;
            }
        });
    }, []);

    const initialFetchPosts = useCallback(async () => {
        try {
            const [trendingResponse, personalizedResponse] = await Promise.all([
                axiosInstance.get("/explore/trending", {
                    params: {
                        search: searchTerm,
                        filters: JSON.stringify(filters),
                        sortOrder,
                        limit: 10,
                        offset: 0,
                    },
                }),
                axiosInstance.get("/explore/personalized", {
                    params: {
                        search: searchTerm,
                        filters: JSON.stringify(filters),
                        sortOrder,
                        limit: 10,
                        offset: 0,
                    },
                }),
            ]);

            setTrendingPosts(trendingResponse.data);
            setPersonalizedPosts(personalizedResponse.data);
            assignColors(trendingResponse.data, trendingColorsRef);
            assignColors(personalizedResponse.data, personalizedColorsRef);
            setTrendingOffset(10);
            setPersonalizedOffset(10);
            setHasMoreTrending(trendingResponse.data.length === 10);
            setHasMorePersonalized(personalizedResponse.data.length === 10);
        } catch (error) {
            console.error("Error during initial fetch:", error);
        }
    }, [axiosInstance, searchTerm, filters, sortOrder, assignColors]);

    const loadMorePosts = useCallback(
        async (type) => {
            const isTrending = type === "trending";
            const setPosts = isTrending ? setTrendingPosts : setPersonalizedPosts;
            const setLoading = isTrending ? setLoadingTrending : setLoadingPersonalized;
            const setHasMore = isTrending ? setHasMoreTrending : setHasMorePersonalized;
            const offset = isTrending ? trendingOffset : personalizedOffset;
            const colorsRef = isTrending ? trendingColorsRef : personalizedColorsRef;
            const endpoint = isTrending ? "/explore/trending" : "/explore/personalized";
    
            if ((isTrending && loadingTrending) || (!isTrending && loadingPersonalized)) return;
    
            setLoading(true);
            try {
                const response = await axiosInstance.get(endpoint, {
                    params: {
                        search: searchTerm,
                        filters: JSON.stringify(filters),
                        sortOrder,
                        limit: 10,
                        offset,
                    },
                });
    
                const data = response.data;
    
                setPosts((prevPosts) => {
                    const newPosts = [...prevPosts, ...data];
                    return Array.from(new Map(newPosts.map(post => [post.event_id, post])).values());
                });
    
                assignColors(data, colorsRef);
    
                if (data.length < 10) setHasMore(false);
                if (isTrending) setTrendingOffset((prev) => prev + 10);
                else setPersonalizedOffset((prev) => prev + 10);
            } catch (error) {
                console.error(`Error loading more ${type} posts:`, error);
            } finally {
                setLoading(false);
            }
        },
        [
            axiosInstance,
            assignColors,
            searchTerm,
            filters,
            sortOrder,
            trendingOffset,
            personalizedOffset,
            loadingTrending,
            loadingPersonalized,
        ]
    );
    

    useEffect(() => {
        initialFetchPosts();
    }, [initialFetchPosts]);

    useEffect(() => {
        function debounce(func, delay) {
            let debounceTimer;
            return function (...args) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => func.apply(this, args), delay);
            };
        }

        const handleScroll = (type) =>
            debounce(() => {
                const containerRef = type === "trending" ? trendingContainerRef : personalizedContainerRef;
                const hasMore = type === "trending" ? hasMoreTrending : hasMorePersonalized;
                const loading = type === "trending" ? loadingTrending : loadingPersonalized;

                if (containerRef.current) {
                    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
                    if (scrollTop + clientHeight >= scrollHeight - 200 && hasMore && !loading) {
                        loadMorePosts(type);
                    }
                }
            }, 300);

        const trendingContainer = trendingContainerRef.current;
        const personalizedContainer = personalizedContainerRef.current;

        if (trendingContainer) trendingContainer.addEventListener("scroll", handleScroll("trending"));
        if (personalizedContainer) personalizedContainer.addEventListener("scroll", handleScroll("personalized"));

        return () => {
            if (trendingContainer) trendingContainer.removeEventListener("scroll", handleScroll("trending"));
            if (personalizedContainer) personalizedContainer.removeEventListener("scroll", handleScroll("personalized"));
        };
    }, [loadMorePosts, hasMoreTrending, hasMorePersonalized, loadingTrending, loadingPersonalized]);

    const updatePostInFeed = (postId, updateData, isTrending) => {
        const setPosts = isTrending ? setTrendingPosts : setPersonalizedPosts;
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.event_id === postId
                    ? typeof updateData === 'function'
                        ? { ...post, ...updateData(post) }
                        : { ...post, ...updateData }
                    : post
            )
        );
    };    
   
    const handleLike = async (postId, type) => {
        const isTrending = type === 'trending';
        try {
            await axiosInstance.post(`/events/${postId}/like`);
            updatePostInFeed(postId, (prevPost) => ({
                has_liked: !prevPost.has_liked,
                likes_count: prevPost.has_liked ? Number(prevPost.likes_count) - 1 : Number(prevPost.likes_count) + 1,
            }), isTrending);
        } catch (error) {
            console.error('Error liking the event:', error);
        }
    };

    const handleShare = async (postId, type) => {
        const isTrending = type === 'trending';
        try {
            await axiosInstance.post(`/events/${postId}/share`);
            updatePostInFeed(postId, (prevPost) => ({
                has_shared_event: !prevPost.has_shared_event,
                shares_count: Number(prevPost.shares_count) + 1,
            }), isTrending);
        } catch (error) {
            console.error('Error sharing the event:', error);
        }
    };

    const handleOptIn = async (postId, type) => {
        const isTrending = type === 'trending';
        try {
            await axiosInstance.post(`/events/${postId}/opt-in`);
            updatePostInFeed(postId, { event_status: 'opted_in' }, isTrending);
        } catch (error) {
            console.error('Error opting into the event:', error);
        }
    };

    const handleRemoveParticipationOrEvent = async (postId, type) => {
        const isTrending = type === 'trending';
        try {
            const response = await axiosInstance.post(`/deleteevent/${postId}`);
            const { isCreator } = response.data;

            if (isCreator) {
                const setPosts = isTrending ? setTrendingPosts : setPersonalizedPosts;
                const posts = isTrending ? trendingPosts : personalizedPosts;

                setPosts(posts.filter((post) => post.event_id !== postId));
            } else {
                updatePostInFeed(postId, { event_status: null }, isTrending);
            }
        } catch (error) {
            console.error('Error removing participation or event:', error);
        }
    };

    const handleBlockUser = async (blockedId, e) => {
        e.stopPropagation();
        try {
            await axiosInstance.post('/block-user', {
                blockedId: blockedId,
            });
            alert('User has been blocked.');
        } catch (err) {
            console.error('Error blocking user:', err);
        }
    };

    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
    };

    const handleBackButton = () => {
        setSelectedEvent(null);
    };

    return (
        !selectedEvent ? (
        <div className="explore-wrapper">
            <SearchAndFilter
                onSearch={setSearchTerm}
                onFilterChange={setFilters}
                onSortOrderChange={setSortOrder}
                filterOptions={filterOptions}
                sortOptions={sortOptions}
            />
            <div className="explore-tabs">
                <button
                    className={`explore-tab-button ${activeTab === "trending" ? "active-explore-tab" : ""}`}
                    onClick={() => handleTabClick("trending")}
                >
                    What's Hot
                </button>
                <button
                    className={`explore-tab-button ${activeTab === "personalized" ? "active-explore-tab" : ""}`}
                    onClick={() => handleTabClick("personalized")}
                >
                    For You
                </button>
            </div>
            <div className="explore-sections">
                {activeTab === "trending" && (
                    <div className="explore-container" ref={trendingContainerRef}>
                        {trendingPosts.map((post) => (
                            <ExplorePost
                                key={post.event_id}
                                post={post}
                                handleClick={() => handleSelectEvent(post)}
                                colorClass={trendingColorsRef.current[post.event_id]}
                                onLike={() => handleLike(post.event_id, 'trending')}
                                onShare={() => handleShare(post.event_id, 'trending')}
                                onAddEvent={() => handleOptIn(post.event_id, 'trending')}
                                onRemoveEvent={() => handleRemoveParticipationOrEvent(post.event_id, 'trending')}
                                onBlock={handleBlockUser}
                            />
                        ))}
                    </div>
                )}

                {activeTab === "personalized" && (
                   <div className="explore-container" ref={personalizedContainerRef}>
                        {personalizedPosts.length ? (
                            personalizedPosts.map((post) => (
                                <ExplorePost
                                    key={post.event_id}
                                    post={post}
                                    handleClick={() => handleSelectEvent(post)}
                                    colorClass={personalizedColorsRef.current[post.event_id]}
                                    onLike={() => handleLike(post.event_id, 'personalized')}
                                    onShare={() => handleShare(post.event_id, 'personalized')}
                                    onAddEvent={() => handleOptIn(post.event_id, 'personalized')}
                                    onRemoveEvent={() => handleRemoveParticipationOrEvent(post.event_id, 'trending')}
                                    onBlock={handleBlockUser}
                                />
                            ))
                        ) : (
                            <p>You must enable metadata and location-based recommendations to populate this section.</p>
                        )}
                    </div>
                )}
            </div>
        </div> ) : (
            <SelectedEvent 
                event={selectedEvent}
                handleBackButton={handleBackButton}
                getEvents={getEvents}
            />
        )
    );
}

export default Explore;
