# 02 - Pages et Écrans

## Vue d'ensemble des routes

| Route | Page | Accès | Layout |
|-------|------|-------|--------|
| `/` | Landing (Index) | Public | Sans NavBar |
| `/login` | Connexion | Public | Sans NavBar |
| `/signup` | Redirection vers Step1 | Public | Sans NavBar |
| `/signup/step1` | Inscription - Étape 1 | Public | Sans NavBar |
| `/signup/plan` | Inscription - Étape 2 | Public | Sans NavBar |
| `/forgot-password` | Mot de passe oublié | Public | Sans NavBar |
| `/reset-password` | Réinitialisation MDP | Public | Sans NavBar |
| `/terms` | CGU | Public | Sans NavBar |
| `/cookies` | Politique cookies | Public | Sans NavBar |
| `/dashboard` | Tableau de bord | Authentifié | AppLayout (NavBar) |
| `/reading` | Plan de lecture | Authentifié | AppLayout (NavBar) |
| `/profile` | Profil | Authentifié | AppLayout (NavBar) |
| `/profile/statistics` | Statistiques | Authentifié | AppLayout (NavBar) |
| `/profile/badges` | Badges | Authentifié | AppLayout (NavBar) |
| `/profile/settings` | Paramètres | Authentifié | AppLayout (NavBar) |
| `/profile/edit` | Éditer profil | Authentifié | AppLayout (NavBar) |
| `/profile/notifications` | Notifications | Authentifié | AppLayout (NavBar) |
| `/profile/privacy` | Confidentialité | Authentifié | AppLayout (NavBar) |
| `/profile/about` | À propos | Authentifié | AppLayout (NavBar) |
| `/profile/help` | Aide | Authentifié | AppLayout (NavBar) |
| `/reading-plan` | Gestion du plan | Authentifié | AppLayout (NavBar) |
| `/verses` | Liste des versets | Authentifié | AppLayout (NavBar) |
| `/admin` | Administration | Admin uniquement | AppLayout (NavBar) |
| `*` | Page 404 | Public | Sans NavBar |

---

## Détail de chaque page

### 1. Page d'accueil (`/` - Index)

**Description** : Page de landing avec logo Beree, titre « Parcourez la Bible en un an », description et boutons d'action.

**Composants** :
- `Logo` (composant avec image `/Beree2.png`)
- Image hero (`beree-hero.jpg`)
- Bouton « Commencer » → redirige vers `/signup` (ou `/dashboard` si connecté)
- Boutons « Connexion » / « Inscription » (si non connecté)
- Boutons « Plan de lecture » / « Profil » (si connecté)

**États** :
- Loading : Spinner pendant vérification auth
- Non authentifié : Boutons Connexion/Inscription
- Authentifié : Boutons Dashboard/Reading/Profil

---

### 2. Connexion (`/login`)

**Description** : Formulaire de connexion avec email et mot de passe.

**Composants** :
- `AuthForm` (composant partagé login/signup)
  - Champ email
  - Champ mot de passe (avec toggle visibilité)
  - Bouton « Se connecter »
  - Lien « Mot de passe oublié ? » → `/forgot-password`
  - Lien vers inscription

**Comportement** :
- Si déjà authentifié → redirection automatique vers `/dashboard`
- Erreurs affichées via `toast` (sonner) : « Email ou mot de passe incorrect », etc.
- Lien CGU en bas de page

---

### 3. Inscription Étape 1 (`/signup/step1`)

**Description** : Formulaire de collecte des informations personnelles.

**Champs** :
- Nom complet (min 2 caractères)
- Email (validation email)
- Mot de passe (min 6 caractères, toggle visibilité)
- Date de début du plan (date picker, défaut : aujourd'hui)
- Checkbox CGU obligatoire (liens vers `/terms` et `/cookies`)

**Comportement** :
- Validation via Zod schema
- Données stockées temporairement dans `localStorage` sous la clé `signupData`
- Bouton « Suivant » → navigation vers `/signup/plan`
- Lien « Déjà un compte? Se connecter » → `/login`

**Design** :
- Card centrée avec bordure verte en haut (`border-t-4 border-t-green-500`)
- Indicateur « Étape 1 sur 2 »

---

### 4. Inscription Étape 2 (`/signup/plan`)

**Description** : Sélection du plan de lecture parmi les plans disponibles.

**Composants** :
- `PlanSelector` : Affiche les 4 plans avec images, durée et description
- Message de bienvenue personnalisé avec le nom saisi à l'étape 1
- Bouton « Retour » et « S'inscrire »

**Comportement** :
- Récupère les données de l'étape 1 depuis `localStorage`
- Si pas de données → redirection vers `/signup`
- Appelle `signUp()` avec email, password, nom, date, planId
- Enregistre le consentement CGU en base
- Succès → supprime `localStorage`, redirige vers `/dashboard`

---

### 5. Tableau de Bord (`/dashboard`)

**Description** : Page principale après connexion. Affiche un résumé quotidien.

**Composants** :
- **Header** : Titre « Le Tour de ma Bible en X jours » + `NotificationCenter` (cloche)
- **TodayDisplay** : Jour actuel (ex: « Jour 45 ») + date + salutation personnalisée
- **VerseOfDay** : Verset du jour avec référence, texte, bouton Like, bouton Partager
- **ReadingPlan** : Liste des passages du jour avec checkbox pour marquer comme lu
- **ProgressStats** : Barre de progression globale (passages lus / total)
- **PlanDates** : Dates de début et fin du plan + jours restants

**Layout mobile** : ReadingPlan au-dessus de VerseOfDay  
**Layout desktop** : Grille 2 colonnes pour PlanDates et ReadingPlan

---

### 6. Plan de Lecture (`/reading`)

**Description** : Vue complète de tous les jours du plan avec progression.

**Deux modes d'affichage** (toggle en haut, mobile uniquement) :
1. **Vue Focus** (`FocusReadingView`) : Carrousel horizontal jour par jour avec détail
2. **Vue Grille** (`MonthlyReadingPlan`) : Organisation mensuelle avec cards pour chaque jour

**Composants** :
- **Header** : Titre + `ViewModeToggle` (Focus/Grille)
- **SearchBar** : Recherche par référence biblique (ex: « Jean », « Psaumes »)
- **DayNavigationControls** : Bouton « Aller au jour actuel »
- **MonthlyReadingPlan** : Grille de `DayCard` organisés par mois
- **FocusReadingView** : Carrousel swipeable avec `FocusDayDetail`
- Bouton flottant « Scroll to top »

**DayCard** (chaque jour) :
- Numéro du jour
- Indicateur de progression (barre colorée)
- Couleurs : vert (100%), jaune (partiel), gris (non commencé)
- Le jour courant est mis en évidence (bordure primary)

**Interactions sur un jour** :
- Clic → ouvre `DayReadingDialog` (dialog/drawer)
  - Liste des passages du jour avec checkboxes
  - Cocher un passage → `toggleChapterStatus` (marque comme lu/non lu)
  - Indicateur de progression du jour en temps réel

---

### 7. Profil (`/profile`)

**Description** : Hub du profil utilisateur avec navigation vers sous-pages.

**Composants** :
- **Header** : Avatar (initiales), nom, email, bouton « Éditer le profil »
- **Liste d'options** (chaque option = icône + label + description + chevron) :
  1. Plan de lecture → `/reading-plan`
  2. Statistiques → `/profile/statistics`
  3. Badges → `/profile/badges`
  4. Verset du jour → `/verses`
  5. Paramètres → `/profile/settings`
  6. À propos → `/profile/about`
  7. Partager l'app → `navigator.share()` ou copie dans presse-papiers
- **Bouton Déconnexion** : Dialog de confirmation → `supabase.auth.signOut()`

---

### 8. Statistiques (`/profile/statistics`)

**Description** : Vue détaillée de la progression de lecture.

**Composants** :
- **Card Progression globale** : Camembert (`CircularProgress`) + stats textuelles (Total, Lus, Restants)
- **Grille 4 stats** :
  1. Jours complétés
  2. Passages lus
  3. Passages restants
  4. Passages cette semaine
- **ActivityChart** : Graphique d'activité avec onglets Semaine/Mois (Recharts `BarChart`)

---

### 9. Badges (`/profile/badges`)

**Description** : Liste de tous les badges avec statut (débloqué/verrouillé).

**Composants** :
- `BadgesSection` : 
  - Stats résumées (X/Y badges débloqués)
  - Grille de badges avec :
    - Icône + couleur
    - Nom + description
    - Barre de progression pour badges verrouillés
    - Animation `badge-glow` pour badges débloqués

**Types de badges** :
- `chapters_read` : Nombre de passages lus
- `days_completed` : Nombre de jours complétés
- `milestone` : Jalons de progression
- `streak_days` : Série de jours consécutifs
- `fixed_time_streak` : Lecture à la même heure
- `time_of_day` : Lecture matinale/soirée
- `resume_after_gap` : Reprise après pause
- `book_completed` : Livre biblique terminé
- `encouragements_used` : Encouragements utilisés

---

### 10. Liste des Versets (`/verses`)

**Description** : Historique de tous les versets du jour, du plus récent au plus ancien.

**Composants** :
- **Header sticky** avec bouton retour et icône BookOpen
- **ThemeFilter** : Filtrage par thématique (sagesse) avec chips scrollables
- **ScrollArea** avec liste de cards :
  - Jour N + nombre de likes (cœur)
  - Texte de sagesse (`wisdomType`)
  - Citation du verset (`text`) en italique
  - Référence biblique

---

### 11. Gestion du Plan (`/reading-plan`)

**Description** : Permet de voir, changer, réinitialiser le plan et modifier la date de début.

**Sections** :
1. **Mon plan actuel** : Card avec image, nom, durée, nombre de passages, badge « Actif »
   - Expandable : date de début + DatePicker pour modifier + description
2. **Changer de plan** : Grille 2x2 des 4 plans avec images
   - Clic = expand avec détails + bouton « Choisir ce plan »
   - `AlertDialog` de confirmation (⚠️ supprime toute progression)
3. **Zone dangereuse** : 
   - Réinitialiser le plan (supprime progression + badges, remet jour 1)
   - `AlertDialog` de double confirmation

---

### 12. Paramètres (`/profile/settings`)

**Sections** :
- **Profil** : Lien vers édition profil
- **Notifications** : Toggle push ON/OFF + statut (Actif/Inactif/Refusé/Non supporté)
- **Apparence** : Sélecteur thème (Clair/Sombre/Système)
- **Confidentialité** : Lien vers `/profile/privacy`
- **Support** : Lien vers `/profile/help`

---

### 13. Édition Profil (`/profile/edit`)

**Description** : Modification du nom et éventuellement d'autres informations personnelles.

---

### 14. Confidentialité (`/profile/privacy`)

**Description** : Gestion des données personnelles, export RGPD, suppression de compte.

**Actions** :
- Export des données personnelles (JSON)
- Suppression du compte (Edge Function `delete-user-account`)
- Gestion du consentement cookies

---

### 15. Administration (`/admin`)

**Accès** : Rôle `admin` uniquement (vérifié via `AdminRoute` + RPC `is_admin()`).

**Composants** :
- `AdminStats` : Statistiques globales (nb utilisateurs, actifs, inactifs)
- `UserStatsTable` : Tableau de tous les utilisateurs avec :
  - Nom, email, date début, dernière connexion
  - Statut actif/inactif
  - Chapitres complétés, jours complétés
  - Tri par colonne
- `InactiveUsersCard` : Liste des utilisateurs inactifs (>7 jours sans activité)

---

### 16. Pages Utilitaires

- **Mot de passe oublié** (`/forgot-password`) : Champ email → envoie un lien de réinitialisation
- **Réinitialisation** (`/reset-password`) : Nouveau mot de passe (arrive via lien email)
- **CGU** (`/terms`) : Conditions générales d'utilisation
- **Cookies** (`/cookies`) : Politique de cookies
- **404** (`*`) : Page non trouvée avec lien retour

---

## Navigation (NavBar)

**Position** : Fixée en bas de l'écran (mobile), sidebar sur desktop.

**Éléments** :
| Icône | Label | Route | Visible |
|-------|-------|-------|---------|
| Home | Accueil | `/dashboard` | Toujours |
| BookOpen | Lecture | `/reading` | Toujours |
| User | Profil | `/profile` | Toujours |
| Settings | Admin | `/admin` | Admin uniquement |

**Comportement** :
- Élément actif = couleur primary + fond primary/10
- Animation `press` au clic
- Animation `icon-bounce` sur icône active

---

## Splash Screen

Au premier chargement, un splash screen s'affiche pendant ~2.5s avec :
- Logo Beree animé (`splash-logo`)
- Barre de progression (`splash-progress`)
- Texte « Parcourez la Bible en un an » avec `fade-in-delayed`
