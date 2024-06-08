const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3001 });

const clients = {};

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const { type, id } = data;
        // console.log(data);
        if (type === 'join') {
            clients[id] = ws;
            // Notify other clients about the new peer
            // for (let clientId in clients) {
            Object.keys(clients).forEach(function (clientId) {
                if (clientId !== id) {
                    console.log(id);
                    clients[clientId].send(JSON.stringify({ type: 'new-peer', id }));
                }
            });
        } else if (type === 'offer' || type === 'answer' || type === 'candidate') {
            const { to } = data;
            if (clients[to]) {
                clients[to].send(JSON.stringify(data));
            }
        }
    });

    ws.on('close', () => {
        // Clean up closed connections
        for (let id in clients) {
            if (clients[id] === ws) {
                delete clients[id];
                // Notify other clients that this peer has left
                for (let clientId in clients) {
                    clients[clientId].send(JSON.stringify({ type: 'peer-left', id }));
                }
                break;
            }
        }
    });
});

console.log('Signaling server is running on ws://localhost:3001');
