# Bérée Native V2 Lot 1 Étape 1 — Audit des contrats Supabase et plan de correction

**Date :** 21 octobre 2026
**Périmètre :** contrats Supabase utilisés par Bérée Native pour l’authentification, les profils, Premium, les plans, la progression, les versets, les notifications et la suppression de compte.
**Intervention :** analyse et planification uniquement. Aucun fichier applicatif, migration SQL, Edge Function, schéma distant, donnée ou dépendance n’a été modifié.

## 1. Synthèse

### 1.1 Conclusion

Le client Native repose sur un ensemble Supabase déjà riche, mais les contrats ne forment pas encore une frontière backend suffisamment stable pour commencer les fonctionnalités du Lot 1. L’audit a reconstitué **34 contrats** allant de l’écran ou du hook jusqu’à la table, la RPC ou l’Edge Function.

Les contrats les mieux établis sont la session Supabase, la lecture du profil, le catalogue de plans actifs, la lecture des chapitres, le verset quotidien et les opérations administratives Premium protégées par un contrôle de rôle. Les risques principaux sont ailleurs : droits Premium contournables par des écritures directes sur `profiles`, fonctions `SECURITY DEFINER` acceptant un utilisateur cible sans contrôle de l’appelant, progression journalière non atomique, relations de versets incomplètes, contrats de notifications incompatibles et suppression de compte appelée avec un payload incorrect.

L’historique de migrations n’est pas un bootstrap complet : les créations initiales de `profiles`, `user_progress`, `reading_plan_chapters`, `daily_verses` et `audio_readings`, ainsi que plusieurs politiques RLS associées, ne figurent pas dans le dépôt. Le fichier de types générés constitue un instantané utile mais ne prouve pas l’état actuellement déployé.

### 1.2 État de la comparaison distante

Une tentative de lecture de la description OpenAPI PostgREST a été effectuée avec la configuration publique déjà présente, sans afficher ses valeurs. Le serveur a répondu **401**. Aucun accès de service, mot de passe de base ou jeton utilisateur n’a été utilisé. Par conséquent :

- aucune migration locale n’est considérée comme effectivement déployée sans preuve supplémentaire ;
- les vulnérabilités décrites comme « confirmées » le sont dans le code ou le SQL du dépôt ; leur exploitabilité sur la production reste à vérifier ;
- la comparaison production/local doit être la précondition opérationnelle du premier correctif.

### 1.3 Résultats chiffrés

- **34 contrats Supabase examinés** ;
- **26 incohérences ou risques documentés**, dont 18 entièrement confirmés dans le dépôt et 8 dont l’exposition ou la contrainte finale dépend du schéma ou du déploiement réels ;
- **3 définitions critiques de sécurité dans le dépôt** : utilitaires de bascule RLS, contournement du choix de plan/Premium et fonction d’initialisation de données utilisant le service role sans autorisation métier ;
- **8 groupes de migrations correctives potentielles** et **4 ajustements d’Edge Functions** à préparer après validation distante ;
- aucune modification SQL exécutable n’est fournie dans ce document.

### 1.4 Principes de correction

1. Fermer d’abord les chemins d’écriture ou d’exécution privilégiés.
2. Préserver les contrats Web existants par des changements additifs et des phases de transition.
3. Dériver l’identité de `auth.uid()` dans les opérations utilisateur ; ne jamais faire confiance à un `user_id` fourni par le client.
4. Rendre Premium, le changement de plan et la complétion d’une journée canoniques côté serveur.
5. Comparer le schéma distant avant de rédiger ou d’exécuter toute migration.

## 2. Cartographie des dépendances

Les états employés sont : **cohérent**, **partiel**, **incompatible**, **non raccordé** et **à vérifier**.

| # | Fonctionnalité | Écran / Hook | Service | Objet Supabase | État |
|---:|---|---|---|---|---|
| 1 | Restauration et écoute de session | `AuthProvider` | client Supabase | `auth.getSession`, `auth.onAuthStateChange` | Cohérent |
| 2 | Inscription et création du profil | `SignupScreen` | `authCore.signUp` | Auth metadata → trigger `handle_new_user` → `profiles` | Partiel : plan non validé, code Premium et consentement ignorés |
| 3 | Lecture du profil | `AuthProvider` | `profileService` | `profiles SELECT` | Cohérent si la RLS historique est déployée |
| 4 | Mise à jour du profil | `EditProfileScreen` | `profileService` | `profiles UPDATE` | Partiel : écriture directe et colonnes sensibles insuffisamment cloisonnées |
| 5 | Réinitialisation du mot de passe | écrans forgot/reset | `authCore` | `auth.resetPasswordForEmail`, `auth.updateUser` | Partiel : contrat auth valide, deep link à vérifier |
| 6 | Lecture du statut Premium | écrans abonnement/plan | `usePremium` | colonnes Premium de `profiles` | Partiel : calcul client, pas d’entitlement d’essai |
| 7 | Attribution Premium admin | écran admin | `admin/premium.grantPremium` | RPC `admin_grant_premium` | Cohérent dans le SQL local, déploiement à vérifier |
| 8 | Révocation Premium admin | écran admin | `admin/premium.revokePremium` | RPC `admin_revoke_premium` | Partiel : plan changé sans stratégie de progression |
| 9 | Expiration Premium | aucun écran | cron SQL | RPC `expire_premium_subscriptions` → `profiles` | À vérifier : présence de `pg_cron`, job et cohérence des données |
| 10 | Catalogue complet des plans | `ReadingPlanSelectionScreen` | `planService` | RPC `get_reading_plan_catalog`, fallback `reading_plans` | Partiel : RPC absente des types générés, fallback masque l’écart |
| 11 | Plan sélectionné | dashboard/lecture/profil | `planService`, `planRetrieval` | `profiles` → relation `reading_plans` | Cohérent si FK/RLS réelles conformes |
| 12 | Changement de plan | `ReadingPlanSelectionScreen` | `planService.changePlan` | RPC `change_user_plan` | Partiel : RPC sûre en elle-même, mais contournable par UPDATE direct |
| 13 | Date de début et jour courant | `EditProfileScreen`, `useDateService` | `profileService`, `dayService` | `profiles.start_date`, `current_day_number` | Incompatible : deux sources modifiables indépendamment |
| 14 | Chapitres d’un jour | dashboard/lecture | `planRetrieval` | `reading_plan_chapters SELECT` | Cohérent fonctionnellement, RLS distante à vérifier |
| 15 | Plan complet avec progression | `ReadingPlanScreen` | `progressService` | `reading_plan_chapters`, `user_progress` | Partiel : charge complète et erreurs converties en tableau vide |
| 16 | Valider/dévalider un passage | dashboard/lecture | `progressService.toggleChapterStatus` | `user_progress SELECT/UPDATE/INSERT` | Partiel : séquence non atomique et identité fournie par le client |
| 17 | Compléter une journée | `ReadingPlanScreen.completeDay` | appels multiples à `toggleChapterStatus` | N écritures `user_progress`, puis activité et badges | Incompatible : succès partiel possible |
| 18 | Compter les jours complets | statistiques/badges | `progressCalculation` | RPC `get_completed_days_count(p_user_id)` | Incompatible sécurité : identifiant arbitraire et droit `anon` historique |
| 19 | Calculer les badges | toggle de lecture | `badgeService.calculateUserBadges` | RPC `calculate_user_badges(_user_id)` | Incompatible sécurité : cible arbitraire et logique privilégiée |
| 20 | Lire badges et progression | écran badges | `badgeService` | `badges`, `user_badges`, progression | Partiel : calcul SQL et calcul client concurrents |
| 21 | Verset du jour | dashboard | `verseService.getDailyVerse` | `daily_verses` | Cohérent avec fallback local, RLS distante à vérifier |
| 22 | Historique des versets | route versets future | `verseService.getAllVersesUpToDay` | `daily_verses` + relation agrégée `verse_likes(count)` | Incompatible : aucune FK PostgREST déclarée dans les migrations/types |
| 23 | Like d’un verset | dashboard | `useVerseLikes` | `verse_likes`, trigger `update_verse_likes_count` | Partiel : RLS correcte localement, erreurs de mutation non inspectées |
| 24 | Audio quotidien | écran lecture | `audioService`, `useDailyAudio` | `audio_readings` | À vérifier : table présente dans les types, création/RLS absentes des migrations |
| 25 | Préférences de notifications | écran notifications | hook non utilisé + AsyncStorage | `notification_preferences` | Incompatible : UI locale, schéma Supabase différent selon migrations |
| 26 | Enregistrement push | `usePushNotifications.subscribe` | Edge invoke | `register-push-subscription` → `push_subscriptions` | Incompatible : token Expo envoyé à un contrat Web Push |
| 27 | Désenregistrement push | `usePushNotifications.unsubscribe` | aucun appel backend | `unregister-push-subscription` | Non raccordé |
| 28 | Notification de test | écran notifications | `usePushNotifications.sendTest` | `send-test-push` → Web Push | Incompatible : payload Expo ignoré, envoi Web uniquement |
| 29 | Envoi du verset quotidien | cron externe | Edge Function | `notification_preferences`, `notifications_sent`, `push_subscriptions` | Partiel : Web fonctionnel en code, endpoint sans authentification applicative |
| 30 | Rappel de lecture | cron externe | Edge Function | mêmes tables notifications | Partiel : Web uniquement et endpoint sans authentification applicative |
| 31 | Notification de badge | hook badge éventuel | `send-badge-notification` | préférences, déduplication, Web Push | Partiel : le client fournit le badge sans preuve de déblocage côté serveur |
| 32 | Appareils et centre de notifications | dashboard/profil | requêtes directes castées en `any` | `user_devices`, `notification_logs` | Incompatible : tables supprimées et non recréées dans les dernières migrations |
| 33 | Consentements | `SignupScreen`, `PrivacyScreen` | aucun service raccordé | `user_consents` | Non raccordé malgré une table et des RLS locales |
| 34 | Suppression de compte | `PrivacyScreen` | Edge invoke | `delete-user-account` → Auth Admin | Incompatible : le client omet le `userId` exigé par la fonction |

## 3. Incohérences identifiées

### SUP-001 — Le schéma distant n’est pas auditable avec l’accès disponible

- **Fichiers et lignes :** `src/integrations/supabase/client.ts:5-19`, `src/integrations/supabase/types.ts:9-550`.
- **Comportement actuel :** l’instantané typé décrit un schéma PostgREST, mais la description distante publique répond 401.
- **Comportement attendu :** disposer d’un export de schéma, d’un accès lecture seule ou de types régénérés et datés depuis chaque environnement.
- **Gravité :** Haute, car elle bloque la confirmation du déploiement.
- **Impact Web / Native :** impossible de garantir qu’un correctif local correspond au backend partagé.
- **Certitude :** Confirmé pour l’accès actuel ; état distant inconnu.

### MIG-001 — Le dossier de migrations n’est pas un baseline complet

- **Fichiers et lignes :** `supabase/migrations/` ; les types déclarent notamment les tables à `src/integrations/supabase/types.ts:17-490`.
- **Comportement actuel :** les migrations altèrent ou utilisent `profiles`, `user_progress`, `reading_plan_chapters`, `daily_verses` et `audio_readings` sans contenir toutes leurs créations et RLS initiales.
- **Comportement attendu :** un baseline vérifiable suivi uniquement de migrations additives et ordonnées.
- **Gravité :** Haute.
- **Impact Web / Native :** reconstruction impossible, risques de politiques différentes entre environnements.
- **Certitude :** Confirmé dans le dépôt ; origine des objets à vérifier en production.

### SEC-001 — Fonctions permettant de désactiver et réactiver la RLS

- **Fichiers et lignes :** `supabase/migrations/20250521_fix_rls_functions.sql:5-49`.
- **Comportement actuel :** deux fonctions `SECURITY DEFINER` exécutent `ALTER TABLE profiles DISABLE/ENABLE ROW LEVEL SECURITY`. Le SQL accorde explicitement l’exécution au `service_role` mais ne révoque pas explicitement le privilège par défaut de `PUBLIC`, `anon` et `authenticated`.
- **Comportement attendu :** supprimer ces fonctions inutilisées ou garantir qu’elles sont exclusivement exécutables par un rôle backend non exposé.
- **Gravité :** Critique.
- **Impact Web / Native :** compromission globale de l’isolation des profils si une fonction est exposée/exécutable ; aucun usage applicatif n’a été trouvé.
- **Certitude :** Définition dangereuse confirmée ; privilèges effectifs et déploiement à vérifier immédiatement.

### SEC-002 — Choix de plan et gating Premium contournables

- **Fichiers et lignes :** `authCore.ts:11-20`, migration `20250905103257...sql:18-31`, `20250521_fix_rls_functions.sql:41-45`, migration Premium `20260610154616...sql:25-54`, `profileService.ts:15-25`.
- **Comportement actuel :** `handle_new_user` accepte `plan_id` depuis les métadonnées Auth sans vérifier que le plan est actif, canonique ou autorisé. Après création, la politique d’UPDATE du profil autorise l’utilisateur à modifier sa ligne ; le trigger Premium ne protège que les quatre colonnes Premium et pas `selected_plan_id`.
- **Comportement attendu :** le serveur choisit ou valide le plan initial et toute modification de `selected_plan_id` passe exclusivement par `change_user_plan`.
- **Gravité :** Critique.
- **Impact Web / Native :** tout client Supabase authentifié peut potentiellement contourner le verrou Premium et la remise à zéro associée. Le Web peut dépendre d’un UPDATE direct et devra être migré avant retrait.
- **Certitude :** Confirmé dans le SQL local ; politiques réellement déployées à vérifier.

### AUTH-001 — L’inscription peut échouer ou créer un profil incohérent

- **Fichiers et lignes :** `AuthExtraScreens.tsx:46-74`, `authCore.ts:3-28`, migration `20250905103257...sql:12-31`.
- **Comportement actuel :** Native sélectionne le premier plan actif trié par nom ; le trigger caste directement une chaîne de métadonnées en UUID et ne vérifie pas l’existence/activité avant insertion. Le code secret et le consentement affichés ne sont pas transmis.
- **Comportement attendu :** plan par défaut déterministe côté serveur, métadonnées invalides rejetées avec une erreur métier, consentement et code traités par des contrats séparés et sûrs.
- **Gravité :** Haute.
- **Impact Web / Native :** inscriptions fragiles et divergence de plan par défaut.
- **Certitude :** Confirmé.

### PREM-001 — Aucun entitlement d’essai de 30 jours ni activation utilisateur

- **Fichiers et lignes :** `usePremium.tsx:8-33`, `ProfileDetailScreens.tsx:399-408`, migration `20260610154616...sql:2-110`.
- **Comportement actuel :** le statut repose sur `is_premium` et une date de fin ; seules les RPC admin savent accorder Premium. Le code promo est un placeholder et aucun acheteur du manuel n’est reconnu.
- **Comportement attendu :** entitlement serveur explicite couvrant essai, code, achat manuel, administration et expiration.
- **Gravité :** Haute.
- **Impact Web / Native :** parité impossible et règles commerciales non applicables uniformément.
- **Certitude :** Confirmé.

### SEC-003 — RPC privilégiées fondées sur un identifiant fourni par le client

- **Fichiers et lignes :** `20251017092601...sql:2-39` (`get_completed_days_count`), `20250710100255...sql:80-93` (`update_user_activity`), `20260610154616...sql:142-275` (`calculate_user_badges`), `progressCalculation.ts:34-49`, `activityService.ts:13-42`, `badgeService.ts:74-89`.
- **Comportement actuel :** ces fonctions `SECURITY DEFINER` acceptent un utilisateur cible sans imposer l’identité de l’appelant. Un ancien GRANT rend en plus `get_completed_days_count(UUID)` exécutable par `anon` (`20250619125618...sql:25-27`) et aucune révocation ultérieure n’est versionnée.
- **Comportement attendu :** les fonctions utilisateur n’acceptent pas d’identifiant ou vérifient strictement `auth.uid()` ; les variantes administratives ont un nom et un contrôle de rôle distincts.
- **Gravité :** Haute.
- **Impact Web / Native :** divulgation d’indicateurs et déclenchement de modifications sur un autre compte ; changement de signature à migrer progressivement côté Web et Native.
- **Certitude :** Confirmé dans le dépôt ; privilèges distants à vérifier.

### PREM-002 — Expiration/révocation change de plan sans réconcilier la progression

- **Fichiers et lignes :** migration `20260610154616...sql:76-110`, `progressService.ts:247-279`.
- **Comportement actuel :** révocation et expiration remplacent `selected_plan_id` par le plan canonique, mais conservent `user_progress`, badges et `start_date`. Le calcul global compte tous les passages complétés de l’utilisateur, sans filtrage explicite par plan.
- **Comportement attendu :** politique métier définie : archivage, migration ou remise à zéro atomique avec le changement de plan.
- **Gravité :** Haute.
- **Impact Web / Native :** statistiques et badges incohérents après downgrade.
- **Certitude :** Confirmé ; stratégie métier en attente.

### READ-001 — Complétion de journée non atomique

- **Fichiers et lignes :** `ReadingPlanScreen.tsx:233-256`, `progressService.ts:146-193`.
- **Comportement actuel :** l’UI lance une mutation par passage avec `Promise.all`. Chaque mutation déclenche activité et badges. Une erreur peut survenir après plusieurs commits ; seul le cache client est restauré.
- **Comportement attendu :** une RPC transactionnelle idempotente valide tous les passages autorisés du jour puis calcule une seule fois les effets dérivés.
- **Gravité :** Haute.
- **Impact Web / Native :** divergence de progression et surcharge ; le Web pourrait réutiliser la RPC cible.
- **Certitude :** Confirmé.

### READ-002 — Toggle passage vulnérable aux courses et doublons potentiels

- **Fichiers et lignes :** `progressService.ts:159-188`, types `user_progress` à `src/integrations/supabase/types.ts:411-448`.
- **Comportement actuel :** SELECT préalable, puis UPDATE ou INSERT séparé. Deux appels concurrents peuvent suivre le chemin INSERT. La contrainte unique `(user_id, chapter_id)` et les politiques RLS ne sont pas définies dans les migrations disponibles.
- **Comportement attendu :** unicité en base et opération UPSERT/RPC atomique qui déduit l’utilisateur depuis la session.
- **Gravité :** Haute si la contrainte est absente, Moyenne sinon.
- **Impact Web / Native :** doublons, compteurs erronés ou erreurs intermittentes.
- **Certitude :** Course confirmée dans le client ; contrainte et RLS à vérifier.

### READ-003 — Calcul global non borné au plan courant

- **Fichiers et lignes :** `progressService.ts:247-279`, `badgeService.ts:152-167`.
- **Comportement actuel :** le total de chapitres est filtré par le plan, mais les passages complétés sont comptés uniquement par utilisateur. Les badges client utilisent eux aussi toute la progression.
- **Comportement attendu :** toutes les agrégations joignent les chapitres et filtrent le plan concerné, ou la progression porte explicitement un `plan_id` cohérent.
- **Gravité :** Haute.
- **Impact Web / Native :** pourcentages supérieurs ou incohérents après changement/downgrade.
- **Certitude :** Confirmé.

### READ-004 — Date de début et jour courant ne forment pas un contrat unique

- **Fichiers et lignes :** `ProfileDetailScreens.tsx:552-615`, `profileService.ts:15-25`, `dayService.ts:19-36`, `useDateService.tsx:18-84`.
- **Comportement actuel :** la date est éditée directement, le jour affiché est recalculé depuis cette date, tandis que la navigation écrit séparément `current_day_number`. La modification de date ne réinitialise ni progression ni badges.
- **Comportement attendu :** une règle métier unique et une RPC atomique pour décaler la date ou réinitialiser le parcours.
- **Gravité :** Moyenne à Haute.
- **Impact Web / Native :** jours et progression divergents entre clients.
- **Certitude :** Confirmé ; comportement métier cible à décider.

### BADGE-001 — Calculs de badges concurrents et RPC non bornée

- **Fichiers et lignes :** `badgeService.ts:121-392`, migration `20260610154616...sql:142-275`.
- **Comportement actuel :** le serveur attribue les badges, tandis que le client recalcule leur progression avec des conventions UTC et des critères parfois différents. La RPC serveur accepte une cible arbitraire.
- **Comportement attendu :** serveur canonique renvoyant progression et badges nouvellement débloqués pour `auth.uid()`.
- **Gravité :** Haute pour l’autorisation, Moyenne pour la divergence.
- **Impact Web / Native :** résultats différents selon client et fuseau.
- **Certitude :** Confirmé.

### VERSE-001 — Relation PostgREST manquante entre likes et versets

- **Fichiers et lignes :** migration `20251211130534...sql:2-8`, types `verse_likes` à `types.ts:471-490`, `verseService.ts:46-89`.
- **Comportement actuel :** `verse_likes` contient seulement un numéro de jour, sans FK vers `daily_verses`; les types générés indiquent `Relationships: []`. Le service demande pourtant `daily_verses.select('*, verse_likes(count)')`.
- **Comportement attendu :** relation FK stable, idéalement par `verse_id`, permettant l’agrégation PostgREST et l’intégrité référentielle.
- **Gravité :** Haute pour la bibliothèque de versets.
- **Impact Web / Native :** la requête embarquée peut échouer ; le fallback masque l’erreur avec des contenus par défaut.
- **Certitude :** Confirmé dans migrations/types ; schéma distant à vérifier.

### VERSE-002 — Mutations de like sans contrôle du résultat

- **Fichiers et lignes :** `useVerseLikes.ts:54-84`.
- **Comportement actuel :** le hook attend la requête mais n’inspecte pas `error`; Supabase ne lève pas automatiquement une exception. Le rollback ne s’exécute donc pas pour une erreur SQL normale.
- **Comportement attendu :** vérifier `error`, traiter le conflit unique et invalider/recharger le compteur canonique.
- **Gravité :** Moyenne.
- **Impact Web / Native :** compteur optimiste faux sur Native ; pas d’impact backend direct.
- **Certitude :** Confirmé.

### VERSE-003 — Likes orphelins et contrainte de jour absente

- **Fichiers et lignes :** migration `20251211130534...sql:2-12`, Edge Function `delete-user-account:70-72`.
- **Comportement actuel :** `verse_likes.user_id` et `verse_day_number` n’ont pas de FK déclarée ; la suppression Auth repose sur des cascades qui ne peuvent donc pas couvrir cette table. Aucun CHECK ne borne le jour.
- **Comportement attendu :** FK vers utilisateur/profil avec cascade, FK vers verset et contraintes de domaine.
- **Gravité :** Haute pour la confidentialité et l’intégrité.
- **Impact Web / Native :** likes orphelins après suppression et données invalides possibles.
- **Certitude :** Confirmé localement ; contraintes distantes à vérifier.

### NOTIF-001 — Tables utilisées par Native supprimées par les migrations récentes

- **Fichiers et lignes :** migration `20260612070634...sql:14-19`, migration `20260612071806...sql:2-54`, `ProfileDetailScreens.tsx:317-355`, `DashboardScreen.tsx:125-140`.
- **Comportement actuel :** `notification_logs` et `user_devices` sont supprimées puis non recréées. Native continue à les requêter via `as any`; les types générés ne les contiennent pas.
- **Comportement attendu :** contrat de centre de notifications/appareils explicitement versionné ou UI désactivée jusqu’au lot concerné.
- **Gravité :** Haute.
- **Impact Web / Native :** erreurs runtime Native ; toute recréation naïve peut casser le Web Push actuel.
- **Certitude :** Confirmé dans l’ordre local des migrations ; production à vérifier.

### NOTIF-002 — Payload Expo incompatible avec les Edge Functions Web Push

- **Fichiers et lignes :** `usePushNotifications.ts:51-67`, `register-push-subscription/index.ts:23-34`, `send-test-push/index.ts:29-56`.
- **Comportement actuel :** Native envoie `{type, token, platform}` ; l’Edge Function exige `{endpoint, p256dh, auth}` puis envoie par VAPID.
- **Comportement attendu :** canaux distincts et contrat de préférences commun, sans remplacer le contrat Web existant.
- **Gravité :** Haute.
- **Impact Web / Native :** Native ne s’enregistre pas ; modifier la table actuelle en place risquerait une régression Web.
- **Certitude :** Confirmé.

### NOTIF-003 — Préférences locales et Supabase divergentes

- **Fichiers et lignes :** `ProfileDetailScreens.tsx:317-352`, `useNotificationPreferences.ts:15-58`.
- **Comportement actuel :** l’écran persiste dans AsyncStorage ; le hook Supabase capable de charger/upserter les préférences n’est pas raccordé et n’inspecte pas toutes les erreurs.
- **Comportement attendu :** préférence serveur canonique, cache local explicite et synchronisation résiliente.
- **Gravité :** Moyenne.
- **Impact Web / Native :** préférences différentes sur chaque appareil et entre Web/Native.
- **Certitude :** Confirmé.

### NOTIF-004 — Endpoints planifiés exécutés avec service role sans secret d’appel

- **Fichiers et lignes :** `supabase/config.toml:9-13`, `send-daily-verse/index.ts:44-117`, `send-reading-reminders/index.ts:28-85`.
- **Comportement actuel :** `verify_jwt=false`; les fonctions n’exigent aucun secret de cron et utilisent immédiatement le service role pour parcourir les utilisateurs et envoyer les notifications.
- **Comportement attendu :** authentification de scheduler vérifiée, méthode HTTP restreinte et protection contre le rejeu.
- **Gravité :** Haute.
- **Impact Web / Native :** déclenchements abusifs, coût et spam Web ; le système Native futur hériterait du risque.
- **Certitude :** Confirmé dans la configuration locale ; déploiement à vérifier.

### NOTIF-005 — Les utilisateurs peuvent écrire dans la table de déduplication

- **Fichiers et lignes :** migration `20260612071806...sql:41-53`.
- **Comportement actuel :** `authenticated` reçoit INSERT/UPDATE/DELETE et la policy `FOR ALL` autorise l’utilisateur sur ses lignes.
- **Comportement attendu :** lecture éventuellement autorisée, mais écritures réservées au dispatcher/service role.
- **Gravité :** Moyenne.
- **Impact Web / Native :** un utilisateur peut précréer une clé de déduplication et empêcher un futur envoi.
- **Certitude :** Confirmé localement.

### EDGE-001 — Initialisation de données élevée sans autorisation métier

- **Fichiers et lignes :** `supabase/functions/init-sample-data/index.ts:10-103`, `supabase/config.toml`.
- **Comportement actuel :** la fonction utilise directement le service role pour écrire chapitres et versets, sans vérifier que l’appelant est administrateur. Avec la vérification JWT par défaut, un utilisateur authentifié suffirait si la fonction est déployée.
- **Comportement attendu :** fonction non déployée en production, supprimée, ou protégée par un rôle admin et un environnement non-production.
- **Gravité :** Critique si déployée.
- **Impact Web / Native :** altération du catalogue partagé et des versets.
- **Certitude :** Code dangereux confirmé ; déploiement inconnu.

### EDGE-002 — Notification de badge fondée sur une déclaration client

- **Fichiers et lignes :** `send-badge-notification/index.ts:22-50`.
- **Comportement actuel :** un utilisateur authentifié fournit `badgeId` et `badgeName`; la fonction ne vérifie pas l’existence du badge dans `user_badges` avant d’insérer la déduplication et d’envoyer.
- **Comportement attendu :** le serveur lit le badge effectivement débloqué et son libellé canonique.
- **Gravité :** Moyenne.
- **Impact Web / Native :** notifications trompeuses et entrées de déduplication arbitraires.
- **Certitude :** Confirmé.

### ACC-001 — Contrat de suppression de compte incompatible

- **Fichiers et lignes :** `ProfileDetailScreens.tsx:412-418`, `delete-user-account/index.ts:15-71`.
- **Comportement actuel :** Native n’envoie aucun body ; la fonction parse obligatoirement `{userId}` et vérifie l’égalité avec le sujet JWT. L’appel aboutit à une erreur, pas à une suppression.
- **Comportement attendu :** la fonction utilise uniquement l’identité du JWT, sans identifiant fourni, et garantit/nettoie toutes les dépendances.
- **Gravité :** Haute, bloquante pour le parcours RGPD.
- **Impact Web / Native :** une modification de payload côté Native seule est rétrocompatible ; simplifier la fonction nécessite de vérifier le client Web.
- **Certitude :** Confirmé.

### TYPE-001 — Types générés et contrats manuels divergent

- **Fichiers et lignes :** `src/integrations/supabase/types.ts:9-550`, `src/types/supabase.ts:8-90`, `src/types/notifications.ts:5-17`, `planService.ts:13-30`.
- **Comportement actuel :** les types générés n’exposent pas `get_reading_plan_catalog`; les anciens types notifications parlent de `badge_encouragement_enabled`, le schéma récent de `badges_enabled`; plusieurs objets disparus sont contournés avec `as any`.
- **Comportement attendu :** un unique fichier généré depuis le schéma de référence, complété seulement par des types de vue métier.
- **Gravité :** Haute.
- **Impact Web / Native :** ruptures découvertes au runtime et risque d’implémenter le mauvais contrat.
- **Certitude :** Confirmé.

### ERR-001 — Les erreurs backend sont souvent transformées en données vides

- **Fichiers et lignes :** `progressService.ts:24-58,61-115,247-289`, `planService.ts:13-59`, `profileService.ts:4-12`.
- **Comportement actuel :** les erreurs deviennent `[]`, `null` ou des métriques à zéro.
- **Comportement attendu :** résultat discriminé ou exception typée permettant à l’UI de distinguer absence de données et panne d’autorisation/réseau.
- **Gravité :** Moyenne.
- **Impact Web / Native :** diagnostic difficile et incohérences masquées sur Native.
- **Certitude :** Confirmé.

## 4. Analyse RLS et sécurité

### 4.1 Failles confirmées dans le dépôt

1. **Plan/Premium :** l’écriture directe de `selected_plan_id` n’est pas protégée par le trigger Premium ; les métadonnées d’inscription peuvent également imposer un plan.
2. **Fonctions privilégiées :** `get_completed_days_count`, `update_user_activity`, `calculate_user_badges` et `is_premium_active` utilisent une cible fournie. La plupart ne fixent pas toutes un `search_path` et aucune stratégie globale de révocation n’est visible.
3. **Fonctions de bascule RLS :** leur existence dans le schéma exposé est injustifiée et dangereuse ; aucun appel légitime n’a été trouvé.
4. **Edge Functions élevées :** `init-sample-data` ne contrôle pas un rôle admin ; les deux dispatchers cron sans JWT ne vérifient pas un secret d’appel.
5. **Déduplication notifications :** l’utilisateur peut écrire dans une table qui devrait être alimentée par le serveur.
6. **Relations versets :** absence de FK vers l’utilisateur/verset et donc de cascade démontrable.

### 4.2 Contrôles présents et utiles

- Les politiques `profiles` historiques bornent SELECT/INSERT/UPDATE à `auth.uid() = id`.
- `change_user_plan` vérifie la session, l’existence et l’activité du plan, puis le Premium pour les plans non canoniques.
- `admin_grant_premium`, `admin_revoke_premium` et `get_user_stats` vérifient le rôle admin.
- Les politiques `verse_likes` imposent l’identité pour INSERT et DELETE.
- Les Edge Functions Web Push d’enregistrement/désenregistrement et de test vérifient les claims JWT.
- `delete-user-account` vérifie le JWT et l’égalité du sujet, malgré son contrat client incorrect.
- Les politiques Storage avatar bornent les écritures au dossier utilisateur.

### 4.3 Risques à confirmer sur le schéma distant

- privilèges `EXECUTE` exacts de toutes les fonctions `public`, notamment héritage de `PUBLIC` ;
- RLS, politiques et contraintes de `user_progress`, `reading_plan_chapters`, `daily_verses`, `audio_readings` et `profiles` ;
- unicité `(user_id, chapter_id)` et cascades de suppression ;
- triggers réellement actifs sur `auth.users`, `profiles`, likes et préférences ;
- version réellement déployée des tables notifications ;
- présence des fonctions de bascule RLS et de `init-sample-data` en production ;
- jobs cron et authentification du scheduler ;
- définition de `assign_default_user_role`, appelée dans une migration mais absente des migrations disponibles.

### 4.4 Requêtes de vérification préalables en lecture seule

À exécuter par une personne disposant d’un accès autorisé : inventaire `pg_proc/proacl`, `pg_policies`, `information_schema.table_constraints`, `pg_trigger`, fonctions PostgREST exposées, versions des Edge Functions et liste des cron. Les résultats doivent être exportés sans données utilisateur et attachés au ticket de correction.

## 5. Plan de correction

| ID | Problème | Correctif proposé | Fichiers concernés | Risque Web | Priorité |
|---|---|---|---|---|---|
| FIX-00 | État distant inconnu | Obtenir un snapshot lecture seule du schéma, privilèges, RLS, triggers, cron et Edge déployées ; comparer aux types et migrations | Supabase distant, types, `supabase/` | Aucun, lecture seule | P0 |
| FIX-01 | Bascule RLS et privilèges excessifs | Révoquer explicitement les rôles publics, supprimer les utilitaires RLS inutilisés, borner chaque fonction privilégiée et fixer son `search_path` | migrations correctives futures | Faible si aucune dépendance cachée ; vérifier le Web | P0 |
| FIX-02 | Contournement plan/Premium | Interdire l’UPDATE direct de `selected_plan_id`, sécuriser le plan initial et imposer la RPC canonique | `handle_new_user`, policies/privileges `profiles`, `change_user_plan`, clients Web/Native | Élevé si le Web met à jour directement le profil | P0 |
| FIX-03 | RPC avec cible arbitraire | Ajouter des variantes self-service sans paramètre utilisateur et réserver les variantes admin au rôle admin/service | RPC progression, activité, badges, Premium | Moyen : transition de signatures nécessaire | P0 |
| FIX-04 | Premium incomplet | Définir un entitlement canonique : essai, code, achat manuel, admin, expiration ; exposer une lecture stable | profils/entitlements, RPC Premium, `usePremium` | Élevé mais maîtrisable avec vue/RPC compatible | P0 |
| FIX-05 | Progression non atomique | Ajouter contraintes et RPC idempotentes pour toggle/complétion de journée ; filtrer toutes les agrégations par plan | `user_progress`, RPC, `progressService`, clients Web/Native | Moyen ; conserver temporairement les écritures existantes | P0 |
| FIX-06 | Cycle plan/date incohérent | Formaliser changement, reset, décalage de date et downgrade dans des RPC transactionnelles distinctes | `profiles`, progression, badges, services date/plan | Élevé selon comportement Web actuel | P1 |
| FIX-07 | Relation versets invalide | Ajouter identifiants/FK, nettoyer les orphelins et fournir une requête d’historique stable | `daily_verses`, `verse_likes`, `verseService`, Web | Moyen : phase de double lecture nécessaire | P1 |
| FIX-08 | Notifications en dérive | Geler le contrat Web Push, restaurer/documenter les objets réellement nécessaires et préparer des tables Native additives | migrations notifications, hooks et Edge Functions | Élevé si remplacement direct ; faible en additif | P1 |
| FIX-09 | Edge Functions insuffisamment autorisées | Désactiver/protéger `init-sample-data`, authentifier les cron et vérifier le badge côté serveur | Edge Functions et `config.toml` | Faible à moyen selon scheduler Web | P0 |
| FIX-10 | Suppression incompatible | Dériver l’utilisateur du JWT, vérifier les cascades/stockage et adapter les clients en transition | fonction delete, écran privacy, client Web | Faible avec acceptation temporaire de l’ancien body | P1 |
| FIX-11 | Types et erreurs | Régénérer les types après stabilisation, supprimer les `any` de contrat et propager les erreurs | types et services Native/Web | Faible, mais révèle des erreurs existantes | P1 |

### 5.1 Dépendances et ordre d’implémentation

```text
FIX-00 Vérification distante
  ├─> FIX-01 Privilèges critiques
  ├─> FIX-09 Edge Functions critiques
  └─> FIX-02 Protection plan/profil
        ├─> FIX-03 RPC self-service
        ├─> FIX-04 Entitlements Premium
        │     └─> FIX-06 Cycle plan/date/downgrade
        └─> FIX-05 Progression atomique
              └─> FIX-07 Versets et intégrité associée

FIX-08 Notifications peut avancer après FIX-00 sans bloquer Premium/lecture.
FIX-10 Suppression dépend de l’inventaire des FK de FIX-00.
FIX-11 Types et erreurs clôt chaque vague, après stabilisation du contrat correspondant.
```

### 5.2 Stratégie de compatibilité Web/Native

- Ajouter d’abord les nouveaux contrats ; maintenir les anciens le temps de migrer les deux clients.
- Pour une RPC dont la signature change, créer une version nommée ou une nouvelle fonction self-service, migrer Native et Web, observer, puis révoquer/supprimer l’ancienne.
- Ne pas renommer ou transformer `push_subscriptions` tant que le Web Push n’a pas été testé. Ajouter plus tard une table de tokens Expo séparée.
- Pour les versets, ajouter une clé relationnelle sans retirer immédiatement `verse_day_number`; remplir la nouvelle colonne, faire une double lecture temporaire, puis renforcer les contraintes.
- Pour `profiles`, vérifier les écritures directes du Web avant de restreindre les privilèges de colonnes. Fournir des RPC dédiées pour le plan et la date.
- Chaque migration corrective doit être additive et réversible ; ne pas modifier les migrations historiques susceptibles d’être déjà appliquées.

## 6. Plan des migrations

Les descriptions suivantes ne sont pas du SQL exécutable.

### MIG-P01 — Durcissement immédiat des privilèges

- **Objets :** `disable_rls`, `enable_rls`, `get_completed_days_count`, `update_user_activity`, `calculate_user_badges`, `is_premium_active`, autres fonctions `SECURITY DEFINER`.
- **Modification envisagée :** révoquer `PUBLIC`, `anon` et/ou `authenticated` selon le besoin ; supprimer les deux utilitaires RLS s’ils sont inutilisés ; fixer les `search_path`; exposer des fonctions self-service fondées sur `auth.uid()`.
- **Préconditions :** export des `proacl`, recherche de dépendances Web/cron et confirmation du propriétaire des fonctions.
- **Données à préserver :** aucune donnée modifiée.
- **Vérifications préalables :** appels légitimes par Native, Web, admin et service role.
- **Non-régression :** utilisateur courant peut encore lire ses compteurs et recalculer ses badges ; un autre UUID est refusé ; administration reste fonctionnelle.
- **Retour arrière :** réaccorder uniquement le rôle légitime fonction par fonction, jamais `PUBLIC` globalement.

### MIG-P02 — Protection des colonnes profil et inscription sûre

- **Objets :** `profiles`, `handle_new_user`, politique/privileges UPDATE, `change_user_plan`.
- **Modification envisagée :** protéger `selected_plan_id` et les colonnes Premium contre l’écriture directe ; déterminer le plan initial côté serveur ; valider toute métadonnée ; conserver `change_user_plan` comme point d’entrée exclusif.
- **Préconditions :** inventaire des UPDATE Web/Native et décision sur le plan gratuit canonique.
- **Données à préserver :** profils, dates, plans et droits existants.
- **Vérifications préalables :** profils avec plan inactif/inexistant, utilisateurs sans plan, noms de plans canoniques.
- **Non-régression :** inscription Web/Native, édition nom/avatar, changement de plan Premium/gratuit, administration.
- **Retour arrière :** réactiver temporairement les colonnes non sensibles seulement ; conserver les protections Premium.

### MIG-P03 — Entitlements Premium et essai

- **Objets :** colonnes Premium ou nouvelle table d’entitlements, codes d’activation, correspondances acheteurs manuels, fonctions de lecture/activation/expiration.
- **Modification envisagée :** représenter source, début, fin, statut et preuve ; calculer l’essai de 30 jours indépendamment de `start_date`; prévoir activation idempotente et audit minimal.
- **Préconditions :** décisions métier sur déclenchement de l’essai, cumul, codes, récupération acheteur et gratuité résiduelle.
- **Données à préserver :** tous les Premium existants et leur source ; mapping de compatibilité vers les anciennes colonnes.
- **Vérifications préalables :** comptes sans date, Premium permanent, expiré, admin, grandfather.
- **Non-régression :** statut identique pendant la transition sur Web et Native ; cron idempotent ; aucun downgrade prématuré.
- **Retour arrière :** maintenir les anciennes colonnes comme projection/compatibilité jusqu’à validation complète.

### MIG-P04 — Intégrité et transactions de progression

- **Objets :** `user_progress`, contraintes, RLS, RPC de toggle et de complétion de journée, agrégations.
- **Modification envisagée :** vérifier/ajouter unicité utilisateur-chapitre, NOT NULL/FK/cascades adaptées, policies self-only, RPC atomiques et filtrage par plan.
- **Préconditions :** détection et résolution des doublons/orphelins ; confirmation de la définition de `chapter_status`.
- **Données à préserver :** dernière valeur valide par paire utilisateur/chapitre et dates de complétion.
- **Vérifications préalables :** doublons, chapitres supprimés, progression sur anciens plans, utilisateurs sans profil.
- **Non-régression :** toggle, dé-toggle, journée complète, double-tap, panne intermédiaire, changement de plan, badges et statistiques Web/Native.
- **Retour arrière :** garder les anciennes écritures le temps de migrer les clients ; rollback de contrainte seulement après restauration d’un contrat cohérent.

### MIG-P05 — Cycle de vie plan et date

- **Objets :** `change_user_plan`, nouvelle opération de décalage/réinitialisation, expiration/révocation Premium.
- **Modification envisagée :** séparer les intentions « changer », « réinitialiser », « décaler la date » et « downgrader » ; rendre chaque opération transactionnelle et documenter la conservation de l’historique.
- **Préconditions :** décisions produit sur suppression/archivage de progression et badges.
- **Données à préserver :** selon décision, archive ou snapshot avant reset ; jamais de suppression implicite non annoncée.
- **Vérifications préalables :** distribution des plans, progression croisée, badges débloqués.
- **Non-régression :** mêmes résultats sur Web/Native et données cohérentes après expiration.
- **Retour arrière :** rétablir l’ancien RPC derrière un feature flag serveur uniquement si les données ne sont pas transformées de façon irréversible.

### MIG-P06 — Intégrité des versets et likes

- **Objets :** `daily_verses`, `verse_likes`, trigger compteur, index et contraintes.
- **Modification envisagée :** ajouter `verse_id`, remplir depuis le numéro de jour, créer FK vers verset et utilisateur, ajouter bornes/NOT NULL, recalculer les compteurs puis fournir une vue ou requête compatible.
- **Préconditions :** identifier doublons de jour, likes orphelins et usages Web de `verse_day_number`.
- **Données à préserver :** likes existants et compteurs.
- **Vérifications préalables :** égalité compteur matérialisé/COUNT réel, jours sans verset, utilisateurs supprimés.
- **Non-régression :** like/unlike concurrents, historique, agrégation et suppression de compte sur les deux clients.
- **Retour arrière :** conserver `verse_day_number` pendant toute la transition ; retirer la nouvelle FK seulement avant suppression de l’ancienne colonne, jamais après.

### MIG-P07 — Compatibilité des notifications

- **Objets :** `push_subscriptions`, `notification_preferences`, `notifications_sent`, éventuels `notification_logs`/`user_devices`, futurs tokens Expo.
- **Modification envisagée :** documenter le Web Push actuel, restreindre l’écriture de déduplication au service, restaurer seulement les objets réellement requis par le centre de notifications et préparer une extension additive pour Native.
- **Préconditions :** snapshot production, besoins exacts du Web et décision sur le centre de notifications Native.
- **Données à préserver :** abonnements Web, préférences, fuseaux et clés de déduplication.
- **Vérifications préalables :** volumes, endpoints expirés, politiques, cron et colonnes attendues par le Web.
- **Non-régression :** inscription/désinscription Web, envoi VAPID, horaires, déduplication et nettoyage ; Native reste désactivé tant que son canal n’est pas développé.
- **Retour arrière :** aucune suppression des tables Web ; les nouveaux objets Native peuvent être ignorés si le déploiement applicatif est annulé.

### MIG-P08 — Cascades RGPD, baseline et types

- **Objets :** toutes les FK utilisateur, Storage avatar, `user_consents`, données Premium, progression, likes et notifications ; fichier de types.
- **Modification envisagée :** corriger les cascades ou documenter les suppressions explicites, capturer un baseline reproductible, puis régénérer les types.
- **Préconditions :** matrice de rétention légale et inventaire distant complet.
- **Données à préserver :** aucune donnée utilisateur supprimée pendant la migration ; nettoyage d’orphelins traité séparément et audité.
- **Vérifications préalables :** FK sans cascade, données sans propriétaire, bucket avatar, fonctions/triggers dépendants.
- **Non-régression :** suppression d’un compte de test dédié, conservation des données légalement requises, absence d’orphelins, compilation des deux clients.
- **Retour arrière :** restaurer les seules contraintes précédentes ; ne pas tenter de recréer des données réellement supprimées.

### 6.1 Ajustements Edge Functions associés

1. **EDGE-P01 :** `delete-user-account` doit dériver l’identité du JWT et accepter temporairement l’ancien payload sans lui faire confiance.
2. **EDGE-P02 :** `init-sample-data` doit être retirée de production ou exiger explicitement le rôle admin et un environnement autorisé.
3. **EDGE-P03 :** les fonctions cron doivent vérifier un secret de scheduler et limiter la méthode ; la rotation du secret doit être documentée.
4. **EDGE-P04 :** `send-badge-notification` doit charger le badge depuis `user_badges` et ne jamais faire confiance au nom envoyé.

La création du canal Expo Push n’appartient pas à cette étape ; seule sa séparation contractuelle avec le Web Push est planifiée.

## 7. Stratégie de tests

### 7.1 Avant chaque correction

- Capturer la définition, les propriétaires, privilèges, politiques, contraintes, triggers et dépendances des objets visés.
- Exécuter les scénarios actuels Web et Native sur staging et enregistrer les réponses HTTP/PostgREST, sans données personnelles.
- Préparer des comptes dédiés : anonyme, gratuit, essai actif, Premium actif, expiré et admin.
- Sauvegarder les compteurs agrégés nécessaires à la comparaison, pas le contenu utilisateur.

### 7.2 Autorisations et RLS

| Test | Résultat attendu |
|---|---|
| Anonyme appelle une RPC utilisateur | Refus, sauf catalogue explicitement public |
| Utilisateur A lit/modifie profil ou progression de B | Refus |
| Utilisateur A fournit l’UUID de B à une ancienne RPC | Refus ou fonction retirée |
| Utilisateur gratuit change directement `selected_plan_id` | Refus |
| Utilisateur gratuit appelle `change_user_plan` vers Premium | Refus métier stable |
| Premium actif change vers un plan actif | Succès transactionnel |
| Utilisateur standard appelle une RPC admin | Refus |
| Appel direct de `disable_rls`/`enable_rls` | Fonction absente ou permission refusée |

### 7.3 Premium et plans

- Essai : veille du début, jour 1, jour 30, frontière exacte d’expiration, jour 31 et fuseaux différents.
- Activation : code valide, invalide, expiré, réutilisé, simultané et compte déjà Premium.
- Acheteur manuel : correspondance unique, conflit d’identité et révocation support.
- Changement/downgrade : plan inactif, canonique absent, double appel, interruption et conservation/réinitialisation selon décision.
- Comparer l’entitlement lu par Web et Native pour le même compte.

### 7.4 Progression

- Toggle pending→completed→pending et appels concurrents.
- Double-tap et deux appareils simultanés sur le même passage.
- Complétion d’une journée dont un passage n’appartient pas au plan actif.
- Injection d’une erreur au milieu d’une journée : aucune écriture partielle.
- Comptage après changement, reset et downgrade ; pourcentage toujours entre 0 et 100.
- Calcul badge effectué une fois, sans écrire pour un autre utilisateur.

### 7.5 Versets

- Historique paginé et filtré avec jours manquants.
- Like concurrent et violation d’unicité traitée sans compteur faux.
- Compteur matérialisé égal au COUNT réel après insert/delete.
- Suppression d’utilisateur ne laisse aucun like orphelin.
- Requête Web historique inchangée pendant la phase de double contrat.

### 7.6 Notifications

- Non-régression Web Push : register, unregister, test, daily, reminder, badge, endpoint expiré.
- Utilisateur incapable d’insérer ou supprimer une ligne de déduplication serveur.
- Cron sans secret, mauvais secret, bonne signature et rejeu.
- Préférences et fuseau identiques entre Web et Native lorsque la synchronisation sera activée.
- Aucun test d’envoi Expo n’est requis à cette étape.

### 7.7 Suppression de compte

- Sans JWT, JWT expiré et JWT d’un autre utilisateur : refus.
- Avec JWT valide : suppression idempotente du compte de test.
- Vérification des cascades : profil, rôles, progression, badges, likes, consentements, préférences, abonnements et avatar.
- Vérification qu’aucune donnée d’un autre utilisateur n’est touchée.

### 7.8 Erreurs réseau et compatibilité

- Timeout, perte réseau, 401, 403, 409, 422 et 500 doivent produire des états UI distincts et ne pas être transformés en données vides.
- Pendant la transition, tester une version Web ancienne avec le backend nouveau et une version Native nouvelle avec le backend compatible.
- Les tests automatisés doivent rester ciblés : autorisation, transactions, contraintes et contrats critiques, complétés par quelques smoke tests sur staging.

## 8. Questions et décisions en attente

### 8.1 Accès et production

1. Qui peut fournir un export lecture seule du schéma, des `proacl`, politiques, triggers, cron et versions d’Edge Functions ?
2. Les migrations du 10, 12 et 24 juin 2026 sont-elles effectivement déployées, et dans quel ordre ?
3. `disable_rls`, `enable_rls` et `init-sample-data` existent-elles en production et quels rôles peuvent les exécuter ?
4. Existe-t-il un environnement staging partageant la même structure que la production ?
5. Quelle version du fichier de types correspond au schéma distant actuel ?

### 8.2 Premium

1. Quand commencent exactement les 30 jours : création du compte, première connexion ou première lecture ?
2. L’essai est-il accordé une seule fois par compte, acheteur ou appareil ?
3. Quelles fonctions restent gratuites après expiration ?
4. Quelle source fait autorité pour reconnaître un acheteur du manuel et quel identifiant peut être rapproché légalement ?
5. Les codes sont-ils à usage unique, liés à un produit, limités dans le temps et cumulables ?
6. Que devient la progression lors d’un downgrade vers le plan canonique ?

### 8.3 Lecture et plans

1. Modifier la date de début doit-il conserver la progression, la décaler ou la réinitialiser ?
2. Un changement de plan doit-il supprimer définitivement ou archiver progression et badges ?
3. Le plan par défaut est-il identifié par un UUID/configuration stable plutôt que par le nom `Canonique 12 mois` ?
4. Le Web écrit-il directement `profiles.selected_plan_id`, `start_date` ou `current_day_number` ?
5. Une journée complète doit-elle automatiquement avancer le jour courant ?

### 8.4 Versets et notifications

1. La relation canonique des likes doit-elle utiliser `daily_verses.id` ou conserver le numéro de jour comme compatibilité ?
2. Quelle taxonomie de thèmes est attendue et existe-t-elle déjà dans le schéma Web ?
3. Le centre de notifications et la liste d’appareils font-ils toujours partie de la V2 Native ?
4. Quel scheduler appelle les fonctions quotidiennes et comment peut-il signer ses requêtes ?
5. Les notifications sont-elles réservées aux Premium ? La migration récente ne conserve pas cette restriction.

### 8.5 Suppression et conservation

1. Quelles données doivent être supprimées, anonymisées ou conservées légalement ?
2. La suppression doit-elle être immédiate ou différée avec délai de récupération ?
3. Le client Web envoie-t-il actuellement `{userId}` à `delete-user-account` ?

## Recommandation de premier correctif

Le premier travail à autoriser ne doit pas être l’ajout d’une fonctionnalité. Il doit être un **correctif de sécurité et de contrôle d’accès en deux temps** :

1. obtenir le snapshot lecture seule du backend partagé et confirmer les privilèges effectifs ;
2. préparer puis appliquer une migration minimale qui supprime ou verrouille `disable_rls`/`enable_rls`, révoque les exécutions publiques injustifiées et ferme le contournement de `selected_plan_id`, avec une transition vérifiée pour la Web App.

Ce correctif réduit immédiatement le risque transversal sans imposer encore le nouveau modèle Premium. Une fois cette frontière sécurisée, l’entitlement Premium et la progression transactionnelle peuvent être développés sur une base fiable.
