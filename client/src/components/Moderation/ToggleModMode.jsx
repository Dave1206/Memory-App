import React from "react";
import { useAuth } from "../auth/AuthContext";

function ToggleModMode() {
  const { user, isModMode, toggleModMode } = useAuth();

  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    return null; // Only show button to moderators and admins
  }

  return (
    <button onClick={toggleModMode}>
      {isModMode ? "Disable Mod Mode" : "Enable Mod Mode"}
    </button>
  );
}

export default ToggleModMode;
