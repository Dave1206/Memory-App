import React, { useState, useEffect } from "react";
import { useAxios } from "../auth/AxiosProvider";
import "../../styles/DataSettings.css";

function DataSettings({ user }) {
  const axiosInstance = useAxios();
  const [preferences, setPreferences] = useState({
    metadataEnabled: true,
    locationEnabled: false,
  });
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await axiosInstance.get(`/user/preferences/${user.id}`);
        const { metadataEnabled, locationEnabled } = response.data.preferences;
        setPreferences({ metadataEnabled, locationEnabled });
      } catch (error) {
        console.error("Error fetching preferences:", error);
        setStatusMessage("Error loading preferences.");
      }
    };
    fetchPreferences();
  }, [axiosInstance, user.id]);

  const handleSave = async () => {
    try {
      await axiosInstance.put(`/user/preferences/${user.id}`, preferences);
      setStatusMessage("Preferences updated successfully.");
    } catch (error) {
      console.error("Error saving preferences:", error);
      setStatusMessage("Failed to update preferences.");
    }
  };

  return (
    <div className="data-settings-wrapper">
      <h2>Data Settings</h2>
      <div className="data-settings">
        <label>
          <input
            type="checkbox"
            checked={preferences.metadataEnabled}
            onChange={(e) =>
              setPreferences((prev) => ({
                ...prev,
                metadataEnabled: e.target.checked,
              }))
            }
          />
          Enable Metadata-Based Recommendations
        </label>

        <label>
          <input
            type="checkbox"
            checked={preferences.locationEnabled}
            onChange={(e) =>
              setPreferences((prev) => ({
                ...prev,
                locationEnabled: e.target.checked,
              }))
            }
          />
          Enable Location-Based Recommendations
        </label>

        <button className="settings-button save-button" onClick={handleSave}>
          Save Preferences
        </button>
        <p aria-live="polite">{statusMessage}</p>
      </div>
    </div>
  );
}

export default DataSettings;
