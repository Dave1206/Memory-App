import React, { useState } from 'react';
import PrivacySettings from './PrivacySettings.jsx';
import NotificationSettings from './NotificationSettings.jsx';
import AccountSettings from './AccountSettings.jsx';
import '../../styles/UserPreferences.css';

function UserPreferences({ user }) {
    const [activeTab, setActiveTab] = useState("account");

    return (
        <div className="preferences-container">
            <nav className="preferences-tabs">
                <button
                    className={`tab-button ${activeTab === "account" ? "active" : ""}`}
                    onClick={() => setActiveTab("account")}
                >
                    Account
                </button>
                <button
                    className={`tab-button ${activeTab === "privacy" ? "active" : ""}`}
                    onClick={() => setActiveTab("privacy")}
                >
                    Privacy
                </button>
                <button
                    className={`tab-button ${activeTab === "notifications" ? "active" : ""}`}
                    onClick={() => setActiveTab("notifications")}
                >
                    Notifications
                </button>
            </nav>

            <div className="preferences-content">
                {activeTab === "account" && <AccountSettings user={user} />}
                {activeTab === "privacy" && <PrivacySettings user={user} />}
                {activeTab === "notifications" && <NotificationSettings user={user} />}
            </div>
        </div>
    )
}

export default UserPreferences;
