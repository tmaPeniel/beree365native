
# Système Freemium Bérée 365

## 1. Base de données (migration Supabase)

**Ajouts à `public.profiles`** :
- `is_premium boolean NOT NULL DEFAULT false`
- `premium_start_date timestamptz`
- `premium_end_date timestamptz`
- `premium_source text` — valeurs futures : `manuel_beree`, `code`, `payment`, `grandfather`

**Constante plan canonique** : on identifie le "Plan Classique" (canonique 12 mois) déjà présent dans `reading_plans` comme plan imposé aux Gratuits.

**Fonction SQL** `public.is_premium_active(_user_id uuid)` (SECURITY DEFINER, STABLE) :
- Retourne `true` si `is_premium = true` ET `premium_end_date > now()` (ou NULL = pas d'expiration).
- Utilisée par les RLS et le frontend (RPC).

**Job pg_cron quotidien** `expire_premium_subscriptions` :
- Pour les profils où `premium_end_date <= now()` ET `is_premium = true` : passe `is_premium = false`, force `selected_plan_id` au plan canonique, réinitialise `start_date = CURRENT_DATE`, `current_day_number = 1`. Silencieux, pas de notification.

**RPC admin sécurisées** (SECURITY DEFINER, vérifient `has_role(auth.uid(), 'admin')`) :
- `admin_grant_premium(target_user_id uuid, months int default 12, source text default 'manuel_beree')` → set is_premium=true, start=now(), end=now()+months.
- `admin_revoke_premium(target_user_id uuid)` → is_premium=false, dates NULL, force plan canonique.

**RLS / restrictions Premium** :
- `notification_preferences` : policy INSERT/UPDATE conditionnée à `is_premium_active(auth.uid())`. SELECT reste autorisé (pour lire ses prefs).
- `user_devices` : INSERT/UPDATE conditionnée à `is_premium_active(auth.uid())`.
- `user_badges` : INSERT (via fonction calculate) déjà SECURITY DEFINER ; on bride en début de `calculate_user_badges` : `IF NOT is_premium_active(_user_id) THEN RETURN; END IF;`.
- `change_user_plan` : ajouter check « si non-Premium, seul le plan canonique est autorisé ».
- `profiles` UPDATE policy existante : empêcher l'utilisateur de modifier lui-même `is_premium`, `premium_*` (policy WITH CHECK qui interdit le changement de ces colonnes ; seules les RPC admin peuvent les modifier).

**Migration utilisateurs existants** : tous les comptes restent `is_premium = false` par défaut. Un script d'insert ponctuel passe `is_premium = true` (source `grandfather`, end +12 mois) **uniquement** pour les user_id ayant le rôle `admin`.

## 2. Backend – Edge functions

- `send-daily-reminders`, `send-daily-verse` et `send-push-notification` : filtrer les destinataires sur `is_premium_active`. Les Gratuits sont exclus côté serveur (défense en profondeur, même si abonnements bloqués par RLS).
- `calculate_user_badges` côté SQL bloque déjà les Gratuits (cf. plus haut).

## 3. Frontend – Hook central

Nouveau hook `usePremium()` :
- Lit `profile.is_premium` + `premium_end_date` via le contexte `useAuth`.
- Expose `{ isPremium, premiumStartDate, premiumEndDate, premiumSource, daysRemaining }`.
- Mémorisé, utilisé partout pour gating UI.

## 4. Frontend – Gating UI

| Zone | Comportement Gratuit |
|---|---|
| `NotificationBell`, `NotificationCenter` | masqués |
| `ProfileSettings` carte Notifications + `PushDiagnosticsPanel` | remplacés par carte « Premium requis » avec lien vers `/premium` |
| `ProfileBadges` + `BadgesSection` | remplacés par teaser Premium |
| `BadgeUnlockPopup` / `useBadgeCalculation` | no-op si non Premium |
| `ReadingPlanManagement` (choix de plan) | un seul plan affiché (canonique), bouton « Changer de plan » remplacé par CTA Premium |
| `Profile` actions | nouvelle entrée « Mon abonnement » |
| Dashboard | bandeau discret « Découvrir Premium » (Gratuit uniquement) |

**Forçage immédiat plan canonique** : dans `useAuth.initAuth`, après chargement du profil, si `!isPremium` et `selected_plan_id !== CANONICAL_PLAN_ID`, appeler `change_user_plan(CANONICAL_PLAN_ID)` (silencieux). Le hook serveur préservera la cohérence.

## 5. Nouvelles pages

**`/premium`** — Présentation des avantages :
- Liste fonctionnalités (notifications, badges, plans multiples).
- Message : « Vous possédez le manuel Bérée ? Contactez un administrateur afin d'activer votre accès Premium pendant 12 mois. »
- Lien mailto/contact admin.

**`/profile/subscription`** — Mon abonnement :
- Statut (Gratuit / Premium actif / Premium expiré).
- Dates début / expiration, jours restants.
- Origine (`premium_source` traduit en français).
- Si Gratuit : CTA vers `/premium`.

## 6. Administration

Intégrée à `/admin` existant.

**`UserStatsTable`** — colonnes ajoutées :
- Statut (badge Premium/Gratuit).
- Début Premium, Fin Premium.

**Fiche utilisateur (modal/drawer)** : nouveau panneau « Abonnement » avec deux boutons :
- « Activer Premium 12 mois » → `admin_grant_premium(user_id, 12, 'manuel_beree')` + confirmation.
- « Retirer Premium » → `admin_revoke_premium(user_id)` + confirmation destructive.

**Service** `src/services/admin/premium.ts` : wrappers RPC + mise à jour optimiste de la liste.

**Type** `UserStats` étendu (`is_premium`, `premium_start_date`, `premium_end_date`, `premium_source`) + `get_user_stats` SQL mis à jour pour les retourner.

## 7. Évolutivité

- `premium_source` est libre → futurs `code`, `stripe`, `paddle` s'ajoutent sans migration.
- `admin_grant_premium(months)` paramétrable → support futur d'abonnements 1/3/12 mois.
- Le flag central `is_premium_active()` est le seul point de vérité ; ajouter une feature Premium = appeler ce flag.
- Préparer une table future `premium_transactions` (hors scope ici) sans bloquer l'architecture actuelle.

## 8. Mémoire projet

Nouvelle mémoire `mem://features/freemium-system` décrivant : flag central `is_premium_active`, gating UI via `usePremium`, forçage plan canonique pour Gratuits, attribution admin uniquement, expiration silencieuse via cron.

## Détails techniques

```text
profiles
 ├─ is_premium (bool)
 ├─ premium_start_date (timestamptz)
 ├─ premium_end_date (timestamptz)
 └─ premium_source (text)

Flux activation admin :
  Admin UI ──► RPC admin_grant_premium ──► UPDATE profiles
                                          └► (utilisateur prochain refresh : isPremium=true)

Flux expiration :
  pg_cron quotidien ──► UPDATE profiles (is_premium=false, plan=canonique)
                       └► utilisateur silencieusement rétrogradé

Flux Gratuit tentant notifications :
  Frontend gating (masque toggle) + RLS (bloque insert notification_preferences/devices)
  + Edge function (exclut non-Premium des envois)
```

## Hors scope (à venir)

- Paiement Stripe/Paddle.
- Activation par code promo.
- Email automatique à l'expiration.
