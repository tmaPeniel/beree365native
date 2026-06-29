# Bérée 365 Native

Application mobile native Expo / React Native de Bérée 365.

## Stack

- Expo
- Expo Router
- React Native
- TypeScript
- Supabase
- React Query
- expo-notifications

## Commandes

```bash
npm install
npm start
npm run android
npm run ios
```

## Architecture

- `app/` : routes Expo Router
- `src/features/auth/` : écrans, hooks et services d'authentification
- `src/features/reading/` : tableau de bord, lecture, plans, progression et dates
- `src/features/profile/` : profil, premium, badges, notifications, admin et pages secondaires
- `src/shared/` : thème, utilitaires et helpers réutilisables
- `src/integrations/` : clients externes, dont Supabase
- `src/types/` : types Supabase et métier
- `supabase/` : migrations et Edge Functions
- `docs/mobile-migration-audit.md` : audit et plan de migration
- `docs/profile-screens-architecture.md` : architecture cible des ecrans Profil detailles

Les routes dans `app/` restent fines : elles importent un écran depuis `src/features/**/screens`.
La logique métier vit près de son domaine fonctionnel plutôt que dans des dossiers globaux `hooks` ou `services`.

## Documentation vivante

La documentation doit etre mise a jour en meme temps que le code :

- modifier le document `docs/*` correspondant au domaine touche ;
- mettre a jour `docs/mobile-migration-audit.md` quand la migration Expo avance ;
- ajouter les decisions techniques ou dettes volontaires dans `docs/00-maintenance-documentation.md` ;
- mettre a jour ce README si la stack, les commandes ou la structure changent.

## Configuration à finaliser

- Définir `EXPO_PUBLIC_SUPABASE_URL`.
- Définir `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Configurer `extra.eas.projectId` pour les notifications Expo.
- Adapter les Edge Functions push pour stocker et envoyer des Expo Push Tokens.
