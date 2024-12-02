import React, { useState, useEffect } from "react";
import { useAxios } from "../auth/AxiosProvider";
import "../../styles/DataSettings.css";

function DataSettings({ user }) {
  const { axiosInstance } = useAxios();
  const [metadataEnabled, setMetadataEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await axiosInstance.get(`/user/preferences/${user.id}`);
        const { data_settings } = response.data;
        setMetadataEnabled(data_settings.metadata_enabled);
        setLocationEnabled(data_settings.location_enabled);
      } catch (error) {
        console.error("Error fetching preferences:", error);
        setStatusMessage("Error loading preferences.");
      }
    };
    fetchPreferences();
  }, [axiosInstance, user.id]);

  const handleSave = async () => {
    const dataSettings = {
      metadata_enabled: metadataEnabled,
      location_enabled: locationEnabled
    };

    try {
      await axiosInstance.put(`/user/preferences/${user.id}`, {
        dataSettings
    });
      setStatusMessage("Preferences updated successfully.");
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      setStatusMessage("Failed to update preferences.");
    }
  };

  const handleCheckboxChange = (setter) => {
    setter((prev) => !prev);
    setHasChanges(true); 
};

  return (
    <div className="data-settings-wrapper">
      <h2>Data Settings</h2>
      <div className="data-settings">
        <label>
          <input
            id="metaDataSetting"
            type="checkbox"
            checked={metadataEnabled}
            onChange={() => handleCheckboxChange(setMetadataEnabled)}
          />
          Enable Metadata-Based Recommendations
        </label>

        <label>
          <input
            id="locationDataSetting"
            type="checkbox"
            checked={locationEnabled}
            onChange={() => handleCheckboxChange(setLocationEnabled)}
          />
          Enable Location-Based Recommendations
        </label>

        <button 
            className="settings-button save-button" 
            onClick={handleSave}
            disabled={!hasChanges}
        >
          Save Changes
        </button>
        <p aria-live="polite">{statusMessage}</p>
      </div>
    </div>
  );
}

export default DataSettings;
