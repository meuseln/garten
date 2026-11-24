/* Firebase Cloud Messaging Service Worker for Hof & Garten */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'Hof & Garten', body: event.data.text() } };
  }
  const title = payload.notification?.title || 'Hof & Garten';
  const options = {
    body: payload.notification?.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data || { url: '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
