

## Cahier des charges complet -- Application Beree

Je vais creer un dossier `docs/` contenant 6 fichiers de documentation exhaustive couvrant l'ensemble du projet, destine a une equipe mobile.

### Fichiers a creer

| Fichier | Contenu |
|---------|---------|
| `docs/01-presentation-projet.md` | But, mission, stack technique, architecture globale |
| `docs/02-pages-et-ecrans.md` | Chaque page avec route, description, composants, captures (URLs preview) |
| `docs/03-modele-de-donnees.md` | Schema complet Supabase (tables, colonnes, types, FK, RLS) |
| `docs/04-interactions-et-logique.md` | Chaque bouton/action, ce qui se passe, flux utilisateur detailles |
| `docs/05-services-et-api.md` | Tous les services (auth, progress, badges, verses, notifications, admin) |
| `docs/06-design-et-composants.md` | Charte graphique, composants UI, theme, responsive, animations |

### Contenu cle par fichier

**01 - Presentation** : App de lecture biblique, plans de 180/365 jours, 4 types de plans (canonique/chronologique x 6/12 mois), PWA, Supabase backend, multi-theme (clair/sombre).

**02 - Pages** : 20+ ecrans documentes avec route, layout, composants utilises, etats (loading/error/vide), et description visuelle precise pour chaque ecran (Index, Login, Signup Step1/Step2, Dashboard, Reading, Profile, Statistics, Badges, VerseList, Settings, Edit, Privacy, About, Help, Admin, ForgotPassword, ResetPassword, Terms, Cookies, ReadingPlanManagement, NotFound).

**03 - Modele de donnees** : Les 11 tables (profiles, reading_plans, reading_plan_chapters, user_progress, daily_verses, verse_likes, badges, user_badges, user_roles, notification_preferences, notification_logs, user_devices, user_consents) avec colonnes, types, contraintes, et politiques RLS.

**04 - Interactions** : Flux complets pour inscription (2 etapes), connexion, marquage de lecture, like de verset, changement de plan, reset de plan, modification de date, suppression de compte, export RGPD, partage, navigation entre vues (focus/grille), recherche, notifications push, badges automatiques.

**05 - Services** : authCore (signUp/signIn/signOut/resetPassword), progressService (getOverallProgress/toggleChapterStatus), verseService (getDailyVerse/getAllVersesUpToDay avec jointure verse_likes), badgeService (calcul automatique), planService (changePlan/getAvailablePlans), admin service, dateService, cacheService.

**06 - Design** : Couleur primaire beree-500 (vert), mobile-first, bottom NavBar (Accueil/Lecture/Profil/Admin), sidebar desktop, composants Shadcn/Radix UI, Recharts pour graphiques, Tailwind CSS, animations (splash, fade-in, scale, press), theme provider (light/dark/system).

