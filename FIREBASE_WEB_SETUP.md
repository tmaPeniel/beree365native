# Configuration Firebase Web pour les notifications

## 📋 Prérequis

Vous devez avoir un projet Firebase configuré avec FCM. Si ce n'est pas fait, suivez d'abord le guide `FIREBASE_SETUP.md`.

## 🔧 Étape 1 : Récupérer les clés Firebase Web

### 1.1 Aller dans Firebase Console

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet
3. Cliquez sur l'icône ⚙️ (Paramètres) → **Paramètres du projet**

### 1.2 Ajouter une application Web

1. Dans l'onglet **Général**, descendez jusqu'à **Vos applications**
2. Cliquez sur l'icône **Web** (`</>`)
3. Donnez un nom à votre application (ex: "Bérée 365 Web")
4. **NE cochez PAS** "Configurer Firebase Hosting"
5. Cliquez sur **Enregistrer l'application**

### 1.3 Copier la configuration

Vous verrez un code JavaScript comme ceci :

\`\`\`javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "votre-projet.firebaseapp.com",
  projectId: "votre-projet",
  storageBucket: "votre-projet.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
\`\`\`

**Copiez ces valeurs**, vous en aurez besoin !

## 🔑 Étape 2 : Récupérer la clé VAPID

### 2.1 Aller dans Cloud Messaging

1. Toujours dans **Paramètres du projet**
2. Allez dans l'onglet **Cloud Messaging**
3. Descendez jusqu'à **Configuration Web**

### 2.2 Générer une clé VAPID (si nécessaire)

Si vous n'avez pas de clé VAPID :
1. Cliquez sur **Générer une nouvelle paire de clés**
2. Confirmez

### 2.3 Copier la clé publique

Copiez la **clé publique** (elle ressemble à : `BN...xyz`)

## 📝 Étape 3 : Mettre à jour le code

### 3.1 Fichier `src/config/firebase.ts`

Remplacez les valeurs placeholders par vos vraies valeurs :

\`\`\`typescript
const firebaseConfig = {
  apiKey: "VOTRE_VRAIE_API_KEY",           // ← Remplacer
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com", // ← Remplacer
  projectId: "VOTRE_PROJECT_ID",           // ← Remplacer
  storageBucket: "VOTRE_PROJECT_ID.appspot.com", // ← Remplacer
  messagingSenderId: "VOTRE_SENDER_ID",    // ← Remplacer
  appId: "VOTRE_APP_ID"                    // ← Remplacer
};
\`\`\`

### 3.2 Fichier `public/firebase-messaging-sw.js`

Remplacez les mêmes valeurs dans le Service Worker :

\`\`\`javascript
const firebaseConfig = {
  apiKey: "VOTRE_VRAIE_API_KEY",           // ← Remplacer
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com", // ← Remplacer
  projectId: "VOTRE_PROJECT_ID",           // ← Remplacer
  storageBucket: "VOTRE_PROJECT_ID.appspot.com", // ← Remplacer
  messagingSenderId: "VOTRE_SENDER_ID",    // ← Remplacer
  appId: "VOTRE_APP_ID"                    // ← Remplacer
};
\`\`\`

### 3.3 Fichier `src/services/notifications/nativeNotificationService.ts`

Ligne ~100, remplacez la clé VAPID :

\`\`\`typescript
const token = await getToken(messaging, {
  vapidKey: 'VOTRE_VRAIE_CLE_VAPID_PUBLIQUE', // ← Remplacer ici
  serviceWorkerRegistration: registration
});
\`\`\`

## ✅ Étape 4 : Tester

1. **Redémarrez l'application** pour que les changements prennent effet
2. Allez sur **Profil** → **Notifications**
3. Activez les notifications
4. Vous devriez voir une demande de permission du navigateur
5. Cliquez sur **Autoriser**
6. Cliquez sur **Tester** pour envoyer une notification de test

## 🔍 Vérification

### Dans les DevTools du navigateur :

1. Ouvrez la console (F12)
2. Vous devriez voir :
   - `✅ Firebase initialized`
   - `✅ Firebase Messaging instance created`
   - `✅ Web push registration success via Firebase`

### Dans la base de données :

1. Vérifiez la table `push_subscriptions`
2. Vous devriez voir une ligne avec :
   - `endpoint` commençant par `web:...`
   - `is_active = true`

## 🐛 Dépannage

### Erreur "Firebase non configuré"

➡️ Vérifiez que vous avez bien remplacé **toutes** les valeurs `VOTRE_XXX` dans les 3 fichiers

### Erreur "vapidKey is required"

➡️ Vérifiez que vous avez bien mis votre clé VAPID publique dans `nativeNotificationService.ts`

### Erreur "Permission denied"

➡️ Si vous avez refusé les permissions :
1. Dans Chrome : `chrome://settings/content/notifications`
2. Trouvez votre site et supprimez-le
3. Rechargez la page et réessayez

### Service Worker ne s'enregistre pas

➡️ Vérifiez que le fichier `public/firebase-messaging-sw.js` existe bien et contient votre config

### Logs dans la console

Activez les logs détaillés dans Firebase :
\`\`\`typescript
import { setLogLevel } from 'firebase/messaging';
setLogLevel('debug');
\`\`\`

## 📚 Ressources

- [Documentation Firebase Cloud Messaging Web](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Guide Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Exemples de configuration Firebase](https://github.com/firebase/quickstart-js/tree/master/messaging)

## ✨ Prochaines étapes

Une fois que les notifications web fonctionnent :

1. Configurez les notifications planifiées (Edge Functions)
2. Personnalisez les préférences de notifications
3. Testez sur mobile (iOS/Android) avec Capacitor
4. Déployez en production

## 🎯 Checklist complète

- [ ] Config Firebase Web copiée
- [ ] Clé VAPID copiée
- [ ] `src/config/firebase.ts` mis à jour
- [ ] `public/firebase-messaging-sw.js` mis à jour
- [ ] `nativeNotificationService.ts` mis à jour (VAPID)
- [ ] Application redémarrée
- [ ] Permissions accordées
- [ ] Notification de test reçue
- [ ] Entrée en base de données vérifiée
