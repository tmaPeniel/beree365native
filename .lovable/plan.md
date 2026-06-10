## Objectif

Ajouter une 4ᵉ slide à l'onboarding qui explique comment installer Bérée 365 sur son téléphone via le navigateur (PWA), avec des instructions adaptées automatiquement à iOS et Android.

## Ce qui sera fait

### 1. Détection de plateforme
Ajouter un petit utilitaire (inline dans `Onboarding.tsx`) qui détecte iOS (Safari iPhone/iPad), Android (Chrome/Samsung), ou desktop via `navigator.userAgent`. Cela conditionne le contenu affiché sur la slide PWA.

### 2. Génération de 2 illustrations
- `onboarding-install-ios.png` — illustration d'un iPhone montrant le bouton "Partager" Safari (carré avec flèche vers le haut) puis "Sur l'écran d'accueil", dans les couleurs chaudes de l'app (brun/or).
- `onboarding-install-android.png` — illustration d'un téléphone Android montrant le menu ⋮ Chrome puis "Installer l'application".

Ces images seront générées dans le style cohérent avec les 3 illustrations d'onboarding existantes.

### 3. Nouvelle slide PWA (4ᵉ position)
Insérée juste avant le bouton "Commencer". Contenu :

- **Titre** : « Installez l'application »
- **Image** : selon la plateforme détectée (iOS, Android, ou une image générique pour desktop)
- **Description** : instructions courtes adaptées :
  - **iOS** : « Touchez le bouton Partager ⬆️ dans Safari, puis "Sur l'écran d'accueil". »
  - **Android** : « Ouvrez le menu ⋮ de Chrome, puis "Installer l'application" ou "Ajouter à l'écran d'accueil". »
  - **Desktop** : « Ouvrez Bérée 365 dans Safari (iPhone) ou Chrome (Android), puis ajoutez-la à votre écran d'accueil. »

### 4. Masquer la slide si déjà installée
Si l'app est déjà lancée en mode standalone (`window.matchMedia('(display-mode: standalone)').matches` ou `navigator.standalone`), la slide PWA est sautée automatiquement — inutile de proposer l'installation à quelqu'un qui a déjà installé.

### 5. Mémoire projet
Mettre à jour `mem://features/onboarding-flow` pour refléter 4 slides au lieu de 3, et noter la slide PWA conditionnelle par OS.

## Détails techniques

**Fichier modifié** : `src/components/Onboarding.tsx`
- Ajout d'un hook `useMemo` pour la détection plateforme.
- Tableau `slides` étendu à 4 entrées, avec la 4ᵉ qui choisit dynamiquement image + description selon l'OS.
- Filtre conditionnel : si standalone, la slide PWA est retirée du tableau.
- Le reste de la logique (swipe, dots, transition) reste inchangé — l'animation gère naturellement N slides.

**Fichiers créés** :
- `src/assets/onboarding-install-ios.png` (image générée)
- `src/assets/onboarding-install-android.png` (image générée)

**Aucun changement** sur : routing, auth, service worker, manifest, edge functions.

## Hors scope
- Pas de bouton « Installer » natif via `beforeinstallprompt` (peu fiable sur iOS et instable sur Android — l'utilisateur passe par le menu navigateur, c'est ce qui marche partout).
- Pas de modification du manifest PWA ni du logo (déjà traités précédemment).
