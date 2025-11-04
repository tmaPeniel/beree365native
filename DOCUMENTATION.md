# Documentation Complète - Beree 365

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture Technique](#architecture-technique)
3. [Structure du Projet](#structure-du-projet)
4. [Fonctionnalités Principales](#fonctionnalités-principales)
5. [Services et Utilitaires](#services-et-utilitaires)
6. [Base de Données](#base-de-données)
7. [Hooks Personnalisés](#hooks-personnalisés)
8. [Composants Principaux](#composants-principaux)
9. [Système de Design](#système-de-design)
10. [Notifications Push](#notifications-push)
11. [Principes de Développement](#principes-de-développement)
12. [Guide de Démarrage](#guide-de-démarrage)

---

## 📖 Vue d'ensemble

**Beree 365** est une application de lecture biblique progressive qui permet aux utilisateurs de suivre un plan de lecture annuel avec:
- Suivi de progression quotidienne
- Système de badges et récompenses
- Notifications push pour encourager la régularité
- Support multi-plateforme (Web PWA, iOS, Android)
- Interface responsive et moderne

### Technologies Utilisées

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Edge Functions, Auth)
- **Mobile**: Capacitor 7
- **Notifications**: OneSignal + Capacitor Push Notifications
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod

---

## 🏗️ Architecture Technique

### Stack Technologique

```
┌─────────────────────────────────────────┐
│         Frontend (React + TS)           │
├─────────────────────────────────────────┤
│  - Pages (Routes)                       │
│  - Components (UI + Business)           │
│  - Hooks (Logic Réutilisable)          │
│  - Services (API Calls)                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│       Backend (Supabase)                │
├─────────────────────────────────────────┤
│  - PostgreSQL (Database)                │
│  - Edge Functions (Serverless)          │
│  - Authentication (Auth.js)             │
│  - Row Level Security (RLS)             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│     Services Externes                   │
├─────────────────────────────────────────┤
│  - OneSignal (Push Notifications)       │
│  - Capacitor (Mobile Native)            │
└─────────────────────────────────────────┘
```

### Principes Architecturaux

1. **Séparation des Responsabilités**
   - Pages = Routing + Layout
   - Components = UI + Présentation
   - Hooks = Logique métier réutilisable
   - Services = Appels API + Business logic

2. **Mobile-First Design**
   - Interface optimisée pour smartphones
   - Progressive Web App (PWA)
   - Support natif iOS/Android via Capacitor

3. **Performance**
   - Lazy loading des composants
   - Optimisation des requêtes avec React Query
   - Cache service pour les données statiques
   - Mémorisation avec useMemo/useCallback

4. **Sécurité**
   - Row Level Security (RLS) sur toutes les tables
   - Authentication requise pour toutes les fonctionnalités
   - Validation des données avec Zod
   - HTTPS uniquement

---

## 📁 Structure du Projet

```
beree-365/
├── public/                      # Assets statiques
│   ├── beree-*.png             # Icons PWA
│   ├── sw.js                   # Service Worker
│   └── robots.txt              # SEO
│
├── src/
│   ├── components/             # Composants React
│   │   ├── ui/                # Composants shadcn/ui
│   │   ├── admin/             # Composants admin
│   │   ├── animations/        # Effets visuels
│   │   ├── notifications/     # UI notifications
│   │   └── profile/           # Composants profil
│   │
│   ├── hooks/                 # Hooks personnalisés
│   │   ├── useAuth.tsx        # Authentification
│   │   ├── useBadgeCalculation.tsx
│   │   ├── useUnifiedPushNotifications.ts
│   │   └── ...
│   │
│   ├── pages/                 # Pages (Routes)
│   │   ├── Index.tsx          # Page d'accueil
│   │   ├── Dashboard.tsx      # Tableau de bord
│   │   ├── Login.tsx          # Connexion
│   │   ├── Profile.tsx        # Profil utilisateur
│   │   └── ...
│   │
│   ├── services/              # Services métier
│   │   ├── auth/              # Services auth
│   │   ├── readingPlan/       # Services plan de lecture
│   │   ├── notifications/     # Services notifications
│   │   ├── badgeService.ts    # Gestion badges
│   │   └── ...
│   │
│   ├── utils/                 # Utilitaires
│   │   ├── logger.ts          # Système de logs
│   │   ├── errorHandler.ts    # Gestion erreurs
│   │   ├── platformDetection.ts
│   │   └── ...
│   │
│   ├── types/                 # Définitions TypeScript
│   │   ├── supabase.ts        # Types DB
│   │   ├── notifications.ts   # Types notifications
│   │   └── progress.ts        # Types progression
│   │
│   ├── integrations/          # Intégrations externes
│   │   └── supabase/          # Client Supabase
│   │
│   ├── providers/             # Context Providers
│   │   └── ThemeProvider.tsx  # Thème clair/sombre
│   │
│   ├── index.css              # Styles globaux + Design tokens
│   ├── App.tsx                # Composant racine
│   └── main.tsx               # Point d'entrée
│
├── supabase/
│   ├── functions/             # Edge Functions
│   │   ├── send-push-notification/
│   │   └── init-sample-data/
│   │
│   ├── migrations/            # Migrations DB
│   └── config.toml            # Configuration Supabase
│
├── capacitor.config.ts        # Configuration Capacitor
├── tailwind.config.ts         # Configuration Tailwind
├── vite.config.ts             # Configuration Vite
└── package.json               # Dépendances
```

---

## ✨ Fonctionnalités Principales

### 1. Authentification

**Fichiers concernés:**
- `src/hooks/useAuth.tsx`
- `src/services/auth/`
- `src/pages/Login.tsx`, `Signup.tsx`

**Fonctionnalités:**
- Inscription avec email/password
- Connexion
- Récupération de mot de passe
- Session persistante
- Profil utilisateur

**Variables clés:**
- `user`: Utilisateur connecté (auth.users)
- `profile`: Profil utilisateur (public.profiles)
- `isLoading`: État de chargement
- `isAuthenticated`: Booléen de connexion

### 2. Plans de Lecture

**Fichiers concernés:**
- `src/services/readingPlan/`
- `src/components/ReadingPlan.tsx`
- `src/components/DayCard.tsx`

**Fonctionnalités:**
- Plans de lecture multiples (Plan Classique, Chronologique, Nouveau Testament)
- 365 jours de lecture
- Chapitres quotidiens
- Changement de plan (reset progression)

**Variables clés:**
- `reading_plans`: Table des plans disponibles
- `reading_plan_chapters`: Chapitres par jour et par plan
- `selected_plan_id`: Plan actif de l'utilisateur

### 3. Suivi de Progression

**Fichiers concernés:**
- `src/services/readingPlan/progressService.ts`
- `src/components/ProgressStats.tsx`
- `src/hooks/useDayCompletion.tsx`

**Fonctionnalités:**
- Marquage des chapitres comme lus
- Calcul des jours complétés
- Statistiques de progression
- Mise à jour en temps réel

**Variables clés:**
- `user_progress`: Table de progression
- `status`: 'pending' | 'completed'
- `completed_at`: Timestamp de complétion
- `current_day_number`: Jour actuel dans le plan

### 4. Système de Badges

**Fichiers concernés:**
- `src/services/badgeService.ts`
- `src/hooks/useBadgeCalculation.tsx`
- `src/components/profile/BadgesSection.tsx`

**Fonctionnalités:**
- Badges basés sur des critères (jours lus, streak, livres complétés)
- Calcul automatique via fonction PostgreSQL
- Notifications lors de nouveaux badges

**Types de badges:**
- `chapters_read`: Nombre de chapitres lus
- `days_completed`: Nombre de jours complétés
- `streak_days`: Jours consécutifs
- `time_of_day`: Lecture régulière (matin/soir)
- `book_completed`: Livre biblique complété
- `resume_after_gap`: Reprise après pause

**Variables clés:**
- `badges`: Table des badges disponibles
- `user_badges`: Badges débloqués par utilisateur
- `criteria`: JSONB des conditions (type, count, etc.)

### 5. Notifications Push

**Fichiers concernés:**
- `src/services/notifications/capacitorNotificationService.ts`
- `src/services/notifications/despiaNotificationService.ts`
- `src/hooks/useUnifiedPushNotifications.ts`
- `supabase/functions/send-push-notification/`

**Fonctionnalités:**
- Notifications quotidiennes de rappel
- Notifications de nouveaux badges
- Support Web (PWA) + Mobile (iOS/Android)
- OneSignal pour l'envoi
- Gestion des permissions

**Variables clés:**
- `device_token`: Token FCM/APNs
- `onesignal_player_id`: ID OneSignal de l'appareil
- `is_active`: Statut des notifications
- `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`: Secrets Supabase

### 6. Interface Admin

**Fichiers concernés:**
- `src/pages/Admin.tsx`
- `src/components/admin/`
- `src/hooks/useAdminAuth.tsx`

**Fonctionnalités:**
- Tableau de bord statistiques
- Liste des utilisateurs
- Utilisateurs inactifs
- Envoi de notifications test

**Variables clés:**
- `user_roles`: Table des rôles
- `app_role`: Enum ('admin' | 'user')
- `is_admin()`: Fonction PostgreSQL de vérification

---

## 🔧 Services et Utilitaires

### Services Auth (`src/services/auth/`)

**authCore.ts**
```typescript
// Fonctions principales
signUp(email, password, metadata)
signIn(email, password)
signOut()
resetPassword(email)
updatePassword(newPassword)
```

**sessionService.ts**
```typescript
// Gestion des sessions
getSession()
refreshSession()
onAuthStateChange(callback)
```

**profileService.ts**
```typescript
// Gestion du profil
getProfile(userId)
updateProfile(userId, data)
```

### Services Reading Plan (`src/services/readingPlan/`)

**progressService.ts**
```typescript
// Progression utilisateur
getUserProgress(userId)
markChapterAsComplete(userId, chapterId)
getCompletedDaysCount(userId)
```

**chapterService.ts**
```typescript
// Chapitres du plan
getChaptersForDay(dayNumber, planId)
getAllChapters(planId)
```

**planService.ts**
```typescript
// Plans de lecture
getAvailablePlans()
getUserPlan(userId)
changePlan(planId) // Reset progression
getPlanById(planId)
```

### Services Notifications (`src/services/notifications/`)

**capacitorNotificationService.ts**
```typescript
// Notifications mobiles (iOS/Android)
initializeCapacitorPush()
requestPermissions()
registerDevice() // Nouveau: séparé de l'init
getDeviceInfo()
saveDeviceInfo(userId, token, playerId)
waitForToken(timeoutMs) // Attend le token avec timeout
```

**despiaNotificationService.ts**
```typescript
// Notifications web (PWA)
initializeDespiaNotifications()
requestPermissions()
subscribe(userId)
```

### Utilitaires (`src/utils/`)

**logger.ts**
```typescript
// Système de logging centralisé
logger.debug(message, ...args)
logger.info(message, ...args)
logger.warn(message, ...args)
logger.error(message, ...args)
logger.success(message, ...args)
```

**errorHandler.ts**
```typescript
// Gestion des erreurs
errorHandler.handle(error, showToast)
errorHandler.create(code, message, details)

// Codes d'erreur
ErrorCode.AUTH_REQUIRED
ErrorCode.PERMISSION_DENIED
ErrorCode.NOT_FOUND
ErrorCode.NETWORK_ERROR
ErrorCode.VALIDATION_ERROR
ErrorCode.UNKNOWN_ERROR
```

**platformDetection.ts**
```typescript
// Détection de plateforme
isDespiaNative() // PWA Despia
isCapacitorNative() // iOS/Android
isWeb() // Navigateur classique
getPlatform() // 'despia' | 'capacitor' | 'web'
getPlatformName() // 'ios' | 'android' | 'web'
```

---

## 🗄️ Base de Données

### Tables Principales

#### `profiles`
Profils utilisateurs (étend auth.users)

```sql
id UUID PRIMARY KEY (ref auth.users.id)
full_name TEXT
start_date DATE DEFAULT CURRENT_DATE
current_day_number INTEGER DEFAULT 1
selected_plan_id UUID (ref reading_plans.id)
last_login_at TIMESTAMP
is_active BOOLEAN
device_token TEXT
onesignal_player_id TEXT
device_platform VARCHAR
```

**RLS Policies:**
- Users can view/update their own profile
- Service role can manage all profiles

#### `reading_plans`
Plans de lecture disponibles

```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
description TEXT
duration_days INTEGER DEFAULT 365
is_active BOOLEAN DEFAULT TRUE
created_at TIMESTAMP
```

**RLS Policies:**
- Everyone can view active plans
- Only admins can manage plans

#### `reading_plan_chapters`
Chapitres de chaque plan

```sql
id UUID PRIMARY KEY
day_number INTEGER NOT NULL
reference TEXT NOT NULL (ex: "Genèse 1-3")
description TEXT
plan_id UUID (ref reading_plans.id)
```

**RLS Policies:**
- Authenticated users can view chapters

#### `user_progress`
Progression de lecture des utilisateurs

```sql
id UUID PRIMARY KEY
user_id UUID (ref auth.users.id)
chapter_id UUID (ref reading_plan_chapters.id)
status chapter_status ('pending' | 'completed')
completed_at TIMESTAMP
```

**RLS Policies:**
- Users can view/update/insert/delete their own progress

#### `badges`
Badges disponibles

```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
description TEXT NOT NULL
icon TEXT NOT NULL
color TEXT DEFAULT '#3B82F6'
criteria JSONB NOT NULL
created_at TIMESTAMP
```

**Exemple de criteria:**
```json
{
  "type": "chapters_read",
  "count": 50
}
```

**Types de badges:**
- `chapters_read`: Nombre de chapitres
- `days_completed`: Nombre de jours
- `milestone`: Étapes importantes
- `streak_days`: Jours consécutifs
- `fixed_time_streak`: Même heure chaque jour
- `resume_after_gap`: Reprise après pause
- `time_of_day`: Lecture matin/soir
- `book_completed`: Livre complet

**RLS Policies:**
- Everyone can view badges

#### `user_badges`
Badges débloqués par utilisateur

```sql
id UUID PRIMARY KEY
user_id UUID (ref auth.users.id)
badge_id UUID (ref badges.id)
unlocked_at TIMESTAMP DEFAULT NOW()
created_at TIMESTAMP
```

**RLS Policies:**
- Users can view/insert their own badges

#### `user_roles`
Rôles des utilisateurs (admin/user)

```sql
id UUID PRIMARY KEY
user_id UUID (ref auth.users.id)
role app_role ('admin' | 'user')
created_at TIMESTAMP
```

**RLS Policies:**
- Admins can view all roles, users can view their own
- Only admins can insert/update/delete roles

#### `daily_verses`
Versets quotidiens

```sql
id UUID PRIMARY KEY
day_number INTEGER NOT NULL
reference TEXT NOT NULL
text TEXT NOT NULL
wisdomType TEXT
```

**RLS Policies:**
- Authenticated users can view verses

### Fonctions PostgreSQL Importantes

#### `calculate_user_badges(user_id UUID)`
Calcule et attribue automatiquement les badges basés sur la progression de l'utilisateur.

**Logique:**
1. Récupère les stats de l'utilisateur (chapitres lus, jours complétés, streaks)
2. Pour chaque badge non débloqué, vérifie si les critères sont remplis
3. Insère dans `user_badges` si critères validés

#### `get_completed_days_count(user_id UUID)`
Retourne le nombre de jours où TOUS les chapitres ont été complétés.

#### `change_user_plan(new_plan_id UUID)`
Change le plan de lecture de l'utilisateur.

**Actions:**
1. Vérifie que le plan existe et est actif
2. Supprime toute la progression (`user_progress`)
3. Supprime tous les badges (`user_badges`)
4. Met à jour le profil (plan, start_date, current_day_number)

#### `is_user_active(user_id UUID, days_threshold INTEGER)`
Détermine si un utilisateur est actif basé sur:
- Dernière connexion (`last_login_at`)
- Dernière lecture (`user_progress.completed_at`)

#### `has_role(user_id UUID, role app_role)`
Vérifie si un utilisateur a un rôle spécifique.

#### `is_admin()`
Vérifie si l'utilisateur connecté est admin.

### Edge Functions

#### `send-push-notification`
Envoie des notifications push via OneSignal.

**Path:** `supabase/functions/send-push-notification/`

**Paramètres:**
```typescript
{
  userId: string;
  title: string;
  message: string;
  type?: 'daily_reminder' | 'badge_unlocked' | 'encouragement';
}
```

**Logique:**
1. Récupère le `onesignal_player_id` du profil
2. Appelle l'API OneSignal avec les secrets
3. Envoie la notification
4. Log le résultat dans `notification_logs`

---

## 🎣 Hooks Personnalisés

### `useAuth()`
Gère l'authentification et le profil utilisateur.

**Retourne:**
```typescript
{
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signUp: (email, password, metadata) => Promise<void>;
  signIn: (email, password) => Promise<void>;
  signOut: () => Promise<void>;
  triggerProgressUpdate: () => void;
  progressUpdateCounter: number;
}
```

### `useOptimizedAuth()`
Version optimisée de `useAuth` avec mémorisation.

**Retourne:**
```typescript
{
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  triggerProgressUpdate: () => void;
  progressUpdateCounter: number;
}
```

### `useBadgeCalculation()`
Gère le calcul automatique des badges.

**Utilisation:**
```typescript
const { triggerBadgeCalculation } = useBadgeCalculation();

// Appeler après une action de progression
await markChapterAsComplete();
await triggerBadgeCalculation();
```

**Fonctionnalités:**
- Compare badges avant/après calcul
- Envoie notifications pour nouveaux badges
- Affiche toasts de célébration

### `useUnifiedPushNotifications()`
Gère les notifications push multi-plateforme.

**Retourne:**
```typescript
{
  isSubscribed: boolean;
  isLoading: boolean;
  deviceToken: string | null;
  oneSignalPlayerId: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  checkStatus: () => Promise<void>;
}
```

**Flux de souscription:**
1. Demande permissions
2. Enregistre l'appareil (`registerDevice()`)
3. Attend le device token (max 10s)
4. Enregistre sur OneSignal
5. Sauvegarde en base de données

### `useDayCompletion(dayNumber)`
Gère la complétion d'un jour de lecture.

**Retourne:**
```typescript
{
  isCompleted: boolean;
  markAsComplete: () => Promise<void>;
  isLoading: boolean;
}
```

### `useDateService()`
Gère les calculs de dates du plan de lecture.

**Retourne:**
```typescript
{
  startDate: Date;
  currentDayNumber: number;
  endDate: Date;
  daysRemaining: number;
  isLoading: boolean;
}
```

### `useAdminAuth()`
Vérifie si l'utilisateur est admin.

**Retourne:**
```typescript
{
  isAdmin: boolean;
  isLoading: boolean;
}
```

---

## 🎨 Composants Principaux

### Pages

#### `Dashboard.tsx`
Tableau de bord principal après connexion.

**Affiche:**
- Progression du jour
- Verset du jour
- Statistiques globales
- Plan de lecture

#### `Profile.tsx`
Page de profil utilisateur.

**Sections:**
- En-tête profil
- Statistiques personnelles
- Badges débloqués
- Plan actuel
- Actions (changer plan, déconnexion)

#### `Reading.tsx`
Page de lecture quotidienne.

**Fonctionnalités:**
- Affichage des chapitres du jour
- Marquage comme lu
- Navigation entre jours
- Détails des lectures

#### `Admin.tsx`
Interface d'administration.

**Sections:**
- Statistiques globales
- Liste des utilisateurs
- Utilisateurs inactifs
- Outils d'envoi de notifications

### Composants UI

#### `DayCard.tsx`
Carte représentant un jour de lecture.

**Props:**
```typescript
{
  dayNumber: number;
  isCompleted: boolean;
  isToday: boolean;
  onClick?: () => void;
}
```

#### `ProgressStats.tsx`
Affiche les statistiques de progression.

**Métriques:**
- Jours complétés
- Pourcentage de progression
- Streak actuel
- Chapitres lus

#### `BadgesSection.tsx`
Section des badges dans le profil.

**Affichage:**
- Grille de badges
- Badges débloqués en couleur
- Badges verrouillés en gris
- Tooltip avec description

### Composants Notifications

#### `NotificationPreferencesCard.tsx`
Gère les préférences de notifications.

**Fonctionnalités:**
- Toggle notifications
- Affichage du statut
- Gestion des permissions
- Debug info (en dev)

#### `NotificationStatusCard.tsx`
Affiche l'état actuel des notifications.

**Informations:**
- Statut (actif/inactif)
- Device token
- OneSignal Player ID
- Plateforme

---

## 🎨 Système de Design

### Tokens de Couleur (index.css)

**Variables CSS:**
```css
:root {
  --background: 0 0% 100%;      /* Fond principal */
  --foreground: 222.2 84% 4.9%; /* Texte principal */
  
  --primary: 222.2 47.4% 11.2%; /* Couleur primaire */
  --primary-foreground: 210 40% 98%;
  
  --secondary: 210 40% 96.1%;   /* Couleur secondaire */
  --secondary-foreground: 222.2 47.4% 11.2%;
  
  --accent: 210 40% 96.1%;      /* Accent */
  --accent-foreground: 222.2 47.4% 11.2%;
  
  --muted: 210 40% 96.1%;       /* Éléments atténués */
  --muted-foreground: 215.4 16.3% 46.9%;
  
  --border: 214.3 31.8% 91.4%;  /* Bordures */
  --input: 214.3 31.8% 91.4%;   /* Inputs */
  --ring: 222.2 84% 4.9%;       /* Focus rings */
  
  --destructive: 0 84.2% 60.2%; /* Erreurs */
  --destructive-foreground: 210 40% 98%;
  
  --radius: 0.5rem;             /* Border radius */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... autres tokens dark mode */
}
```

### Utilisation des Tokens

**❌ Mauvais (couleurs directes):**
```tsx
<div className="bg-white text-black">
```

**✅ Bon (tokens sémantiques):**
```tsx
<div className="bg-background text-foreground">
```

### Composants shadcn/ui

**Tous les composants sont dans:** `src/components/ui/`

**Composants principaux:**
- `button.tsx`: Boutons avec variantes
- `card.tsx`: Cartes de contenu
- `dialog.tsx`: Modales
- `toast.tsx`: Notifications toast
- `progress.tsx`: Barres de progression
- `badge.tsx`: Badges/étiquettes
- `select.tsx`, `input.tsx`, `checkbox.tsx`: Formulaires

**Variantes de boutons:**
```tsx
<Button variant="default">Primaire</Button>
<Button variant="secondary">Secondaire</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Danger</Button>
```

---

## 🔔 Notifications Push

### Architecture

```
┌──────────────────────────────────────────┐
│  Frontend (React)                        │
│  ├─ capacitorNotificationService.ts     │
│  ├─ despiaNotificationService.ts        │
│  └─ useUnifiedPushNotifications.ts      │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│  Capacitor Push Notifications API        │
│  ├─ PushNotifications.register()        │
│  ├─ PushNotifications.requestPermissions│
│  └─ Listeners (registration, error...)  │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│  OneSignal                               │
│  ├─ Device Registration                 │
│  ├─ Player ID Management                │
│  └─ Push Delivery                       │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│  Supabase                                │
│  ├─ profiles (device_token, player_id)  │
│  ├─ Edge Function (send-push)           │
│  └─ Secrets (ONESIGNAL_APP_ID...)       │
└──────────────────────────────────────────┘
```

### Flux de Souscription (Corrigé)

**Problème précédent:** L'app crashait car `register()` était appelé avant que les permissions ne soient acceptées.

**Solution implémentée:**

1. **Demander les permissions** (`requestPermissions()`)
2. **Attendre l'acceptation utilisateur**
3. **Enregistrer l'appareil** (`registerDevice()`)
4. **Attendre le device token** (max 10 secondes via `waitForToken()`)
5. **Enregistrer sur OneSignal** avec le token
6. **Sauvegarder en base** (device_token, onesignal_player_id)

**Code clé (`capacitorNotificationService.ts`):**
```typescript
async registerDevice(): Promise<boolean> {
  try {
    await PushNotifications.register();
    
    // Attendre le token avec timeout
    const token = await this.waitForToken(10000);
    if (!token) {
      throw new Error("Token non reçu");
    }
    
    // Enregistrer sur OneSignal
    const playerId = await this.registerDeviceWithOneSignal(token);
    if (!playerId) {
      throw new Error("Échec OneSignal");
    }
    
    return true;
  } catch (error) {
    logger.error("Erreur registerDevice:", error);
    return false;
  }
}

private waitForToken(timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), timeoutMs);
    
    if (this.deviceToken) {
      clearTimeout(timeout);
      resolve(this.deviceToken);
      return;
    }
    
    const checkToken = setInterval(() => {
      if (this.deviceToken) {
        clearTimeout(timeout);
        clearInterval(checkToken);
        resolve(this.deviceToken);
      }
    }, 100);
  });
}
```

### Types de Notifications

1. **Daily Reminder**: Rappel quotidien de lecture
2. **Badge Unlocked**: Nouveau badge débloqué
3. **Encouragement**: Messages de motivation

### Configuration OneSignal

**Secrets Supabase requis:**
- `ONESIGNAL_APP_ID`: ID de l'application OneSignal
- `ONESIGNAL_REST_API_KEY`: Clé API pour envoyer des notifications

**Configuration Android (Android Studio):**
- `google-services.json` dans `android/app/`
- Plugin `google-services` dans `build.gradle`
- Permission `POST_NOTIFICATIONS` dans `AndroidManifest.xml`

---

## 📐 Principes de Développement

### 1. Conventions de Nommage

**Fichiers:**
- Composants: `PascalCase.tsx` (ex: `DayCard.tsx`)
- Hooks: `camelCase.tsx` avec préfixe `use` (ex: `useAuth.tsx`)
- Services: `camelCase.ts` (ex: `badgeService.ts`)
- Types: `camelCase.ts` (ex: `supabase.ts`)

**Variables:**
- React state: `camelCase` (ex: `isLoading`)
- Constantes: `UPPER_SNAKE_CASE` (ex: `MAX_RETRY_ATTEMPTS`)
- Types/Interfaces: `PascalCase` (ex: `UserProfile`)
- Fonctions: `camelCase` (ex: `getUserProgress`)

**Base de données:**
- Tables: `snake_case` (ex: `user_progress`)
- Colonnes: `snake_case` (ex: `created_at`)
- Fonctions: `snake_case` (ex: `calculate_user_badges`)

### 2. Organisation du Code

**Séparation des responsabilités:**
```typescript
// ❌ Mauvais: Tout dans le composant
function Dashboard() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    supabase.from('profiles').select('*').then(setData);
  }, []);
  
  // ... logique métier, UI, etc.
}

// ✅ Bon: Logique dans un hook
function useProfile() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    profileService.getProfile().then(setData);
  }, []);
  
  return { profile: data };
}

function Dashboard() {
  const { profile } = useProfile();
  // ... UI uniquement
}
```

### 3. Gestion des Erreurs

**Toujours utiliser try/catch:**
```typescript
try {
  await someAsyncOperation();
} catch (error) {
  logger.error("Message contextuel", error);
  errorHandler.handle(error);
}
```

**Utiliser les codes d'erreur:**
```typescript
throw errorHandler.create(
  ErrorCode.AUTH_REQUIRED,
  "Vous devez être connecté",
  { userId: user?.id }
);
```

### 4. Performance

**Mémorisation:**
```typescript
// useMemo pour calculs coûteux
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// useCallback pour fonctions passées en props
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);
```

**React Query pour cache:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => getUser(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### 5. Accessibilité

**Labels pour les inputs:**
```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

**Textes alternatifs:**
```tsx
<img src="..." alt="Description de l'image" />
```

**Roles ARIA:**
```tsx
<button aria-label="Fermer le dialogue" onClick={close}>
  <X />
</button>
```

### 6. Sécurité

**Jamais de données sensibles côté client:**
```typescript
// ❌ Mauvais
const API_KEY = "sk_live_123456789";

// ✅ Bon (côté Supabase Edge Function)
const API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
```

**Validation des inputs:**
```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const result = schema.safeParse(formData);
if (!result.success) {
  // Gérer les erreurs de validation
}
```

**Row Level Security (RLS):**
- Toujours activer RLS sur les tables sensibles
- Vérifier que les policies couvrent tous les cas
- Tester avec différents utilisateurs

### 7. Tests (À implémenter)

**Structure recommandée:**
```
src/
├── components/
│   ├── DayCard.tsx
│   └── __tests__/
│       └── DayCard.test.tsx
```

**Types de tests:**
- **Unit**: Fonctions isolées (services, utils)
- **Integration**: Hooks + Services
- **E2E**: Flows utilisateur complets

---

## 🚀 Guide de Démarrage

### Prérequis

- Node.js 18+ et npm
- Compte Supabase (si backend)
- Xcode (pour iOS) ou Android Studio (pour Android)

### Installation

```bash
# 1. Cloner le projet
git clone <YOUR_GIT_URL>
cd beree-365

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
# Créer un fichier .env avec:
SUPABASE_URL=https://xizlfyrjhzkzdchjezfn.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...

# 4. Lancer en développement
npm run dev
```

### Développement Mobile

```bash
# 1. Ajouter les plateformes
npx cap add ios
npx cap add android

# 2. Build du projet
npm run build

# 3. Synchroniser avec les plateformes natives
npx cap sync

# 4. Ouvrir dans l'IDE natif
npx cap open ios      # macOS uniquement
npx cap open android
```

### Structure du Workflow

**Développement typique:**

1. **Créer une branche de feature**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Développer la fonctionnalité**
   - Créer les composants dans `src/components/`
   - Ajouter la logique dans `src/hooks/` ou `src/services/`
   - Mettre à jour les types dans `src/types/`

3. **Tester localement**
   ```bash
   npm run dev
   ```

4. **Si changement DB:**
   - Créer une migration dans `supabase/migrations/`
   - Tester la migration localement
   - Vérifier les RLS policies

5. **Commit et push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

### Debugging

**Console logs:**
```typescript
import { logger } from '@/utils/logger';

logger.debug("Debug info", { data });
logger.info("Info message");
logger.warn("Warning");
logger.error("Error occurred", error);
```

**React DevTools:**
- Installer l'extension Chrome/Firefox
- Inspecter les composants et leur state
- Profiler les performances

**Supabase Dashboard:**
- SQL Editor: Tester les requêtes
- Auth: Gérer les utilisateurs
- Logs: Voir les erreurs Edge Functions

**Capacitor:**
- `/capacitor-debug`: Page de debug des notifications
- Chrome DevTools (Android): `chrome://inspect`
- Safari DevTools (iOS): Develop > Simulator

### Commandes Utiles

```bash
# Développement
npm run dev                 # Lancer le serveur dev
npm run build              # Build de production
npm run preview            # Prévisualiser le build

# Capacitor
npx cap sync               # Sync après changements
npx cap run android        # Lancer sur Android
npx cap run ios            # Lancer sur iOS
npx cap update             # Mettre à jour Capacitor

# Supabase (si CLI installée)
supabase start             # Lancer Supabase local
supabase db reset          # Reset DB locale
supabase gen types typescript # Générer types
```

---

## 📚 Ressources Complémentaires

### Documentation Externe

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/docs)
- [Capacitor](https://capacitorjs.com/docs)
- [OneSignal](https://documentation.onesignal.com/)
- [React Query](https://tanstack.com/query/latest/docs/react/overview)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

### Dossiers Importants à Connaître

**Pour débuter:**
1. `src/pages/Index.tsx`: Point d'entrée de l'app
2. `src/hooks/useAuth.tsx`: Comprendre l'authentification
3. `src/services/readingPlan/`: Logique métier principale
4. `src/components/ui/`: Composants réutilisables

**Pour les notifications:**
1. `src/services/notifications/`
2. `src/hooks/useUnifiedPushNotifications.ts`
3. `supabase/functions/send-push-notification/`

**Pour l'admin:**
1. `src/pages/Admin.tsx`
2. `src/components/admin/`
3. Fonction PostgreSQL: `get_user_stats()`

---

## 🐛 Problèmes Connus et Solutions

### 1. Crash lors de l'acceptation des permissions (Android)

**Problème:** L'app se ferme quand l'utilisateur accepte les permissions de notifications.

**Solution:** Implémentée via séparation de `registerDevice()` et `waitForToken()`.

**Fichiers modifiés:**
- `src/services/notifications/capacitorNotificationService.ts`
- `src/hooks/useUnifiedPushNotifications.ts`

### 2. Device Token non reçu

**Diagnostic:**
- Vérifier que `google-services.json` est présent (Android)
- Vérifier les capabilities dans Xcode (iOS)
- Vérifier les permissions dans `AndroidManifest.xml`

**Debug:**
```typescript
const deviceInfo = await capacitorNotificationService.getDeviceInfo();
console.log("Device Token:", deviceInfo.deviceToken);
console.log("OneSignal Player ID:", deviceInfo.oneSignalPlayerId);
```

### 3. Notifications non reçues

**Checklist:**
1. Vérifier que `ONESIGNAL_APP_ID` et `ONESIGNAL_REST_API_KEY` sont configurés
2. Vérifier que le `onesignal_player_id` est dans la DB
3. Tester l'envoi depuis OneSignal Dashboard
4. Vérifier les logs de l'Edge Function `send-push-notification`

---

## 📝 Glossaire

- **RLS**: Row Level Security (sécurité au niveau des lignes)
- **PWA**: Progressive Web App (application web installable)
- **Edge Function**: Fonction serverless Supabase
- **Device Token**: Token unique pour envoyer des notifications (FCM/APNs)
- **Player ID**: Identifiant OneSignal d'un appareil
- **Streak**: Série de jours consécutifs
- **Badge**: Récompense débloquée par l'utilisateur
- **Chapter**: Chapitre biblique
- **Day Number**: Numéro du jour dans le plan (1-365)
- **Plan**: Plan de lecture (Classique, Chronologique, etc.)
- **Profile**: Profil utilisateur étendu (au-delà de auth.users)

---

## 🎯 Prochaines Étapes (Roadmap)

### Court Terme
- [ ] Tests unitaires et d'intégration
- [ ] Mode hors-ligne complet
- [ ] Amélioration des performances (lazy loading)
- [ ] Monitoring des erreurs (Sentry)

### Moyen Terme
- [ ] Fonctionnalités sociales (partage, groupes)
- [ ] Plus de plans de lecture
- [ ] Thèmes personnalisables
- [ ] Widget mobile

### Long Terme
- [ ] Version desktop (Electron)
- [ ] API publique
- [ ] Marketplace de plans de lecture
- [ ] Statistiques avancées

---

**Dernière mise à jour:** 2025-11-04  
**Version:** 1.0.0  
**Auteur:** Équipe Beree 365
