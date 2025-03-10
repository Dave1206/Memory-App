import React, { useState, useEffect } from "react";
import Landing from "./Landing";
import "../styles/LandingToggle.css";

const LandingToggle = () => {
  const [isLandingOpen, setIsLandingOpen] = useState(true);

  useEffect(() => {
    const lastViewed = localStorage.getItem("landingClosed");
    if (lastViewed === "true") {
      setIsLandingOpen(false);
    }
  }, []);

  const toggleLanding = () => {
    setIsLandingOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("landingClosed", newState ? "false" : "true");
      return newState;
    });
  };

  return (
    <>
      {isLandingOpen && <Landing />}
      <button className="landing-toggle" onClick={toggleLanding}>
        {isLandingOpen ? "Close Info" : "View Info"}
      </button>
    </>
  );
};

export default LandingToggle;
