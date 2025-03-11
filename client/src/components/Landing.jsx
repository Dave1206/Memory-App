import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import issues from "../data/issuesData";
import features from "../data/featuresData";
import plannedFeatures from "../data/plannedFeaturesData";
import "../styles/Landing.css";

const Landing = ({ onClose, toggleButtonRef }) => {
  const [activeTab, setActiveTab] = useState("welcome");
  const [lastViewed, setLastViewed] = useState(null);
  const [selectedGuide, setSelectedGuide] = useState("createEvent");
  const containerRef = useRef(null);

  const lastUpdatedData = {
    issues: "2025-03-11T16:54:27.451Z",
    features: "2025-03-08T18:35:00Z",
    upcoming: "2025-03-11T16:54:27.451Z",
    walkthrough: "2025-03-06T15:45:00Z",
  };

  useEffect(() => {
    const storedTimestamp = localStorage.getItem("lastViewedLanding");
    setLastViewed(storedTimestamp ? new Date(storedTimestamp) : null);
    localStorage.setItem("lastViewedLanding", new Date().toISOString());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && 
        !containerRef.current.contains(event.target) &&
        !(toggleButtonRef.current && toggleButtonRef.current.contains(event.target)) 
      ){
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, toggleButtonRef]);

  const isNew = (section) => !lastViewed || new Date(lastUpdatedData[section]) > lastViewed;

  return (
    <div className="landing-container" ref={containerRef}>
      <h1>Welcome to MemoryApp - Testing Phase</h1>

      <div className="tabs">
        <button onClick={() => setActiveTab("welcome")} className={activeTab === "welcome" ? "active" : ""}>
          Welcome
        </button>
        <button onClick={() => setActiveTab("issues")} className={activeTab === "issues" ? "active" : ""}>
          {isNew("issues") && "🆕 "} Known Issues
        </button>
        <button onClick={() => setActiveTab("features")} className={activeTab === "features" ? "active" : ""}>
          {isNew("features") && "🆕 "} Features
        </button>
        <button onClick={() => setActiveTab("upcoming")} className={activeTab === "upcoming" ? "active" : ""}>
          {isNew("upcoming") && "🆕 "} Upcoming Features
        </button>
        <button onClick={() => setActiveTab("walkthrough")} className={activeTab === "walkthrough" ? "active" : ""}>
          {isNew("walkthrough") && "🆕 "} How to Use
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "welcome" && (
          <div className="welcome-content">
            <div class="privacy-notice">
              <h2>Thank You for Testing MemoryApp!</h2>
              <p>
                This app is currently in testing. We appreciate your feedback!
                Please report any <strong>bugs, usability issues, or general feedback</strong> on our Discord.
              </p>
              <a href="https://discord.gg/cXtwDJVEFF"> <FontAwesomeIcon style={{fontSize: "42px"}} icon={faDiscord}/></a>
              <h3>Data Collection & Privacy</h3>
              <p>To improve user experience, MemoryApp collects limited data:</p>

              <ul>
                <li><strong>Interaction Data</strong> (enabled by default): Tracks engagement with content to
                  <em> promote popular posts</em> and <em>suggest relevant content</em>.
                </li>
                <li><strong>Location Data</strong> (disabled by default): Can be used to
                  <em> recommend events near you</em> if enabled.
                </li>
              </ul>

              <p>You can <strong>enable or disable both</strong> in the <strong>Settings</strong> at any time.</p>

              <h3>Your Privacy Matters</h3>
              <ul>
                <li> <strong>Your data will never be sold</strong> or shared with third parties.</li>
                <li> Data is <strong>only used within the app</strong> to enhance recommendations and user experience.</li>
                <li> During testing, we may log additional usage patterns to improve app stability and functionality.</li>
              </ul>

              <p>
                By using MemoryApp during this testing phase, you acknowledge and agree to this data collection.
                If you have any concerns, please reach out via Discord.
              </p>
            </div>

            <h3>What We’re Looking For:</h3>
            <ul>
              <li>🐞 Bugs – Anything that isn't working as expected.</li>
              <li>⚙️ Usability Issues – If something is confusing or hard to use.</li>
              <li>🌟 Feature Suggestions – Ideas for improvements or additions.</li>
              <li>🎨 Design Suggestions - Suggestions that might improve the look of the app or user experience (UX).</li>
              <li>📱 Responsiveness - Test the app on your mobile device, and give feedback about the mobile experience.</li>
              <li>🔧 If you would like to work on the app, whether coding, design, or otherwise, reach out on discord.</li>
            </ul>
            <p>Click a tab above to explore known issues, current features, and upcoming updates.</p>
          </div>
        )}

        {/* Walkthrough Section */}
        {activeTab === "walkthrough" && (
          <div className="walkthrough-container">
            <div className="walkthrough-menu">
              <button onClick={() => setSelectedGuide("createEvent")}>Create an Event</button>
              <button onClick={() => setSelectedGuide("shareMemory")}>Share a Memory</button>
              <button onClick={() => setSelectedGuide("messenger")}>Access Messenger</button>
              <button onClick={() => setSelectedGuide("profile")}>Access User Profile</button>
              <button onClick={() => setSelectedGuide("notifications")}>Access Settings</button>
            </div>
            <div className="walkthrough-content">
              {selectedGuide ? (
                <img
                  src={`/assets/${selectedGuide}.jpg`}
                  alt="Guide Screenshot"
                  className="walkthrough-image"
                />
              ) : (
                <p>Select a topic to view the guide.</p>
              )}
            </div>
          </div>
        )}

        {/* Issues, Features, and Upcoming Features Sections */}
        {activeTab !== "welcome" && activeTab !== "walkthrough" && (
          <div>
            <p className="last-updated">
              Last Updated: {new Date(lastUpdatedData[activeTab]).toLocaleString()}
              {activeTab === "issues" && " 🔥= high priority"}
            </p>
            <div className="issues-list">
              {activeTab === "issues" && issues.map((issue, index) => (
                <details key={index} className="issue">
                  <summary>{new Date(issue.lastUpdated) > lastViewed ? "🆕 " : ""} {issue.title}</summary>
                  <ul>{issue.details.map((detail, i) => <li key={i}>{detail}</li>)}</ul>
                </details>
              ))}
              {activeTab === "features" && features.map((feature, index) => (
                <details key={index} className="issue">
                  <summary>{new Date(feature.lastUpdated) > lastViewed ? "🆕 " : ""} {feature.title}</summary>
                  <ul>{feature.details.map((detail, i) => <li key={i}>{detail}</li>)}</ul>
                </details>
              ))}
              {activeTab === "upcoming" && plannedFeatures.map((feature, index) => (
                <details key={index} className="issue">
                  <summary>{new Date(feature.lastUpdated) > lastViewed ? "🆕 " : ""} {feature.title}</summary>
                  <ul>{feature.details.map((detail, i) => <li key={i}>{detail}</li>)}</ul>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Landing;
