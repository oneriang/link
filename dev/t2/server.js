const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3000 });

// Store connected clients
const clients = [];

wss.on('connection', (ws) => {
    clients.push(ws);

    // Handle messages from clients
    ws.on('message', (message) => {
        broadcast(message);
    });

    // Remove client from array when they disconnect
    ws.on('close', () => {
        const index = clients.indexOf(ws);
        if (index !== -1) {
            clients.splice(index, 1);
        }
    });
});

// Broadcast message to all connected clients
function broadcast(message) {
    clients.forEach(client => {
        client.send(message);
    });
}
