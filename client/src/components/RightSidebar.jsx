import React from "react";
import { useLocation } from "react-router-dom";
import TipCarousel from "./TipCarousel";
import "../styles/RightSidebar.css";

function RightSidebar() {
    const location = useLocation();
    const hideSidebar =
        location.pathname.startsWith('/profile') ||
        location.pathname.startsWith('/settings') ||
        location.pathname.startsWith('/moderator-tools');

    if (hideSidebar) return null;

    return (
        <div className="right-sidebar">
            <h3>Getting Started</h3>
            <TipCarousel />
        </div>
    );
}

export default RightSidebar;
