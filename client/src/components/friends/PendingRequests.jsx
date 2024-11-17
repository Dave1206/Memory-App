import React, { useState, useEffect } from 'react';
import { useAxios } from '../auth/AxiosProvider.jsx'

function PendingRequests({ userId }) {
    const [requests, setRequests] = useState([]);
    const axiosInstance = useAxios();

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await axiosInstance.get(`/friends/requests/${userId}`);
                setRequests(response.data);
            } catch (error) {
                console.error('Error fetching requests:', error);
            }
        };
        fetchRequests();
    }, [userId]);

    const handleAccept = async (friendId) => {
        try {
            await axiosInstance.post('/friends/accept', { userId, friendId });
            setRequests(requests.filter((request) => request.id !== friendId));
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    };

    const handleReject = async (friendId) => {
        try {
            await axiosInstance.post('/friends/reject', { userId, friendId });
            setRequests(requests.filter((request) => request.id !== friendId));
        } catch (error) {
            console.error('Error rejecting friend request:', error);
        }
    };

    return (
        <div>
            <h2>Pending Friend Requests</h2>
            <ul>
                {requests.map((request) => (
                    <li key={request.id}>
                        {request.username}
                        <button onClick={() => handleAccept(request.id)}>Accept</button>
                        <button onClick={() => handleReject(request.id)}>Reject</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default PendingRequests;
