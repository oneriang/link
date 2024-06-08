const socket = io();

const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messages = document.getElementById('messages');

let localConnection;
let remoteConnection;
let localDataChannel;
let remoteDataChannel;

function appendMessage(text) {
    messages.value += text + '\n';
}

sendButton.onclick = () => {
    const message = messageInput.value;
    if (localDataChannel && localDataChannel.readyState === 'open') {
        localDataChannel.send(message);
        appendMessage('You: ' + message);
        messageInput.value = '';
    } else {
        appendMessage('Data channel is not open');
    }
};

socket.on('offer', async (offer) => {
    remoteConnection = new RTCPeerConnection();
    remoteDataChannel = remoteConnection.createDataChannel('textMessages');

    remoteDataChannel.onopen = () => {
        appendMessage('Data channel is open');
    };

    remoteDataChannel.onclose = () => {
        appendMessage('Data channel is closed');
    };

    remoteDataChannel.onmessage = (event) => {
        appendMessage('Peer: ' + event.data);
    };

    await remoteConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await remoteConnection.createAnswer();
    await remoteConnection.setLocalDescription(answer);

    socket.emit('answer', answer);

    remoteConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };
});

socket.on('answer', async (answer) => {
    await localConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', async (candidate) => {
    const newCandidate = new RTCIceCandidate(candidate);
    if (localConnection) {
        await localConnection.addIceCandidate(newCandidate);
    } else if (remoteConnection) {
        await remoteConnection.addIceCandidate(newCandidate);
    }
});

async function createConnection() {
    localConnection = new RTCPeerConnection();

    localDataChannel = localConnection.createDataChannel('textMessages');

    localDataChannel.onopen = () => {
        appendMessage('Data channel is open');
    };

    localDataChannel.onclose = () => {
        appendMessage('Data channel is closed');
    };

    localDataChannel.onmessage = (event) => {
        appendMessage('Peer: ' + event.data);
    };

    const offer = await localConnection.createOffer();
    await localConnection.setLocalDescription(offer);

    socket.emit('offer', offer);

    localConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };
}

//createConnection();


// 创建 PeerConnection
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});

// 处理 ICE 候选者
peerConnection.onicecandidate = event => {
  if (event.candidate) {
    // 将候选者发送到信令服务器
    sendToSignalingServer({
      type: 'candidate',
      candidate: event.candidate
    });
  }
};

// 处理远端流
peerConnection.ontrack = event => {
  const [remoteStream] = event.streams;
  const remoteVideo = document.getElementById('remoteVideo');
  remoteVideo.srcObject = remoteStream;
};

// 获取本地媒体流
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    // 将本地流添加到 PeerConnection
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    const localVideo = document.getElementById('localVideo');
    localVideo.srcObject = stream;
  })
  .catch(error => console.error('Error accessing media devices.', error));

// 创建和发送 offer
peerConnection.createOffer()
  .then(offer => {
    return peerConnection.setLocalDescription(offer);
  })
  .then(() => {
    // 将 offer 发送到信令服务器
    sendToSignalingServer({
      type: 'offer',
      sdp: peerConnection.localDescription
    });
  })
  .catch(error => console.error('Error creating offer.', error));

// 处理信令消息
function handleSignalingMessage(message) {
  if (message.type === 'offer') {
    peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
      .then(() => peerConnection.createAnswer())
      .then(answer => peerConnection.setLocalDescription(answer))
      .then(() => {
        // 将 answer 发送到信令服务器
        sendToSignalingServer({
          type: 'answer',
          sdp: peerConnection.localDescription
        });
      })
      .catch(error => console.error('Error handling offer.', error));
  } else if (message.type === 'answer') {
    peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
      .catch(error => console.error('Error setting remote description.', error));
  } else if (message.type === 'candidate') {
    peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate))
      .catch(error => console.error('Error adding ICE candidate.', error));
  }
}

// 发送消息到信令服务器的示例函数
function sendToSignalingServer(message) {
  // 具体的信令服务器实现需要自行编写，如通过 WebSocket 发送消息
  socket.send(JSON.stringify(message));
}
