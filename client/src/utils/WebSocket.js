const WebSocketInstance = (() => {
    let sockets = {};
    let listeners = {};
    let reconnectTimeouts = {};
    let heartbeatIntervals = {};
    let heartbeatTimeouts = {};

    const reconnectDelay = 5000;
    const heartbeatDelay = 30000;
    const heartbeatTimeoutDelay = 10000;

    const connect = (userId, clientType = "navbar") => {
        if (sockets[clientType] && sockets[clientType].readyState === WebSocket.OPEN) {
            console.log(`WebSocket for ${clientType} already connected.`);
            return;
        }

        const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
        const wsPort = process.env.NODE_ENV === "production" ? "" : ":4747";
        const wsUrl = `${wsProtocol}${window.location.hostname}${wsPort}/ws?userId=${userId}&type=${clientType}`;

        console.log(`Attempting to connect to WebSocket: ${wsUrl} for ${clientType}`);
        sockets[clientType] = new WebSocket(wsUrl);

        sockets[clientType].onopen = () => {
            console.log(`✅ WebSocket connection established to ${wsUrl} for ${clientType}`);
            clearReconnectTimeout(clientType);
            startHeartbeat(clientType);
        };

        sockets[clientType].onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
    
                if (message.type === 'pong') {
                    clearTimeout(heartbeatTimeouts[clientType]);
                    return;
                }
    
                handleClientMessage(clientType, message);
            } catch (error) {
                console.error("Error parsing WebSocket message:", error, event.data);
            }
        };

        sockets[clientType].onclose = (event) => {
            console.warn(`⚠️ WebSocket connection closed for ${clientType}: Code=${event.code}, Reason=${event.reason}`);
            stopHeartbeat(clientType);
    
            if (event.code !== 1000 && !reconnectTimeouts[clientType]) {
                scheduleReconnect(userId, clientType);
            }
        };
    
        sockets[clientType].onerror = (error) => {
            console.error(`❌ WebSocket error (${clientType}):`, error);
        };
    };

    const startHeartbeat = (clientType) => {
        stopHeartbeat(clientType);
        heartbeatIntervals[clientType] = setInterval(() => {
            if (sockets[clientType] && sockets[clientType].readyState === WebSocket.OPEN) {
                sendMessage(clientType, 'ping');
                heartbeatTimeouts[clientType] = setTimeout(() => {
                    console.warn(`No pong received from server for ${clientType}. Possible connection issue.`);
                }, heartbeatTimeoutDelay);
            }
        }, heartbeatDelay);
    };

    const stopHeartbeat = (clientType) => {
        if (heartbeatIntervals[clientType]) {
            clearInterval(heartbeatIntervals[clientType]);
            delete heartbeatIntervals[clientType];
        }
        if (heartbeatTimeouts[clientType]) {
            clearTimeout(heartbeatTimeouts[clientType]);
            delete heartbeatTimeouts[clientType];
        }
    };

    const scheduleReconnect = (userId, clientType) => {
        reconnectTimeouts[clientType] = setTimeout(() => {
            console.log(`Reconnecting WebSocket (${clientType}) in ${reconnectDelay / 1000}s...`);
            connect(userId, clientType);
        }, reconnectDelay);
    };

    const clearReconnectTimeout = (clientType) => {
        if (reconnectTimeouts[clientType]) {
            clearTimeout(reconnectTimeouts[clientType]);
            delete reconnectTimeouts[clientType];
        }
    };

    const sendMessage = (clientType, type, data = {}) => {
        if (sockets[clientType] && sockets[clientType].readyState === WebSocket.OPEN) {
            sockets[clientType].send(JSON.stringify({ type, ...data }));
        } else {
            console.error(`WebSocket (${clientType}) is not connected. Cannot send message.`);
        }
    };

    const disconnect = (clientType) => {
        if (sockets[clientType]) {
            stopHeartbeat(clientType);
            clearReconnectTimeout(clientType);
            sockets[clientType].close(1000, `User closed the ${clientType} connection.`);
            delete sockets[clientType];
            console.log(`WebSocket (${clientType}) disconnected`);
        }
    };

    const on = (type, callback) => {
        listeners[type] = callback;
    };

    const off = (type) => {
        delete listeners[type];
    };

    const handleClientMessage = (clientType, message) => {
        const { type, data } = message;
        console.log(`WebSocket received message:`, message);

        if (listeners[type]) {
            listeners[type](data);
        } else {
            console.warn(`No handler for message type: ${type}`);
        }
    };

    const getWebSocketStatus = (clientType) => {
        return sockets[clientType] && sockets[clientType].readyState === WebSocket.OPEN;
    };

    return {
        connect,
        sendMessage,
        getWebSocketStatus,
        disconnect,
        on,
        off,
    };
})();

export default WebSocketInstance;