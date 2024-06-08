// client/scripts/ui.js

// 定义一个函数，用于通过 ID 获取元素
const $ = query => document.getElementById(query);
// 定义一个函数，用于通过查询选择器获取元素
const $$ = query => document.body.querySelector(query);
// 定义一个函数，用于检查文本是否为 URL
const isURL = text => /^((https?:\/\/|www)[^\s]+)/g.test(text.toLowerCase());
// 检查浏览器是否支持下载功能
window.isDownloadSupported = (typeof document.createElement('a').download !== 'undefined');
// 检查当前环境是否为生产环境
window.isProductionEnvironment = !window.location.host.startsWith('localhost');
// 检查当前设备是否为 iOS 设备
window.iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const chatDialogs = {};

// 监听 display-name 事件，设置显示名称
Events.on('display-name', async e => {
    console.log('display-name');
    console.log(e);

    const me = e.detail.message;

    window.peerId = me.peerId;
    localStorage.setItem("peerId", me.peerId);
    $$('.home').innerText = me.peerId;

    // 读取用户
    let user = await crudOperation('Users', 'read', null, me.peerId);
    if (!user) {
        //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        // 创建用户
        let userId = me.peerId;
        await crudOperation('Users', 'create', {
            userId: userId,
            username: 'john_doe',
            displayName: 'John Doe',
            email: 'john@example.com',
            password: 'hashed_password',
            avatarUrl: '',
            status: 'online',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        // 读取用户
        user = await crudOperation('Users', 'read', null, userId);
        //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    }

    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
/*
    // 读取用户
    let users = await crudOperation('Users', 'read', null, null);
    console.log('User retrieved:', users);
    if (users) {
        for (const user of users) {
            console.log(user);
            if (!$(user.userId)) {
                user.id = user.userId;
                const peerUI = new PeerUI(user);
                // $$('x-peers').appendChild(peerUI.$el);

                const el = document.createElement('div');
                el.classList.add('swiper-slide');
                el.appendChild(peerUI.$el);
                window.swiper.appendSlide(el);

                const el2 = document.createElement('div');
                el2.classList.add('swiper-slide');
                el.classList.add(user.userId);
                el2.id = 'swiper-slide-' + user.userId;
                el2.style.display = 'block';
                el2.innerHTML = user.userId;
                window.swiper2.appendSlide(el2);
            }
        }
    }
*/
    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
});

const peerUIs = {};
// 定义 PeersUI 类，用于处理与其他对等方的 UI 交互
class PeersUI {

    constructor() {
        // 监听 peer-joined 事件，当有新的对等方加入时调用 _onPeerJoined 方法
        Events.on('peer-joined', e => this._onPeerJoined(e.detail));
        // 监听 peer-left 事件，当有对等方离开时调用 _onPeerLeft 方法
        Events.on('peer-left', e => this._onPeerLeft(e.detail));
        // 监听 peers 事件，当有对等方列表更新时调用 _onPeers 方法
        Events.on('peers', e => this._onPeers(e.detail));
        // 监听 file-progress 事件，当文件传输进度更新时调用 _onFileProgress 方法
        Events.on('file-progress', e => this._onFileProgress(e.detail));
        // 监听 paste 事件，当粘贴事件发生时调用 _onPaste 方法
        Events.on('paste', e => this._onPaste(e));
    }

    // 处理新的对等方加入时的 UI 更新
    async _onPeerJoined(peer) {

        console.log("_onPeerJoined");
        console.log(peer);
        console.log(peer.id);

        //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

        // 读取用户
        let user = await crudOperation('Users', 'read', null, peer.id);
        console.log('User retrieved:', user);
        //alert(JSON.stringify(user));
        if (!user) {

            // 创建用户
            let userId = peer.id;
            await crudOperation('Users', 'create', {
                userId: userId,
                username: 'john_doe1',
                displayName: 'John Doe1',
                email: 'john1@example.com',
                password: 'hashed_password',
                avatarUrl: '',
                status: 'online',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('User created with ID:', userId);

            // 读取用户
            user = await crudOperation('Users', 'read', null, userId);
            console.log('User retrieved:', user);
            //alert(JSON.stringify(user));

            // 创建联系人
            let contactId = uuidv4();
            await crudOperation('Contacts', 'create', {
                contactId: contactId,
                userId: window.peerId,
                contactUserId: userId,
                nickname: 'Jane',
                status: 'friend',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('Contact created with ID:', contactId);

            // 读取联系人
            let contact = await crudOperation('Contacts', 'read', null, contactId);
            console.log('Contact retrieved:', contact);
            //alert(JSON.stringify(contact));

            await createChatSession(userId, 'single', [window.peerId, userId]);

        }

        //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

        if (!peerUIs[peer.id]) {
            const peerUI = new PeerUI(peer);
            peerUIs[peer.id] = peerUI;

            const el = document.createElement('div');
            el.id = 'swiper-slide-1-' + user.userId;
            el.classList.add('swiper-slide');
            el.appendChild(peerUI.$el);
            window.swiper.appendSlide(el);

            const el2 = document.createElement('div');
            el2.classList.add('swiper-slide');
            el.classList.add(user.userId);
            el2.id = 'swiper-slide-' + user.userId;
            el2.style.display = 'block';
            el2.innerHTML = user.userId;
            window.swiper2.appendSlide(el2);
        } else {
            const peerUI = peerUIs[peer.id];
            peerUI.setOnline();
        }
    }

    // 处理对等方列表更新时的 UI 更新
    _onPeers(peers) {
        this._clearPeers();
        peers.forEach(peer => this._onPeerJoined(peer));
    }

    // 处理对等方离开时的 UI 更新
    _onPeerLeft(peerId) {
        peerUIs[peerId].setOffline();
    }

    // 处理文件传输进度更新时的 UI 更新
    _onFileProgress(progress) {
        const peerId = progress.sender || progress.recipient;
        const $peer = $(peerId);
        if (!$peer) return;
        $peer.ui.setProgress(progress.progress);
    }

    // 清除所有对等方的 UI
    _clearPeers() {
        const $peers = $$('x-peers').innerHTML = '';
    }

    // 处理粘贴事件时的 UI 更新
    _onPaste(e) {
        const files = e.clipboardData.files || e.clipboardData.items
            .filter(i => i.type.indexOf('image') > -1)
            .map(i => i.getAsFile());
        const peers = document.querySelectorAll('x-peer');
        // send the pasted image content to the only peer if there is one
        // otherwise, select the peer somehow by notifying the client that
        // "image data has been pasted, click the client to which to send it"
        // not implemented
        if (files.length > 0 && peers.length === 1) {
            Events.fire('files-selected', {
                files: files,
                to: $$('x-peer').id
            });
        }
    }
}

// 定义 PeerUI 类，用于处理单个对等方的 UI 交互
class PeerUI {

    // 返回对等方的 HTML 模板
    html() {
        return `
            <div class="id"></div>
        `
    }
    
    // 构造函数，初始化对等方的 UI 元素和事件监听器
    constructor(peer) {
        this._peer = peer;
        this._initDom();
        this._bindListeners(this.$el);
        this._isContextmenu = false;
    }

    // 初始化对等方的 UI 元素
    _initDom() {
        const el = document.createElement('x-peer');
        el.id = this._peer.id;
        el.style.height = '100%';
        el.innerHTML = this.html();
        el.querySelector('.id').textContent = this._peer.id;;
        el.ui = this;
        this.$el = el;
        this.$progress = el.querySelector('.progress');
    }

    // 绑定对等方的 UI 元素的事件监听器
    _bindListeners(el) {
        console.log(el);

        el.addEventListener('click', e => this._onClick(e));

        el.addEventListener('drop', e => this._onDrop(e));
        el.addEventListener('dragend', e => this._onDragEnd(e));
        el.addEventListener('dragleave', e => this._onDragEnd(e));
        el.addEventListener('dragover', e => this._onDragOver(e));
        el.addEventListener('contextmenu', e => this._onRightClick(e));
        el.addEventListener('touchstart', e => this._onTouchStart(e));
        el.addEventListener('touchend', e => this._onTouchEnd(e));

        // prevent browser's default file drop behavior
        Events.on('dragover', e => e.preventDefault());
        Events.on('drop', e => e.preventDefault());
    }

    // 返回对等方的显示名称
    _displayName() {
        // return this._peer.name.displayName;
        return '';
    }

    // 返回对等方的设备名称
    _deviceName() {
        // return this._peer.name.deviceName;
        return '';
    }

    // 返回对等方的图标
    _icon() {
        // const device = this._peer.name.device || this._peer.name;
        // if (device.type === 'mobile') {
        //     return '#phone-iphone';
        // }
        // if (device.type === 'tablet') {
        //     return '#tablet-mac';
        // }
        return '#desktop-mac';
    }

    _onClick(e) {
        console.log(e);
        // e.preventDefault();
        if (this._isContextmenu) {
            this._isContextmenu = false;
        } else {
            // this._showSendTextDialog();
            // this._showChatDialog();

            if (!$('chatDialog-' + this._peer.id)) {
                const chatDialog = new ChatDialog(this._peer.id);
                chatDialogs[this._peer.id] = chatDialog;
            } else {
                const chatDialog = chatDialogs[this._peer.id];
                //chatDialog.show();
            }
        }
    }

    // 处理文件选择事件
    _onFilesSelected(e) {
        const $input = e.target;
        const files = $input.files;
        Events.fire('files-selected', {
            files: files,
            to: this._peer.id
        });
        $input.value = null; // reset input
    }

    setOnline() {
        this.$el.querySelector('.id').textContent = this._peer.id;
    }

    setOffline() {
        this.$el.querySelector('.id').textContent = 'offline';
    }

    // 设置文件传输进度
    setProgress(progress) {
        if (progress > 0) {
            this.$el.setAttribute('transfer', '1');
        }
        if (progress > 0.5) {
            this.$progress.classList.add('over50');
        } else {
            this.$progress.classList.remove('over50');
        }
        const degrees = `rotate(${360 * progress}deg)`;
        this.$progress.style.setProperty('--progress', degrees);
        if (progress >= 1) {
            this.setProgress(0);
            this.$el.removeAttribute('transfer');
        }
    }

    // 处理文件拖放事件
    _onDrop(e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        Events.fire('files-selected', {
            files: files,
            to: this._peer.id
        });
        this._onDragEnd();
    }

    // 处理文件拖放悬停事件
    _onDragOver() {
        this.$el.setAttribute('drop', 1);
    }

    // 处理文件拖放结束事件
    _onDragEnd() {
        this.$el.removeAttribute('drop');
    }

    // 处理右键点击事件
    _onRightClick(e) {
        e.preventDefault();
        // Events.fire('text-recipient', this._peer.id);
        // if (e.which == 3) {
        this._isContextmenu = true;
        this._inputClick();
        // }

    }

    // 处理触摸开始事件
    _onTouchStart(e) {
        this._touchStart = Date.now();
        this._touchTimer = setTimeout(_ => this._onTouchEnd(), 610);
    }

    // 处理触摸结束事件
    _onTouchEnd(e) {
        if (Date.now() - this._touchStart < 500) {
            clearTimeout(this._touchTimer);
        } else { // this was a long tap
            if (e) e.preventDefault();
            // Events.fire('text-recipient', this._peer.id);
            this._inputClick();
        }
    }

    _showSendTextDialog() {
        Events.fire('text-recipient', this._peer.id);
    }

    _showChatDialog() {
        const chatDialog = new ChatDialog(this._peer.id);
    }

    _inputClick() {
        this.$el.querySelector('input.file-selector').click();
    }
}

Events.on('text-received', e => {
    const peer = e.detail;
    const peerId = e.detail.sender;
    if (!$('chatDialog-' + peerId)) {
        const chatDialog = new ChatDialog(peerId);
        chatDialogs[peerId] = chatDialog;
        chatDialog._onText(e);
    } else {
        const chatDialog = chatDialogs[peerId];
        chatDialog._onText(e);
    }
})


// 定义 Dialog 类，用于处理对话框的显示和隐藏
class Dialog {

    html() {
        return `
            <!-- Chat Dialog -->
        `
    }

    constructor(id) {
        this.id = id;
        this._initDom();
        this.$el = $(id);
        this.$el.querySelectorAll('[close]').forEach(el => el.addEventListener('click', e => this.hide()))
        this.$autoFocus = this.$el.querySelector('[autofocus]');
    }

    _initDom() {
        const el = document.createElement('x-dialog');
        el.id = this.id;
        // el.style.display = 'none';
        el.innerHTML = this.html();
        el.ui = this;
        this.$el = el;

        $$('x-dialogs').appendChild(this.$el);
    }

    // 显示对话框
    show() {
        this.$el.style.display = 'block';
        this.$el.setAttribute('show', 1);
        if (this.$autoFocus) this.$autoFocus.focus();
    }

    // 隐藏对话框
    hide() {
        this.$el.style.display = 'none';
        this.$el.removeAttribute('show');
        document.activeElement.blur();
        window.blur();
    }
}

// 定义 ReceiveDialog 类，用于处理接收文件的对话框
class ReceiveDialog extends Dialog {


    constructor() {
        super('receiveDialog');
        Events.on('file-received', e => {
            this._nextFile(e.detail);
            window.blop.play();
        });
        this._filesQueue = [];
    }

    // 处理下一个文件
    _nextFile(nextFile) {
        if (nextFile) this._filesQueue.push(nextFile);
        if (this._busy) return;
        this._busy = true;
        const file = this._filesQueue.shift();
        this._displayFile(file);
    }

    // 处理文件队列中的下一个文件
    _dequeueFile() {
        if (!this._filesQueue.length) { // nothing to do
            this._busy = false;
            return;
        }
        // dequeue next file
        setTimeout(_ => {
            this._busy = false;
            this._nextFile();
        }, 300);
    }

    // 显示文件
    _displayFile(file) {
        const $a = this.$el.querySelector('#download');
        const url = URL.createObjectURL(file.blob);
        $a.href = url;
        $a.download = file.name;

        if (this._autoDownload()) {
            $a.click()
            return
        }
        if (file.mime.split('/')[0] === 'image') {
            console.log('the file is image');
            this.$el.querySelector('.preview').style.visibility = 'inherit';
            this.$el.querySelector("#img-preview").src = url;
        }

        this.$el.querySelector('#fileName').textContent = file.name;
        this.$el.querySelector('#fileSize').textContent = this._formatFileSize(file.size);
        this.show();

        if (window.isDownloadSupported) return;
        // fallback for iOS
        $a.target = '_blank';
        const reader = new FileReader();
        reader.onload = e => $a.href = reader.result;
        reader.readAsDataURL(file.blob);
    }

    // 格式化文件大小
    _formatFileSize(bytes) {
        if (bytes >= 1e9) {
            return (Math.round(bytes / 1e8) / 10) + ' GB';
        } else if (bytes >= 1e6) {
            return (Math.round(bytes / 1e5) / 10) + ' MB';
        } else if (bytes > 1000) {
            return Math.round(bytes / 1000) + ' KB';
        } else {
            return bytes + ' Bytes';
        }
    }

    // 隐藏对话框
    hide() {
        this.$el.querySelector('.preview').style.visibility = 'hidden';
        this.$el.querySelector("#img-preview").src = "";
        super.hide();
        this._dequeueFile();
    }

    // 检查是否自动下载
    _autoDownload() {
        return !this.$el.querySelector('#autoDownload').checked
    }
}

// 定义 SendTextDialog 类，用于处理发送文本的对话框
class SendTextDialog extends Dialog {


    html() {
        return `
            <form action="#">
                <x-background class="full center">
                    <x-paper shadow="2">
                        <h3>Send a Message</h3>
                        <div id="textInput" class="textarea" role="textbox" placeholder="Send a message" autocomplete="off"
                            autofocus contenteditable></div>
                        <div class="row-reverse">
                            <button class="button" type="submit" close>Send</button>
                            <a class="button" close>Cancel</a>
                        </div>
                    </x-paper>
                </x-background>
            </form>
        `
    }


    constructor() {
        super('sendTextDialog');
        Events.on('text-recipient', e => this._onRecipient(e.detail))
        this.$text = this.$el.querySelector('#textInput');
        const button = this.$el.querySelector('form');
        button.addEventListener('submit', e => this._send(e));
    }


    // 处理接收方
    _onRecipient(recipient) {
        this._recipient = recipient;
        this._handleShareTargetText();
        this.show();

        const range = document.createRange();
        const sel = window.getSelection();

        range.selectNodeContents(this.$text);
        sel.removeAllRanges();
        sel.addRange(range);

    }

    // 处理共享目标文本
    _handleShareTargetText() {
        if (!window.shareTargetText) return;
        this.$text.textContent = window.shareTargetText;
        window.shareTargetText = '';
    }

    // 发送文本
    _send(e) {
        e.preventDefault();
        Events.fire('send-text', {
            to: this._recipient,
            text: this.$text.innerText
        });
    }
}


// 定义 ChatDialog 类，用于处理发送文本的对话框
class ChatDialog extends Dialog {

    html() {
        return `
            <form action="#">
                <div id="chatWrap" style="bottom: 0px; width: auto; height: 100%; display: flex; flex-direction: column;">
                    <div id="displayName"></div>
                    <div id="chats" style="margin: 0px; max-height: none; height: 100%;">
                        <!--
                        <div class="chat"><span class="name">b</span><span class="date light"> · 10:44 PM</span>
                            <div class="message">l</div>
                        </div>
                        -->
                    </div>
                    <div id="composeBox" style="overflow: hidden;">
                        <div id="chatTextInput" contenteditable="true"></div>
                    </div>
                    <div class="row-reverse">
                        <button class="button" id="chatTextSendButton">Send</button>
                        <!-- <a class="button" close>Cancel</a> -->
                    </div>
                </div>
            </form>
        `
    }

    constructor(peerId) {

        console.log('ChatDialog');
        console.log(peerId);

        super('chatDialog' + '-' + peerId);

        this.peerId = peerId;

        this.$chats = this.$el.querySelector('#chats');

        this.$displayName = this.$el.querySelector('#displayName');
        this.$chatText = this.$el.querySelector('#chatTextInput');
        const button = this.$el.querySelector('#chatTextSendButton');
        button.addEventListener('click', e => this._send(e));

        this.$displayName.innerText = this.peerId;

        this._recipient = this.peerId;


        const me = this;
        async function b() {
            let messages = await crudOperation('Messages', 'readByIndex', null, me.peerId, 'sessionId', 'timestamp', 'desc');
            console.log(messages);
            messages.forEach(msg => {
                let chatMessage = '';
                const text = msg.content;
                if (text) {

                    const element = document.createElement("div");

                    if (isURL(text)) {
                        chatMessage = `
                            <p style="text-align: left; margin-top: 4px; margin-bottom: 4px;">
                                <a href="${text}" target="_blank">${text}</a>
                            </p>
                        `;
                    } else {
                        if (msg.senderId == window.peerId) {
                            chatMessage = `
                                <div class="chat sent"><span class="name">b</span><span class="date light">${new Date().toISOString()}</span>
                                    <div class="message">${text}</div>
                                </div>
                            `;
                        } else {
                            chatMessage = `
                                <div class="chat"><span class="name">b</span><span class="date light">${new Date().toISOString()}</span>
                                    <div class="message">${text}</div>
                                </div>
                            `;
                        }
                    }
                    // chatMessage += `
                    //     <span class="time-left">${new Date().toISOString()}</span>
                    // `;
                    element.innerHTML = chatMessage;
                    me.$chats.appendChild(element);
                }

            });

            $('swiper-slide-' + me.peerId).appendChild(me.$el);

            me.show();

        }

        b();

        //this.show();
    }

    // 发送文本
    async _send(e) {
        console.log('_send');
        e.preventDefault();

        //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

        await createMessage(this._recipient, window.peerId, this._recipient, this.$chatText.innerText, 'text');

        let chatMessage = `
            <div class="chat sent"><span class="name">b</span><span class="date light">${new Date().toISOString()}</span>
                <div class="message">${this.$chatText.innerText}</div>
            </div>
        `;
        const element = document.createElement("div");
        // element.className = 'textareaChat darker';
        element.innerHTML = chatMessage;
        this.$chats.appendChild(element);

        //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

        Events.fire('send-text', {
            to: this._recipient,
            text: this.$chatText.innerText
        });

        this.$chatText.innerText = '';
    }


    async _onText(e) {
        console.log("_onText");
        console.log(e.detail);

        await createMessage(this._recipient, this._recipient, window.peerId, e.detail.text, 'text');

        let chatMessage = '';
        const text = e.detail.text;
        if (isURL(text)) {
            chatMessage = `
                <p style="text-align: left; margin-top: 4px; margin-bottom: 4px;">
                    <a href="${text}" target="_blank">${text}</a>
                </p>
            `;
        } else {
            chatMessage = `
                <div class="chat"><span class="name">b</span><span class="date light">${new Date().toISOString()}</span>
                    <div class="message">${text}</div>
                </div>
            `;
        }
        const element = document.createElement("div");
        // element.className = 'textareaChat';
        element.innerHTML = chatMessage;
        this.$chats.appendChild(element);

        super.show();
    }
}

// 定义 ReceiveTextDialog 类，用于处理接收文本的对话框
class ReceiveTextDialog extends Dialog {
    constructor() {
        super('receiveTextDialog');
        // Events.on('text-received', e => this._onText(e.detail))
        this.$text = this.$el.querySelector('#text');
        const $copy = this.$el.querySelector('#copy');
        copy.addEventListener('click', _ => this._onCopy());
    }


    // 处理接收到的文本
    _onText(e) {
        this.$text.innerHTML = '';
        const text = e.text;
        if (isURL(text)) {
            const $a = document.createElement('a');
            $a.href = text;
            $a.target = '_blank';
            $a.textContent = text;
            this.$text.appendChild($a);
        } else {
            this.$text.textContent = text;
        }
        this.show();
        window.blop.play();
    }

    // 复制文本到剪贴板
    async _onCopy() {
        await navigator.clipboard.writeText(this.$text.textContent);
        Events.fire('notify-user', 'Copied to clipboard');
    }
}

// 定义 Toast 类，用于处理通知用户的消息
class Toast extends Dialog {
    constructor() {
        super('toast');
        Events.on('notify-user', e => this._onNotfiy(e.detail));
    }


    // 处理通知用户的消息
    _onNotfiy(message) {
        this.$el.textContent = message;
        this.show();
        setTimeout(_ => this.hide(), 3000);
    }
}

// 定义 Notifications 类，用于处理通知
class Notifications {


    constructor() {
        // Check if the browser supports notifications
        if (!('Notification' in window)) return;

        // Check whether notification permissions have already been granted
        if (Notification.permission !== 'granted') {
            this.$button = $('notification');
            this.$button.removeAttribute('hidden');
            this.$button.addEventListener('click', e => this._requestPermission());
        }
        Events.on('text-received', e => this._messageNotification(e.detail.text));
        Events.on('file-received', e => this._downloadNotification(e.detail.name));
    }

    // 请求通知权限
    _requestPermission() {
        Notification.requestPermission(permission => {
            if (permission !== 'granted') {
                Events.fire('notify-user', Notifications.PERMISSION_ERROR || 'Error');
                return;
            }
            this._notify('Even more snappy sharing!');
            this.$button.setAttribute('hidden', 1);
        });
    }

    // 显示通知
    _notify(message, body) {
        const config = {
            body: body,
            icon: '/images/logo_transparent_128x128.png',
        }
        let notification;
        try {
            notification = new Notification(message, config);
        } catch (e) {
            // Android doesn't support "new Notification" if service worker is installed
            if (!serviceWorker || !serviceWorker.showNotification) return;
            notification = serviceWorker.showNotification(message, config);
        }

        // Notification is persistent on Android. We have to close it manually
        const visibilitychangeHandler = () => {
            if (document.visibilityState === 'visible') {
                notification.close();
                Events.off('visibilitychange', visibilitychangeHandler);
            }
        };
        Events.on('visibilitychange', visibilitychangeHandler);

        return notification;
    }

    // 显示消息通知
    _messageNotification(message) {
        if (document.visibilityState !== 'visible') {
            if (isURL(message)) {
                const notification = this._notify(message, 'Click to open link');
                this._bind(notification, e => window.open(message, '_blank', null, true));
            } else {
                const notification = this._notify(message, 'Click to copy text');
                this._bind(notification, e => this._copyText(message, notification));
            }
        }
    }

    // 显示下载通知
    _downloadNotification(message) {
        if (document.visibilityState !== 'visible') {
            const notification = this._notify(message, 'Click to download');
            if (!window.isDownloadSupported) return;
            this._bind(notification, e => this._download(notification));
        }
    }

    // 下载文件
    _download(notification) {
        document.querySelector('x-dialog [download]').click();
        notification.close();
    }

    // 复制文本到剪贴板
    _copyText(message, notification) {
        notification.close();
        if (!navigator.clipboard.writeText(message)) return;
        this._notify('Copied text to clipboard');
    }

    // 绑定通知事件
    _bind(notification, handler) {
        if (notification.then) {
            notification.then(e => serviceWorker.getNotifications().then(notifications => {
                serviceWorker.addEventListener('notificationclick', handler);
            }));
        } else {
            notification.onclick = handler;
        }
    }
}

// 网络状态UI类，用于处理网络状态变化的用户界面更新
class NetworkStatusUI {
    // 构造函数，在创建实例时自动调用
    constructor() {
        // 监听离线事件，当网络状态变为离线时触发
        window.addEventListener('offline', e => this._showOfflineMessage(), false);
        // 监听在线事件，当网络状态变为在线时触发
        window.addEventListener('online', e => this._showOnlineMessage(), false);
        // 如果当前网络状态为离线，则显示离线消息
        if (!navigator.onLine) this._showOfflineMessage();
    }

    // 显示离线消息的私有方法
    _showOfflineMessage() {
        Events.fire('notify-user', 'You are offline');
    }

    // 显示在线消息的私有方法
    _showOnlineMessage() {
        Events.fire('notify-user', 'You are back online');
    }
}

// Web共享目标UI类，用于处理Web共享目标的用户界面更新
class WebShareTargetUI {
    constructor() {
        // 解析当前URL，获取查询参数中的标题、文本和URL
        const parsedUrl = new URL(window.location);
        const title = parsedUrl.searchParams.get('title');
        const text = parsedUrl.searchParams.get('text');
        const url = parsedUrl.searchParams.get('url');

        // 根据查询参数构造共享目标文本
        let shareTargetText = title ? title : '';
        shareTargetText += text ? shareTargetText ? ' ' + text : text : '';

        // 如果URL存在，则只共享链接，而不共享文本，因为只有链接的文本是可点击的
        if (url) shareTargetText = url;

        // 如果共享目标文本为空，则返回
        if (!shareTargetText) return;
        // 设置共享目标文本并重写URL
        window.shareTargetText = shareTargetText;
        history.pushState({}, 'URL Rewrite', '/');
        console.log('Shared Target Text:', '"' + shareTargetText + '"');
    }
}

// Snapdrop类，应用程序的主要类
class Snapdrop {
    constructor() {
        // 创建服务器连接、对等管理器和对等UI实例
        const server = new ServerConnection();
        const peers = new PeersManager(server);
        const peersUI = new PeersUI();
        // 监听加载事件，在应用程序加载完成时创建其他UI实例
        Events.on('load', e => {
            const receiveDialog = new ReceiveDialog();
            const sendTextDialog = new SendTextDialog();
            // const chatDialog = new ChatDialog ();
            const receiveTextDialog = new ReceiveTextDialog();
            const toast = new Toast();
            const notifications = new Notifications();
            const networkStatusUI = new NetworkStatusUI();
            const webShareTargetUI = new WebShareTargetUI();
        });
    }
}

// 创建Snapdrop实例
const snapdrop = new Snapdrop();

// 如果支持Service Worker，则注册Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(serviceWorker => {
            console.log('Service Worker registered');
            window.serviceWorker = serviceWorker
        });
}

// 监听安装提示事件，如果应用程序未安装，则显示安装按钮
window.addEventListener('beforeinstallprompt', e => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        // 如果应用程序已安装，则不显示安装横幅
        return e.preventDefault();
    } else {
        const btn = document.querySelector('#install')
        btn.hidden = false;
        btn.onclick = _ => e.prompt();
        return e.preventDefault();
    }
});

// // 背景动画
// Events.on('load', () => {
//     // 创建画布元素并设置其样式
//     let c = document.createElement('canvas');
//     document.body.appendChild(c);
//     let style = c.style;
//     style.width = '100%';
//     style.position = 'absolute';
//     style.zIndex = -1;
//     style.top = 0;
//     style.left = 0;
//     // 获取画布上下文并初始化变量
//     let ctx = c.getContext('2d');
//     let x0, y0, w, h, dw;

//     // 初始化函数，设置画布大小和其他变量
//     function init() {
//         w = window.innerWidth;
//         h = window.innerHeight;
//         c.width = w;
//         c.height = h;
//         let offset = h > 380 ? 100 : 65;
//         offset = h > 800 ? 116 : offset;
//         x0 = w / 2;
//         y0 = h - offset;
//         dw = Math.max(w, h, 1000) / 13;
//         drawCircles();
//     }
//     // 监听窗口大小变化事件，重新初始化画布
//     window.onresize = init;

//     // 绘制圆圈的函数
//     function drawCircle(radius) {
//         ctx.beginPath();
//         let color = Math.round(255 * (1 - radius / Math.max(w, h)));
//         ctx.strokeStyle = 'rgba(' + color + ',' + color + ',' + color + ',0.1)';
//         ctx.arc(x0, y0, radius, 0, 2 * Math.PI);
//         ctx.stroke();
//         ctx.lineWidth = 2;
//     }

//     // 初始化步骤变量
//     let step = 0;

//     // 绘制圆圈的函数
//     function drawCircles() {
//         ctx.clearRect(0, 0, w, h);
//         for (let i = 0; i < 8; i++) {
//             drawCircle(dw * i + step % dw);
//         }
//         step += 1;
//     }

//     // 初始化加载变量
//     let loading = true;

//     // 动画函数
//     function animate() {
//         if (loading || step % dw < dw - 5) {
//             requestAnimationFrame(function () {
//                 drawCircles();
//                 animate();
//             });
//         }
//     }
//     // 公共函数，用于控制背景动画的加载状态
//     window.animateBackground = function (l) {
//         loading = l;
//         //animate();
//     };
//     // 初始化画布并开始动画
//     init();
//     //animate();
// });

// 通知权限错误消息
Notifications.PERMISSION_ERROR = `
Notifications permission has been blocked
as the user has dismissed the permission prompt several times.
This can be reset in Page Info
which can be accessed by clicking the lock icon next to the URL.`;

// Safari hack to fix audio，用于修复Safari中的音频问题
document.body.onclick = e => {
    document.body.onclick = null;
    if (!(/.*Version.*Safari.*/.test(navigator.userAgent))) return;
    blop.play();
}


//####################################

const db = new Dexie('chatAppDB');
//alert(1);
db.version(1).stores({
    Users: 'userId,username,email',
    Contacts: 'contactId,userId,contactUserId',
    ChatSessions: 'sessionId,sessionType,*participants,createdAt,updatedAt',
    Messages: 'messageId,sessionId,senderId,receiverId,timestamp,content,contentType,status',
    CallRecords: 'callId,callerId,receiverId,startTime,[callerId+receiverId]'
});

db.open().catch((error) => {
    console.error('Failed to open database:', error);
});

async function crudOperation(storeName, operation, data, key, indexField, sortField = null, sortOrder = 'asc') {
    try {
        switch (operation) {
            case 'create':
                return await db[storeName].add(data);
            case 'read':
                if (key) {
                    return await db[storeName].get(key);
                } else {
                    return await db[storeName].toArray();
                }
            case 'update':
                return await db[storeName].put(data);
            case 'delete':
                return await db[storeName].delete(key);
            // case 'readByIndex':
            //     return await db[storeName].where(indexField).equals(key).toArray();
            // case 'readByCompositeIndex':
            //     return await db[storeName].where(indexField).equals(key).toArray();
            case 'readByIndex':
                if (sortField) {
                    return await db[storeName]
                        .where(indexField)
                        .equals(key)
                        .sortBy(sortField, sortOrder);
                } else {
                    return await db[storeName]
                        .where(indexField)
                        .equals(key)
                        .toArray();
                }
            case 'readByCompositeIndex':
                return await db[storeName]
                    .where(indexField)
                    .equals(key)
                    .toArray();
            default:
                throw new Error('Invalid operation');
        }
    } catch (error) {
        console.error(`Error during ${operation} operation on ${storeName}:`, error);
        throw error;
    }
}

// async function readMessagesBySessionId(sessionId) {
//     try {
//         let messages = await crudOperation('Messages', 'readByIndex', null, sessionId, 'sessionId');
//         console.log('Messages retrieved by sessionId:', messages);
//     } catch (error) {
//         console.error('Error during read by index operation:', error);
//     }
// }

// async function b() {
//     await readMessagesBySessionId('79e310e8-832a-4342-bc5d-434e1a4a2c9e');
// }
// b();

// // 调用示例函数
// readMessagesBySessionId('some-session-id');

async function createChatSession(sessionId, sessionType, participants) {
    try {
        if (!sessionId) {
            sessionId = uuidv4();
        }
        let session = {
            sessionId: sessionId,
            sessionType: sessionType,
            participants: participants,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await crudOperation('ChatSessions', 'create', session);
        console.log('Chat session created with ID:', sessionId);
        //alert('sessionId1');
        //alert(sessionId);
        return sessionId;
    } catch (error) {
        console.error('Error during chat session creation:', error);
    }
}

async function createMessage(sessionId, senderId, receiverId, content, contentType) {
    try {
        let messageId = uuidv4();
        let message = {
            messageId: messageId,
            sessionId: sessionId,
            senderId: senderId,
            receiverId: receiverId,
            // 如果是群聊，这个字段可以为 null
            content: content,
            contentType: contentType,
            timestamp: new Date(),
            status: 'sent'
        };
        await crudOperation('Messages', 'create', message);
        console.log('Message created with ID:', messageId);
        return messageId;
    } catch (error) {
        console.error('Error during message creation:', error);
    }
}

async function a() {
    // // 调用示例函数
    // let userId1 = uuidv4();
    // let userId2 = uuidv4();
    // let sessionId = await createChatSession(null, 'single', [userId1, userId2]);
    // await createMessage(sessionId, userId1, userId2, 'Hello, how are you?', 'text');

    user = await crudOperation('Users', 'read', null, null);
    console.log('User retrieved:', user);
}

// a();


