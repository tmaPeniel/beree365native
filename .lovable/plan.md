# Refonte complète : suppression intégrale du système de notifications

L'utilisateur veut repartir de zéro. **Cette étape ne reconstruit rien** : on supprime tout, on valide, puis on rebâtit dans un second temps avec de nouvelles clés VAPID.

## 1. Suppression côté code

### Frontend
- Supprimer tous les hooks/services/composants liés aux notifications :
  - `src/hooks/useOneSignal*.tsx`, `useNotifications*.tsx`, `usePushNotifications*.tsx`
  - `src/services/onesignal*.ts`, `src/services/notifications/*`
  - Composants `OneSignal*`, `PushNotificationToggle`, `NotificationCenter`, `NotificationBell`, `IOSInstallPrompt` push
- Retirer tout import / usage résiduel dans `App.tsx`, `Settings.tsx`, `AppLayout.tsx`, `index.html`, `main.tsx`
- Désinstaller : `bun remove react-onesignal` (et toute lib push éventuelle)

### Service workers
- Supprimer `public/OneSignalSDKWorker.js`, `public/OneSignalSDKUpdaterWorker.js`, et tout SW push (`sw-push.js`, `firebase-messaging-sw.js` s'il existe)

### Edge functions (supprimées du repo + Supabase)
- `send-push-notification`
- `send-daily-reminders`
- `send-daily-verse`
- Toute autre fonction qui dépend de OneSignal/VAPID

## 2. Suppression côté base de données (migration)

- `DROP TABLE` : `push_subscriptions`, `notification_preferences`, `notification_logs`, `user_devices`
- `DROP FUNCTION` : `get_user_push_subscription_status`, `get_user_notification_history`, `cleanup_old_notification_logs`, `create_default_notification_preferences`
- `DROP TRIGGER` associé à la création auto de préférences
- Supprimer les cron jobs pg_cron liés (envoi quotidien, rappel lecture, cleanup logs) — via insert tool car contient l'URL projet
- `sync_current_day_numbers` : à garder (utile au-delà des notifs) — **à confirmer**

## 3. Suppression des secrets

À supprimer (via `delete_secret`) :
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `FCM_SERVER_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

## 4. Nettoyage mémoire projet

Supprimer les entrées d'index mémoire devenues obsolètes :
- Notification System, Notification Automation, Notification Schema, Sync Day, Toggle, iOS Interactions, Multi-device, OneSignal Subscription, Notification Center UI, Logs Cleanup, Badge Notifications (partie push)

## 5. Vérification finale

- `rg -i "onesignal|vapid|web-push|pushManager|notification_preferences|push_subscriptions"` dans `src/` et `supabase/` → 0 résultat
- Build OK
- L'app tourne sans erreur console
- Tables et fonctions push absentes via `psql`/Supabase

## Hors scope (étape suivante)

La reconstruction VAPID propre (nouvelles clés générées, schéma neuf, SW dédié, multi-device, iOS PWA, admin broadcast) sera traitée dans un message **séparé**, une fois la table rase confirmée.

## Ordre d'exécution

1. Migration DROP (tables + fonctions + triggers)
2. Insert tool : suppression des cron jobs
3. Suppression des edge functions (repo + Supabase via tool)
4. Suppression code frontend + désinstall package
5. Suppression des SW push dans `public/`
6. Suppression des secrets
7. Mise à jour de l'index mémoire
8. Vérification finale (grep + build)
