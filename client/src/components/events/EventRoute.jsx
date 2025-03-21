import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SelectedEvent from "./SelectedEvent";
import useInteractionTracking from "../../hooks/useInteractionTracking";
import { useAxios } from "../auth/AxiosProvider";

function EventRoute() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { axiosInstance} = useAxios();
    const [event, setEvent] = useState(null);

    const {
        handleSelectEvent,
        handleBackButton
    } = useInteractionTracking(null);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await axiosInstance.get(`/eventdata/${eventId}`);
                const eventData = response.data;
                await handleSelectEvent(eventData, `/event/${eventId}`);
                setEvent(eventData);
            } catch (err) {
                console.error("Failed to fetch event:", err);
                navigate("/home");
            }
        };

        fetchEvent();
    }, [axiosInstance, eventId, handleSelectEvent, navigate]);

    if (!event) return

    return (
        <SelectedEvent
            event={event}
            handleBackButton={() => {
                handleBackButton();
                navigate("/home");
            }}
            getEvents={() => {}}
        />
    );
}

export default EventRoute;
