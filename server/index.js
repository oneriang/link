// server/index.js

// 引入 node.js 的 process 模块，用于处理进程的事件和信号
var process = require('process')

// 监听 SIGINT 信号，当接收到该信号时，输出提示信息并结束进程
// SIGINT 信号通常是用户在终端中按下 Ctrl+C 组合键时触发
process.on('SIGINT', () => {
    console.info("SIGINT Received, exiting...")
    process.exit(0)
})

// 监听 SIGTERM 信号，当接收到该信号时，输出提示信息并结束进程
// SIGTERM 信号通常是用于请求一个程序以最优雅的方式进行终止
process.on('SIGTERM', () => {
    console.info("SIGTERM Received, exiting...")
    process.exit(0)
})

// 引入 ua-parser-js 模块，用于解析用户代理（User Agent）字符串
const parser = require('ua-parser-js');

// 引入 unique-names-generator 模块，用于生成唯一的名称
const { uniqueNamesGenerator, animals, colors } = require('unique-names-generator');

// 定义 SnapdropServer 类，用于创建和管理 WebSocket 服务器
class SnapdropServer {


    // 构造函数，用于初始化 WebSocket 服务器
    constructor(port) {
        // 引入 WebSocket 模块
        const WebSocket = require('ws');
        // 创建 WebSocket 服务器，并监听指定的端口
        this._wss = new WebSocket.Server({ port: port });
        // 监听连接事件，当有新的客户端连接时，创建一个新的 Peer 对象并加入到房间中
        this._wss.on('connection', (socket, request) => this._onConnection(new Peer(socket, request)));
        // 监听 headers 事件，当接收到 HTTP 请求时，设置响应的 Cookie 头部
        this._wss.on('headers', (headers, response) => this._onHeaders(headers, response));

        // 定义一个对象，用于存储所有的房间
        this._rooms = {};

        // 输出提示信息，表示 Snapdrop 已经在指定的端口上运行
        console.log('Snapdrop is running on port', port);
    }

    // 监听连接事件的回调函数，用于处理新的客户端连接
    _onConnection(peer) {
        // 将新的客户端加入到房间中
        this._joinRoom(peer);
        // 监听消息事件，当接收到消息时，调用 _onMessage 函数进行处理
        peer.socket.on('message', message => this._onMessage(peer, message));
        // 监听错误事件，当发生错误时，输出错误信息
        peer.socket.on('error', console.error);
        // 调用 _keepAlive 函数，用于定期发送心跳包，检查客户端是否在线
        this._keepAlive(peer);

        // 发送一个消息，用于通知客户端其显示名称和设备名称
        this._send(peer, {
            type: 'display-name',
            message: {
                peerId: peer.id,
                displayName: peer.name.displayName,
                deviceName: peer.name.deviceName
            }
        });
    }

    // 监听 headers 事件的回调函数，用于处理 HTTP 请求
    _onHeaders1(headers, response) {
        // 检查响应的 Cookie 头部是否已经包含 peerid 参数，如果已经包含则不进行任何操作
        if (response.headers.cookie && response.headers.cookie.indexOf('peerid=') > -1) return;
        // 为响应的 Cookie 头部
        response.peerId = Peer.uuid();
        headers.push('Set-Cookie: peerid=' + response.peerId + "; SameSite=Strict; Secure");
    }
    _onHeaders(headers, response) {
        console.log('_onHeaders');
        console.log('response');
        // console.log(request);
        // Example: Parsing URL parameters
        const url = new URL(response.url, `http://${response.headers.host}`);
        const params = new URLSearchParams(url.search);

        response.peerId = null;

        for (const [key, value] of params.entries()) {
            console.log(`${key}: ${value}`);
            if (key == 'peerid') {
                response.peerId = value;
            }
        }

        if (response.peerId) {
            
        } else {
            response.peerId = Peer.uuid();
        }

        console.log(response.peerId);
        headers.push('Set-Cookie: peerid=' + response.peerId + "; SameSite=Strict; Secure");
    }

    // 处理消息的回调函数，用于接收和处理客户端发送的消息
    _onMessage(sender, message) {
        // 尝试将消息字符串解析为 JSON 对象
        try {
            message = JSON.parse(message);
        } catch (e) {
            return; // TODO: handle malformed JSON
        }

        // 根据消息的类型进行不同的处理
        switch (message.type) {
            case 'disconnect':
                // 如果消息的类型是 disconnect，则将客户端从房间中移除
                this._leaveRoom(sender);
                break;
            case 'pong':
                // 如果消息的类型是 pong，则更新客户端的最后一次心跳包的时间戳
                sender.lastBeat = Date.now();
                break;
        }

        // 如果消息有指定的接收者，则将消息转发给接收者
        if (message.to && this._rooms['peer.ip']) {
            const recipientId = message.to; // TODO: sanitize
            const recipient = this._rooms['peer.ip'][recipientId];
            delete message.to;
            // add sender id
            message.sender = sender.id;
            this._send(recipient, message);
            return;
        }
    }

    // 将客户端加入到房间中的函数
    _joinRoom(peer) {
        console.log('_joinRoom');
        // 如果房间不存在，则创建一个新的房间
        if (!this._rooms['peer.ip']) {
            this._rooms['peer.ip'] = {};
        }

        console.log(this._rooms);
        // 通知其他客户端有新的客户端加入了房间
        for (const otherPeerId in this._rooms['peer.ip']) {
            const otherPeer = this._rooms['peer.ip'][otherPeerId];
            this._send(otherPeer, {
                type: 'peer-joined',
                peer: peer.getInfo()
            });
        }

        // 通知新的客户端有哪些其他客户端在房间中
        const otherPeers = [];
        for (const otherPeerId in this._rooms['peer.ip']) {
            otherPeers.push(this._rooms['peer.ip'][otherPeerId].getInfo());
        }

        this._send(peer, {
            type: 'peers',
            peers: otherPeers
        });

        // 将新的客户端添加到房间中
        this._rooms['peer.ip'][peer.id] = peer;
    }

    // 将客户端从房间中移除的函数
    _leaveRoom(peer) {
        // 检查客户端是否在房间中，如果不在则不进行任何操作
        if (!this._rooms['peer.ip'] || !this._rooms['peer.ip'][peer.id]) return;
        // 取消定时发送心跳包的任务
        this._cancelKeepAlive(this._rooms['peer.ip'][peer.id]);

        // 从房间中移除客户端
        delete this._rooms['peer.ip'][peer.id];

        // 关闭客户端的 WebSocket 连接
        peer.socket.terminate();
        // 如果房间中没有其他客户端，则将房间从存储所有房间的对象中移除
        if (!Object.keys(this._rooms['peer.ip']).length) {
            delete this._rooms['peer.ip'];
        } else {
            // 通知其他客户端有客户端离开了房间
            for (const otherPeerId in this._rooms['peer.ip']) {
                const otherPeer = this._rooms['peer.ip'][otherPeerId];
                this._send(otherPeer, { type: 'peer-left', peerId: peer.id });
            }
        }
    }

    // 发送消息的函数
    _send(peer, message) {
        // 检查客户端是否存在，如果不存在则不进行任何操作
        if (!peer) return;
        // 检查 WebSocket 服务器是否已经打开，如果没有打开则不进行任何操作
        if (this._wss.readyState !== this._wss.OPEN) return;
        // 将消息对象转换为字符串
        message = JSON.stringify(message);
        // 发送消息字符串
        peer.socket.send(message, error => '');
    }

    // 定期发送心跳包，检查客户端是否在线的函数
    _keepAlive(peer) {
        // 取消之前的定时发送心跳包的任务
        this._cancelKeepAlive(peer);
        // 定义一个超时时间，用于检查客户端是否在线
        var timeout = 30000;
        // 如果客户端的最后一次心跳包的时间戳不存在，则将其设置为当前时间
        if (!peer.lastBeat) {
            peer.lastBeat = Date.now();
        }
        // 如果当前时间与客户端的最后一次心跳包的时间戳的差值大于两倍的超时时间，则将客户端从房间中移除
        if (Date.now() - peer.lastBeat > 2 * timeout) {
            this._leaveRoom(peer);
            return;
        }

        // 发送一个心跳包，用于通知客户端在线
        this._send(peer, { type: 'ping' });

        // 定义一个新的定时发送心跳包的任务
        peer.timerId = setTimeout(() => this._keepAlive(peer), timeout);
    }

    // 取消定时发送心跳包的任务的函数
    _cancelKeepAlive(peer) {
        // 检查客户端是否存在，如果不存在则不进行任何操作
        if (peer && peer.timerId) {
            // 取消定时发送心跳包的任务
            clearTimeout(peer.timerId);
        }
    }
}

// 定义 Peer 类，用于表示一个客户端
class Peer {


    // 构造函数，用于初始化客户端的信息
    constructor(socket, request) {
        // 设置客户端的 WebSocket 对象
        this.socket = socket;

        // 设置客户端的 IP 地址
        this._setIP(request);

        // 设置客户端的 ID
        this._setPeerId(request)
        // 检查客户端是否支持 WebRTC
        this.rtcSupported = request.url.indexOf('webrtc') > -1;
        // 设置客户端的名称
        this._setName(request);
        // 定义一个变量，用于存储定时发送心跳包的任务的 ID
        this.timerId = 0;
        // 定义一个变量，用于存储客户端的最后一次心跳包的时间戳
        this.lastBeat = Date.now();
    }

    // 设置客户端的 IP 地址的函数
    _setIP(request) {
        // 如果请求的头部中包含 X-Forwarded-For 字段，则将其中的第一个 IP 地址作为客户端的 IP 地址
        if (request.headers['x-forwarded-for']) {
            this.ip = request.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
        } else {
            // 否则，将请求的连接对象中的 remoteAddress 属性作为客户端的 IP 地址
            this.ip = request.connection.remoteAddress;
        }
        // 如果客户端的 IP 地址是 IPv4 或 IPv6 中表示本地主机的地址，则将其设置为 IPv4 中表示本地主机的地址
        if (this.ip == '::1' || this.ip == '::ffff:127.0.0.1') {
            this.ip = '127.0.0.1';
        }
    }

    // 设置客户端的 ID 的函数
    _setPeerId(request) {
        // 如果请求的对象中已经包含 peerId 属性，则将其作为客户端的 ID
        if (request.peerId) {
            this.id = request.peerId;
        } else {
            // 否则，将请求的头部中的 Cookie 字段中的 peerid 参数的值作为客户端的 ID
            this.id = request.headers.cookie.replace('peerid=', '');
        }
    }

    // 将客户端对象转换为字符串的函数
    toString() {
        return `<Peer id=${this.id} ip=${this.ip} rtcSupported=${this.rtcSupported}>`
    }

    // 设置客户端的名称的函数
    _setName(req) {
        // 使用 ua-parser-js 模块解析用户代理字符串，获取操作系统和浏览器的信息
        let ua = parser(req.headers['user-agent']);

        // 定义一个变量，用于存储设备的名称
        let deviceName = '';

        // 如果操作系统的名称是 Mac OS，则将其设置为 Mac，否则将其原样添加到设备的名称中
        if (ua.os && ua.os.name) {
            deviceName = ua.os.name.replace('Mac OS', 'Mac') + ' ';
        }

        // 如果操作系统的设备类型是手机或平板电脑，则将其模型名称添加到设备的名称中，否则将其浏览器的名称添加到设备的名称中
        if (ua.device.model) {
            deviceName += ua.device.model;
        } else {
            deviceName += ua.browser.name;
        }

        // 如果设备的名称为空，则将其设置为 Unknown Device
        if (!deviceName)
            deviceName = 'Unknown Device';

        // 使用 unique-names-generator 模块生成一个唯一的显示名称
        const displayName = uniqueNamesGenerator({
            length: 2,
            separator: ' ',
            dictionaries: [colors, animals],
            style: 'capital',
            seed: this.id.hashCode()
        })

        // 将设备的名称和显示名称添加到客户端的名称对象中
        this.name = {
            model: ua.device.model,
            os: ua.os.name,
            browser: ua.browser.name,
            type: ua.device.type,
            deviceName,
            displayName
        };
    }

    // 获取客户端的信息的函数
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            rtcSupported: this.rtcSupported
        }
    }

    // 生成一个 UUID 的函数
    static uuid() {
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
}

// 为字符串对象添加一个 hashCode 方法，用于计算字符串的哈希码
Object.defineProperty(String.prototype, 'hashCode', {
    value: function () {
        var hash = 0, i, chr;
        for (i = 0; i < this.length; i++) {
            chr = this.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
});

// 创建一个新的 SnapdropServer 对象，并监听指定的端口
const server = new SnapdropServer(process.env.PORT || 9001);