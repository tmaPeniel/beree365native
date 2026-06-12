import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Précache et route les fichiers générés automatiquement par Workbox
precacheAndRoute(self.__WB_MANIFEST);

// Nettoie les caches obsolètes
cleanupOutdatedCaches();

// Prend immédiatement le contrôle des clients existants
self.skipWaiting();
clientsClaim();

// Gestion des messages du client principal
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// === Web Push ===
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: 'Bérée 365', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Bérée 365';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/beree-192x192.png',
    badge: payload.badge || '/beree-192x192.png',
    tag: payload.tag,
    data: { url: payload.url || '/dashboard' },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try { client.navigate(url); } catch (_) {}
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

console.log('[Service Worker] Service Worker Bérée 365 chargé');
