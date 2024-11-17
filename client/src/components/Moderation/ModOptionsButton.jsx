import React from "react";
import { useAxios } from '../auth/AxiosProvider';
import { useAuth } from "../auth/AuthContext";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGavel } from '@fortawesome/free-solid-svg-icons';

function ModOptionsButton({ type, contentId, onContentRemoved }) {
    const axiosInstance = useAxios();
    const { user } = useAuth();

    const handleRemoveContent = async () => {
        try {
            const response = await axiosInstance.delete(`/moderate/remove/${type}/${contentId}`);
            if (response.status === 200) {
                alert(`${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully.`);
                onContentRemoved && onContentRemoved(contentId); // Trigger a callback if provided to update the UI
            }
        } catch (error) {
            console.error("Error removing content:", error);
            alert("Failed to remove content. Please try again.");
        }
    };

    return (
        user.isModerator && (
            <button className="mod-button" onClick={handleRemoveContent}>
                <FontAwesomeIcon icon={faGavel} />
            </button>
        )
    );
}

export default ModOptionsButton;
