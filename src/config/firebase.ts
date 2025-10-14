/**
 * Configuration Firebase pour les notifications web
 * IMPORTANT: Remplacez ces valeurs par vos vraies clés Firebase
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';
import { logger } from '@/utils/logger';

// Configuration Firebase - À REMPLACER avec vos vraies valeurs
// Récupérez-les depuis Firebase Console > Project Settings > Your apps
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT_ID.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialise Firebase si ce n'est pas déjà fait
 */
export const initializeFirebase = async (): Promise<FirebaseApp | null> => {
  try {
    // Vérifier si déjà initialisé
    if (getApps().length > 0) {
      app = getApps()[0];
      logger.debug('Firebase already initialized');
      return app;
    }

    // Initialiser Firebase
    app = initializeApp(firebaseConfig);
    logger.success('Firebase initialized');
    return app;
  } catch (error) {
    logger.error('Firebase initialization failed', error);
    return null;
  }
};

/**
 * Récupère l'instance Firebase Messaging
 */
export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  try {
    // Vérifier si les notifications sont supportées
    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      logger.warn('Firebase Messaging not supported');
      return null;
    }

    // Initialiser Firebase si nécessaire
    if (!app) {
      app = await initializeFirebase();
      if (!app) return null;
    }

    // Récupérer ou créer l'instance messaging
    if (!messaging) {
      messaging = getMessaging(app);
      logger.debug('Firebase Messaging instance created');
    }

    return messaging;
  } catch (error) {
    logger.error('Failed to get Firebase Messaging', error);
    return null;
  }
};

/**
 * Vérifie si Firebase est correctement configuré
 */
export const isFirebaseConfigured = (): boolean => {
  return firebaseConfig.apiKey !== "VOTRE_API_KEY" && 
         firebaseConfig.projectId !== "VOTRE_PROJECT_ID";
};
