import React, { useEffect, useState } from "react";
import TipCarousel from "./TipCarousel";
import "../styles/RightSidebar.css";

function RightSidebar() {
    return (
        <div className="right-sidebar">
            <h3>Getting Started</h3>
            <TipCarousel />
        </div>
    );
}

export default RightSidebar;
