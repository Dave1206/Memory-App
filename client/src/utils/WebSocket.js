const WebSocketInstance = (() => {
    let socket;
    let listeners = {};

    const connect = (userId) => {
        const wsUrl = `ws://${window.location.hostname}:4747/ws?userId=${userId}`;
        console.log("Attempting to connect to WebSocket:", wsUrl);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("WebSocket connection established to", wsUrl);
        };

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleClientMessage(message);
        };

        socket.onclose = () => {
            console.log("WebSocket connection closed");
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
