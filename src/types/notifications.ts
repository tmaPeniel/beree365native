/**
 * Types pour les notifications push
 */

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface NotificationPreferences {
  reading_reminder_enabled?: boolean;
  reading_reminder_time?: string;
  daily_verse_enabled?: boolean;
  daily_verse_time?: string;
  badge_encouragement_enabled?: boolean;
}

export type NotificationStatus = 'unsupported' | 'denied' | 'active' | 'inactive';

export interface NotificationStatusInfo {
  status: NotificationStatus;
  label: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  description: string;
  icon: any;
}
