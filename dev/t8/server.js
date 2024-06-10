const WebSocket = require('ws');

// 设置 WebSocket 服务器
const wss = new WebSocket.Server({ port: 3001 });

// 存储客户端连接
const clients = {};

// 心跳间隔时间（毫秒）
const pingInterval = 30000;

// 定期发送心跳包
setInterval(() => {
    for (const id in clients) {
        if (clients[id].isAlive === false) {
            console.log(`终止不活跃的连接: ${id}`);
            return clients[id].terminate();
        }

        clients[id].isAlive = false;
        clients[id].ping();
    }
}, pingInterval);

wss.on('connection', (ws) => {
    ws.isAlive = true;

    // 处理心跳包的 pong 响应
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (message) => {
        // console.log(message);
        const data = JSON.parse(message);
        const { type, id } = data;
        if (type === 'join') {
            console.log(`客户端加入: ${id}`);
            ws.id = id;
            clients[id] = ws;
            // 通知其他客户端有新节点加入
            Object.keys(clients).forEach(function (clientId) {
                if (clientId !== id) {
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
        const id = ws.id;
        // 清理关闭的连接
        console.log(`客户端离开: ${id}`);
        // 通知其他客户端该节点离开
        Object.keys(clients).forEach(function (clientId) {
            if (clientId !== id) {
                clients[clientId].send(JSON.stringify({ type: 'peer-left', id }));
            }
        });
        delete clients[id];
    });
});

console.log('信令服务器运行在 ws://localhost:3001');
