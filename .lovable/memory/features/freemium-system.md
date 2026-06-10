---
name: Système Freemium
description: Architecture Gratuit/Premium — gating UI, RLS, expiration, attribution admin uniquement
type: feature
---

# Système Freemium Bérée 365

## Règle centrale
Flag unique côté DB : `public.is_premium_active(user_id)` retourne `true` si `profiles.is_premium = true` ET (`premium_end_date IS NULL` OU `premium_end_date > now()`).

Côté frontend : hook `usePremium()` (lit `profile.is_premium` + `premium_end_date` via `useAuth`) — source de vérité unique pour le gating UI.

## Attribution Premium
- **Jamais automatique** : nouveaux comptes = Gratuit (`is_premium = false`).
- Activé uniquement par admin via `admin_grant_premium(user_id, months=12, source='manuel_beree')`.
- Retiré via `admin_revoke_premium(user_id)` → remet automatiquement sur le plan canonique.
- Admins existants ont été grandfathered Premium 12 mois (`source='grandfather'`).
- Trigger `prevent_premium_self_edit` empêche les utilisateurs de modifier leurs propres champs Premium.

## Restrictions Gratuit
- **Notifications push** : RLS bloque INSERT/UPDATE sur `notification_preferences` et `user_devices`. Edge functions filtrent aussi sur `is_premium = true` (défense en profondeur). UI masque NotificationCenter, NotificationBell, switch dans ProfileSettings.
- **Badges** : `calculate_user_badges` retourne immédiatement si non-Premium. ProfileBadges affiche un teaser CTA.
- **Plans de lecture** : `change_user_plan` rejette tout plan ≠ canonique pour les Gratuits. ReadingPlanManagement masque les autres plans.
- **Forçage plan canonique** : `useEnforceCanonicalPlan` (appelé dans AppLayout) bascule silencieusement les Gratuits non-canoniques. ID canonique 12 mois : `fa63f02b-7e58-4418-a0eb-58282fd8799d`.

## Expiration
Cron quotidien `expire-premium-subscriptions-daily` (03:15 UTC) exécute `expire_premium_subscriptions()` : passe `is_premium = false`, NULL les dates/source, remet sur plan canonique. Rétrogradation silencieuse (pas de notification).

## Évolutivité
- `premium_source` est un text libre : futurs `code`, `stripe`, `paddle` sans migration.
- `admin_grant_premium(months)` paramétrable → abonnements 1/3/12 mois.
- Pages dédiées : `/premium` (présentation + contact admin) et `/profile/subscription` (détails abonnement).
