import React, { useState, useEffect } from "react";
import "../styles/Landing.css";

const Landing = () => {
  const [activeTab, setActiveTab] = useState("issues");
  const [lastViewed, setLastViewed] = useState(null);

  const lastUpdatedData = {
    issues: "2025-03-09T12:00:00Z",
    features: "2025-03-08T18:30:00Z",
    walkthrough: "2025-03-06T15:45:00Z",
  };

  useEffect(() => {
    const storedTimestamp = localStorage.getItem("lastViewedLanding");
    setLastViewed(storedTimestamp ? new Date(storedTimestamp) : null);
    localStorage.setItem("lastViewedLanding", new Date().toISOString());
  }, []);

  const isNew = (section) => {
    if (!lastViewed) return true;
    return new Date(lastUpdatedData[section]) > lastViewed;
  };

  const issues = [
    {
      title: "Alerts & Notifications",
      details: [
        "Alerts will be moved to the top right next to the ellipsis menu.",
        "New notifications will include when a friend creates a post or when a memory is added to a post you follow.",
        "Notification preferences will be customizable."
      ]
    },
    {
      title: "Messenger",
      details: [
        "Chat window should auto-scroll to the last seen message, but sometimes does not.",
        "Messages are not always marked as seen correctly.",
        "The message list should load previous messages when scrolling up. This is temporarily broken. 🔥 High Priority Fix",
        "In the future, users can start a conversation via a 'Message' button in the friend's list and profile."
      ]
    },
    {
      title: "Blocking & Privacy",
      details: [
        "Blocking users is currently broken. 🔥 High Priority Fix",
        "There is no way to unblock users yet—this will be added in profile settings."
      ]
    },
    {
      title: "Profile & Settings Pages",
      details: [
        "Sometimes trying to access your own profile results in a 'This user has blocked you' error. Logging out and back in fixes this.",
        "Not all notification preferences are functional.",
        "Changing email does not currently require re-verification. This will be fixed soon."
      ]
    },
    {
      title: "Like Button Issue",
      details: [
        "Like button does not work on the Events page but functions on Explore and Feed pages."
      ]
    },
    {
      title: "Event & Memory Posts",
      details: [
        "Currently, users can create events with an empty title or description. These will be required in the future.",
        "Memory posts will require minimum content limits.",
        "Multimedia (images, videos) will be supported soon, with moderation in place.",
        "The magnifying glass icon is clickable on all events, but in the future, it will only be available for events exceeding the content limit.",
        "Styling will be added to make it more obvious that it is a clickable button."
      ]
    },
    {
      title: "Advanced Account Setup",
      details: [
        "New users will go through an onboarding process to set preferences, add a profile picture, and customize their content interests.",
        "This data will be used to tailor the 'For You' section in Explore."
      ]
    }
  ];
  
  return (
    <div className="landing-container">
      <h1>Welcome to MemoryApp - Testing Phase</h1>
      <p>
        This app is currently in testing! Below is a list of known issues, upcoming features, and how to use the app.
        If you find an issue, please report it on Discord.
      </p>
      <a href="YOUR_DISCORD_LINK_HERE" target="_blank" rel="noopener noreferrer" className="discord-link">
        📢 Report an Issue on Discord
      </a>

      <div className="tabs">
        <button onClick={() => setActiveTab("issues")} className={activeTab === "issues" ? "active" : ""}>
          {isNew("issues") && "🆕 "} Known Issues
        </button>
        <button onClick={() => setActiveTab("features")} className={activeTab === "features" ? "active" : ""}>
          {isNew("features") && "🆕 "} Current Features
        </button>
        <button onClick={() => setActiveTab("walkthrough")} className={activeTab === "walkthrough" ? "active" : ""}>
          {isNew("walkthrough") && "🆕 "} How to Use
        </button>
      </div>

      <div className="tab-content">

        {activeTab === "issues" && (
          <div className="issues-list">
            <p className="last-updated">Last Updated: {new Date(lastUpdatedData.issues).toLocaleString()}</p>
            {/* Split issues into groups of 3 per column */}
            {Array.from({ length: Math.ceil(issues.length / 12) }).map((_, rowIndex) => (
              <div key={rowIndex} className="issues-row">
                {Array.from({ length: 3 }).map((_, colIndex) => {
                  const startIndex = rowIndex * 12 + colIndex * 4;
                  const columnIssues = issues.slice(startIndex, startIndex + 4);

                  return (
                    <div key={colIndex} className="issues-column">
                      {columnIssues.map((issue, index) => (
                        <details key={index} className="issue">
                          <summary>
                            {new Date(issue.lastUpdated) > lastViewed ? "🆕 " : ""} {issue.title}
                          </summary>
                          <ul>
                            {issue.details.map((detail, i) => (
                              <li key={i}>{detail}</li>
                            ))}
                          </ul>
                        </details>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {activeTab === "features" && (
          <div>
            <p>Features List here</p>
          </div>
        )}

        {activeTab === "walkthrough" && (
          <div>
            <p>Features walkthrough here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Landing;