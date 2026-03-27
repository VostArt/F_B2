const CACHE_NAME = 'cyberpunk-pwa-v4';
const ASSETS =['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];

self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    if (url.pathname.startsWith('/content/')) {
        e.respondWith(fetch(e.request).then(res => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
            return res;
        }).catch(() => caches.match(e.request)));
    } else if (!url.pathname.startsWith('/socket.io/')) {
        e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
    }
});

self.addEventListener('push', e => {
    const data = e.data.json();
    const options = { 
        body: data.body, 
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-144.png',
        data: { reminderId: data.reminderId },
        vibrate: [200, 100, 200]
    };
    if (data.reminderId) {
        options.actions = [{ action: 'snooze', title: '💤 Отложить (10 сек)' }];
    }
    e.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    if (e.action === 'snooze') {
        e.waitUntil(fetch(`https://localhost:3000/snooze?reminderId=${e.notification.data.reminderId}`, { method: 'POST' }));
    }
});