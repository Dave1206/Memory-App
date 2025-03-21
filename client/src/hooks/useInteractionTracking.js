import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAxios } from '../components/auth/AxiosProvider';

const useInteractionTracking = (onInteractionEnd) => {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [targetPathname, setTargetPathname] = useState(null);
    const selectedEventRef = useRef(null);
    const { axiosInstance } = useAxios();
    const location = useLocation();

    const handleSelectEvent = async (event, path) => {
        try {
            await axiosInstance.post(`/events/${event.event_id}/start-interaction`);
            setSelectedEvent(event);
            selectedEventRef.current = event;
            setTargetPathname(path);
        } catch (error) {
            console.error('Error starting interaction:', error);
        }
    };

    const handleEndInteraction = useCallback(async () => {
        if (selectedEventRef.current) {
            try {
                await axiosInstance.post(`/events/${selectedEventRef.current.event_id}/end-interaction`);
                if (onInteractionEnd) onInteractionEnd(selectedEventRef.current);
            } catch (error) {
                console.error('Error ending interaction:', error);
            } finally {
                selectedEventRef.current = null;
                setSelectedEvent(null);
            }
        }
    }, [axiosInstance, onInteractionEnd]);

    const handleBackButton = () => {
        handleEndInteraction();
        setSelectedEvent(null);
    };

    useEffect(() => {
        const handleBeforeUnload = async () => {
            await handleEndInteraction();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            handleEndInteraction();
        };
    }, [handleEndInteraction]);

    useEffect(() => {
        if (!targetPathname) return;
        if (location.pathname !== targetPathname) {
            handleEndInteraction();
        }
    }, [handleEndInteraction, location.pathname, targetPathname]);

    return {
        selectedEvent,
        setSelectedEvent,
        handleSelectEvent,
        handleBackButton,
    };
};

export default useInteractionTracking;