import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Précache et route les fichiers générés automatiquement par Workbox
precacheAndRoute(self.__WB_MANIFEST);

// Nettoie les caches obsolètes
cleanupOutdatedCaches();

// Prend immédiatement le contrôle des clients existants
self.skipWaiting();
clientsClaim();

// Gestion des notifications push
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push notification reçue:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[Service Worker] Données de notification:', data);
      
      const options = {
        body: data.body || 'Nouvelle notification de Bérée 365',
        icon: '/beree-192x192.png',
        badge: '/beree-192x192.png',
        tag: data.tag || 'beree-notification',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
        data: data.data || {},
        timestamp: Date.now(),
        ...data.options
      };

      event.waitUntil(
        self.registration.showNotification(
          data.title || 'Bérée 365',
          options
        )
      );
    } catch (error) {
      console.error('[Service Worker] Erreur lors du parsing des données de notification:', error);
      
      // Notification par défaut en cas d'erreur
      event.waitUntil(
        self.registration.showNotification('Bérée 365', {
          body: 'Vous avez une nouvelle notification',
          icon: '/beree-192x192.png',
          badge: '/beree-192x192.png',
          tag: 'beree-default'
        })
      );
    }
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Clic sur notification:', event.notification);
  
  event.notification.close();
  
  const data = event.notification.data;
  let urlToOpen = '/';
  
  // Détermine l'URL à ouvrir selon le type de notification
  if (data && data.url) {
    urlToOpen = data.url;
  } else if (event.notification.tag === 'reading-reminder') {
    urlToOpen = '/reading';
  } else if (event.notification.tag === 'daily-verse') {
    urlToOpen = '/dashboard';
  } else if (event.notification.tag === 'badge-encouragement') {
    urlToOpen = '/profile/badges';
  }
  
  // Action spécifique si l'utilisateur clique sur un bouton d'action
  if (event.action) {
    switch (event.action) {
      case 'read-now':
        urlToOpen = '/reading';
        break;
      case 'view-verse':
        urlToOpen = '/dashboard';
        break;
      case 'view-badges':
        urlToOpen = '/profile/badges';
        break;
      case 'dismiss':
        return; // Ne pas ouvrir l'app
    }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Cherche une fenêtre existante avec l'URL cible
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Cherche n'importe quelle fenêtre ouverte de l'app
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'navigate' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      
      // Ouvre une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Gestion de la fermeture des notifications
self.addEventListener('notificationclose', function(event) {
  console.log('[Service Worker] Notification fermée:', event.notification);
  
  // Optionnel : envoyer une analytics ou logs
  const data = event.notification.data;
  if (data && data.trackClose) {
    // Ici on pourrait envoyer des données d'analytics
    console.log('[Service Worker] Tracking notification close');
  }
});

// Gestion des messages du client principal
self.addEventListener('message', function(event) {
  console.log('[Service Worker] Message reçu:', event.data);
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] Service Worker Bérée 365 chargé et prêt pour les notifications push');
