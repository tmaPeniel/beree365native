# 05 - Services et API

## Architecture des Services

```
src/services/
├── auth/
│   ├── authCore.ts          # signUp, signIn, signOut, resetPassword, updatePassword
│   ├── profileService.ts    # refreshUserProfile, updateUserProfile
│   ├── sessionService.ts    # getCurrentUser, cleanupAuthState
│   ├── activityService.ts   # updateUserActivity
│   └── index.ts             # Re-export
├── authService.ts           # Re-export (compatibilité)
├── readingPlan/
│   ├── chapterService.ts    # getReadingPlanForDay, calculateDayNumber
│   ├── progressService.ts   # getUserProgressForDay, toggleChapterStatus, getOverallProgress
│   ├── verseService.ts      # getDailyVerse, getAllVersesUpToDay
│   ├── planService.ts       # getAvailablePlans, getUserPlan, changePlan
│   ├── optimizedCacheService.ts  # getOptimizedReadingPlanData
│   ├── optimizedProgressService.ts
│   ├── helpers/
│   │   ├── planRetrieval.ts      # getUserSelectedPlanId, getChaptersForDay
│   │   └── progressCalculation.ts # getCompletedChaptersCount, calculatePercentage
│   └── index.ts
├── badgeService.ts          # getAllBadges, getUserBadges, calculateUserBadges, getBadgeProgress
├── dateService.ts           # Calculs de dates centralisés
├── dayService.ts            # Service de gestion des jours
└── admin/
    └── index.ts             # Services admin (get_user_stats RPC)
```

---

## Services d'Authentification

### `authCore.ts`

#### `signUp(email, password, fullName, startDate, planId)`
- **Appel** : `supabase.auth.signUp({ email, password, options: { data: { full_name, start_date, plan_id } } })`
- **Post-traitement** : Enregistre le consentement CGU via REST API direct
- **Retour** : `{ success: boolean, user?: any, error?: string }`

#### `signIn(email, password)`
- **Appel** : `supabase.auth.signInWithPassword({ email, password })`
- **Gestion d'erreurs** : Traduit les messages Supabase en français
- **Retour** : `{ success: boolean, user?: any, error?: string }`

#### `signOut()`
- **Appel** : `supabase.auth.signOut()`
- **Retour** : `{ success: boolean, error?: string }`

#### `resetPassword(email)`
- **Appel** : `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`
- **Toast** : « Un email de réinitialisation a été envoyé »

#### `updatePassword(newPassword)`
- **Appel** : `supabase.auth.updateUser({ password: newPassword })`

---

### `profileService.ts`

#### `refreshUserProfile(userId)`
- Récupère le profil depuis `profiles` table
- Met à jour `last_login_at` via `update_user_activity` RPC
- **Retour** : `Profile | null`

#### `updateUserProfile(userId, updates)`
- Met à jour les champs du profil (ex: `start_date`, `full_name`)
- **Retour** : `{ success: boolean }`

---

### `activityService.ts`

#### `ActivityService.updateUserActivity(userId)`
- **Appel RPC** : `update_user_activity(p_user_id)`
- Met à jour `last_login_at = now()` et `is_active = true`

---

## Services du Plan de Lecture

### `chapterService.ts`

#### `getReadingPlanForDay(dayNumber, userId)`
1. Récupère le `selected_plan_id` de l'utilisateur
2. Requête `reading_plan_chapters` filtré par `day_number` et `plan_id`
3. **Retour** : `ReadingPlanChapter[]`

#### `calculateDayNumber(startDate)`
```typescript
const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
return Math.max(1, diffDays + 1);
```

---

### `progressService.ts`

#### `getUserProgressForDay(userId, dayNumber)`
1. Récupère le plan de l'utilisateur
2. Récupère les chapitres du jour
3. Récupère la progression (`user_progress`) pour ces chapitres
4. Fusionne : chaque chapitre + son statut (pending/completed)
5. **Retour** : `(UserProgress & { reading_plan_chapters: ReadingPlanChapter })[]`

#### `toggleChapterStatus(userId, chapterId, currentStatus)`
1. Vérifie la session auth
2. Calcule le nouveau statut (`pending` ↔ `completed`)
3. Vérifie si une entrée existe déjà dans `user_progress`
   - Si oui → UPDATE
   - Si non → INSERT
4. Met à jour `completed_at` (ISO string ou null)
5. Appelle `ActivityService.updateUserActivity`
6. Toast de confirmation
7. **Retour** : `{ success: boolean, data?: any }`

#### `getDayProgress(userId, dayNumber)`
- Calcule le pourcentage de complétion d'un jour
- **Retour** : `number` (0-100)

#### `getOverallProgress(userId)`
- Compte total des chapitres du plan
- Compte des chapitres complétés
- Compte des jours complétés (via RPC)
- **Retour** :
```typescript
{
  totalPassages: number,
  passagesRead: number,
  passagesRemaining: number,
  progressPercentage: number,
  completedDays: number
}
```

---

### `verseService.ts`

#### `getDailyVerse(dayNumber)`
- Requête `daily_verses` par `day_number`
- Si pas trouvé → retourne un verset par défaut (sagesse)
- **Retour** : `DailyVerse`

#### `getAllVersesUpToDay(maxDayNumber)`
- Requête tous les versets du jour 1 au jour max
- **Jointure** avec `verse_likes(count)` pour le vrai comptage
- Normalise `likes_count` depuis la jointure
- Comble les jours manquants avec des versets par défaut
- Tri décroissant (jour le plus récent en premier)
- **Retour** : `DailyVerse[]`

#### `getDefaultVerse(dayNumber)`
- Retourne un verset par défaut quand aucun n'existe en base
- 5 sagesses cycliques basées sur `(dayNumber - 1) % 5`

---

### `planService.ts`

#### `getAvailablePlans()`
- Requête `reading_plans` où `is_active = true`
- **Retour** : `ReadingPlan[]`

#### `getUserPlan(userId)`
- Récupère le plan sélectionné via le profil
- **Retour** : `ReadingPlan | null`

#### `changePlan(planId)`
- **Appel RPC** : `change_user_plan(new_plan_id)`
- Supprime progression + badges + remet à jour le profil

---

### `optimizedCacheService.ts`

#### `getOptimizedReadingPlanData(userId, startDate)`
- Charge TOUTES les données du plan en une seule requête optimisée
- Structure les données par jour avec progression
- Utilisé par la page Reading pour éviter N+1 queries
- **Retour** : `DayData[]` (jour + chapitres + progression)

#### `invalidateUserCacheSelective(userId)`
- Invalide les caches spécifiques à un utilisateur

---

## Service de Badges

### `badgeService.ts`

#### `getAllBadges()`
- Requête `badges` table triée par `created_at`
- **Retour** : `Badge[]`

#### `getUserBadges(userId)`
- Requête `user_badges` avec jointure `badges(*)`
- Triée par `unlocked_at` DESC
- **Retour** : `UserBadge[]`

#### `calculateUserBadges(userId)`
- **Appel RPC** : `calculate_user_badges(_user_id)`
- Évalue tous les badges non débloqués
- Insère automatiquement les badges gagnés
- **Retour** : `boolean`

#### `getBadgeProgress(userId)`
- Pour chaque badge verrouillé, calcule :
  - `current` : valeur actuelle
  - `required` : valeur requise
  - `progress` : pourcentage (0-100)
- Calculs complexes côté client :
  - Série de jours consécutifs (streak)
  - Série à heure fixe (same-hour streak)
  - Jours matin/soir
  - Reprise après gap
  - Livres complétés
- **Retour** : Tableau trié par progression décroissante

#### `getBadgeStats(userId)`
- Stats résumées : total, débloqués, pourcentage, 3 derniers
- **Retour** : `{ totalBadges, unlockedBadges, progressPercentage, latestBadges }`

---

## Service Admin

### `admin/index.ts`

#### `getUserStats()`
- **Appel RPC** : `get_user_stats()` (réservé admin)
- Retourne pour chaque utilisateur :
  - Nom, email, date début, dernière connexion
  - Statut actif (via `is_user_active`)
  - Chapitres complétés
  - Jours complétés

---

## Hooks Principaux

| Hook | Description |
|------|-------------|
| `useAuth` | Contexte auth global (user, profile, isAuthenticated, refreshProfile, triggerProgressUpdate) |
| `useOptimizedAuth` | Version optimisée de useAuth avec moins de re-renders |
| `useDateService` | Jour courant, stats du plan, durée du plan |
| `usePlanDuration` | Nom et durée du plan sélectionné |
| `useDayCompletion` | Gestion du marquage des passages (toggle + calcul badges) |
| `useBadgeCalculation` | Calcul et vérification des badges |
| `useAdminAuth` | Vérifie si l'utilisateur est admin |
| `useVerseLikes` | Gestion des likes de versets |
| `useNotifications` | Historique et gestion des notifications |
| `useNotificationPreferences` | Préférences de notification |
| `useUnifiedPushNotifications` | Gestion OneSignal (subscribe/unsubscribe) |
| `useSplashScreen` | Contrôle du splash screen |
| `useLocalStorage` | Persistance dans localStorage |
| `useIsMobile` | Détection mobile (breakpoint) |
| `useSortableTable` | Tri des colonnes de tableaux |
| `useProgressAnimation` | Animation du cercle de progression |

---

## Client Supabase

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Variables d'environnement** :
- `VITE_SUPABASE_URL` : URL du projet Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY` : Clé publique (anon key)
- `VITE_SUPABASE_PROJECT_ID` : ID du projet

---

## Gestion du Cache (React Query)

| Query Key | staleTime | gcTime | Description |
|-----------|-----------|--------|-------------|
| `optimized-reading-plan-data` | 3 min | 10 min | Données complètes du plan |
| `userStats` | 5 min | — | Progression globale |
| `weeklyPassages` | 5 min | — | Passages cette semaine |
| `verses` | 5 min | 30 min | Liste des versets |
| `user-plan` | défaut | — | Plan actuel |
| `available-plans` | défaut | — | Plans disponibles |
| `user-badges` | défaut | — | Badges utilisateur |

Après chaque modification (toggle lecture, changement plan), les caches concernés sont invalidés via `queryClient.invalidateQueries()`.
