# 04 - Interactions et Logique Métier

## 4.1 Flux d'Inscription (2 étapes)

### Étape 1 : Informations personnelles
1. L'utilisateur saisit : nom, email, mot de passe, date de début
2. Il coche la case CGU (obligatoire)
3. Clic sur « Suivant »
4. **Validation Zod** : email valide, password ≥ 6 chars, nom ≥ 2 chars, CGU cochées
5. Si valide → données stockées dans `localStorage('signupData')` → navigation vers `/signup/plan`

### Étape 2 : Choix du plan
1. Affichage des 4 plans disponibles (chargés depuis `reading_plans` via Supabase)
2. L'utilisateur sélectionne un plan
3. Clic sur « S'inscrire »
4. **Appel** `signUp(email, password, fullName, startDate, planId)` :
   - `supabase.auth.signUp()` avec métadonnées `{ full_name, start_date, plan_id }`
   - Le trigger `handle_new_user` crée automatiquement le profil dans `profiles`
   - Le trigger `assign_default_user_role` assigne le rôle 'user'
   - Le trigger `create_default_notification_preferences` crée les préférences
   - Enregistrement du consentement CGU dans `user_consents`
5. Succès → suppression `localStorage('signupData')` → redirection `/dashboard`

---

## 4.2 Flux de Connexion

1. L'utilisateur saisit email + mot de passe
2. Clic sur « Se connecter »
3. **Appel** `signIn(email, password)` → `supabase.auth.signInWithPassword()`
4. Si erreur :
   - "Invalid login credentials" → "Email ou mot de passe incorrect"
   - "Email not confirmed" → "Veuillez confirmer votre email"
5. Si succès → `onAuthStateChange('SIGNED_IN')` → charge le profil → redirige `/dashboard`

---

## 4.3 Flux de Déconnexion

1. Clic sur « Déconnexion » dans la page Profil
2. **AlertDialog** de confirmation : « Êtes-vous sûr de vouloir vous déconnecter ? »
3. Clic « Se déconnecter »
4. **Appel** `supabase.auth.signOut()`
5. `onAuthStateChange('SIGNED_OUT')` → nettoie l'état → redirige `/login`

---

## 4.4 Réinitialisation du Mot de Passe

### Demande
1. Page `/forgot-password` : saisie de l'email
2. Clic « Envoyer » → `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`
3. Toast : « Un email de réinitialisation a été envoyé »

### Réinitialisation
1. L'utilisateur clique sur le lien dans l'email → arrive sur `/reset-password`
2. Supabase détecte l'événement `PASSWORD_RECOVERY`
3. L'utilisateur saisit son nouveau mot de passe
4. **Appel** `supabase.auth.updateUser({ password: newPassword })`
5. Succès → toast + redirection `/dashboard`

---

## 4.5 Marquage de Lecture (Toggle Chapter)

C'est l'interaction la plus fréquente de l'application.

### Flux
1. L'utilisateur ouvre un jour (clic sur DayCard ou dans la vue Focus)
2. Le dialog/drawer affiche la liste des passages avec checkboxes
3. Clic sur un passage :
   - **Appel** `toggleChapterStatus(userId, chapterId, currentStatus)`
   - Si `pending` → crée/met à jour `user_progress` avec `status='completed'`, `completed_at=now()`
   - Si `completed` → met à jour avec `status='pending'`, `completed_at=null`
4. Toast : « Passage marqué comme lu » ou « Passage marqué comme non lu »
5. **Appel** `ActivityService.updateUserActivity(userId)` → met à jour `last_login_at`
6. Le composant parent déclenche `triggerProgressUpdate()` pour rafraîchir les stats
7. **Calcul automatique des badges** via `calculate_user_badges` (RPC)

### Vérification d'un jour complété
Un jour est "complété" quand **tous** ses passages sont à status='completed'.
La fonction `get_completed_days_count` utilise cette logique.

---

## 4.6 Like d'un Verset

### Flux
1. Sur le verset du jour (Dashboard ou page Versets), clic sur le bouton cœur (❤️)
2. **Vérification** : l'utilisateur est-il connecté ?
3. Si premier like :
   - `INSERT INTO verse_likes (user_id, verse_day_number)`
   - Le trigger `update_verse_likes_count` incrémente `daily_verses.likes_count` de +1
   - L'icône cœur devient pleine/rouge
4. Si déjà liké (unlike) :
   - `DELETE FROM verse_likes WHERE user_id = X AND verse_day_number = Y`
   - Le trigger décrémente `likes_count` de -1
   - L'icône cœur redevient vide
5. Le compteur de likes se met à jour en temps réel

---

## 4.7 Changement de Plan

### Flux
1. Page `/reading-plan` → section « Changer de plan »
2. Clic sur un plan différent → expansion avec détails
3. Clic « Choisir ce plan »
4. **AlertDialog** : « ⚠️ Attention : changer de plan supprimera toute votre progression actuelle et vos badges »
5. Confirmation → **Appel RPC** `change_user_plan(new_plan_id)` :
   - `DELETE FROM user_progress WHERE user_id = auth.uid()`
   - `DELETE FROM user_badges WHERE user_id = auth.uid()`
   - `UPDATE profiles SET selected_plan_id = X, start_date = today, current_day_number = 1`
6. Invalidation de tous les caches React Query
7. Toast : « Plan de lecture changé avec succès ! »

---

## 4.8 Réinitialisation du Plan

### Flux
1. Page `/reading-plan` → section « Zone dangereuse »
2. Clic « Réinitialiser le plan »
3. **AlertDialog** de confirmation
4. Confirmation :
   - Supprime toute la `user_progress`
   - Supprime tous les `user_badges`
   - Remet `current_day_number = 1` et `start_date = aujourd'hui`
5. Invalidation des caches
6. Toast : « Plan réinitialisé »

---

## 4.9 Modification de la Date de Début

### Flux
1. Page `/reading-plan` → expand du plan actuel → clic « Modifier »
2. **Popover Calendar** (date picker français)
3. Sélection d'une date → clic « Confirmer »
4. **Appel** `updateUserProfile(userId, { start_date: formattedDate })`
5. Invalidation des caches (le jour courant est recalculé)
6. Toast : « Date de début mise à jour ! »

### Calcul du jour courant
```
currentDayNumber = max(1, (aujourd'hui - start_date) + 1)
```
Limité à `duration_days` du plan sélectionné.

---

## 4.10 Recherche de Passages

### Flux
1. Page `/reading` (vue grille) → barre de recherche
2. Saisie d'un terme (ex: « Jean », « Psaumes »)
3. **Filtrage côté client** : parcourt `optimizedData` et filtre les jours dont au moins un passage contient le terme dans sa `reference`
4. Affichage du nombre de résultats
5. Si aucun résultat → message avec suggestion

---

## 4.11 Navigation entre Vues (Reading)

### Vue Focus (mobile uniquement)
- Carrousel horizontal de jours
- Swipe gauche/droite pour naviguer entre les jours
- Affichage détaillé d'un seul jour à la fois
- Pas de barre de recherche (simplification)

### Vue Grille (défaut desktop, option mobile)
- Organisation mensuelle (Mois 1, Mois 2...)
- Cards pour chaque jour en grille
- Barre de recherche + bouton « Aller au jour actuel »
- Scroll automatique au jour courant au chargement

### Toggle
- Persisté dans `localStorage` sous la clé `reading-view-mode`
- Composant `ViewModeToggle` avec deux icônes

---

## 4.12 Partage de l'Application

### Flux
1. Page Profil → « Partager l'app »
2. Si `navigator.share` supporté (mobile) :
   - Ouvre le dialogue natif de partage
   - Titre : « Bereé - Plan de lecture biblique »
   - Texte : « Découvrez cette super app de lecture biblique ! »
   - URL : origin de l'application
3. Si non supporté (desktop) :
   - Copie l'URL dans le presse-papiers
   - Toast : « Lien copié dans le presse-papiers »

---

## 4.13 Notifications Push

### Activation
1. Page Paramètres → toggle « Notifications push »
2. Si toggle ON → `subscribe()` :
   - Demande la permission du navigateur
   - Enregistre le player ID OneSignal
   - Sauvegarde dans `user_devices`
3. Si toggle OFF → `unsubscribe()`

### Types de notifications
- **Rappel de lecture** : Envoyé à l'heure configurée si l'utilisateur n'a pas lu aujourd'hui
- **Verset du jour** : Envoyé le matin avec le verset quotidien
- **Badge débloqué** : Notification lors du déblocage d'un badge

### Edge Functions
- `send-daily-reminders` : Cron job quotidien
- `send-daily-verse` : Cron job quotidien
- Utilisent l'API OneSignal REST

---

## 4.14 Calcul Automatique des Badges

### Déclencheur
Après chaque `toggleChapterStatus` (marquage de lecture), le système appelle `calculate_user_badges(user_id)` via RPC.

### Logique (fonction PostgreSQL)
Pour chaque badge non encore débloqué, vérifie si les critères sont remplis :

| Type | Calcul |
|------|--------|
| `chapters_read` | COUNT des passages completed |
| `days_completed` | Via `get_completed_days_count` |
| `streak_days` | Série max de jours consécutifs avec au moins 1 lecture |
| `fixed_time_streak` | Série max de jours consécutifs à la même heure |
| `time_of_day` | Nombre de jours avec lecture < 7h (morning) ou ≥ 21h (evening) |
| `resume_after_gap` | Reprise après un gap > N jours |
| `book_completed` | Tous les chapitres d'un livre biblique complétés |
| `milestone` | Identique à days_completed |

### Popup de Badge
Quand un nouveau badge est débloqué :
1. `BadgeNotificationContext` détecte le changement
2. `BadgeUnlockPopup` s'affiche avec animation `success-bounce` + `badge-glow`
3. Nom, description et icône du badge

---

## 4.15 Suppression de Compte

### Flux
1. Page `/profile/privacy` → « Supprimer mon compte »
2. **AlertDialog** avec saisie de confirmation
3. Confirmation → **Edge Function** `delete-user-account`
4. Supprime toutes les données : progress, badges, devices, consents, notifications, profil
5. Supprime le compte auth
6. Déconnexion automatique

---

## 4.16 Centre de Notifications

### Composant `NotificationCenter`
- Icône cloche dans le header du Dashboard
- Badge avec compteur de notifications non lues
- Clic → ouvre un panneau avec la liste des notifications
- Chaque notification :
  - Titre + corps + date
  - Marquage lu/non lu
  - Suppression individuelle

### Source des données
- Table `notification_logs` filtrée par `user_id = auth.uid()`
- Triées par `sent_at` DESC
- Les supprimées sont filtrées (`is_deleted = false`)

---

## 4.17 Thème (Clair/Sombre/Système)

### Implémentation
- `ThemeProvider` utilise `next-themes`
- 3 options : `light`, `dark`, `system`
- Persiste dans `localStorage`
- Les variables CSS changent via la classe `.dark` sur `<html>`
- Sélection via `Select` dans la page Paramètres
