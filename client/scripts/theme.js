// client/scripts/theme.js

// 选择主题切换按钮
const btnTheme = document.getElementById('theme');
// 检查操作系统是否设置为深色模式
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// 从本地存储中获取用户的主题偏好，如果有的话
const currentTheme = localStorage.getItem('theme');
// 如果用户在本地存储中的偏好是深色模式...
if (currentTheme == 'dark') {
    // ...在 body 上切换 .dark-theme 类
    document.body.classList.toggle('dark-theme');
    // 否则，如果用户在本地存储中的偏好是浅色模式...
} else if (currentTheme == 'light') {
    // ...在 body 上切换 .light-theme 类
    document.body.classList.toggle('light-theme');
}

// 监听按钮的点击事件
btnTheme.addEventListener('click', function () {


    // 如果用户的操作系统设置为深色模式并且匹配我们的 .dark-theme 类...
    if (prefersDarkScheme.matches) {
        // ...那么切换浅色模式类
        document.body.classList.toggle('light-theme');
        // ...但是如果 body 上已经有 .light-theme 类，那么使用 .dark-theme
        var theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    }
    else {
        // 否则，让我们对 .dark-theme 做同样的事情
        document.body.classList.toggle('dark-theme');
        var theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    }
    // 最后，让我们将当前偏好保存到本地存储中，以便继续使用它
    localStorage.setItem('theme', theme);
});