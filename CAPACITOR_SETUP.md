# Configuration Capacitor pour Bérée 365

## 🎯 Migration terminée

Votre application utilise maintenant Capacitor pour les notifications push natives sur iOS et Android, tout en gardant le support PWA pour le web.

## 📱 Configuration Firebase (Requis)

### 1. Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Créez un nouveau projet ou utilisez un projet existant
3. Ajoutez une application iOS et/ou Android

### 2. Configuration iOS

1. Dans Firebase Console > Project Settings > iOS
2. Téléchargez le fichier `GoogleService-Info.plist`
3. Activez Cloud Messaging dans les capabilities Xcode

**APNs (Apple Push Notification service):**
- Allez dans [Apple Developer](https://developer.apple.com/)
- Créez une clé APNs (Push Notifications)
- Uploadez la clé dans Firebase Console > Cloud Messaging

### 3. Configuration Android

1. Dans Firebase Console > Project Settings > Android
2. Téléchargez le fichier `google-services.json`
3. Le Server Key sera utilisé dans l'Edge Function

**Récupérer le Server Key:**
- Firebase Console > Project Settings > Cloud Messaging
- Copiez le "Server key" (Legacy)

## 🚀 Déploiement sur mobile

### Prérequis
```bash
# 1. Cloner le repo depuis GitHub
git pull origin main

# 2. Installer les dépendances
npm install

# 3. Builder l'application
npm run build
```

### iOS
```bash
# 1. Ajouter la plateforme iOS
npx cap add ios

# 2. Copier le fichier GoogleService-Info.plist
# Placez-le dans ios/App/App/

# 3. Ouvrir Xcode
npx cap open ios

# 4. Dans Xcode:
# - Sélectionnez votre équipe de développement
# - Activez "Push Notifications" dans Capabilities
# - Build et run sur simulateur ou appareil
```

### Android
```bash
# 1. Ajouter la plateforme Android
npx cap add android

# 2. Copier le fichier google-services.json
# Placez-le dans android/app/

# 3. Ouvrir Android Studio
npx cap open android

# 4. Dans Android Studio:
# - Build et run sur émulateur ou appareil
```

## 🔧 Configuration Backend

### Edge Function pour FCM

Il faut créer une nouvelle Edge Function pour envoyer les notifications via Firebase Cloud Messaging:

```typescript
// supabase/functions/send-fcm-notification/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!;
const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';

serve(async (req) => {
  const { token, title, body, data } = await req.json();

  const response = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title,
        body,
        sound: 'default',
      },
      data,
      priority: 'high',
    }),
  });

  const result = await response.json();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Ajouter le secret FCM_SERVER_KEY

Dans Supabase Dashboard:
1. Settings > Edge Functions > Secrets
2. Ajoutez `FCM_SERVER_KEY` avec la valeur du Server Key Firebase

## 🔄 Synchronisation après modifications

Après chaque modification du code:
```bash
# 1. Rebuild
npm run build

# 2. Sync avec les plateformes natives
npx cap sync

# 3. Ouvrir sur la plateforme voulue
npx cap open ios
# ou
npx cap open android
```

## 🌐 Mode de développement

Le fichier `capacitor.config.ts` est configuré pour charger depuis le serveur Lovable:
- Vous pouvez développer en temps réel
- Les modifications apparaissent instantanément sur l'app mobile
- Parfait pour le développement rapide

Pour la production, commentez la section `server` dans `capacitor.config.ts`.

## 📊 Architecture

```
┌─────────────────┐
│   Frontend      │
│  React + TS     │
└────────┬────────┘
         │
         ├─ Web (PWA) ──> Service Worker + Web Push
         │
         └─ Native (iOS/Android) ──> Capacitor Push Notifications
                                     │
                                     └──> Firebase Cloud Messaging
                                          │
                                          └──> Supabase Edge Function
```

## ✅ Fonctionnalités

- ✅ Support multi-plateforme (Web, iOS, Android)
- ✅ Notifications push natives
- ✅ Gestion unifiée via `useUnifiedPushNotifications`
- ✅ Détection automatique de la plateforme
- ✅ Préférences de notifications
- ✅ Tests de notifications
- ✅ Persistance des tokens

## 📝 Notes importantes

1. **PWA vs Native**: Le hook unifié détecte automatiquement la plateforme
2. **Permissions**: Sur iOS, demandées au premier lancement. Sur Android, accordées automatiquement
3. **Badge**: iOS supporte les badges natifs pour le nombre de notifications
4. **Deep linking**: Vous pouvez ajouter des actions dans les notifications pour ouvrir des pages spécifiques

## 🐛 Debugging

### Logs iOS
```bash
# Voir les logs de l'app
npx cap run ios --livereload --external
```

### Logs Android
```bash
# Voir les logs de l'app
npx cap run android --livereload --external
```

### Tester les notifications
1. Utilisez le bouton "Tester" dans l'app
2. Vérifiez les logs Supabase Edge Functions
3. Vérifiez Firebase Console > Cloud Messaging

## 📚 Ressources

- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor iOS Setup](https://capacitorjs.com/docs/ios)
- [Capacitor Android Setup](https://capacitorjs.com/docs/android)
