# Système de notifications Web Push (VAPID) — inspiré de Cap

Reconstruction propre, sans FCM. Architecture client pure Web Push API + VAPID, et logique serveur portée sur Supabase Edge Functions (Bérée est un SPA Vite, pas TanStack Start comme Cap — donc les `createServerFn` deviennent des edge functions).

## 1. Génération des clés VAPID

Demande des secrets via le tool secrets :
- `VAPID_PUBLIC_KEY` (exposable au client)
- `VAPID_PRIVATE_KEY` (server-only)
- `VAPID_SUBJECT` (ex : `mailto:contact@beree365.app`)

L'utilisateur génère la paire localement avec `npx web-push generate-vapid-keys` ou via un site dédié, puis colle les valeurs dans la fenêtre sécurisée. La publique sera aussi codée en dur dans `src/lib/push/vapid.ts` (constante), exactement comme Cap.

## 2. Schéma DB (migration unique)

Trois tables, calquées sur Cap mais adaptées au contexte Bérée (verset du jour, rappels de lecture, badges) :

```sql
-- Multi-device : une ligne par endpoint
push_subscriptions (
  id uuid PK, user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  endpoint text UNIQUE, p256dh text, auth text,
  user_agent text, created_at timestamptz
)

-- Préférences par utilisateur
notification_preferences (
  user_id uuid PK REFERENCES auth.users ON DELETE CASCADE,
  daily_verse_enabled boolean DEFAULT true,
  reading_reminder_enabled boolean DEFAULT true,
  badges_enabled boolean DEFAULT true,
  daily_verse_time time DEFAULT '08:00',
  reading_reminder_time time DEFAULT '20:00',
  timezone text DEFAULT 'UTC',
  created_at, updated_at
)

-- Anti-doublon (évite de renvoyer le même verset deux fois le même jour)
notifications_sent (
  id uuid PK, user_id uuid, kind text, ref_id text,
  sent_at timestamptz,
  UNIQUE (user_id, kind, ref_id)
)
```

RLS : chaque utilisateur ne lit/écrit que ses lignes. `GRANT` pour `authenticated` + `service_role` (les edge functions cron utilisent le service role). Trigger `updated_at` sur `notification_preferences`.

## 3. Service worker (`public/sw.js`)

Réécriture minimale, alignée sur celle de Cap mais combinée avec Workbox (déjà utilisé pour le PWA) :

- garde `precacheAndRoute(self.__WB_MANIFEST)`, `cleanupOutdatedCaches`, `skipWaiting`, `clientsClaim`
- ajoute `push` : parse JSON `{ title, body, url, tag, icon }`, affiche la notification avec icône `/beree-logo.png`
- ajoute `notificationclick` : focus une fenêtre existante et `client.navigate(url)`, sinon `clients.openWindow(url)`
- garde le handler `message` existant

## 4. Client : helpers + hook

### `src/lib/push/vapid.ts`
Constante `VAPID_PUBLIC_KEY` (la même valeur que le secret).

### `src/lib/push/push.ts` (copié quasi tel quel de Cap)
- `pushSupported()`, `isIOS()`, `isStandalone()`, `permissionState()`
- `getRegistration()` — récupère le SW `/sw.js`, **bypass des hôtes preview** (`id-preview--*.lovable.app`, etc.) pour éviter les souscriptions parasites
- `getCurrentSubscription()`, `subscribeToPush()`, `unsubscribeFromPush()`

### `src/hooks/usePushNotifications.ts`
Wrapper React :
- `isSupported`, `permission`, `isSubscribed`, `isLoading`
- `subscribe()` → appel SW puis edge function `register-push-subscription`
- `unsubscribe()` → désabonnement SW puis `unregister-push-subscription`
- `sendTest()` → edge function `send-test-push`

## 5. Edge Functions (Supabase, Deno)

Toutes utilisent `npm:web-push@3` et lisent `VAPID_*` depuis `Deno.env`. Toutes incluent CORS, validation Zod, et `getClaims()` pour les non-cron.

| Fonction | Auth | Rôle |
|---|---|---|
| `register-push-subscription` | JWT user | Upsert sur `push_subscriptions` (par endpoint) |
| `unregister-push-subscription` | JWT user | Delete par endpoint pour l'utilisateur |
| `get-notification-preferences` | JWT user | Lit/crée les prefs avec timezone détectée |
| `update-notification-preferences` | JWT user | Patch sur les toggles + horaires |
| `send-test-push` | JWT user | Envoi à tous les endpoints de l'utilisateur ; supprime les 404/410 |
| `send-daily-verse` | service role (cron) | Pour chaque user avec `daily_verse_enabled=true` à l'heure locale, envoie le verset du jour |
| `send-reading-reminders` | service role (cron) | Idem pour rappel de lecture |
| `send-badge-notification` | service role (depuis `useBadgeCalculation`) | Envoi push quand un badge se débloque, si `badges_enabled` |

Module partagé `_shared/webpush.ts` (inspiré de `webpush.server.ts` de Cap) : `sendPush(sub, payload)` retournant `{ ok, gone, error }`, et la suppression auto des subs `gone`. Anti-doublon via insert dans `notifications_sent` (kind = `daily_verse|reading_reminder|badge`, ref_id = `YYYY-MM-DD` ou badge_id).

## 6. Cron jobs (pg_cron via insert tool)

- `send-daily-verse` : toutes les 15 min (couvre tous les fuseaux + horaires personnalisés)
- `send-reading-reminders` : toutes les 15 min
- `cleanup-old-notifications-sent` : quotidien (purge `notifications_sent` > 30 jours)

Chaque job appelle l'edge function via `net.http_post` avec apikey anon + header service-role spécial. Les jobs orphelins restants (`send-daily-reading-reminders`, `send-daily-verses`, `sync-onesignal-daily`, `cleanup-notification-logs`) ne pourront pas être supprimés par moi (permission refusée déjà constaté) → je redonnerai la commande SQL à exécuter manuellement.

## 7. UI Settings

Recrée `src/pages/ProfileNotifications.tsx` (et la route `/profile/notifications` dans `App.tsx`) basé sur le `NotificationsSection` de Cap :
- Bouton **Activer / Désactiver** (gère les états : non supporté, refusé, iOS sans PWA installée)
- Bannière iOS expliquant l'install obligatoire en PWA (`isIOS && !isStandalone`)
- 3 lignes de préférences avec switches + sélecteur d'heure : Verset du jour, Rappel de lecture, Badges débloqués
- Bouton « Envoyer une notification de test » visible quand abonné

Re-ajoute aussi le lien vers cette page dans `ProfileSettings.tsx` (section Notifications), et la mention du sous-traitant "Web Push (Mozilla autopush / Google FCM endpoints)" dans `ProfilePrivacy.tsx` et `CookiesPolicy.tsx`.

## 8. Intégration badges

Dans `useBadgeCalculation.tsx`, après détection d'un nouveau badge, appel à l'edge function `send-badge-notification` (en plus du toast in-app existant).

## 9. Mémoire projet

Mise à jour de l'index :
- Remplace la ligne « Notifications: Push system fully removed » par « **Notifications**: Web Push standard (VAPID), multi-device, edge functions Deno avec npm:web-push, anti-doublon via `notifications_sent`. »
- Nouveaux fichiers mémoire : `architecture/push-notifications-vapid`, `database/schema/push-notifications`, `notifications/cron-strategy`.

## 10. Vérification

- Build sans erreur
- Active depuis Settings sur Chrome desktop → notif de test reçue
- Vérifie la ligne dans `push_subscriptions`
- Test deuxième appareil → deuxième ligne
- Désactivation → suppression de la ligne correspondante
- Logs edge function disponibles dans le dashboard

## Hors scope

- Backfill des anciennes données OneSignal (table purgée, sans retour)
- App native (Capacitor) — purement web/PWA pour l'instant
- Notifications transactionnelles (paiement, etc.)
