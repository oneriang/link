// client/scripts/network.js

// 如果浏览器不支持 window.URL，则使用 window.webkitURL
window.URL = window.URL || window.webkitURL;
// 检查浏览器是否支持 WebRTC
window.isRtcSupported = !!(window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection);

// 定义服务器连接类
class ServerConnection {


    // 构造函数
    constructor() {
        // 连接到服务器
        this._connect();
        // 监听 beforeunload 事件，在页面关闭前断开连接
        Events.on('beforeunload', e => this._disconnect());
        // 监听 pagehide 事件，在页面隐藏时断开连接
        Events.on('pagehide', e => this._disconnect());
        // 监听 visibilitychange 事件，在页面可见时重新连接
        document.addEventListener('visibilitychange', e => this._onVisibilityChange());
    }

    // 连接到服务器的方法
    _connect() {
        // 清除重连定时器
        clearTimeout(this._reconnectTimer);
        // 如果已经连接或正在连接，则返回
        if (this._isConnected() || this._isConnecting()) return;
        // 创建 WebSocket 连接
        // const ws = new WebSocket(this._endpoint());
        let endpoint = this._endpoint();
        const peerId = localStorage.getItem("peerId");
        if (peerId) {
            endpoint += '/?peerid=' + peerId;
        }
        //alert(endpoint);
        const ws = new WebSocket(endpoint);
        ws.binaryType = 'arraybuffer';
        // 监听连接打开事件
        ws.onopen = e => console.log('WS: server connected');
        // 监听消息事件
        ws.onmessage = e => this._onMessage(e.data);
        // 监听连接关闭事件
        ws.onclose = e => this._onDisconnect();
        // 监听错误事件
        ws.onerror = e => console.error(e);
        // 保存 WebSocket 连接对象
        this._socket = ws;
    }

    // 处理消息的方法
    _onMessage(msg) {
        console.log('_onMessage');
        console.log(msg);
        // 解析消息
        msg = JSON.parse(msg);
        console.log('WS:', msg);
        // 根据消息类型进行不同的处理
        switch (msg.type) {
            case 'peers':
                // 触发 peers 事件
                Events.fire('peers', msg.peers);
                break;
            case 'peer-joined':
                // 触发 peer-joined 事件
                Events.fire('peer-joined', msg.peer);
                break;
            case 'peer-left':
                // 触发 peer-left 事件
                Events.fire('peer-left', msg.peerId);
                break;
            case 'signal':
                // 触发 signal 事件
                Events.fire('signal', msg);
                break;
            case 'ping':
                // 发送 pong 消息
                this.send({ type: 'pong' });
                break;
            case 'display-name':
                // 触发 display-name 事件
                Events.fire('display-name', msg);
                break;
            default:
                // 未知消息类型，输出错误信息
                console.error('WS: unkown message type', msg);
        }
    }

    // 发送消息的方法
    send(message) {
        // 如果未连接，则返回
        if (!this._isConnected()) return;
        // 发送消息
        this._socket.send(JSON.stringify(message));
    }

    // 获取服务器端点的方法
    _endpoint() {
        // 检测是否为部署环境或开发环境
        const protocol = location.protocol.startsWith('https') ? 'wss' : 'ws';
        const webrtc = window.isRtcSupported ? '/webrtc' : '/fallback';
        // const url = protocol + '://' + location.host + location.pathname + 'server' + webrtc;
        const url = protocol + '://' + `sfs.yiersan.link/` + 'server' + webrtc;
        return url;
    }

    // 断开连接的方法
    _disconnect() {
        // 发送断开连接的消息
        this.send({ type: 'disconnect' });
        // 取消连接关闭事件的监听
        this._socket.onclose = null;
        // 关闭 WebSocket 连接
        this._socket.close();
    }

    // 处理连接断开的方法
    _onDisconnect() {
        console.log('WS: server disconnected');
        // 触发 notify-user 事件，提示用户连接已断开
        Events.fire('notify-user', 'Connection lost. Retry in 5 seconds...');
        // 清除重连定时器
        clearTimeout(this._reconnectTimer);
        // 设置重连定时器
        this._reconnectTimer = setTimeout(_ => this._connect(), 5000);
    }

    // 处理页面可见性变化的方法
    _onVisibilityChange() {
        // 如果页面隐藏，则返回
        if (document.hidden) return;
        // 重新连接到服务器
        this._connect();
    }

    // 判断是否已连接的方法
    _isConnected() {
        return this._socket && this._socket.readyState === this._socket.OPEN;
    }

    // 判断是否正在连接的方法
    _isConnecting() {
        return this._socket && this._socket.readyState === this._socket.CONNECTING;
    }
}

// 定义 Peer 类
class Peer {


    // 构造函数
    constructor(serverConnection, peerId) {
        this._server = serverConnection;
        this._peerId = peerId;
        this._filesQueue = [];
        this._busy = false;
    }

    // 发送 JSON 消息的方法
    sendJSON(message) {
        this._send(JSON.stringify(message));
    }

    // 发送文件的方法
    sendFiles(files) {
        // 将文件添加到队列中
        for (let i = 0; i < files.length; i++) {
            this._filesQueue.push(files[i]);
        }
        // 如果正在发送文件，则返回
        if (this._busy) return;
        // 发送队列中的下一个文件
        this._dequeueFile();
    }

    // 发送队列中的下一个文件的方法
    _dequeueFile() {
        // 如果队列为空，则返回
        if (!this._filesQueue.length) return;
        // 设置忙碌状态为 true
        this._busy = true;
        // 从队列中取出文件
        const file = this._filesQueue.shift();
        // 发送文件
        this._sendFile(file);
    }

    // 发送文件的方法
    _sendFile(file) {
        // 发送文件头部信息
        this.sendJSON({
            type: 'header',
            name: file.name,
            mime: file.type,
            size: file.size
        });
        // 创建文件分块器对象
        this._chunker = new FileChunker(file,
            chunk => this._send(chunk),
            offset => this._onPartitionEnd(offset));
        // 发送文件的第一个分块
        this._chunker.nextPartition();
    }

    // 处理分块发送完成的方法
    _onPartitionEnd(offset) {
        this.sendJSON({ type: 'partition', offset: offset });
    }

    // 处理接收到分块的方法
    _onReceivedPartitionEnd(offset) {
        this.sendJSON({ type: 'partition-received', offset: offset });
    }

    // 发送下一个分块的方法
    _sendNextPartition() {
        if (!this._chunker || this._chunker.isFileEnd()) return;
        this._chunker.nextPartition();
    }

    // 发送进度信息的方法
    _sendProgress(progress) {
        this.sendJSON({ type: 'progress', progress: progress });
    }

    // 处理消息的方法
    _onMessage(message) {
        // 如果消息不是字符串，则是文件分块
        if (typeof message !== 'string') {
            this._onChunkReceived(message);
            return;
        }
        // 解析消息
        message = JSON.parse(message);
        console.log('RTC:', message);
        // 根据消息类型进行不同的处理
        switch (message.type) {
            case 'header':
                this._onFileHeader(message);
                break;
            case 'partition':
                this._onReceivedPartitionEnd(message);
                break;
            case 'partition-received':
                this._sendNextPartition();
                break;
            case 'progress':
                this._onDownloadProgress(message.progress);
                break;
            case 'transfer-complete':
                this._onTransferCompleted();
                break;
            case 'text':
                this._onTextReceived(message);
                break;
        }
    }

    // 处理文件头部信息的方法
    _onFileHeader(header) {
        this._lastProgress = 0;
        // 创建文件解析器对象
        this._digester = new FileDigester({
            name: header.name,
            mime: header.mime,
            size: header.size
        }, file => this._onFileReceived(file));
    }

    // 处理接收到的文件分块的方法
    _onChunkReceived(chunk) {
        if (!chunk.byteLength) return;

        // 解析文件分块
        this._digester.unchunk(chunk);
        const progress = this._digester.progress;
        this._onDownloadProgress(progress);

        // 定期发送进度信息
        if (progress - this._lastProgress < 0.01) return;
        this._lastProgress = progress;
        this._sendProgress(progress);
    }

    // 处理下载进度的方法
    _onDownloadProgress(progress) {
        Events.fire('file-progress', { sender: this._peerId, progress: progress });
    }

    // 处理接收到的文件的方法
    _onFileReceived(proxyFile) {
        Events.fire('file-received', proxyFile);
        this.sendJSON({ type: 'transfer-complete' });
    }

    // 处理传输完成的方法
    _onTransferCompleted() {
        this._onDownloadProgress(1);
        this._reader = null;
        this._busy = false;
        this._dequeueFile();
        Events.fire('notify-user', 'File transfer completed.');
    }

    // 发送文本消息的方法
    sendText(text) {
        const unescaped = btoa(unescape(encodeURIComponent(text)));
        this.sendJSON({ type: 'text', text: unescaped });
    }

    // 处理接收到的文本消息的方法
    _onTextReceived(message) {
        const escaped = decodeURIComponent(escape(atob(message.text)));
        Events.fire('text-received', { text: escaped, sender: this._peerId });
    }
}

// 定义 RTCPeer 类，继承自 Peer 类
class RTCPeer extends Peer {


    // 构造函数
    constructor(serverConnection, peerId) {
        super(serverConnection, peerId);
        if (!peerId) return; // we will listen for a caller
        this._connect(peerId, true);
    }

    // 连接到对等方的方法
    _connect(peerId, isCaller) {
        if (!this._conn) this._openConnection(peerId, isCaller);

        if (isCaller) {
            this._openChannel();
        } else {
            this._conn.ondatachannel = e => this._onChannelOpened(e);
        }
    }

    // 打开连接的方法
    _openConnection(peerId, isCaller) {
        this._isCaller = isCaller;
        this._peerId = peerId;
        this._conn = new RTCPeerConnection(RTCPeer.config);
        this._conn.onicecandidate = e => this._onIceCandidate(e);
        this._conn.onconnectionstatechange = e => this._onConnectionStateChange(e);
        this._conn.oniceconnectionstatechange = e => this._onIceConnectionStateChange(e);
    }

    // 打开数据通道的方法
    _openChannel() {
        const channel = this._conn.createDataChannel('data-channel', {
            ordered: true,
            reliable: true // Obsolete. See https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/reliable
        });
        channel.onopen = e => this._onChannelOpened(e);
        this._conn.createOffer().then(d => this._onDescription(d)).catch(e => this._onError(e));
    }

    // 处理描述信息的方法
    _onDescription(description) {
        // description.sdp = description.sdp.replace('b=AS:30', 'b=AS:1638400');
        this._conn.setLocalDescription(description)
            .then(_ => this._sendSignal({ sdp: description }))
            .catch(e => this._onError(e));
    }

    // 处理 ICE 候选地址的方法
    _onIceCandidate(event) {
        if (!event.candidate) return;
        this._sendSignal({ ice: event.candidate });
    }

    // 处理服务器消息的方法
    onServerMessage(message) {
        if (!this._conn) this._connect(message.sender, false);

        if (message.sdp) {
            this._conn.setRemoteDescription(new RTCSessionDescription(message.sdp))
                .then(_ => {
                    if (message.sdp.type === 'offer') {
                        return this._conn.createAnswer()
                            .then(d => this._onDescription(d));
                    }
                })
                .catch(e => this._onError(e));
        } else if (message.ice) {
            this._conn.addIceCandidate(new RTCIceCandidate(message.ice));
        }
    }

    // 处理数据通道打开的方法
    _onChannelOpened(event) {
        console.log('RTC: channel opened with', this._peerId);
        const channel = event.channel || event.target;
        channel.binaryType = 'arraybuffer';
        channel.onmessage = e => this._onMessage(e.data);
        channel.onclose = e => this._onChannelClosed();
        this._channel = channel;
    }

    // 处理数据通道关闭的方法
    _onChannelClosed() {
        console.log('RTC: channel closed', this._peerId);
        if (!this.isCaller) return;
        this._connect(this._peerId, true); // reopen the channel
    }

    // 处理连接状态变化的方法
    _onConnectionStateChange(e) {
        console.log('RTC: state changed:', this._conn.connectionState);
        switch (this._conn.connectionState) {
            case 'disconnected':
                this._onChannelClosed();
                break;
            case 'failed':
                this._conn = null;
                this._onChannelClosed();
                break;
        }
    }

    // 处理 ICE 连接状态变化的方法
    _onIceConnectionStateChange() {
        switch (this._conn.iceConnectionState) {
            case 'failed':
                console.error('ICE Gathering failed');
                break;
            default:
                console.log('ICE Gathering', this._conn.iceConnectionState);
        }
    }

    // 处理错误的方法
    _onError(error) {
        console.error(error);
    }

    // 发送消息的方法
    _send(message) {
        if (!this._channel) return this.refresh();
        this._channel.send(message);
    }

    // 发送信号的方法
    _sendSignal(signal) {
        signal.type = 'signal';
        signal.to = this._peerId;
        this._server.send(signal);
    }

    // 刷新连接的方法
    refresh() {
        // check if channel is open. otherwise create one
        if (this._isConnected() || this._isConnecting()) return;
        this._connect(this._peerId, this._isCaller);
    }

    // 判断是否已连接的方法
    _isConnected() {
        return this._channel && this._channel.readyState === 'open';
    }

    // 判断是否正在连接的方法
    _isConnecting() {
        return this._channel && this._channel.readyState === 'connecting';
    }
}

// 定义 PeersManager 类
class PeersManager {


    // 构造函数
    constructor(serverConnection) {
        this.peers = {};
        this._server = serverConnection;
        Events.on('signal', e => this._onMessage(e.detail));
        Events.on('peers', e => this._onPeers(e.detail));
        Events.on('files-selected', e => this._onFilesSelected(e.detail));
        Events.on('send-text', e => this._onSendText(e.detail));
        Events.on('peer-left', e => this._onPeerLeft(e.detail));
    }

    // 处理信号消息的方法
    _onMessage(message) {
        if (!this.peers[message.sender]) {
            this.peers[message.sender] = new RTCPeer(this._server);
        }
        this.peers[message.sender].onServerMessage(message);
    }

    // 处理对等方列表的方法
    _onPeers(peers) {
        peers.forEach(peer => {
            if (this.peers[peer.id]) {
                this.peers[peer.id].refresh();
                return;
            }
            if (window.isRtcSupported && peer.rtcSupported) {
                this.peers[peer.id] = new RTCPeer(this._server, peer.id);
            } else {
                this.peers[peer.id] = new WSPeer(this._server, peer.id);
            }
        })
    }

    // 向指定对等方发送消息的方法
    sendTo(peerId, message) {
        this.peers[peerId].send(message);
    }

    // 处理选择文件的方法
    _onFilesSelected(message) {
        this.peers[message.to].sendFiles(message.files);
    }

    // 处理发送文本的方法
    _onSendText(message) {
        console.log('_onSendText');
        console.log(message);
        this.peers[message.to].sendText(message.text);
    }

    // 处理对等方离开的方法
    _onPeerLeft(peerId) {
        const peer = this.peers[peerId];
        delete this.peers[peerId];
        if (!peer || !peer._peer) return;
        peer._peer.close();
    }
}

// 定义 WSPeer 类
class WSPeer {
    _send(message) {
        message.to = this._peerId;
        this._server.send(message);
    }
}

// 定义文件分块器类
class FileChunker {


    // 构造函数
    constructor(file, onChunk, onPartitionEnd) {
        this._chunkSize = 64000; // 64 KB
        this._maxPartitionSize = 1e6; // 1 MB
        this._offset = 0;
        this._partitionSize = 0;
        this._file = file;
        this._onChunk = onChunk;
        this._onPartitionEnd = onPartitionEnd;
        this._reader = new FileReader();
        this._reader.addEventListener('load', e => this._onChunkRead(e.target.result));
    }

    // 发送下一个分块的方法
    nextPartition() {
        this._partitionSize = 0;
        this._readChunk();
    }

    // 读取分块的方法
    _readChunk() {
        const chunk = this._file.slice(this._offset, this._offset + this._chunkSize);
        this._reader.readAsArrayBuffer(chunk);
    }

    // 处理分块读取完成的方法
    _onChunkRead(chunk) {
        this._offset += chunk.byteLength;
        this._partitionSize += chunk.byteLength;
        this._onChunk(chunk);
        if (this.isFileEnd()) return;
        if (this._isPartitionEnd()) {
            this._onPartitionEnd(this._offset);
            return;
        }
        this._readChunk();
    }

    // 重新发送当前分块的方法
    repeatPartition() {
        this._offset -= this._partitionSize;
        this._nextPartition();
    }

    // 判断当前分块是否已结束的方法
    _isPartitionEnd() {
        return this._partitionSize >= this._maxPartitionSize;
    }

    // 判断文件是否已结束的方法
    isFileEnd() {
        return this._offset >= this._file.size;
    }

    // 获取当前进度的方法
    get progress() {
        return this._offset / this._file.size;
    }
}

// 定义文件解析器类
class FileDigester {


    // 构造函数
    constructor(meta, callback) {
        this._buffer = [];
        this._bytesReceived = 0;
        this._size = meta.size;
        this._mime = meta.mime || 'application/octet-stream';
        this._name = meta.name;
        this._callback = callback;
    }

    // 解析文件分块的方法
    unchunk(chunk) {
        this._buffer.push(chunk);
        this._bytesReceived += chunk.byteLength || chunk.size;
        const totalChunks = this._buffer.length;
        this.progress = this._bytesReceived / this._size;
        if (isNaN(this.progress)) this.progress = 1

        if (this._bytesReceived < this._size) return;
        // we are done
        let blob = new Blob(this._buffer, { type: this._mime });
        this._callback({
            name: this._name,
            mime: this._mime,
            size: this._size,
            blob: blob
        });
    }
}

// 定义事件类
class Events {
    // 触发事件的方法
    static fire(type, detail) {
        window.dispatchEvent(new CustomEvent(type, { detail: detail }));
    }


    // 监听事件的方法
    static on(type, callback) {
        return window.addEventListener(type, callback, false);
    }

    // 取消监听事件的方法
    static off(type, callback) {
        return window.removeEventListener(type, callback, false);
    }
}

// 定义 RTCPeer 的配置对象
RTCPeer.config = {
    'sdpSemantics': 'unified-plan',
    'iceServers': [{
        urls: 'stun:stun.l.google.com:19302'
    }]
}