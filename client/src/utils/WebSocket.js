const WebSocketInstance = (() => {
    let socket;
    let listeners = {}; // Holds callbacks for different message types
    const port = 4747;

    const connect = (userId) => {
        const wsUrl = `ws://localhost:${port}/ws?userId=${userId}`;
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("WebSocket connection established");
        };

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleClientMessage(message);
        };

        socket.onclose = () => {
            console.log("WebSocket connection closed");
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
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
            listeners[type](data); // Call the registered callback
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
