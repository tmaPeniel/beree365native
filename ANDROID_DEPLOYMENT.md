# Guide de Déploiement Android 🤖

## Prérequis
- ✅ Firebase configuré avec la FCM Server Key dans Supabase
- ✅ Fichier `google-services.json` téléchargé depuis Firebase
- ✅ Android Studio installé sur votre machine

## Étapes de déploiement

### 1. Exporter et cloner le projet
```bash
# Exportez via le bouton "Export to Github" dans Lovable
# Puis clonez votre repo
git clone [URL_DE_VOTRE_REPO]
cd beree-365
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Ajouter la plateforme Android
```bash
npx cap add android
```

### 4. Placer le fichier de configuration Firebase
```bash
# Copiez google-services.json dans le dossier android/app/
cp [chemin-vers]/google-services.json android/app/
```

### 5. Build le projet web
```bash
npm run build
```

### 6. Synchroniser avec Capacitor
```bash
npx cap sync android
```

### 7. Ouvrir dans Android Studio
```bash
npx cap open android
```

### 8. Dans Android Studio

1. **Vérifiez que `google-services.json` est présent** dans `android/app/`

2. **Build le projet** :
   - Cliquez sur `Build` → `Make Project`
   - Attendez que Gradle termine

3. **Lancer sur un émulateur ou appareil physique** :
   - Connectez un appareil Android en mode développeur, OU
   - Créez un émulateur via AVD Manager
   - Cliquez sur le bouton ▶️ (Run)

## Test des notifications

Une fois l'app lancée :

1. **Connectez-vous à votre compte**
2. **Allez dans Profil → Notifications**
3. **Activez les notifications push**
4. **Testez l'envoi** via le bouton de test

## Structure des fichiers clés

```
beree-365/
├── android/
│   ├── app/
│   │   ├── google-services.json  ← Fichier Firebase
│   │   └── build.gradle           ← Config Android
│   └── build.gradle               ← Config Gradle racine
├── capacitor.config.ts            ← Config Capacitor
└── dist/                          ← Build web (après npm run build)
```

## Troubleshooting

### Erreur "google-services.json not found"
- Vérifiez que le fichier est bien dans `android/app/`
- Relancez `npx cap sync android`

### Gradle build failed
- Ouvrez Android Studio
- `File` → `Invalidate Caches / Restart`
- Relancez le build

### Les notifications ne fonctionnent pas
1. Vérifiez que la `FCM_SERVER_KEY` est bien configurée dans Supabase
2. Vérifiez les logs de la fonction Edge `send-fcm-notification`
3. Testez avec la commande curl du fichier `FIREBASE_SETUP.md`

## Mode développement

Pour tester rapidement sans rebuild :
- L'app pointe vers `https://f27fcb77-1f7c-4b7c-8610-d0860593b05d.lovableproject.com`
- Les changements dans Lovable sont visibles immédiatement
- Pour un build production, modifiez `capacitor.config.ts` et retirez la section `server`

## Build APK de production

```bash
# Dans Android Studio
Build → Generate Signed Bundle / APK → APK
```

Ou en ligne de commande :
```bash
cd android
./gradlew assembleRelease
# APK dans: android/app/build/outputs/apk/release/
```

---

**Besoin d'aide ?** Consultez la [documentation Capacitor Android](https://capacitorjs.com/docs/android)
