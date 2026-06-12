---
name: Web Push notifications (VAPID)
description: Architecture push standard sans tiers — VAPID + Supabase Edge Functions + npm:web-push
type: feature
---

Système de notifications push standard Web Push (RFC 8030), sans FCM ni OneSignal.

## Composants

- **Service Worker** (`public/sw.js`) : handlers `push` et `notificationclick` (icône `/beree-192x192.png`, focus client existant sinon openWindow).
- **Client** (`src/lib/push/push.ts`) : helpers `subscribeToPush`, `unsubscribeFromPush`, détection iOS/standalone, bypass hôtes preview Lovable.
- **Hook React** (`src/hooks/usePushNotifications.ts`) : état souscription + appel des edge functions register/unregister/test.
- **Préférences** (`src/hooks/useNotificationPreferences.ts`) : lecture/mise à jour `notification_preferences` (avec auto-création + détection fuseau via Intl).

## Edge Functions (Deno + npm:web-push@3.6.7)

- `get-vapid-public-key` (public) — retourne `VAPID_PUBLIC_KEY` au client.
- `register-push-subscription` (JWT) — upsert sur `push_subscriptions` (par endpoint).
- `unregister-push-subscription` (JWT) — delete par endpoint.
- `send-test-push` (JWT) — envoie à tous les endpoints de l'utilisateur.
- `send-daily-verse` (cron, public) — pour chaque user avec `daily_verse_enabled`, envoie le verset du jour à l'heure locale.
- `send-reading-reminders` (cron, public) — rappel de lecture à l'heure locale.
- `send-badge-notification` (JWT) — appelée depuis `useBadgeCalculation` quand un nouveau badge est débloqué.
- `_shared/webpush.ts` — helper `sendPush` qui détecte les souscriptions `gone` (404/410) pour les supprimer.

## Tables

- `push_subscriptions` (multi-device : 1 ligne par endpoint, UNIQUE endpoint).
- `notification_preferences` (PK user_id : 3 toggles + 2 horaires + timezone).
- `notifications_sent` (anti-doublon UNIQUE user_id+kind+ref_id, ref_id = `verse-YYYY-MM-DD`, `reading-YYYY-MM-DD`, `badge-{id}`).

RLS : chacun lit/écrit ses propres lignes. Edge functions cron utilisent le service role.

## Cron jobs (pg_cron)

- `push-send-daily-verse` : `*/15 * * * *` (filtre par heure locale ± fenêtre de 15 min).
- `push-send-reading-reminders` : `*/15 * * * *`.
- `push-cleanup-notifications-sent` : `30 3 * * *` (purge `notifications_sent` > 30 jours).

## Secrets

- `VAPID_PUBLIC_KEY` (exposable via edge function `get-vapid-public-key`).
- `VAPID_PRIVATE_KEY` (server-only).
- `VAPID_SUBJECT` (ex : `mailto:contact@beree365.app`).

## UI

`src/pages/ProfileNotifications.tsx` accessible via `/profile/notifications` depuis ProfileSettings.
Gère iOS PWA non installée, permission refusée, navigateur incompatible.
