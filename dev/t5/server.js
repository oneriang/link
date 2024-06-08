const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 将客户端代码放在public文件夹中
app.use(express.static(path.join(__dirname, '.')));


// return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
const uuid = function () {
  let uuid = '',
    ii;
  for (ii = 0; ii < 32; ii += 1) {
    switch (ii) {
      case 8:
      case 20:
        uuid += '-';
        uuid += (Math.random() * 16 | 0).toString(16);
        break;
      case 12:
        uuid += '-';
        uuid += '4';
        break;
      case 16:
        uuid += '-';
        uuid += (Math.random() * 4 | 8).toString(16);
        break;
      default:
        uuid += (Math.random() * 16 | 0).toString(16);
    }
  }
  return uuid;
};

let peers = {};
const clients = [];

wss.on('connection', (ws, request) => {

  // console.log('ws:', ws);
  // console.log('request:', request);

  // 将新连接的客户端添加到 clients 列表
  const peer_id = uuid();
  peers[peer_id] = ws;

  if (!clients.includes(ws)) {
    const data = {
      type: 'peers',
      peer_id: peer_id
    }
    ws.send(JSON.stringify(data));
  }

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    // console.log('Received message:', data);

    // 将消息广播给其他客户端
    // clients.forEach(client => {
    //   if (client !== ws && client.readyState === WebSocket.OPEN) {
    //     // console.log('send message:', data);
    //     client.send(JSON.stringify(data));
    //   }
    // });
    Object.keys(peers).forEach(function (key) {
      if (peers[key] !== ws && peers[key].readyState === WebSocket.OPEN) {
        // console.log('send message:', data);
        data.peer_id = key;
        console.log('sent to peer_id:', peer_id);
        console.log('sent data:', data);
        peers[key].send(JSON.stringify(data));
      }
    });
  });

  ws.on('close', () => {
    // 从 clients 列表中移除断开连接的客户端
    //clients = clients.filter(client => client !== ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(3001, () => {
  console.log('Server is running on http://localhost:3001');
});
