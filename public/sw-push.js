// Push notification service worker
// install + activate are required for push subscriptions to work in all browsers
self.addEventListener('install', function (event) {
  // Force this SW to become active immediately (don't wait for old one to die)
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Experium';
  const options = {
    body: data.message || 'Ai o notificare nouă',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'default',
    requireInteraction: false,
    data: {
      url: data.url || '/',
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
