const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');

const server = http.createServer((req, res) => {
  // 设置静态文件目录
  const publicPath = path.join(__dirname, 'public');

  // 设置默认文件
  let filePath = path.join(publicPath, req.url === '/' ? 'index.html' : req.url);

  // 获取文件的扩展名
  const extname = path.extname(filePath);
  let contentType = 'text/html';

  // 根据文件扩展名设置内容类型
  switch (extname) {
    case '.js':
      contentType = 'application/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
    case '.wav':
      contentType = 'audio/wav';
      break;
  }

  // 读取文件并返回内容
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile(path.join(publicPath, '404.html'), (error, content) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const wss = new WebSocket.Server({ server });

const peers = new Set();

wss.on('connection', (ws) => {
  peers.add(ws);

  ws.on('message', (message) => {
    peers.forEach(peer => {
      if (peer !== ws && peer.readyState === WebSocket.OPEN) {
        peer.send(message);
      }
    });
  });

  ws.on('close', () => {
    peers.delete(ws);
  });
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
