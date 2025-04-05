import React, { useState, useEffect, useRef } from "react";
import Landing from "./Landing";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import "../styles/LandingToggle.css";

const LandingToggle = () => {
  const [isLandingOpen, setIsLandingOpen] = useState(true);
  const toggleButtonRef = useRef(null);

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
      {isLandingOpen && <Landing onClose={() => toggleLanding()} toggleButtonRef={toggleButtonRef} />}
      <button ref={toggleButtonRef} className="landing-toggle" onClick={toggleLanding}>
        {isLandingOpen ? <FontAwesomeIcon icon={faTimesCircle} /> : <FontAwesomeIcon icon={faClipboardList} />}
      </button>
    </>
  );
};

export default LandingToggle;
