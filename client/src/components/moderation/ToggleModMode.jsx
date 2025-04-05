import React from "react";
import { useAuth } from "../auth/AuthContext";

function ToggleModMode() {
  const { user, isModMode, toggleModMode } = useAuth();

  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    return null;
  }

  return (
    <button className="event-button" onClick={toggleModMode}>
      {isModMode ? "Disable Mod Mode" : "Enable Mod Mode"}
    </button>
  );
}

export default ToggleModMode;
