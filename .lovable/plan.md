# Plan de correction du flux de notifications push

## Ce que le diagnostic montre déjà
- Le backend a bien au moins une ancienne souscription web active pour ton utilisateur dans `user_devices`, avec un endpoint FCM valide côté navigateur.
- En revanche, il n’y a **aucune trace récente de `manual_test`** dans `notification_logs`.
- Il n’y a pas non plus de logs récents pour l’edge function `send-push-notification`.

Conclusion la plus probable : le problème ne se situe pas uniquement chez FCM/VAPID. Le flux casse probablement **avant la livraison visible**, à l’un de ces niveaux :
1. la souscription active utilisée n’est pas celle de ton navigateur/appareil actuel,
2. le clic sur le bouton de test n’invoque pas correctement l’edge function,
3. l’edge function répond mais sans journalisation suffisante pour comprendre,
4. la notification arrive au service push mais n’est pas affichée par le service worker / navigateur courant.

## Plan d’implémentation

### 1. Ajouter un mode diagnostic visible dans l’écran Profil > Notifications
Créer un bloc de diagnostic simple pour afficher en direct :
- support navigateur (`Notification`, `serviceWorker`, `PushManager`),
- permission actuelle (`granted`, `denied`, `default`),
- présence de `VITE_VAPID_PUBLIC_KEY`,
- état du service worker (`ready`, scope, registration trouvée ou non),
- présence d’une `PushSubscription` locale,
- endpoint courant tronqué pour vérifier qu’il correspond bien à celui stocké en base,
- résultat détaillé du bouton “Envoyer une notification de test”.

But : ne plus avoir un simple “ça ne marche pas”, mais savoir immédiatement à quel étage le flux casse.

### 2. Fiabiliser l’enregistrement de la souscription web
Revoir la logique client de `pushService.subscribe()` / `saveSubscription()` pour :
- réutiliser une souscription existante si le navigateur en a déjà une,
- réactiver la ligne correspondante en base si l’endpoint existe déjà,
- éviter qu’une ancienne souscription d’un autre navigateur reste la seule active,
- rafraîchir `last_seen_at` systématiquement.

But : s’assurer que le push part bien vers **le navigateur actuellement utilisé**.

### 3. Instrumenter fortement l’edge function `send-push-notification`
Ajouter des logs explicites à chaque étape :
- invocation reçue,
- utilisateur(s) ciblé(s),
- nombre de devices trouvés,
- endpoint ciblé tronqué,
- statut de chaque envoi,
- éventuel code d’erreur web-push.

Retourner aussi une réponse plus parlante au client, par exemple :
- `devicesFound`,
- `sent`,
- `failed`,
- détails par device.

But : si l’appel part bien, on saura immédiatement s’il échoue côté sélection de device, côté envoi web-push, ou côté réception navigateur.

### 4. Vérifier et corriger le service worker de réception
Contrôler la compatibilité de `public/sw.js` avec les payloads réellement envoyés :
- bon parsing de `event.data.json()`,
- fallback correct si payload partiel,
- `showNotification()` toujours appelé,
- absence d’erreur silencieuse empêchant l’affichage.

Si besoin, simplifier le payload serveur pour commencer par un format minimal garanti :
```text
{ title, body, tag }
```
Puis réintroduire les options avancées seulement après validation.

### 5. Valider le flux de bout en bout après correctifs
Après implémentation, exécuter une validation complète :
1. se placer sur le vrai flux Profil > Paramètres,
2. activer les notifications,
3. vérifier qu’une souscription locale existe,
4. vérifier qu’elle est bien enregistrée en base,
5. cliquer sur le bouton de test,
6. confirmer :
   - appel edge function,
   - logs backend,
   - ligne `manual_test` en base,
   - réception effective de la notification.

## Fichiers concernés
- `src/pages/ProfileSettings.tsx`
- `src/services/pushService.ts`
- `src/hooks/useUnifiedPushNotifications.ts`
- `public/sw.js`
- `supabase/functions/send-push-notification/index.ts`

## Détails techniques

### Hypothèse principale à corriger
La base semble contenir une vieille souscription active pour ton utilisateur, mais pas de trace récente de test manuel. Donc le problème le plus crédible est :
```text
clic sur le bouton
  -> appel edge function absent ou non observable
  OU
  -> souscription courante pas alignée avec le navigateur utilisé
  OU
  -> réception locale/service worker non affichée
```

### Résultat attendu après correction
Depuis l’écran de paramètres, on doit pouvoir lire noir sur blanc :
- “permission accordée”,
- “service worker prêt”,
- “subscription locale trouvée”,
- “device enregistré en base”,
- “test envoyé à 1 device”,
- puis recevoir la notification sur l’appareil courant.

Si tu valides, j’implémente cette instrumentation + les correctifs de fiabilisation, puis je refais le test complet avec les logs de bout en bout.