import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAxios } from './auth/AxiosProvider';
import '../styles/Explore.css';

import SearchAndFilter from './SearchAndFilter';
import ExplorePost from './ExplorePost';

function Explore() {
    const [trendingPosts, setTrendingPosts] = useState([]);
    const [personalizedPosts, setPersonalizedPosts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [sortOrder, setSortOrder] = useState("asc");
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

    const fetchPosts = useCallback(
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
                        offset
                    },
                });

                const data = response.data;

                setPosts((prevPosts) => {
                    const newPosts = [...prevPosts, ...data];
                    const uniquePosts = Array.from(new Map(newPosts.map(post => [post.event_id, post])).values());
                    return uniquePosts;
                });

                assignColors(data, colorsRef);

                if (data.length < 10) setHasMore(false);

                if (isTrending) setTrendingOffset((prev) => prev + 10);
                else setPersonalizedOffset((prev) => prev + 10);
            } catch (error) {
                console.error(`Error loading ${type} posts:`, error);
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
        fetchPosts("trending");
        fetchPosts("personalized");
    }, [fetchPosts, searchTerm, filters, sortOrder]);

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
                        fetchPosts(type);
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
    }, [fetchPosts, hasMoreTrending, hasMorePersonalized, loadingTrending, loadingPersonalized]);

    return (
        <div className="explore-wrapper">
            <SearchAndFilter
                onSearch={setSearchTerm}
                onFilterChange={setFilters}
                onSortOrderChange={setSortOrder}
                filterOptions={filterOptions}
                sortOptions={sortOptions}
            />
            <div className="explore-sections">
                <div className="explore-section">
                    <h2>What's Hot</h2>
                    <div className="explore-container" ref={trendingContainerRef}>
                        {trendingPosts.map((post) => (
                            <ExplorePost
                                key={post.event_id}
                                post={post}
                                colorClass={trendingColorsRef.current[post.event_id]}
                            />
                        ))}
                    </div>
                </div>
                <div className="explore-section">
                    <h2>For You</h2>
                    <div className="explore-container" ref={personalizedContainerRef}>
                        {personalizedPosts.length ? (
                            personalizedPosts.map((post) => (
                                <ExplorePost
                                    key={post.event_id}
                                    post={post}
                                    colorClass={personalizedColorsRef.current[post.event_id]}
                                />
                            ))
                        ) : (
                            <p>You must enable metadata and location-based recommendations to populate this section.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Explore;
