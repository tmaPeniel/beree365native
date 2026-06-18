## Objectif

Supprimer l'étape "choisir un plan" lors de l'inscription. À la place, ajouter un champ optionnel "Code secret" dans le formulaire d'inscription : s'il est valide, l'utilisateur reçoit automatiquement l'accès **premium 12 mois**. Sinon, il est créé en gratuit (plan canonique par défaut). Les codes sont gérés en base.

## 1. Base de données

Nouvelle table `public.premium_signup_codes` :
- `code` (texte, unique, normalisé en majuscule)
- `duration_months` (entier, défaut 12)
- `max_uses` (entier nullable, NULL = illimité)
- `used_count` (entier, défaut 0)
- `expires_at` (date d'expiration du code lui-même, nullable)
- `is_active` (booléen, défaut true)
- `notes` (texte libre pour l'admin)

Table `redemptions` pour tracer qui a utilisé quel code : `premium_code_redemptions(user_id, code_id, redeemed_at)`.

RLS : aucune lecture publique. Toute la logique passe par une fonction SECURITY DEFINER `redeem_premium_signup_code(_code text)` qui :
- vérifie code actif, non expiré, capacité restante
- accorde 12 mois de premium à `auth.uid()` (réutilise la logique d'`admin_grant_premium` mais sans le check admin)
- incrémente `used_count`, insère une ligne dans `redemptions`
- renvoie `{ success, error }`

Les admins peuvent gérer la table via le dashboard Supabase (CRUD direct par `service_role`). Pas d'UI admin dans cette itération — à demander séparément si besoin.

## 2. Frontend — Inscription

**`SignupStep1.tsx`** :
- Ajouter un champ optionnel `premiumCode` (texte, max 50 car., trim, majuscule).
- À la soumission : appeler directement `signUp(...)` (plus de stockage `localStorage`, plus de navigation vers `/signup/plan`).
- Après création réussie du compte, si `premiumCode` est non vide : appeler `supabase.rpc('redeem_premium_signup_code', { _code })`. En cas d'échec, toast non bloquant ("Code invalide, compte créé en version gratuite") et continuer.
- Rediriger vers `/dashboard`.
- Renommer le sous-titre : retirer "Étape 1 sur 2".

**`SignupStep2.tsx`** et route `/signup/plan` : supprimés.

**`signUp` dans `authCore.ts`** : la signature `planId` devient inutile pour le flux d'inscription standard. Le trigger `handle_new_user` assigne déjà le plan par défaut (Plan Classique / canonique) quand aucun plan n'est fourni. On retire le paramètre `planId` (ou on le rend optionnel pour ne casser aucun appelant) et on n'envoie plus `plan_id` dans les métadonnées.

## 3. Validation & sécurité

- Schéma Zod du code : `z.string().trim().toUpperCase().max(50).optional()`.
- La RPC `redeem_premium_signup_code` est la seule voie d'attribution du premium côté client ; elle vérifie tout côté serveur.
- La table `premium_signup_codes` n'est pas lisible par `anon`/`authenticated` (pas de GRANT SELECT), pour éviter qu'un utilisateur puisse énumérer les codes.

## Récapitulatif des fichiers

- `supabase/migrations/...` (nouveau) — tables + RPC `redeem_premium_signup_code`
- `src/pages/SignupStep1.tsx` — champ code + appel direct à `signUp` + RPC
- `src/pages/SignupStep2.tsx` — supprimé
- `src/App.tsx` — retirer la route `/signup/plan` et l'import
- `src/services/auth/authCore.ts` — `signUp` sans `planId`
- mémoire projet : noter la nouvelle règle (inscription + code premium)

## Hors scope (à confirmer si tu veux les ajouter)

- UI d'administration des codes dans `/admin` (création, désactivation, stats d'utilisation).
- Internationalisation / messages d'erreur détaillés sur le code.
