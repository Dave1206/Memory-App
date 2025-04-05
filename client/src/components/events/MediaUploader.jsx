import React, { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faVideo, faTimes } from "@fortawesome/free-solid-svg-icons";
import { useAxios } from "../auth/AxiosProvider";
import { v4 as uuidv4 } from 'uuid';
import "../../styles/MediaUploader.css";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const MediaUploader = ({ visibility, onRegisterUpload }) => {
  const { axiosInstance } = useAxios();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = (selectedFiles) => {
    const newFiles = Array.from(selectedFiles);
    const currentImages = files.filter(f => f.type.startsWith('image'));
    const currentVideo = files.find(f => f.type.startsWith('video'));

    for (const file of newFiles) {
      if (!['image/jpeg', 'image/png', 'video/mp4'].includes(file.type)) {
        return setError("Only JPG, PNG, or MP4 files are allowed.");
      }
      if (file.type.startsWith('image')) {
        if (file.size > MAX_IMAGE_SIZE) {
          return setError("Each image must be under 5MB.");
        }
        if (currentImages.length + newFiles.filter(f => f.type.startsWith('image')).length > 2) {
          return setError("Only two images allowed.");
        }
      }
      if (file.type.startsWith('video')) {
        if (file.size > MAX_VIDEO_SIZE) {
          return setError("Video exceeds 100MB limit.");
        }
        if (currentVideo || newFiles.filter(f => f.type.startsWith('video')).length > 1) {
          return setError("Only one video allowed.");
        }
      }
    }

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    setError(null);
  };

  useEffect(() => {
    const previewList = files.map(file => URL.createObjectURL(file));
    setPreviews(previewList);
    return () => previewList.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  const handleUpload = useCallback(async () => {
    try {
      const token = files.length ? uuidv4() : null;
      const responses = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("media", file);
        formData.append("visibility", visibility);
        if (token) formData.append("mediaToken", token);

        const response = await axiosInstance.post("/upload/memory-media", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        responses.push({ ...response.data, token });
      }
      console.log("media upload responses:", responses);
      setFiles([]);
      setPreviews([]);

      return responses;
    } catch (err) {
      console.error("Upload failed", err);
      setError("Upload failed. Try again.");
    }
  },[axiosInstance, files, visibility]);

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    const updated = [...files];
    updated.splice(index, 1);
    setFiles(updated);
  };

  useEffect(() => {
    if (typeof onRegisterUpload === 'function') {
      onRegisterUpload(handleUpload);
    }
  }, [onRegisterUpload, handleUpload]);

  return (
    <div className="media-uploader" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
      <label className="upload-label">
        <FontAwesomeIcon icon={faImage} /> or <FontAwesomeIcon icon={faVideo} />
        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept="image/jpeg,image/png,video/mp4"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      <button onClick={() => fileInputRef.current.click()}>Choose Files</button>

      {error && <p className="error-text">{error}</p>}

      <div className="previews">
        {previews.map((url, i) => (
          <div key={i} className="preview">
            {files[i]?.type.startsWith("video") ? (
              <video src={url} controls width="100" />
            ) : (
              <img src={url} alt="preview" width="100" />
            )}
            <button onClick={() => removeFile(i)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaUploader;
