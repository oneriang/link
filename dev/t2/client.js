const socket = new WebSocket('ws://localhost:3000'); // Connect to signaling server

const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messageList = document.getElementById('messageList');

let localConnection;
let sendChannel;

// Handle messages from signaling server
socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'offer') {
        await handleOffer(message);
    } else if (message.type === 'answer') {
        await handleAnswer(message);
    } else if (message.type === 'candidate') {
        await handleCandidate(message);
    }
};

// Create RTCPeerConnection and set up data channel
async function createConnection() {
    localConnection = new RTCPeerConnection();
    sendChannel = localConnection.createDataChannel('sendDataChannel');

    localConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendMessage({ type: 'candidate', candidate: event.candidate });
        }
    };

    sendChannel.onmessage = (event) => {
        const li = document.createElement('li');
        li.textContent = event.data;
        messageList.appendChild(li);
    };

    await localConnection.createOffer()
        .then(offer => localConnection.setLocalDescription(offer))
        .then(() => sendMessage({ type: 'offer', offer: localConnection.localDescription }))
        .catch(error => console.error('Error creating offer:', error));
}

// Handle incoming offer message
async function handleOffer(message) {
    await createConnection();
    await localConnection.setRemoteDescription(message.offer);
    const answer = await localConnection.createAnswer();
    await localConnection.setLocalDescription(answer);
    sendMessage({ type: 'answer', answer });
}

// Handle incoming answer message
async function handleAnswer(message) {
    await localConnection.setRemoteDescription(message.answer);
}

// Handle incoming ICE candidate message
async function handleCandidate(message) {
    await localConnection.addIceCandidate(message.candidate);
}

// Send message to signaling server
function sendMessage(message) {
    socket.send(JSON.stringify(message));
}

// Send data over data channel
sendButton.onclick = () => {
    const message = messageInput.value;
    sendChannel.send(message);
    messageInput.value = '';
};
