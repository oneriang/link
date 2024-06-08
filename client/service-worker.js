// service-worker.js

// 定义缓存的名称
var CACHE_NAME = 'snapdrop-cache-v2';

// 定义需要缓存的资源列表
var urlsToCache = [
    'index.html',
    './',
    'styles.css',
    'scripts/network.js',
    'scripts/ui.js',
    'scripts/clipboard.js',
    'scripts/theme.js',
    'sounds/blop.mp3',
    'images/favicon-96x96.png'
];

// 监听安装事件
self.addEventListener('install', function (event) {
    // 执行安装步骤
    event.waitUntil(
        // 打开缓存
        caches.open(CACHE_NAME)
            .then(function (cache) {
                console.log('Opened cache');
                // 添加需要缓存的资源列表到缓存中
                return cache.addAll(urlsToCache);
            })
    );
});

// 监听获取资源事件
self.addEventListener('fetch', function (event) {
    event.respondWith(
        // 从缓存中匹配请求的资源
        caches.match(event.request)
            .then(function (response) {
                // 如果缓存中有匹配的资源，则返回缓存中的资源
                if (response) {
                    return response;
                }
                // 如果缓存中没有匹配的资源，则从网络中获取资源
                return fetch(event.request);
            }
            )
    );
});

// 监听激活事件
self.addEventListener('activate', function (event) {
    console.log('Updating Service Worker...')
    event.waitUntil(
        // 获取所有缓存的名称
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                // 过滤出需要删除的缓存
                cacheNames.filter(function (cacheName) {
                    // 如果需要删除该缓存，则返回 true
                    return true
                }).map(function (cacheName) {
                    // 删除缓存
                    return caches.delete(cacheName);
                })
            );
        })
    );
});