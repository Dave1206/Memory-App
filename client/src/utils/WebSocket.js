const WebSocketInstance = (() => {
    let socket;
    let listeners = {};
    let reconnectTimeout;
    const reconnectDelay = 5000;

    const connect = (userId) => {
        const wsUrl = `ws://${window.location.hostname}:4747/ws?userId=${userId}`;
        console.log("Attempting to connect to WebSocket:", wsUrl);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("WebSocket connection established to", wsUrl);
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleClientMessage(message);
            } catch (error) {
                console.error("Error parsing WebSocket message:", error, event.data)
            }
        };

        socket.onclose = (event) => {
            console.log("WebSocket connection closed:", event.reason);
            if(!reconnectTimeout) {
                reconnectTimeout = setTimeout(() => connect(userId), reconnectDelay);
                console.log("Reconnecting WebSocket in", reconnectDelay / 1000, "seconds...");
            }
        };

        socket.onerror = (error) => {
            console.error("WebSocket connection error:", error.message || error, "URL:", socket.url);
        };
    };

    const sendMessage = (type, data) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type, ...data }));
        } else {
            console.error("WebSocket is not connected or ready");
        }
    };

    const disconnect = () => {
        if (socket) {
            socket.close();
            socket = null;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            console.log("WebSocket disconnected")
        }
    };

    const on = (type, callback) => {
        listeners[type] = callback;
    };

    const off = (type) => {
        delete listeners[type];
    };

    const handleClientMessage = (message) => {
        const { type, data } = message;

        if (listeners[type]) {
            listeners[type](data);
        } else {
            console.warn(`No handler for message type: ${type}`);
        }
    };

    return {
        connect,
        sendMessage,
        disconnect,
        on,
        off,
    };
})();

export default WebSocketInstance;
