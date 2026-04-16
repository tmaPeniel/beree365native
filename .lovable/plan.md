

## Migration OneSignal → Web Push natif (VAPID)

### Objectif
Remplacer OneSignal par l'API Web Push native avec des cles VAPID. Cela supprime la dependance a un service tiers, simplifie l'architecture, et donne un controle total sur les notifications.

### Architecture cible

```text
Frontend (SW + Push API)          Edge Functions (Supabase)
┌─────────────────────┐           ┌────────────────────────┐
│ subscribe() →       │           │ send-push-notification │
│   PushSubscription  │──save──→  │   ← web-push (VAPID)  │
│   {endpoint, keys}  │           │   → fetch(endpoint)    │
└─────────────────────┘           └────────────────────────┘
```

Au lieu de stocker un `onesignal_player_id`, on stocke le `PushSubscription` complet (endpoint + p256dh + auth) dans `user_devices`.

### Fichiers a modifier/creer

| Fichier | Action |
|---------|--------|
| **DB migration** | Ajouter colonnes `push_endpoint`, `push_p256dh`, `push_auth` a `user_devices` ; rendre `onesignal_player_id` nullable |
| `src/services/pushService.ts` | **Creer** -- remplace `src/onesignal.ts`. Subscribe/unsubscribe via Push API native, sauvegarde PushSubscription dans Supabase |
| `src/hooks/useUnifiedPushNotifications.ts` | **Recrire** -- utilise `pushService` au lieu de `oneSignalService` |
| `src/hooks/useBadgeCalculation.tsx` | **Modifier** -- importer `pushService` au lieu de `oneSignalService` |
| `public/sw.js` | **Garder** -- deja fonctionnel pour `push` et `notificationclick` |
| `index.html` | **Modifier** -- supprimer le script OneSignal SDK et le bloc `OneSignalDeferred` |
| `public/OneSignalSDKWorker.js` | **Supprimer** |
| `public/manifest.json` | **Modifier** -- retirer `gcm_sender_id` si present |
| `supabase/functions/send-push-notification/index.ts` | **Recrire** -- remplacer l'appel API OneSignal par Web Push natif (fetch vers l'endpoint avec payload chiffre VAPID) |
| `supabase/functions/send-daily-reminders/index.ts` | **Recrire** -- meme logique, utiliser les colonnes `push_endpoint/p256dh/auth` au lieu de `onesignal_player_id` |
| `supabase/functions/send-daily-verse/index.ts` | **Recrire** -- idem |
| `supabase/functions/sync-onesignal-subscriptions/index.ts` | **Supprimer** ou renommer en `cleanup-push-subscriptions` |
| `src/pages/ProfileNotifications.tsx` | **Modifier** -- retirer references OneSignal, simplifier l'UI |
| `src/components/cookies/CookieConsentBanner.tsx` | **Modifier** -- changer "OneSignal" en "notifications push" |

### Detail technique

#### 1. Migration BDD
```sql
ALTER TABLE user_devices 
  ADD COLUMN push_endpoint text,
  ADD COLUMN push_p256dh text,
  ADD COLUMN push_auth text;
ALTER TABLE user_devices ALTER COLUMN onesignal_player_id DROP NOT NULL;
```

#### 2. pushService.ts (remplace onesignal.ts)
- `subscribe()` : appelle `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`, sauvegarde le `PushSubscription` JSON dans `user_devices`
- `unsubscribe()` : appelle `subscription.unsubscribe()`, marque `is_active = false`
- `getSubscription()` : verifie si une subscription active existe
- Utilise `VITE_VAPID_PUBLIC_KEY` (env var publique) pour la cle VAPID cote client

#### 3. Edge Functions -- envoi Web Push natif
Les Edge Functions utiliseront la librairie `web-push` pour Deno (ou implementation manuelle avec `crypto.subtle`) pour signer les requetes VAPID et envoyer les payloads chiffres vers les endpoints Push.

Secrets necessaires : `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` (deja configures dans Supabase).

#### 4. Service Worker
Le `public/sw.js` existant gere deja `push` et `notificationclick` correctement -- aucune modification necessaire.

#### 5. Nettoyage
- Supprimer `src/onesignal.ts`
- Supprimer `public/OneSignalSDKWorker.js`
- Retirer les scripts OneSignal de `index.html`
- Retirer les colonnes `onesignal_player_id` de `profiles` (migration future, pas bloquant)

### Impact
- **0 dependance externe** pour les notifications
- Les secrets `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` sont deja configures
- Le service worker existant est deja compatible
- Les tables `user_devices` et `notification_logs` restent utilisees

