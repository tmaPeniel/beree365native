# 06 - Design et Composants UI

## 6.1 Identité Visuelle

### Couleur Principale
La couleur de marque Beree est un **vert** décliné en 11 nuances :

| Token | Hex | Usage |
|-------|-----|-------|
| `beree-50` | #f0faf3 | Fonds légers, hover states |
| `beree-100` | #dcf2e3 | — |
| `beree-200` | #bde5cb | — |
| `beree-300` | #92d2aa | — |
| `beree-400` | #65b881 | — |
| **`beree-500`** | **#34A853** | **Couleur principale (accent green)** |
| `beree-600` | #2e8a45 | Hover des boutons |
| `beree-700` | #29703b | — |
| `beree-800` | #255a32 | — |
| `beree-900` | #214a2c | — |
| `beree-950` | #0e2716 | Texte foncé |

### Variables CSS Sémantiques (HSL)

#### Mode Clair
```css
--background: 0 0% 100%;           /* Blanc */
--foreground: 222.2 84% 4.9%;      /* Noir profond */
--primary: 137 53% 43%;            /* Beree-500 */
--primary-foreground: 210 40% 98%; /* Blanc */
--secondary: 210 40% 96.1%;        /* Gris clair */
--muted: 210 40% 96.1%;            /* Gris clair */
--muted-foreground: 215.4 16.3% 46.9%; /* Gris moyen */
--accent: 137 53% 43%;             /* Beree-500 */
--destructive: 0 84.2% 60.2%;      /* Rouge */
--border: 214.3 31.8% 91.4%;       /* Gris border */
--card: 0 0% 100%;                  /* Blanc */
--radius: 1rem;                     /* Border radius */
```

#### Mode Sombre
```css
--background: 222.2 84% 4.9%;      /* Noir profond */
--foreground: 210 40% 98%;          /* Blanc */
--primary: 137 53% 43%;            /* Beree-500 (inchangé) */
--secondary: 217.2 32.6% 17.5%;    /* Gris foncé */
--muted: 217.2 32.6% 17.5%;        /* Gris foncé */
--border: 217.2 32.6% 17.5%;       /* Gris foncé */
--card: 222.2 84% 4.9%;            /* Fond sombre */
```

---

## 6.2 Typographie

- **Polices** : Polices système par défaut (pas de custom font)
- **Titres** : `font-bold`, tailles `text-xl` à `text-3xl`
- **Corps** : `text-sm` à `text-base`
- **Labels** : `text-xs` à `text-sm`

---

## 6.3 Layout

### Mobile-first
- Tous les layouts sont conçus mobile-first
- Breakpoint principal : `md:` (768px)
- Padding standard : `p-4` mobile, `p-6` desktop

### Structure des pages protégées
```
AppLayout
├── NavBar (fixé en bas)
└── <Page Content> (pb-20 pour compenser la NavBar)
```

### NavBar (Bottom Navigation)
- Hauteur : `h-16`
- Fond : `bg-card/95 backdrop-blur-md`
- Border top + shadow
- 3-4 items (Accueil, Lecture, Profil, [Admin])
- Icônes Lucide (20px) + label text-xs

### Sidebar (Desktop)
- Composant `AppSidebar` via shadcn Sidebar
- Affiché seulement sur desktop

---

## 6.4 Composants UI (shadcn/ui)

Tous les composants UI de base viennent de **shadcn/ui** (basé sur Radix UI) :

| Composant | Usage |
|-----------|-------|
| `Button` | Boutons (variants: default, outline, ghost, destructive, link) |
| `Card` / `CardContent` / `CardHeader` | Conteneurs de contenu |
| `Dialog` / `AlertDialog` | Modales et confirmations |
| `Drawer` | Panneau mobile (bottom sheet) |
| `Input` | Champs de saisie |
| `Checkbox` | Cases à cocher (toggle lecture) |
| `Switch` | Toggles ON/OFF (notifications) |
| `Select` | Listes déroulantes (thème) |
| `Avatar` | Photo/initiales utilisateur |
| `Badge` | Étiquettes colorées |
| `Progress` | Barre de progression |
| `Tabs` | Onglets (Semaine/Mois) |
| `Calendar` | Sélection de date |
| `Popover` | Popup contextuel |
| `ScrollArea` | Zone scrollable personnalisée |
| `Skeleton` | Placeholders de chargement |
| `Separator` | Séparateurs visuels |
| `Tooltip` | Infobulles |
| `Form` | Formulaires avec validation (react-hook-form) |
| `Sheet` | Panneau latéral (sidebar) |
| `Accordion` | Sections pliables |

---

## 6.5 Composants Métier

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `Logo` | Logo.tsx | Logo Beree (image + texte) |
| `SplashScreen` | SplashScreen.tsx | Écran de démarrage animé |
| `NavBar` | NavBar.tsx | Navigation bottom bar |
| `AuthForm` | AuthForm.tsx | Formulaire connexion/inscription partagé |
| `TodayDisplay` | TodayDisplay.tsx | Affichage du jour courant + salutation |
| `VerseOfDay` | VerseOfDay.tsx | Card verset du jour avec like/partage |
| `ReadingPlan` | ReadingPlan.tsx | Liste des passages du jour avec checkboxes |
| `ProgressStats` | ProgressStats.tsx | Barre de progression globale |
| `CircularProgress` | CircularProgress.tsx | Camembert de progression (SVG) |
| `DayCard` | DayCard.tsx | Card d'un jour dans la grille |
| `OptimizedDayCard` | OptimizedDayCard.tsx | Version optimisée de DayCard |
| `DayReadingDialog` | DayReadingDialog.tsx | Dialog détail d'un jour |
| `MonthlyReadingPlan` | MonthlyReadingPlan.tsx | Grille mensuelle des jours |
| `FocusReadingView` | reading/FocusReadingView.tsx | Vue focus avec carrousel |
| `FocusDayDetail` | reading/FocusDayDetail.tsx | Détail d'un jour en vue focus |
| `HorizontalDayCarousel` | reading/HorizontalDayCarousel.tsx | Carrousel horizontal |
| `ViewModeToggle` | reading/ViewModeToggle.tsx | Toggle grille/focus |
| `SearchBar` | SearchBar.tsx | Barre de recherche |
| `DayNavigationControls` | DayNavigationControls.tsx | Boutons navigation jours |
| `ThemeFilter` | ThemeFilter.tsx | Filtrage par thématique (versets) |
| `PlanSelector` | ui/PlanSelector.tsx | Sélection du plan (inscription) |
| `PlanDates` | ui/PlanDate.tsx | Dates début/fin du plan |
| `NotificationCenter` | notifications/NotificationCenter.tsx | Centre de notifications (cloche) |
| `BadgeUnlockPopup` | notifications/BadgeUnlockPopup.tsx | Popup badge débloqué |
| `BadgesSection` | profile/BadgesSection.tsx | Section badges dans profil |
| `ActivityChart` | statistics/ActivityChart.tsx | Graphique d'activité (Recharts) |
| `VerseCardMobile` | verse/VerseCardMobile.tsx | Card verset mobile |
| `VerseCardDesktop` | verse/VerseCardDesktop.tsx | Card verset desktop |
| `LikeButton` | verse/LikeButton.tsx | Bouton like |
| `CookieConsentBanner` | cookies/CookieConsentBanner.tsx | Bandeau consentement cookies |
| `AdminStats` | admin/AdminStats.tsx | Stats admin |
| `UserStatsTable` | admin/UserStatsTable.tsx | Tableau utilisateurs admin |
| `ProfileCard` | profile/ProfileCard.tsx | Card profil |
| `StatsCard` | profile/StatsCard.tsx | Card statistique |
| `PlanCard` | profile/PlanCard.tsx | Card plan de lecture |

---

## 6.6 Animations

Toutes définies dans `tailwind.config.ts` via keyframes :

### Entrées
| Animation | Classe | Durée | Description |
|-----------|--------|-------|-------------|
| Fade In | `animate-fade-in` | 0.4s | Apparition douce avec léger slide up |
| Slide Up | `animate-slide-up` | 0.5s | Glissement vers le haut |
| Scale Fade In | `animate-scale-fade-in` | 0.3s | Zoom léger + fade |

### Interactions
| Animation | Classe | Durée | Description |
|-----------|--------|-------|-------------|
| Press | `animate-press` | 0.1s | Effet d'appui tactile (scale 0.95) |
| Lift | `animate-lift` | 0.2s | Élévation au hover |
| Ripple | `animate-ripple` | 0.3s | Effet ripple |

### Récompenses
| Animation | Classe | Durée | Description |
|-----------|--------|-------|-------------|
| Success Bounce | `animate-success-bounce` | 0.4s | Rebond pour succès |
| Badge Glow | `animate-badge-glow` | 2s (infinite) | Lueur pulsante sur badges |
| Check Mark | `animate-check-mark` | 0.4s | Animation de coche |

### Chargement
| Animation | Classe | Durée | Description |
|-----------|--------|-------|-------------|
| Gentle Spin | `animate-gentle-spin` | 1s (infinite) | Rotation douce |
| Pulse Soft | `animate-pulse-soft` | 2s (infinite) | Pulsation d'opacité |

### Icônes & Texte
| Animation | Classe | Durée | Description |
|-----------|--------|-------|-------------|
| Icon Bounce | `animate-icon-bounce` | 0.5s | Rebond d'icône |
| Float | `animate-float` | 3s (infinite) | Flottement léger |
| Text Reveal | `animate-text-reveal` | 0.3s | Révélation de texte |

### Splash Screen
| Animation | Classe | Durée | Description |
|-----------|--------|-------|-------------|
| Splash Logo | `animate-splash-logo` | 1s | Logo qui apparaît |
| Splash Progress | `animate-splash-progress` | 2.5s | Barre qui se remplit |

---

## 6.7 Icônes

Bibliothèque : **Lucide React** (`lucide-react`)

Icônes principales utilisées :
- Navigation : `Home`, `BookOpen`, `User`, `Settings`, `ArrowLeft`, `ChevronRight`
- Actions : `Check`, `X`, `Plus`, `Pencil`, `Trash2`, `Share`, `LogOut`
- Contenu : `Calendar`, `Heart`, `Award`, `BarChart3`, `TrendingUp`
- État : `Eye`, `EyeOff`, `AlertCircle`, `CheckCircle`, `Bell`
- Lecture : `BookMarked`, `ChevronUp`, `ChevronDown`, `RotateCcw`
- UI : `Moon`, `Shield`, `HelpCircle`, `Info`, `MessageSquare`, `Search`

---

## 6.8 Responsive Design

### Breakpoints
| Breakpoint | Taille | Usage |
|------------|--------|-------|
| Default | < 768px | Mobile (principal) |
| `md:` | ≥ 768px | Tablet / Desktop |

### Adaptations principales
| Élément | Mobile | Desktop |
|---------|--------|---------|
| NavBar | Bottom fixed | Sidebar |
| Dashboard layout | Stack vertical | Grid 2 colonnes |
| ReadingPlan | Vue Focus par défaut | Vue Grille uniquement |
| DayReadingDialog | Drawer (bottom sheet) | Dialog centré |
| Verset du jour | Card pleine largeur | Card avec padding |
| Profil | Stack vertical | Stack vertical (même) |

### Hook `useIsMobile()`
```typescript
// Retourne true si la largeur est < 768px
const isMobile = useIsMobile();
```

---

## 6.9 États d'Interface

Chaque page gère 4 états :

1. **Loading** : Spinner animé centré avec texte « Chargement... »
2. **Error** : Message d'erreur avec bouton « Réessayer »
3. **Empty** : Illustration + message explicatif + action suggérée
4. **Success** : Contenu principal

### Feedback Utilisateur
- **Toast** (sonner) : Notifications temporaires en bas de l'écran
  - Succès : Vert
  - Erreur : Rouge
  - Info : Bleu
- **AlertDialog** : Confirmations importantes (suppression, changement de plan)
- **Badge** : Indicateurs d'état (Actif, Inactif, Refusé)

---

## 6.10 PWA (Progressive Web App)

### Manifest
```json
{
  "name": "Beree - Plan de lecture biblique",
  "short_name": "Beree",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#34A853",
  "background_color": "#ffffff"
}
```

### Icônes
- `pwa-192x192.png` : Icône standard
- `pwa-512x512.png` : Icône haute résolution
- `pwa-maskable-512x512.png` : Icône adaptative (Android)
- `apple-touch-icon.png` : Icône iOS

### Service Worker
- Fichier : `public/sw.js`
- Plugin : `vite-plugin-pwa`
- Stratégie : Cache-first pour les assets statiques
- Composant `PWAUpdateNotification` : Notification de mise à jour disponible

---

## 6.11 Graphiques (Recharts)

### ActivityChart
- **Type** : BarChart
- **Onglets** : Semaine / Mois
- **Données** : Nombre de passages lus par jour/semaine
- **Couleur barres** : `beree-500` (#34A853)
- **Responsive** : `ResponsiveContainer` pleine largeur

### CircularProgress
- **Type** : SVG circle personnalisé (pas Recharts)
- **Animation** : Transition CSS du stroke-dashoffset
- **Tailles** : Configurable (120px par défaut)
- **Affichage** : Pourcentage au centre
