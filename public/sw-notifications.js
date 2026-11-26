/* Push & Notification click handlers imported by Workbox sw.js */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'Hof & Garten', body: event.data.text() } };
  }

  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || 'Hof & Garten';
  const body = notif.body || data.body || 'Neuer Ping in Hof & Garten.';
  const targetUrl =
    (payload.fcmOptions && payload.fcmOptions.link) ||
    data.url ||
    '/';

  const options = {
    body,
    icon: notif.icon || '/pwa-192x192.png',
    badge: notif.badge || '/pwa-192x192.png',
    tag: notif.tag || 'homestead-ping',
    data: { url: targetUrl },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
