const WebSocketInstance = (() => {
    let socket = null;
    let listeners = {};
    let reconnectTimeout = null;
    let heartbeatInterval = null;
    let heartbeatTimeout = null;

    const reconnectDelay = 5000;
    const heartbeatDelay = 30000;
    const heartbeatTimeoutDelay = 10000;

    const connect = (userId) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            console.log("WebSocket already connected.");
            return;
        }

        const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
        const wsPort = process.env.NODE_ENV === "production" ? "" : ":4747";
        const wsUrl = `${wsProtocol}${window.location.hostname}${wsPort}/ws?userId=${userId}`;

        console.log("Attempting to connect to WebSocket:", wsUrl);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("WebSocket connection established to", socket.url);
            clearReconnectTimeout();
            startHeartbeat();
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === 'pong') {
                    clearTimeout(heartbeatTimeout);
                    return;
                }

                handleClientMessage(message);
            } catch (error) {
                console.error("Error parsing WebSocket message:", error, event.data)
            }
        };

        socket.onclose = (event) => {
            console.warn(
                `WebSocket connection closed: Code=${event.code}, Reason=${event.reason}`
            );

            stopHeartbeat();

            if (event.code !== 1000 && !reconnectTimeout) {
                scheduleReconnect(userId);
            }
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error.message || error);
        };
    };

    const startHeartbeat = () => {
        stopHeartbeat();
        heartbeatInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                sendMessage('ping');
                heartbeatTimeout = setTimeout(() => {
                    console.warn("No pong received from server. There may be a connection issue.")
                }, heartbeatTimeoutDelay);
            }
        }, heartbeatDelay);
    };

    const stopHeartbeat = () => {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        if (heartbeatTimeout) {
            clearTimeout(heartbeatTimeout);
            heartbeatTimeout = null;
        }
    };

    const scheduleReconnect = (userId) => {
        reconnectTimeout = setTimeout(() => {
            console.log(`Reconnecting WebSocket in ${reconnectDelay / 1000}s...`);
            connect(userId);
        }, reconnectDelay);
    };

    const clearReconnectTimeout = () => {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
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
            stopHeartbeat();
            clearReconnectTimeout();
            socket.close(1000, "User closed the messenger.");
            socket = null;
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
