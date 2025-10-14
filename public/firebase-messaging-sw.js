// Firebase Cloud Messaging Service Worker pour les notifications web
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuration Firebase - À REMPLACER avec vos vraies valeurs depuis Firebase Console
// Allez dans Firebase Console > Project Settings > General > Your apps > Web app
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT_ID.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Récupérer l'instance Firebase Messaging
const messaging = firebase.messaging();

// Gérer les messages en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Message reçu en arrière-plan', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Nouvelle notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/beree-192x192.png',
    badge: '/beree-192x192.png',
    data: payload.data,
    tag: payload.data?.tag || 'default',
    requireInteraction: false
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked', event);
  
  event.notification.close();

  // Ouvrir ou focus la fenêtre de l'app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const urlToOpen = event.notification.data?.url || '/';
      
      // Essayer de focus une fenêtre existante
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Sinon, ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
