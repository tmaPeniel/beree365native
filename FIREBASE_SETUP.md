# 🔥 Configuration Firebase pour Bérée 365

## Étape 1 : Créer le projet Firebase ✅

### 1.1 Créer le projet
1. Allez sur [Firebase Console](https://console.firebase.com/)
2. Cliquez sur **"Ajouter un projet"**
3. Nom du projet : `beree-365` (ou votre choix)
4. Activez Google Analytics (optionnel mais recommandé)
5. Cliquez sur **"Créer le projet"**

### 1.2 Activer Cloud Messaging
1. Dans votre projet Firebase, allez dans **Project Settings** (⚙️)
2. Allez dans l'onglet **"Cloud Messaging"**
3. Si demandé, activez **"Cloud Messaging API (Legacy)"**

---

## Étape 2 : Configuration iOS 🍎

### 2.1 Ajouter l'app iOS
1. Dans Firebase Console, cliquez sur **"Ajouter une application"** → **iOS**
2. **Bundle ID** : `app.lovable.f27fcb771f7c4b7c8610d0860593b05d`
3. **Nom de l'app** : `Bérée 365`
4. Cliquez sur **"Enregistrer l'application"**

### 2.2 Télécharger GoogleService-Info.plist
1. Téléchargez le fichier `GoogleService-Info.plist`
2. **IMPORTANT** : Vous devrez le placer dans `ios/App/App/` après avoir fait `npx cap add ios`

### 2.3 Configurer APNs (Apple Push Notification service)

#### A. Créer une clé APNs dans Apple Developer
1. Allez sur [Apple Developer](https://developer.apple.com/account/resources/authkeys/list)
2. Cliquez sur **"+"** pour créer une nouvelle clé
3. Nom : `Beree_Push_Notifications`
4. Cochez **"Apple Push Notifications service (APNs)"**
5. Cliquez sur **"Continue"** puis **"Register"**
6. **TÉLÉCHARGEZ LA CLÉ** (fichier `.p8`) - vous ne pourrez le télécharger qu'une fois !
7. Notez le **Key ID** et le **Team ID**

#### B. Uploader la clé APNs dans Firebase
1. Dans Firebase Console → **Project Settings** → **Cloud Messaging**
2. Section **"Apple app configuration"**
3. Cliquez sur **"Upload"** dans APNs Authentication Key
4. Uploadez votre fichier `.p8`
5. Entrez le **Key ID** et le **Team ID**
6. Cliquez sur **"Upload"**

---

## Étape 3 : Configuration Android 🤖

### 3.1 Ajouter l'app Android
1. Dans Firebase Console, cliquez sur **"Ajouter une application"** → **Android**
2. **Package name** : `app.lovable.f27fcb771f7c4b7c8610d0860593b05d`
3. **Nom de l'app** : `Bérée 365`
4. Cliquez sur **"Enregistrer l'application"**

### 3.2 Télécharger google-services.json
1. Téléchargez le fichier `google-services.json`
2. **IMPORTANT** : Vous devrez le placer dans `android/app/` après avoir fait `npx cap add android`

### 3.3 Récupérer le Server Key (Legacy)
1. Dans Firebase Console → **Project Settings** → **Cloud Messaging**
2. Section **"Cloud Messaging API (Legacy)"**
3. **Copiez le "Server key"** (commence par `AAAA...`)
4. Ce sera votre `FCM_SERVER_KEY` (déjà configuré dans Supabase ✅)

---

## Étape 4 : Mettre à jour le FCM_SERVER_KEY dans Supabase ✅

Le secret `FCM_SERVER_KEY` a déjà été créé dans Supabase. Maintenant vous devez y mettre la vraie valeur :

1. Copiez votre **Server Key** depuis Firebase (étape 3.3)
2. Allez dans [Supabase Secrets](https://supabase.com/dashboard/project/xizlfyrjhzkzdchjezfn/settings/functions)
3. Trouvez `FCM_SERVER_KEY`
4. Cliquez sur **"Edit"**
5. Collez votre Server Key Firebase
6. Cliquez sur **"Save"**

---

## Étape 5 : Tester la configuration 🧪

### Test rapide (sans build mobile)
Pour tester que Firebase est bien configuré, vous pouvez utiliser l'API REST de Firebase directement :

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=VOTRE_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "UN_TOKEN_TEST",
    "notification": {
      "title": "Test Bérée 365",
      "body": "Configuration Firebase réussie !"
    }
  }'
```

Si vous obtenez une réponse avec `"success": 1` ou même une erreur sur le token (normal sans app mobile), c'est que la clé fonctionne !

---

## Étape 6 : Déployer sur mobile 📱

### iOS
```bash
# Dans votre repo GitHub local
npm install
npm run build
npx cap add ios
npx cap sync

# Copier GoogleService-Info.plist
# Placez-le dans : ios/App/App/GoogleService-Info.plist

# Ouvrir Xcode
npx cap open ios

# Dans Xcode :
# 1. Sélectionnez votre Team de développement
# 2. Signing & Capabilities → + Capability → Push Notifications
# 3. Build et run sur simulateur ou appareil
```

### Android
```bash
# Dans votre repo GitHub local  
npm install
npm run build
npx cap add android
npx cap sync

# Copier google-services.json
# Placez-le dans : android/app/google-services.json

# Ouvrir Android Studio
npx cap open android

# Dans Android Studio :
# Build et run sur émulateur ou appareil
```

---

## Récapitulatif des fichiers importants 📋

| Fichier | Emplacement | Source |
|---------|-------------|--------|
| `GoogleService-Info.plist` | `ios/App/App/` | Firebase iOS |
| `google-services.json` | `android/app/` | Firebase Android |
| `FCM_SERVER_KEY` | Supabase Secrets | Firebase Cloud Messaging |

---

## ✅ Checklist de configuration

- [ ] Projet Firebase créé
- [ ] App iOS ajoutée dans Firebase
- [ ] `GoogleService-Info.plist` téléchargé
- [ ] Clé APNs créée et uploadée dans Firebase
- [ ] App Android ajoutée dans Firebase
- [ ] `google-services.json` téléchargé
- [ ] Server Key copié et ajouté dans Supabase
- [ ] Edge Function `send-fcm-notification` déployée (✅ déjà fait)
- [ ] Tests effectués

---

## 🆘 En cas de problème

### "Notification not received on iOS"
- Vérifiez que la clé APNs est bien uploadée dans Firebase
- Vérifiez que Push Notifications est activé dans Xcode Capabilities
- Testez sur un appareil physique (pas simulateur iOS)

### "Notification not received on Android"
- Vérifiez que `google-services.json` est bien placé dans `android/app/`
- Vérifiez les logs Android Studio pour voir les erreurs Firebase
- Vérifiez que l'app a les permissions de notification

### "FCM_SERVER_KEY invalid"
- Vérifiez que vous avez copié le bon Server Key (Legacy)
- Vérifiez qu'il n'y a pas d'espaces avant/après dans Supabase Secrets
- Testez avec curl pour valider la clé

---

## 📚 Ressources utiles

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [APNs Configuration](https://firebase.google.com/docs/cloud-messaging/ios/client)
- [FCM for Android](https://firebase.google.com/docs/cloud-messaging/android/client)

---

## 🎉 Prochaine étape

Une fois Firebase configuré et le `FCM_SERVER_KEY` mis à jour dans Supabase, vous pourrez :

1. Builder l'application : `npm run build`
2. Ajouter iOS/Android : `npx cap add ios` / `npx cap add android`
3. Synchroniser : `npx cap sync`
4. Tester les notifications push natives !

L'Edge Function `send-fcm-notification` est déjà déployée et prête à être utilisée. Elle détectera automatiquement si une subscription est native (iOS/Android) et enverra via FCM.
