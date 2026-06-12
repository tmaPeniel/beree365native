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
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] Service Worker Bérée 365 chargé');
