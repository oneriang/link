const http = require('http');
const express = require('express');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname + '/'));

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('offer', (offer) => {
    console.log('Offer received');
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    console.log('Answer received');
    socket.broadcast.emit('answer', answer);
  });

  socket.on('candidate', (candidate) => {
    console.log('Candidate received');
    socket.broadcast.emit('candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
  
  clients.push(socket);
  socket.on('message', message => {
      console.log('message_-------------');
      console.log(message);
    const data = JSON.parse(message);
    //clients.forEach(client => {
      //if (client !== socket && client.readyState === 'open') {
        //socket.send(JSON.stringify(data));
      //}
    //});
    
    socket.broadcast.emit('message', JSON.stringify(data));
    
    console.log(data);
  });

  socket.on('close', () => {
    clients = clients.filter(client => client !== socket);
  });
});

let clients = [];

/*
server.on('connection', socket => {
  clients.push(socket);
  socket.on('message', message => {
    const data = JSON.parse(message);
    clients.forEach(client => {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });

  socket.on('close', () => {
    clients = clients.filter(client => client !== socket);
  });
});
*/

server.listen(3000, () => {
  console.log('listening on *:3000');
});