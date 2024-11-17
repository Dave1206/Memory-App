import React from 'react';
import '../styles/NotificationBadge.css';

function NotificationBadge({ count }) {
    return (
        <div className="notification-container">
            <div className="icon">🔔</div> {/* Your main icon here */}
            {count > 0 && (
                <div className="notification-badge">
                    {count}
                </div>
            )}
        </div>
    );
}

export default NotificationBadge;
