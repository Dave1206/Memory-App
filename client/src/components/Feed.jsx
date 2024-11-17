import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAxios } from './auth/AxiosProvider';
import { useAuth } from './auth/AuthContext';
import '../styles/Feed.css';

import SearchAndFilter from './SearchAndFilter';
import FeedPost from './FeedPost';

function Feed() {
    const [feed, setFeed] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [sortOrder, setSortOrder] = useState("asc");
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const axiosInstance = useAxios();
    const { user } = useAuth();

    const postColorsRef = useRef({});
    const feedContainerRef = useRef(null);

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

    const assignColors = useCallback((posts) => {
        const colors = ["color1", "color2", "color3", "color4", "color5", "color6", "color7", "color8", "color9"];
        posts.forEach((post) => {
            if (!postColorsRef.current[post.event_id]) {
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                postColorsRef.current[post.event_id] = randomColor;
            }
        });
    }, []);

    const initialFetchFeed = useCallback(async () => {
        setLoading(true);
        setHasMore(true);
        setOffset(10);

        try {
            const response = await axiosInstance.get('/feed', {
                params: {
                    search: searchTerm,
                    filters: JSON.stringify(filters),
                    sortOrder,
                    limit: 10,
                    offset: 0
                },
            });
            setFeed(response.data);
            assignColors(response.data);
            if (response.data.length < 10) setHasMore(false);
        } catch (error) {
            console.error("Error fetching feed data:", error);
        } finally {
            setLoading(false);
        }
    }, [axiosInstance, searchTerm, filters, sortOrder, assignColors]);

    const loadMoreFeed = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);

        try {
            const response = await axiosInstance.get('/feed', {
                params: {
                    search: searchTerm,
                    filters: JSON.stringify(filters),
                    sortOrder,
                    limit: 10,
                    offset
                },
            });
            
            if (response.data.length < 10) setHasMore(false);

            setFeed((prevFeed) => {
                const newFeed = [...prevFeed, ...response.data];
                const uniqueFeed = Array.from(new Map(newFeed.map(post => [post.event_id, post])).values());
                return uniqueFeed;
            });
            
            assignColors(response.data);
            setOffset((prevOffset) => prevOffset + 10);
        } catch (error) {
            console.error("Error loading more feed data:", error);
        } finally {
            setLoading(false);
        }
    }, [axiosInstance, searchTerm, filters, sortOrder, offset, hasMore, loading, assignColors]);

    useEffect(() => {
        initialFetchFeed();
    }, [initialFetchFeed, searchTerm, filters, sortOrder]);

    useEffect(() => {
        function debounce(func, delay) {
            let debounceTimer;
            return function(...args) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => func.apply(this, args), delay);
            };
        }
        
        const handleScroll = debounce(() => {
            if (feedContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = feedContainerRef.current;
                if (scrollTop + clientHeight >= scrollHeight - 200 && hasMore && !loading) {
                    loadMoreFeed();
                }
            }
        }, 300);

        const feedContainer = feedContainerRef.current;

        if (feedContainer) {
            feedContainer.addEventListener("scroll", handleScroll);
        }
    
        return () => {
            if (feedContainer) {
                feedContainer.removeEventListener("scroll", handleScroll);
            }
        };
    }, [loadMoreFeed, hasMore, loading]);

    const updatePostInFeed = (postId, updateData) => {
        setFeed((prevFeed) =>
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
                likes_count: prevPost.has_liked ? prevPost.likes_count - 1 : prevPost.likes_count + 1,
            }));
        } catch (error) {
            console.error('Error liking the event:', error);
        }
    };

    const handleShare = async (postId) => {
        try {
            await axiosInstance.post(`/events/${postId}/share`);
            updatePostInFeed(postId, (prevPost) => ({
                shares_count: prevPost.shares_count + 1,
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

    const handleRemoveParticipationOrEvent = async (postId) => {
        try {
            const response = await axiosInstance.post(`/deleteevent/${postId}`);
            const { isCreator } = response.data;

            if (isCreator) {
                setFeed((prevFeed) => prevFeed.filter((post) => post.event_id !== postId));
            } else {
                updatePostInFeed(postId, { event_status: null });
            }
        } catch (error) {
            console.error('Error removing participation or event:', error);
        }
    };

    const handleBlockUser = async (blockedId, e) => {
        e.stopPropagation();
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

    if (feed.length === 0 && !loading) return (
        <div className='feed-wrapper'>
            <SearchAndFilter
                onSearch={setSearchTerm}
                onFilterChange={setFilters}
                onSortOrderChange={setSortOrder}
                filterOptions={filterOptions}
                sortOptions={sortOptions}
            />
            <p>No results...</p>
        </div>
    );

    return (
        <div className="feed-wrapper">
            <SearchAndFilter
                onSearch={setSearchTerm}
                onFilterChange={setFilters}
                onSortOrderChange={setSortOrder}
                filterOptions={filterOptions}
                sortOptions={sortOptions}
            />
            <div className='feed-header-and-container'>
                <h2>Latest Posts</h2>
                <div className="feed-container" ref={feedContainerRef}>
                    {feed.map((post) => (
                        <FeedPost 
                            key={post.event_id}
                            post={post}
                            onLike={handleLike}
                            onShare={handleShare}
                            onAddEvent={handleOptIn}
                            onRemoveEvent={() => handleRemoveParticipationOrEvent(post.event_id)}
                            onBlock={handleBlockUser}
                            colorClass={postColorsRef.current[post.event_id]}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Feed;
