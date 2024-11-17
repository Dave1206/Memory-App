import React, { useState } from 'react';
import { useAxios } from '../auth/AxiosProvider';
import '../../styles/EditProfile.css';

function EditProfile({ user, profileUser, onSave }) {
    const [bio, setBio] = useState(profileUser.bio || '');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const axiosInstance = useAxios();

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleBioChange = (e) => {
        setBio(e.target.value);
    };

    const handleSave = async () => {
        try {
            // Upload the new profile picture if selected
            if (selectedFile) {
                const formData = new FormData();
                formData.append('profilePic', selectedFile);

                const uploadResponse = await axiosInstance.post('/upload-profile-picture', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (uploadResponse.status === 200) {
                    setUploadStatus('Profile picture uploaded successfully.');
                } else {
                    setUploadStatus('Failed to upload profile picture.');
                }
            }

            // Update the bio
            const bioResponse = await axiosInstance.put(`/user/${profileUser.id}/bio`, { bio });
            if (bioResponse.status === 200) {
                onSave(); // Refresh profile data after saving
            }
        } catch (error) {
            console.error("Error saving profile changes:", error);
            setUploadStatus('Error saving profile changes.');
        }
    };

    const handleCancel = () => {
        setBio(profileUser.bio); // Reset bio to original state
        setSelectedFile(null);   // Clear selected file
        setUploadStatus('');     // Clear status message
    };

    return (
        <div className="edit-profile-container">
            <h2>Edit Profile</h2>
            
            {/* Profile Picture Upload */}
            <div className="profile-picture-section">
                <label htmlFor="profile-picture">Profile Picture:</label>
                <input 
                    type="file" 
                    id="profile-picture" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                />
                {uploadStatus && <p>{uploadStatus}</p>}
            </div>

            {/* Edit Bio */}
            <div className="bio-section">
                <label htmlFor="bio">About Me:</label>
                <textarea 
                    id="bio" 
                    value={bio} 
                    onChange={handleBioChange} 
                    maxLength={500} 
                    placeholder="Tell us about yourself"
                />
                <p>{bio.length}/500 characters</p>
            </div>

            {/* Save and Cancel Buttons */}
            <div className="button-container">
                <button onClick={handleSave} className="settings-button">Save</button>
                <button onClick={handleCancel} className="settings-button">Cancel</button>
            </div>
        </div>
    );
}

export default EditProfile;
