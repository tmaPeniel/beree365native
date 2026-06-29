# Audit migration mobile Expo native-only

## Decision finale

Le projet est maintenant une application Expo React Native native-only. Les points d'entree Vite, pages React web, composants HTML/CSS, Tailwind, shadcn/Radix, React Router, PWA et artefacts web ont ete retires du runtime.

## Etat actuel

- Ancienne application web React 18 + Vite + TypeScript.
- Ancienne navigation web avec `react-router-dom`.
- Ancienne UI web avec Tailwind, Radix/shadcn, HTML et CSS.
- Backend Supabase deja bien isole dans `src/integrations/supabase`, `src/services`, `src/types` et `supabase/migrations`.
- Logique metier documentee dans `docs/` : plans de lecture 180/365 jours, progression, badges, versets, auth, admin, notifications.

## Reutilisable tel quel ou presque

- Types metier : `src/types`, `src/integrations/supabase/types.ts`.
- Migrations et Edge Functions Supabase : `supabase/`.
- Calculs purs : `src/services/dateService.ts`, helpers de progression, formatters et logger.
- Services de lecture : `src/services/readingPlan/*`, avec variantes natives quand un toast web etait present.
- Logique premium : `src/hooks/usePremium.tsx`.
- React Query : conserve comme couche de cache.
- Assets image : logo, illustrations onboarding, images de plans.

## A adapter

- Client Supabase : la version web utilise `localStorage`; la version native utilise `AsyncStorage` dans `client.native.ts`.
- Auth : `useAuth.tsx` depend de React Router et Sonner; `useAuth.native.tsx` remplace la redirection web par Expo Router.
- Services avec effets web : `authCore`, `profileService`, `sessionService`, `planService`, `progressService`, `dayService`.
- Notifications : l'ancien push web/PWA doit devenir `expo-notifications`; le backend devra accepter des tokens Expo.
- Variables d'environnement : garder les valeurs publiques Supabase, mais prevoir `EXPO_PUBLIC_*` pour les builds natifs.

## Reecrit pour React Native

- Routes dans `app/` avec Expo Router.
- Safe areas gerees au niveau des layouts Expo Router : top sur les tabs, top/bottom sur auth, headers internes safe-area sur les ecrans Profil detailles et traitement explicite des footers fixes.
- Ecrans dans `src/features/**/screens/`.
- Hooks et services dans `src/features/<domaine>/hooks` et `src/features/<domaine>/services`.
- Styles natifs partages dans `src/shared/theme/styles.ts`.
- Navigation principale par tabs natives, avec une tabbar flottante liquid glass sur 3 onglets persistants : Accueil, Lecture et Profil.
- Auth, lecture, dashboard, profil, statistiques, badges, versets, premium, parametres et routes utilitaires en composants React Native.
- Lecture audio du jour branchee sur le jour selectionne avec `audio_readings`, `useDailyAudio`, un FAB flottant `FloatingAudioPlayer` au-dessus de la navigation et un lecteur YouTube masque; le schema live utilise `plan_id` + `day_number`.
- Architecture cible des ecrans Profil detailles documentee dans `docs/profile-screens-architecture.md`.

## Plan progressif

1. Renforcer les ecrans natifs simples en vues completes.
   - Connexion et inscription alignees sur les captures de reference du 22 juin 2026 : carte ivoire/cuivre, champs natifs, affichage du mot de passe, gestion clavier et liens de navigation.
   - Accueil aligne sur les captures de reference du 22 juin 2026 : header dedie avec nom de l'application, badge notifications et badge profil, verset du jour, passages interactifs, rafraichissement, progression globale, dates du plan et navigation flottante liquid glass a trois onglets.
   - Profil aligne sur les captures de reference du 23 juin 2026 : en-tete avec avatar et action d'edition, menu natif vers plan, statistiques, badges, versets, abonnement, parametres, a propos, partage et deconnexion.
   - Route `/reading-plan` implementee comme selection de plan depuis le Profil : catalogue Supabase via `get_reading_plan_catalog`, affichage des plans actuels/disponibles/Premium/indisponibles, confirmation avant changement et invalidation des caches de lecture.
   - Ecrans Profil detailles implementes : badges, statistiques, notifications, abonnement, confidentialite, edition, aide et a propos, avec header interne et bouton retour.
2. Finaliser la validation d'inscription avec Zod et brancher le code secret Premium sur un traitement backend securise.
3. Migrer la vue lecture complete avec `FlatList`, recherche biblique et detail par jour.
4. Deployer la migration `get_reading_plan_catalog` sur Supabase pour afficher aussi les plans inactifs comme indisponibles en production.
5. Remplacer les Edge Functions web push par un schema compatible Expo Push Token.
6. Ajouter tests unitaires sur services purs et tests de parcours auth/lecture.

## TODO configuration

- TODO: remplacer les constantes Supabase en dur par `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- TODO: adapter l'Edge Function `register-push-subscription` pour stocker les tokens Expo.
- TODO: configurer `projectId` EAS dans `app.json` pour obtenir les tokens push en build natif.
- TODO: verifier les deep links Supabase pour `beree365://reset-password`.
- TODO: valider le code secret Premium cote serveur avant toute activation; le champ est present dans l'interface d'inscription mais n'accorde actuellement aucun droit.
- TODO: choisir le fournisseur de paiement Premium : RevenueCat ou in-app purchase Expo.
- TODO: ajouter `expo-image-picker` pour activer camera/galerie sur l'avatar du profil.
