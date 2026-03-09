# 03 - Modèle de Données (Supabase PostgreSQL)

## Vue d'ensemble

```
profiles ──────────── reading_plans
    │                      │
    │                reading_plan_chapters
    │                      │
    └── user_progress ─────┘
    │
    ├── user_badges ────── badges
    ├── user_roles
    ├── user_consents
    ├── user_devices
    ├── notification_preferences
    ├── notification_logs
    └── verse_likes ────── daily_verses
```

---

## Tables

### 1. `profiles`

Profil utilisateur principal, lié à `auth.users` via `id`.

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | — | PK, même ID que auth.users |
| `full_name` | text | Oui | null | Nom complet |
| `start_date` | date | Oui | CURRENT_DATE | Date de début du plan |
| `current_day_number` | integer | Non | 1 | Jour courant calculé |
| `created_at` | timestamptz | Oui | now() | Date de création |
| `last_login_at` | timestamptz | Oui | null | Dernière connexion |
| `is_active` | boolean | Oui | false | Statut actif |
| `selected_plan_id` | uuid | Non | — | FK → reading_plans.id |
| `onesignal_player_id` | text | Oui | null | ID OneSignal |
| `device_platform` | varchar | Oui | null | Plateforme (ios/android/web) |
| `device_token` | text | Oui | null | Token push |

**RLS** :
- SELECT : `auth.uid() = id`
- UPDATE : `auth.uid() = id`
- INSERT : `auth.uid() = id`
- ALL (service_role) : `current_setting('role') = 'service_role'`

---

### 2. `reading_plans`

Définition des plans de lecture disponibles.

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `name` | text | Non | — | Nom du plan (ex: "Plan Canonique 12 mois") |
| `description` | text | Oui | null | Description du plan |
| `duration_days` | integer | Non | 365 | Durée en jours |
| `is_active` | boolean | Non | true | Plan actif ou non |
| `image_url` | text | Oui | null | URL image du plan |
| `created_at` | timestamptz | Non | now() | Date de création |

**RLS** :
- SELECT : `is_active = true` (tout le monde peut voir les plans actifs)
- ALL : `is_admin()` (seuls les admins peuvent modifier)

---

### 3. `reading_plan_chapters`

Passages bibliques associés à chaque jour de chaque plan.

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `plan_id` | uuid | Non | — | FK → reading_plans.id |
| `day_number` | integer | Non | — | Numéro du jour (1 à 365) |
| `reference` | text | Non | — | Référence biblique (ex: "Genèse 1-2") |
| `description` | text | Oui | null | Description optionnelle |
| `sort_order` | integer | Oui | 0 | Ordre d'affichage dans le jour |

**RLS** :
- SELECT : `true` (accessible à tous les authentifiés)
- INSERT/UPDATE/DELETE : Non autorisé (admin via SQL direct)

**Note** : Un jour peut avoir plusieurs passages (ex: Jour 1 = Genèse 1-2 + Psaume 1).

---

### 4. `user_progress`

Suivi de la progression de lecture de chaque utilisateur.

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `user_id` | uuid | Oui | null | FK → profiles.id |
| `chapter_id` | uuid | Oui | null | FK → reading_plan_chapters.id |
| `status` | enum (chapter_status) | Oui | 'pending' | 'pending' ou 'completed' |
| `completed_at` | timestamptz | Oui | null | Date/heure de complétion |

**RLS** :
- SELECT/UPDATE/INSERT/DELETE : `auth.uid() = user_id`

**Logique** :
- Une entrée est créée quand l'utilisateur coche un passage (status='completed')
- Si décoché, status repasse à 'pending' et completed_at = null
- Un jour est "complété" quand TOUS ses passages sont à 'completed'

---

### 5. `daily_verses`

Versets du jour, un par jour du plan.

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `day_number` | integer | Non | — | Numéro du jour (1 à 365) |
| `reference` | text | Non | — | Référence (ex: "Proverbes 3:5-6") |
| `text` | text | Non | — | Texte complet du verset |
| `wisdomType` | text | Oui | 'NULL' | Thématique/sagesse associée |
| `likes_count` | integer | Non | 0 | Compteur de likes (dénormalisé) |

**RLS** :
- SELECT : `true` (lecture publique)

---

### 6. `verse_likes`

Likes des utilisateurs sur les versets.

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `user_id` | uuid | Non | — | ID utilisateur |
| `verse_day_number` | integer | Non | — | Jour du verset liké |
| `created_at` | timestamptz | Oui | now() | Date du like |

**RLS** :
- SELECT : `true` (comptage visible par tous)
- INSERT : `auth.uid() = user_id`
- DELETE : `auth.uid() = user_id`

**Trigger** : `update_verse_likes_count` met à jour `daily_verses.likes_count` automatiquement (+1 sur INSERT, -1 sur DELETE).

---

### 7. `badges`

Définition de tous les badges disponibles.

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `name` | text | Non | — | Nom du badge |
| `description` | text | Non | — | Description |
| `icon` | text | Non | — | Nom de l'icône (Lucide) |
| `color` | text | Non | '#3B82F6' | Couleur hex |
| `criteria` | jsonb | Non | — | Critères de déblocage (voir ci-dessous) |
| `created_at` | timestamptz | Non | now() | Date de création |

**Format `criteria`** (JSONB) :
```json
// Exemples
{ "type": "chapters_read", "count": 50 }
{ "type": "days_completed", "count": 30 }
{ "type": "streak_days", "count": 7 }
{ "type": "fixed_time_streak", "count": 5 }
{ "type": "time_of_day", "period": "morning", "count": 10 }
{ "type": "resume_after_gap", "gap_days": 3 }
{ "type": "book_completed", "book": "Genèse" }
{ "type": "milestone", "count": 100 }
{ "type": "encouragements_used", "count": 5 }
```

---

### 8. `user_badges`

Badges débloqués par chaque utilisateur.

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `user_id` | uuid | Non | — | ID utilisateur |
| `badge_id` | uuid | Non | — | FK → badges.id |
| `unlocked_at` | timestamptz | Non | now() | Date de déblocage |
| `created_at` | timestamptz | Non | now() | Date de création |

**Contrainte** : UNIQUE(user_id, badge_id)

---

### 9. `user_roles`

Rôles utilisateur (séparés du profil pour sécurité).

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `user_id` | uuid | Non | — | ID utilisateur |
| `role` | enum (app_role) | Non | 'user' | 'admin' ou 'user' |
| `created_at` | timestamptz | Oui | now() | Date de création |

**Contrainte** : UNIQUE(user_id, role)

**RLS** :
- SELECT : Admin voit tout, utilisateur voit ses propres rôles
- INSERT/UPDATE/DELETE : Admin uniquement

---

### 10. `notification_preferences`

Préférences de notification par utilisateur.

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `user_id` | uuid | Non | — | FK → profiles.id (UNIQUE) |
| `reading_reminder_enabled` | boolean | Non | true | Rappel de lecture activé |
| `reading_reminder_time` | time | Non | '20:00:00' | Heure du rappel |
| `daily_verse_enabled` | boolean | Non | true | Verset quotidien activé |
| `daily_verse_time` | time | Non | '07:00:00' | Heure d'envoi |
| `badge_encouragement_enabled` | boolean | Non | true | Encouragements badges |
| `created_at` | timestamptz | Non | now() | — |
| `updated_at` | timestamptz | Non | now() | — |

---

### 11. `notification_logs`

Historique des notifications envoyées.

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `user_id` | uuid | Non | — | FK → profiles.id |
| `notification_type` | text | Non | — | Type (daily_verse, reminder, badge) |
| `title` | text | Non | — | Titre de la notification |
| `body` | text | Non | — | Corps du message |
| `success` | boolean | Non | true | Envoi réussi ou non |
| `error_message` | text | Oui | null | Message d'erreur |
| `is_read` | boolean | Oui | false | Lu ou non |
| `is_deleted` | boolean | Oui | false | Supprimé (soft delete) |
| `read_at` | timestamptz | Oui | null | Date de lecture |
| `sent_at` | timestamptz | Non | now() | Date d'envoi |
| `onesignal_notification_id` | text | Oui | null | ID OneSignal |
| `onesignal_player_id` | text | Oui | null | Player ID |

---

### 12. `user_devices`

Appareils enregistrés pour les notifications push.

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `user_id` | uuid | Non | — | ID utilisateur |
| `onesignal_player_id` | text | Non | — | ID joueur OneSignal |
| `device_platform` | text | Oui | null | ios/android/web |
| `device_token` | text | Oui | null | Token FCM |
| `is_active` | boolean | Oui | true | Appareil actif |
| `created_at` | timestamptz | Oui | now() | — |
| `last_seen_at` | timestamptz | Oui | now() | — |

---

### 13. `user_consents`

Consentements RGPD (CGU, cookies).

| Colonne | Type | Nullable | Défaut | Description |
|---------|------|----------|--------|-------------|
| `id` | uuid | Non | gen_random_uuid() | PK |
| `user_id` | uuid | Oui | null | ID utilisateur |
| `consent_type` | text | Non | — | 'terms', 'cookies', etc. |
| `consent_version` | text | Non | — | Version (ex: '1.0') |
| `consent_given` | boolean | Non | false | Consentement donné |
| `user_agent` | text | Oui | null | User-agent du navigateur |
| `consented_at` | timestamptz | Oui | now() | Date du consentement |
| `revoked_at` | timestamptz | Oui | null | Date de révocation |

---

## Enums

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.chapter_status AS ENUM ('pending', 'completed');
```

---

## Fonctions RPC Principales

| Fonction | Description |
|----------|-------------|
| `has_role(_user_id, _role)` | Vérifie si un utilisateur a un rôle (SECURITY DEFINER) |
| `is_admin()` | Vérifie si l'utilisateur courant est admin |
| `calculate_user_badges(_user_id)` | Calcule et débloque les badges automatiquement |
| `get_completed_days_count(p_user_id)` | Nombre de jours entièrement complétés |
| `get_user_stats()` | Stats admin (tous les utilisateurs) |
| `change_user_plan(new_plan_id)` | Change le plan + supprime progression + badges |
| `sync_current_day_numbers()` | Met à jour current_day_number pour tous les profils |
| `update_user_activity(p_user_id)` | Met à jour last_login_at et is_active |
| `is_user_active(p_user_id, days_threshold)` | Vérifie activité récente (défaut 7 jours) |
| `cleanup_old_notification_logs()` | Supprime les logs > 1 mois |

---

## Triggers

| Trigger | Table | Événement | Action |
|---------|-------|-----------|--------|
| `handle_new_user` | auth.users | AFTER INSERT | Crée le profil dans `profiles` |
| `assign_default_user_role` | profiles | AFTER INSERT | Assigne le rôle 'user' |
| `create_default_notification_preferences` | profiles | AFTER INSERT | Crée les préférences par défaut |
| `update_verse_likes_count` | verse_likes | AFTER INSERT/DELETE | Met à jour `daily_verses.likes_count` |
| `update_last_login` | (session) | Connexion | Met à jour `last_login_at` |

---

## Edge Functions (Supabase)

| Fonction | Description |
|----------|-------------|
| `delete-user-account` | Supprime le compte et toutes les données associées |
| `send-daily-reminders` | Envoie les rappels de lecture quotidiens via OneSignal |
| `send-daily-verse` | Envoie le verset du jour via notification push |
| `send-push-notification` | Envoi générique de notification push |
| `sync-onesignal-subscriptions` | Synchronise les abonnements OneSignal |
| `init-sample-data` | Initialise des données de démonstration |

---

## Storage

| Bucket | Public | Contenu |
|--------|--------|---------|
| `plan-images` | Oui | Images des plans de lecture |
