import React from 'react';
import '../styles/NotificationBadge.css';

function NotificationBadge({ count }) {
    if (count <= 0) return null;

    return (
        <div className="notification-badge" onClick={(e) => e.stopPropagation()}>
            {count > 99 ? "99+" : count}
        </div>
    );
}

export default NotificationBadge;
