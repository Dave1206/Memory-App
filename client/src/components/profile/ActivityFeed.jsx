import React, { useEffect, useState } from 'react';
import { useAxios } from '../auth/AxiosProvider';

function ActivityFeed({ userId }) {
    const [activities, setActivities] = useState([]);
    const { axiosInstance } = useAxios();

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const response = await axiosInstance.get(`/users/${userId}/activities`);
                setActivities(response.data);
            } catch (err) {
                console.error("Error fetching activity feed", err);
            }
        };
        fetchActivities();
    }, [userId, axiosInstance]);

    const renderActivityDescription = (activity) => {
        switch (activity.activity_type) {
            case 'create_event':
                return `Created a new event: ${activity.description}`;
            case 'share_memory':
                return `Shared a memory: ${activity.description}`;
            case 'add_friend':
                return `Added ${activity.description} as a friend`;
            case 'like_event':
                return `Liked the event: ${activity.description}`;
            case 'share_event':
                return `Shared an event: ${activity.description}`;
            // Add more cases as needed
            default:
                return activity.description;
        }
    };

    return (
        <div className="activity-feed">
            <h2>Recent Activities</h2>
            <ul>
                {activities.map((activity, index) => (
                    <li key={index}>{renderActivityDescription(activity)}</li>
                ))}
            </ul>
        </div>
    );
}

export default ActivityFeed;
