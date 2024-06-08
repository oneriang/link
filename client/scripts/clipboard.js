// client/scripts/clipboard.js

// 如果浏览器不支持 Navigator.clipboard.writeText，则提供一个 Polyfill
if (!navigator.clipboard) {
    navigator.clipboard = {
        // 定义一个函数，用于将文本复制到剪贴板
        writeText: text => {


            // 创建一个 <span> 元素，用于包含要复制的文本
            const span = document.createElement('span');
            span.textContent = text;
            // 设置 span 元素的 whiteSpace 属性为 pre，以保留连续的空格和换行符
            span.style.whiteSpace = 'pre';

            // 将 span 元素定位到视口之外
            span.style.position = 'absolute';
            span.style.left = '-9999px';
            span.style.top = '-9999px';

            // 获取当前窗口对象和选择对象
            const win = window;
            const selection = win.getSelection();
            // 将 span 元素添加到文档体中
            win.document.body.appendChild(span);

            // 创建一个范围对象，用于选择 span 元素中的文本
            const range = win.document.createRange();
            selection.removeAllRanges();
            range.selectNode(span);
            selection.addRange(range);

            // 尝试使用 execCommand 方法将文本复制到剪贴板
            let success = false;
            try {
                success = win.document.execCommand('copy');
            } catch (err) {
                // 如果出现错误，则返回一个失败的 Promise 对象
                return Promise.error();
            }

            // 取消选择并移除 span 元素
            selection.removeAllRanges();
            span.remove();

            // 如果复制成功，则返回一个成功的 Promise 对象
            return Promise.resolve();
        }
    }
}