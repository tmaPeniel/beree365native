

## Plan : Corriger l'enregistrement des abonnements OneSignal dans Supabase

### Diagnostic confirme

Le dernier enregistrement dans `user_devices` date du **17 janvier 2026**. Le probleme vient du code `src/onesignal.ts` qui ne recupere pas correctement le Player ID apres l'abonnement avec le SDK OneSignal v16.

### 3 problemes identifies dans `src/onesignal.ts`

1. **Polling insuffisant** : Seulement 2 tentatives (2s + 1s) pour recuperer le Player ID, alors que OneSignal v16 peut prendre plus de temps
2. **Event listener incomplet** : Le listener `change` ne capture pas `event.current.id` et appelle `getPlayerId()` qui peut retourner `null`
3. **Pas de liaison utilisateur** : `OneSignal.login(user.id)` n'est jamais appele, donc OneSignal ne connait pas l'identite de l'utilisateur Supabase

---

### Modifications dans `src/onesignal.ts`

#### A. Corriger le listener de subscription (ligne 325-336)

Remplacer le listener actuel par un qui capture le Player ID directement depuis l'evenement :

```typescript
async setupSubscriptionListener(): Promise<void> {
  const OneSignal = await this.waitForOneSignal();
  
  OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
    console.log('Changement de subscription OneSignal:', JSON.stringify(event));
    
    const playerId = event?.current?.id;
    const isOptedIn = event?.current?.optedIn;
    
    if (isOptedIn && playerId) {
      this.playerId = playerId;
      await this.savePlayerIdToProfile(playerId);
    } else if (!isOptedIn) {
      await this.clearPlayerIdFromProfile();
      this.playerId = null;
    }
  });
}
```

#### B. Ameliorer la methode `subscribe()` (ligne 222-280)

- Ajouter `OneSignal.login(user.id)` pour lier l'utilisateur Supabase a OneSignal
- Implementer un polling robuste avec 5 tentatives et delais progressifs
- Ajouter un fallback via le Player ID capture par le listener

```typescript
async subscribe(): Promise<boolean> {
  const OneSignal = await this.waitForOneSignal();
  
  // Recuperer l'utilisateur connecte
  const { data: { user } } = await supabase.auth.getUser();
  
  // Lier l'utilisateur Supabase a OneSignal (external_user_id)
  if (user) {
    await OneSignal.login(user.id);
  }
  
  // Verifier/demander la permission
  // ...
  
  // S'abonner
  await OneSignal.User.PushSubscription.optIn();
  
  // Polling robuste : 5 tentatives avec delais progressifs
  let playerId = null;
  const delays = [1500, 2000, 2500, 3000, 3500];
  
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise(r => setTimeout(r, delays[attempt]));
    playerId = await this.getPlayerId();
    if (playerId) break;
  }
  
  // Fallback : verifier si le listener a deja capture l'ID
  if (!playerId && this.playerId) {
    playerId = this.playerId;
  }
  
  if (playerId) {
    await this.savePlayerIdToProfile(playerId);
    this.playerId = playerId;
  }
  
  // ...
}
```

#### C. Ajouter des logs detailles dans `savePlayerIdToProfile()` (ligne 119-178)

Ajouter un bloc de logs visible pour faciliter le diagnostic futur.

---

### Resume des changements

| Fichier | Modification |
|---------|-------------|
| `src/onesignal.ts` | 1. Listener avec `event.current.id` |
| | 2. `OneSignal.login(user.id)` dans `subscribe()` |
| | 3. Polling 5 tentatives (1.5s a 3.5s) |
| | 4. Fallback via `this.playerId` du listener |
| | 5. Logs detailles |

### Impact

- Les **futurs abonnements** seront correctement enregistres dans `user_devices` et `profiles`
- L'`external_user_id` sera defini dans OneSignal, facilitant la synchronisation future
- Les logs permettront de diagnostiquer tout probleme residuel

### Note importante

Pour les abonnements manquants entre le 17 janvier et aujourd'hui, les utilisateurs devront desactiver puis reactiver leurs notifications pour que leur Player ID soit enregistre avec les corrections.
