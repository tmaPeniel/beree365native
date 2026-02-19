/**
 * Constantes pour les notifications
 */

export const DEFAULT_NOTIFICATION_PREFS = {
  reading_reminder_enabled: true,
  reading_reminder_time: '20:00',
  daily_verse_enabled: true,
  daily_verse_time: '07:00',
  badge_encouragement_enabled: true
};

export const NOTIFICATION_MESSAGES = {
  PERMISSION_GRANTED: 'Permissions accordées pour les notifications',
  PERMISSION_DENIED: 'Permissions refusées pour les notifications',
  SUBSCRIPTION_SUCCESS: 'Abonnement aux notifications réussi',
  SUBSCRIPTION_ERROR: 'Erreur lors de l\'abonnement',
  UNSUBSCRIPTION_SUCCESS: 'Désabonnement réussi',
  PREFERENCES_UPDATED: 'Préférences mises à jour',
  PREFERENCES_ERROR: 'Erreur lors de la mise à jour',
  AUTH_REQUIRED: 'Vous devez être connecté pour activer les notifications'
};
