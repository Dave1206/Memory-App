import React, { useState } from 'react';
import { useAxios } from '../auth/AxiosProvider';

function ProfilePictureUpload() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const axiosInstance = useAxios();

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('profilePic', selectedFile);

        try {
            const response = await axiosInstance.post('/upload-profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUploadStatus(response.data.message);
        } catch (error) {
            setUploadStatus('Error uploading file');
        }
    };

    return (
        <div>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload Profile Picture</button>
            <p>{uploadStatus}</p>
        </div>
    );
}

export default ProfilePictureUpload;
