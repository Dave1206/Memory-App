import React, { useEffect, useState } from "react";

const tips = [
    {
        tip: "Create and share memories with friends by making an event.",
        img: "Logo_transparent.png"
    },
    {
        tip: "Follow events to see updates in your feed.",
        img: "Logo_transparent.png"
    },
    {
        tip: "Interact with posts by liking, sharing, and commenting.",
        img: "Logo_transparent.png"
    },
    {
        tip: "Use the messenger to stay connected with your friends.",
        img: "Logo_transparent.png"
    },
    {
        tip: "Explore trending events and discover new content.",
        img: "Logo_transparent.png"
    }
];

function TipCarousel() {
    const [currentTipIndex, setCurrentTipIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTipIndex((prevIndex) => (prevIndex + 1) % tips.length);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="tip-carousel">
            <img 
                src={`/assets/${tips[currentTipIndex].img}`} 
                alt="Tip" 
                className="tip-image"
            />
            <p className="tip-text">{tips[currentTipIndex].tip}</p>
        </div>
    );
}

export default TipCarousel;
