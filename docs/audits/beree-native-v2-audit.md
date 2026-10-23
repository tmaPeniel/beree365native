# Bérée Native V2 — Lot 0 : audit technique et fonctionnel

**Date de l’audit :** 21 octobre 2026
**Périmètre :** application Expo/React Native, intégration Supabase versionnée dans le dépôt et écarts avec le cahier des charges V2 ainsi qu’avec la Web App.
**Nature de l’intervention :** audit uniquement. Aucun code applicatif, schéma distant, déploiement ni donnée n’a été modifié.

## 1. Synthèse exécutive

L’application dispose d’un socle exploitable : authentification Supabase, navigation protégée, tableau de bord, lecture quotidienne avec progression optimiste, changement de plan, statistiques simples, badges, verset du jour, profil et avatar. Le projet passe la vérification TypeScript actuelle.

Il ne s’agit toutefois pas encore d’une V2 fonctionnellement alignée avec la Web App. Les écarts les plus structurants portent sur l’onboarding et l’activation Premium, la bibliothèque de versets, l’audio avancé, les notifications natives, la confidentialité des données et plusieurs contrats client/serveur. Certaines fonctions annoncées comme opérationnelles dans les documents Native sont seulement partielles ou absentes dans le code observé ; le présent rapport retient le dépôt comme source de vérité technique.

### Résultat de la matrice

| État | Nombre | Part du périmètre audité |
|---|---:|---:|
| Opérationnel | 5 | 12,5 % |
| Partiel | 17 | 42,5 % |
| Absent | 15 | 37,5 % |
| À vérifier | 3 | 7,5 % |
| **Total** | **40** | **100 %** |

Ces états évaluent la conformité au besoin complet, pas seulement l’existence d’un écran ou d’un fichier. « À vérifier » signifie qu’une validation sur l’environnement Supabase/EAS ou une décision produit est indispensable.

### Cinq problèmes prioritaires

1. **Notifications natives non raccordées au backend actuel.** Le mobile envoie un jeton Expo alors que la fonction Edge attend un abonnement Web Push (`endpoint`, `p256dh`, `auth`). Aucun `projectId` EAS n’est configuré.
2. **Premium insuffisamment protégé côté serveur.** La période gratuite de 30 jours, le paywall et plusieurs accès Premium ne sont pas imposés au niveau des données ; une migration ultérieure annule en outre une partie des politiques de notifications Premium.
3. **Suppression de compte actuellement incompatible avec la fonction Edge.** Le client n’envoie pas l’identifiant requis dans le corps JSON, ce qui empêche le parcours RGPD de réussir.
4. **Schéma de notifications incohérent.** Les écrans interrogent `user_devices` et `notification_logs`, tables supprimées dans les migrations les plus récentes et absentes des types générés.
5. **Validation journalière non atomique.** « Terminer la journée » lance plusieurs mutations indépendantes : une panne intermédiaire peut laisser une journée partiellement enregistrée malgré un rollback visuel.

### Conclusion de préparation

Le socle est suffisant pour engager le Lot 1, mais pas pour publier une V2 fiable. Le premier lot doit sécuriser les contrats backend et l’autorisation Premium avant d’enrichir l’interface. Commencer par l’audio ou le design sans stabiliser ces fondations augmenterait la dette et le risque de contournement.

## 2. Architecture actuelle

### 2.1 Socle applicatif

- Expo SDK 57, React Native 0.86.3, React 19.2.3 et Expo Router.
- Routage par fichiers dans `app/`, avec un layout racine qui installe React Query et le contexte d’authentification.
- Groupe `(tabs)` protégé par vérification de session ; redirection vers la connexion en l’absence d’utilisateur.
- Organisation fonctionnelle dans `src/features/` : authentification, lecture, statistiques/profil, versets, audio, notifications et Premium.
- Supabase fournit l’authentification, la base, le stockage avatar, les RPC et les fonctions Edge.
- AsyncStorage est utilisé pour la session Supabase, le mode de lecture et certaines préférences locales.

### 2.2 Flux de données observé

Le client mélange trois approches : accès Supabase direct depuis les écrans, services de domaine et hooks React Query. Le résultat fonctionne pour les parcours simples, mais plusieurs écrans concentrent UI, requêtes, état optimiste et règles métier. Les plus volumineux dépassent plusieurs centaines de lignes, notamment le tableau de bord, le plan de lecture, le profil et le lecteur audio.

La progression de lecture est persistée dans Supabase. L’interface applique une mise à jour optimiste, puis invalide les requêtes. Les statistiques et badges sont calculés à la fois côté client et côté SQL/RPC, ce qui crée deux sources de vérité.

### 2.3 Configuration et environnement

- Le client Supabase accepte des variables `EXPO_PUBLIC_*`, mais retombe silencieusement sur une URL et une clé publique codées en dur.
- Le fichier `.env` est suivi par Git et contient la configuration d’environnement. Même si une clé anonyme Supabase et une clé publique VAPID ne sont pas des secrets serveur, cette pratique empêche une séparation propre des environnements et peut masquer une mauvaise configuration de build.
- `app.json` ne définit pas de projet EAS, de schéma de deep link métier complet ni de capacités audio en arrière-plan.
- Le dépôt ne contient pas de configuration de build/publication EAS vérifiable dans le périmètre observé.

### 2.4 Qualité et maintenabilité

- La vérification `tsc --noEmit` réussit.
- Le mode TypeScript strict et `strictNullChecks` sont désactivés ; de nombreux contournements `any` existent.
- Aucun script de lint ni de test automatisé n’est défini.
- Plusieurs services, hooks et écrans paraissent obsolètes ou non raccordés, dont un ancien écran de lecture, des services « optimized » et un hook de préférences de notifications.
- Les versions installées de plusieurs modules Expo ne correspondent pas exactement aux versions correctives attendues par le SDK 57.

## 3. Matrice de conformité fonctionnelle

| ID | Fonctionnalité | État | Fichiers concernés | Écart identifié | Priorité |
|---|---|---|---|---|---|
| AUTH-00 | Connexion, inscription, session, déconnexion | Opérationnel | `src/features/auth/`, `app/(tabs)/_layout.tsx` | Socle présent et routes authentifiées protégées. | P1 |
| AUTH-01 | Onboarding multi-écrans | Absent | `app/`, `assets/images/` | Des visuels existent, mais aucun parcours, état de complétion ou routage d’onboarding. | P1 |
| AUTH-02 | Code Premium à l’inscription | Absent | `AuthExtraScreens.tsx`, `authCore.ts` | Le champ est affiché mais sa valeur n’est pas transmise ni validée. | P0 |
| AUTH-03 | Reconnaissance manuelle des acheteurs Web | Absent | `src/features/premium/`, migrations | Aucun rapprochement acheteur/compte ni parcours de récupération. | P1 |
| AUTH-04 | Acceptation persistée des conditions | Absent | `AuthExtraScreens.tsx`, `authCore.ts` | Case UI uniquement ; un TODO confirme l’absence de persistance et de version du consentement. | P1 |
| AUTH-05 | Mot de passe oublié et lien invalide/expiré | Partiel | `authCore.ts`, écrans reset | Envoi et mise à jour présents ; états de lien invalide, expiré ou déjà utilisé non traités explicitement. | P1 |
| DASH-00 | Tableau de bord, lecture du jour, progression, like/partage | Opérationnel | `DashboardScreen.tsx`, hooks versets | Le cœur du tableau de bord est utilisable avec mises à jour optimistes. | P1 |
| DASH-01 | Parité complète du tableau de bord Web | Partiel | `DashboardScreen.tsx` | Le nom du plan et certains états/indicateurs Web manquent ; le centre de notifications repose sur un schéma supprimé. | P1 |
| READ-01 | Vue focus, grille, recherche, progression optimiste | Opérationnel | `ReadingPlanScreen.tsx`, `progressService.ts` | Fonctions principales présentes, préférence de vue mémorisée. | P1 |
| READ-02 | Validation complète d’une journée | Partiel | `ReadingPlanScreen.tsx`, `progressService.ts` | Mutations parallèles non atomiques, effets badge/activité répétés et risque de succès partiel. | P0 |
| READ-03 | Célébration de fin de journée | Absent | `ReadingPlanScreen.tsx` | Aucun confetti, modal ou animation de célébration conforme au Web. | P2 |
| READ-04 | Changement et réinitialisation du plan | Partiel | `ReadingPlanSelectionScreen.tsx`, `planService.ts`, RPC SQL | Changement confirmé et RPC présent ; aucune action distincte « réinitialiser » et historique détruit lors du changement. | P1 |
| STAT-01 | Graphique hebdomadaire navigable | Absent | `ProfileDetailScreens.tsx` | Une agrégation 7 jours existe, sans navigation entre semaines ni parité Web. | P2 |
| STAT-02 | Graphique mensuel sur six mois | Absent | `ProfileDetailScreens.tsx` | L’option « Tout » est limitée à 90 jours, sans vue mensuelle six mois. | P2 |
| STAT-03 | Cartes de synthèse complètes | Partiel | `ProfileDetailScreens.tsx` | Séries, streak et activité présents ; la carte « passages cette semaine » et certains libellés Web manquent. | P2 |
| STAT-04 | Badges, état verrouillé/déverrouillé, détail | Opérationnel | `ProfileDetailScreens.tsx`, `badgeService.ts`, RPC SQL | Catalogue et progression visibles ; la cohérence de calcul reste traitée comme problème technique séparé. | P1 |
| AUDIO-01 | Sources MP3 et YouTube | Partiel | `audioService.ts`, `AudioPlayer.tsx` | Le modèle accepte les deux, mais le lecteur refuse actuellement les MP3. | P1 |
| AUDIO-02 | Contrôles essentiels du lecteur | Partiel | `AudioPlayer.tsx` | Lecture/pause et saut temporel présents ; navigation jour précédent/suivant et comportement robuste incomplets. | P1 |
| AUDIO-03 | Vitesse, volume et reprise persistée | Absent | `AudioPlayer.tsx` | Aucun réglage de vitesse/volume, aucune sauvegarde de position, aucune reprise automatique. | P1 |
| AUDIO-04 | Mini-player global et session média système | Absent | `ReadingPlanScreen.tsx`, `AudioPlayer.tsx`, layout racine | Le lecteur est local à l’écran ; pas de player global, commandes système ni continuité inter-écrans. | P1 |
| AUDIO-05 | Lecture audio en arrière-plan sur appareils | À vérifier | `app.json`, dépendances | Aucune capacité native dédiée n’est configurée ; validation finale nécessaire sur builds iOS/Android et selon les contraintes YouTube. | P1 |
| VERSE-01 | Page bibliothèque/historique des versets | Absent | `app/verses.tsx` | La route est un écran statique de remplacement. | P1 |
| VERSE-02 | Filtres et navigation dans les versets | Partiel | `verseService.ts`, `app/verses.tsx` | Un service d’historique existe mais n’est pas raccordé ; aucun filtre thème/date dans l’UI. | P1 |
| VERSE-03 | Like et partage avec gestion d’erreur | Partiel | hooks de versets, `DashboardScreen.tsx` | Les actions existent, mais certaines erreurs Supabase ne sont pas vérifiées et peuvent laisser un état optimiste incorrect. | P1 |
| PUSH-01 | Enregistrement push natif | Partiel | `usePushNotifications.ts`, `app.json`, fonction `register-push-subscription` | Jeton Expo côté mobile, contrat Web Push côté serveur et `projectId` EAS absent : flux non fonctionnel de bout en bout. | P0 |
| PUSH-02 | Préférences et horaires de notification | Partiel | `ProfileDetailScreens.tsx`, hook non utilisé, migrations | L’écran sauvegarde surtout localement ; l’implémentation Supabase existante n’est pas utilisée. | P1 |
| PUSH-03 | Notification d’activation Premium | Absent | fonctions Edge notifications | Aucune fonction ou déclencheur correspondant. | P1 |
| PUSH-04 | Rappels, déduplication, timezone, deep links | Partiel | fonctions Edge daily/reminder/badge | Les fonctions Web gèrent fenêtre temporelle et déduplication, mais les liens ciblent le Web et non l’application native. | P1 |
| PUSH-05 | Préservation du Web Push en production | À vérifier | migrations, fonctions Edge Web Push | Le code Web Push est présent ; la configuration, les secrets, les cron et l’état réellement déployé ne sont pas vérifiables depuis le dépôt. | P0 |
| PREM-01 | Essai gratuit de 30 jours puis paywall | Absent | hooks Premium, écrans, migrations | Aucun calcul d’essai, verrouillage après 30 jours ou paywall applicatif/serveur. | P0 |
| PREM-02 | Statut Premium et administration | Partiel | `usePremium.tsx`, RPC/migrations Premium | Le profil et les RPC admin existent ; il manque le parcours utilisateur complet et une vérification du déploiement. | P0 |
| PREM-03 | Activation par code et reconnaissance acheteur | Absent | écrans Premium, auth, backend | Les actions visibles sont des placeholders et aucun service de validation n’existe. | P0 |
| PREM-04 | Restriction serveur des fonctions Premium | Partiel | migrations RLS/RPC, lecture, audio, notifications | Changement de plan et badges partiellement gardés ; progression, audio et notifications ne le sont pas de manière cohérente. | P0 |
| PREM-05 | Paiement intégré | À vérifier | écrans Premium | Explicitement hors périmètre fonctionnel actuel ; décision produit nécessaire pour la V2 Native. | P2 |
| PROF-00 | Profil utilisateur et avatar | Opérationnel | `ProfileDetailScreens.tsx`, migration avatars | Consultation/édition et stockage avatar avec politiques par dossier présents. | P1 |
| PROF-01 | Thèmes clair/sombre/système | Absent | `app.json`, UI | Style forcé en clair, sans préférence ni thème global. | P2 |
| PROF-02 | Export exhaustif des données | Partiel | `ProfileDetailScreens.tsx` | L’export ne contient que le profil déjà chargé et l’identité de base, pas toutes les données personnelles. | P0 |
| PROF-03 | Suppression définitive du compte | Partiel | `ProfileDetailScreens.tsx`, fonction `delete-user-account` | UI et fonction existent mais leurs contrats divergent ; le client n’envoie pas l’identifiant requis. | P0 |
| PROF-04 | Consentements modifiables et persistés | Absent | `ProfileDetailScreens.tsx`, auth | Les toggles sont éphémères et aucune version/preuve de consentement n’est stockée. | P1 |
| HELP-01 | FAQ, recherche et contact support | Partiel | `app/profile/help.tsx` | Aide statique minimale, sans catégories, recherche ni formulaire de contact. | P2 |

## 4. Problèmes techniques identifiés

### TECH-01 — Contrat incompatible pour les notifications natives

- **Sévérité :** Critique
- **Fichiers :** `src/features/notifications/hooks/usePushNotifications.ts`, `supabase/functions/register-push-subscription/index.ts`, `app.json`
- **Cause :** le mobile transmet `{ type, token, platform }`, tandis que la fonction Edge valide un abonnement Web Push contenant `endpoint`, `p256dh` et `auth`. Le projet EAS requis par `getExpoPushTokenAsync` n’est pas configuré.
- **Impact :** un appareil Native ne peut pas s’enregistrer correctement ; rappels et alertes Premium/badges ne sont pas fiables.
- **Solution :** séparer explicitement `expo_push_tokens` et `web_push_subscriptions`, définir un contrat versionné, configurer EAS, ajouter l’unregister serveur et tester sur un build physique iOS et Android.

### TECH-02 — Dérive du schéma de notifications

- **Sévérité :** Haute
- **Fichiers :** `ProfileDetailScreens.tsx`, `DashboardScreen.tsx`, migrations du 12 juin 2026, types Supabase générés
- **Cause :** une migration supprime `notification_logs`, `notification_preferences`, `user_devices` et `push_subscriptions`; la suivante ne recrée que les structures Web Push/préférences nécessaires. L’UI continue d’interroger `user_devices` et `notification_logs` au moyen de casts `any`.
- **Impact :** erreurs runtime sur une base reconstruite depuis les migrations récentes, historique de notifications indisponible et absence de garantie de reproductibilité.
- **Solution :** choisir le modèle cible, écrire une migration corrective non destructive, régénérer les types et supprimer tous les casts de contournement.

### TECH-03 — Autorisation Premium incomplète et incohérente

- **Sévérité :** Critique
- **Fichiers :** migrations Premium et notifications, services lecture/audio, `usePremium.tsx`
- **Cause :** une partie des règles est appliquée par l’interface ou certaines RPC seulement. Une migration postérieure recrée des politiques de notifications accessibles à tout utilisateur propriétaire, sans la restriction Premium précédente.
- **Impact :** contournement possible des fonctionnalités payantes, règles différentes entre Web et Native, expiration difficile à garantir.
- **Solution :** définir une fonction SQL canonique `is_premium_active(auth.uid())`, l’utiliser dans les RLS/RPC concernées, modéliser l’essai de 30 jours côté serveur et ajouter des tests d’autorisation par rôle.

### TECH-04 — Suppression de compte non fonctionnelle

- **Sévérité :** Haute
- **Fichiers :** `ProfileDetailScreens.tsx`, `supabase/functions/delete-user-account/index.ts`
- **Cause :** le client invoque la fonction sans corps ; la fonction exige un JSON contenant l’identifiant égal au sujet du jeton.
- **Impact :** exercice du droit à l’effacement bloqué et risque de non-conformité RGPD.
- **Solution :** privilégier l’identité issue du JWT uniquement côté serveur, rendre le corps optionnel, gérer les données liées et le stockage, puis déconnecter/rediriger le client après succès.

### TECH-05 — Validation journalière non transactionnelle

- **Sévérité :** Haute
- **Fichiers :** `ReadingPlanScreen.tsx`, `progressService.ts`
- **Cause :** `Promise.all` déclenche une mutation par passage ; chacune recalcule ensuite activité et badges.
- **Impact :** état partiellement commité si une mutation échoue, charge backend inutile et divergence entre rollback UI et données persistées.
- **Solution :** créer une RPC transactionnelle idempotente `complete_reading_day`, renvoyer le nouvel état et effectuer une seule mise à jour d’activité/badges.

### TECH-06 — RPC `SECURITY DEFINER` insuffisamment bornées

- **Sévérité :** Haute
- **Fichiers :** migrations contenant `get_completed_days_count`, `update_user_activity`, calculs de badges
- **Cause :** certaines fonctions acceptent un `p_user_id` arbitraire sans imposer `p_user_id = auth.uid()` ni vérifier un rôle admin ; des droits d’exécution ont été accordés largement, y compris à `anon` pour un compteur.
- **Impact :** lecture d’indicateurs d’un autre utilisateur ou modification d’activité hors périmètre, selon les droits effectivement déployés.
- **Solution :** révoquer les droits publics inutiles, dériver l’identité depuis `auth.uid()`, réserver les opérations tierces au service role et fixer le `search_path` des fonctions privilégiées.

### TECH-07 — Inscription incomplète et consentements non prouvables

- **Sévérité :** Haute
- **Fichiers :** `AuthExtraScreens.tsx`, `authCore.ts`
- **Cause :** code Premium ignoré, plan sélectionné implicitement, acceptation des conditions non persistée.
- **Impact :** onboarding trompeur, activation impossible et aucune preuve/version de consentement.
- **Solution :** concevoir un service d’inscription transactionnel avec choix de plan, validation éventuelle du code et journal de consentement horodaté/versionné.

### TECH-08 — Erreurs Supabase converties en données vides

- **Sévérité :** Moyenne
- **Fichiers :** `progressService.ts`, hook de likes des versets
- **Cause :** certains `catch` retournent `[]` ou des métriques à zéro ; certaines mutations n’inspectent pas la propriété `error` renvoyée par Supabase.
- **Impact :** une panne ressemble à une absence de progression et les états optimistes peuvent rester faux.
- **Solution :** propager des erreurs typées, distinguer vide/chargement/erreur et centraliser la traduction utilisateur des erreurs.

### TECH-09 — TypeScript permissif et contournements `any`

- **Sévérité :** Moyenne
- **Fichiers :** `tsconfig.json`, écrans notifications/profil et services
- **Cause :** `strict`, `strictNullChecks` et `noImplicitAny` sont désactivés ; le schéma périmé est masqué par des casts.
- **Impact :** les ruptures de contrat base/client sont découvertes au runtime.
- **Solution :** régénérer d’abord les types Supabase, supprimer les casts structurants, puis activer progressivement `strictNullChecks` et `noImplicitAny`.

### TECH-10 — Configuration d’environnement fragile

- **Sévérité :** Moyenne
- **Fichiers :** `.env`, `.gitignore`, `src/integrations/supabase/client.ts`
- **Cause :** `.env` suivi par Git et fallback de production codé en dur.
- **Impact :** confusion développement/staging/production et absence d’échec explicite lorsqu’un build est mal configuré.
- **Solution :** retirer le fichier d’environnement du suivi, fournir `.env.example`, valider les variables au démarrage et faire tourner toute valeur réellement secrète qui aurait été exposée.

### TECH-11 — Historique de migrations non autosuffisant

- **Sévérité :** Haute
- **Fichiers :** `supabase/migrations/`
- **Cause :** plusieurs tables centrales (`profiles`, progression, chapitres, versets, audio) sont supposées préexistantes ; des migrations successives suppriment/recréent des objets avec des règles différentes.
- **Impact :** impossibilité de garantir qu’un environnement vierge reproduit la production, et dérive probable entre local et distant.
- **Solution :** capturer un baseline validé, ajouter les migrations manquantes sans réécrire l’historique déployé, puis comparer le schéma distant via un processus contrôlé.

### TECH-12 — Versions Expo non alignées au SDK

- **Sévérité :** Moyenne
- **Fichiers :** `package.json`, fichier de verrouillage
- **Cause :** plusieurs modules Expo sont en retard sur les versions correctives attendues par le SDK 57.
- **Impact :** correctifs natifs manquants et risque de comportement différent lors des builds.
- **Solution :** réaliser une mise à niveau groupée avec `expo install`, puis vérifier TypeScript, démarrage et deux builds de développement.

### TECH-13 — Absence de garde-fous automatisés

- **Sévérité :** Moyenne
- **Fichiers :** `package.json`, ensemble du dépôt
- **Cause :** aucun lint, test unitaire/intégration ou test de contrat n’est configuré.
- **Impact :** régressions sur progression, Premium et notifications difficiles à détecter avant publication.
- **Solution :** commencer par une suite courte et rentable : contrats Supabase, règles Premium, progression transactionnelle et smoke tests des parcours critiques.

### TECH-14 — Écrans monolithiques et code mort

- **Sévérité :** Moyenne
- **Fichiers :** `DashboardScreen.tsx`, `ReadingPlanScreen.tsx`, `ProfileDetailScreens.tsx`, `AudioPlayer.tsx`, anciens services/hooks
- **Cause :** responsabilités UI, accès données et logique métier assemblées dans les écrans ; plusieurs implémentations alternatives restent présentes mais inutilisées.
- **Impact :** corrections risquées, lecture difficile et maintien involontaire de règles concurrentes.
- **Solution :** extraire des hooks/services par cas d’usage, conserver une seule implémentation et supprimer le code mort après couverture minimale.

### TECH-15 — Deux moteurs de calcul des badges

- **Sévérité :** Moyenne
- **Fichiers :** `badgeService.ts`, migrations/RPC de badges
- **Cause :** critères et progression sont recalculés en JavaScript et en SQL, avec des conventions temporelles potentiellement différentes.
- **Impact :** badge visible mais non attribué, progression différente selon l’écran ou le fuseau.
- **Solution :** rendre le serveur canonique, renvoyer progression et nouveaux déblocages dans une réponse typée, et limiter le client à l’affichage.

## 5. Analyse Supabase

### 5.1 Authentification et profils

La persistance de session mobile est correctement configurée avec rafraîchissement automatique. Les routes principales disposent d’une protection. L’inscription écrit des métadonnées mais ne traite ni le code Premium ni la preuve de consentement. La récupération de mot de passe existe, sans parcours robuste pour les liens invalides ou expirés.

### 5.2 RLS et fonctions privilégiées

Les politiques avatar suivent une approche saine par dossier utilisateur. À l’inverse, certaines RPC privilégiées prennent un identifiant utilisateur fourni par l’appelant. Toute fonction `SECURITY DEFINER` doit être revue sur quatre points : contrôle de l’appelant, dérivation de `auth.uid()`, `search_path` fixe et droits `EXECUTE` minimaux.

Les règles Premium doivent être imposées au point d’accès aux données, pas seulement dans les écrans. L’état actuel protège certains changements de plan et certains calculs de badge, mais ne démontre pas une protection homogène de l’audio, de la progression au-delà de l’essai et des notifications.

### 5.3 Progression et changement de plan

La progression individuelle est fonctionnelle. La complétion de journée devrait devenir une transaction serveur. Le changement de plan supprime progression et badges avant réinitialisation : ce comportement est cohérent avec une remise à zéro, mais il doit être explicitement accepté par le produit et éventuellement précédé d’un export/historique.

L’expiration Premium remet le plan vers un plan canonique sans preuve que la progression incompatible est nettoyée ou migrée. Cela peut produire un mélange entre ancien plan et nouveau catalogue.

### 5.4 Notifications

Le backend présent est un backend **Web Push**, avec VAPID, préférences, fuseau, fenêtre d’envoi, déduplication et nettoyage d’abonnements expirés. Ce système doit être préservé pour la Web App. Il ne peut cependant pas recevoir directement des jetons Expo.

Le modèle recommandé est :

- `web_push_subscriptions` pour le Web, avec endpoint et clés VAPID ;
- `expo_push_tokens` pour Native, avec token, plateforme, appareil, dernière activité et révocation ;
- une table canonique de préférences indépendante du canal ;
- un journal/déduplication commun contenant canal, type, date logique et statut d’envoi ;
- un dispatcher qui choisit Web Push ou Expo sans modifier les fonctions Web déjà stables.

L’existence effective des secrets VAPID, tâches planifiées et fonctions déployées n’a pas été vérifiée. Aucun changement n’a été effectué sur le projet Supabase distant.

### 5.5 Fonctions Edge et confidentialité

La fonction de suppression vérifie le jeton, ce qui est positif, mais son contrat client doit être corrigé. L’export doit agréger au minimum profil, consentements, progression, likes, préférences, abonnements/appareils, historique de notifications pertinent et données Premium, dans les limites légales retenues.

### 5.6 Reproductibilité

Le dossier de migrations ne constitue pas un bootstrap complet de la base. Avant le Lot 1, il faut comparer le schéma distant au dépôt, documenter les objets hérités et produire un baseline. Cette étape est une vérification d’infrastructure, pas une invitation à réinitialiser la base de production.

## 6. Backlog technique V2

### Lot 1 — Essentiel : versets, Premium et lecture

#### L1-01 — Rendre Premium canonique côté serveur

- **Objectif :** modéliser essai de 30 jours, activation, expiration et droits d’accès dans une seule source de vérité.
- **Fichiers/zones :** migrations Supabase, RPC Premium, `usePremium.tsx`, services lecture/audio.
- **Dépendances :** décision sur date de début d’essai, plans canoniques et droits gratuits.
- **Critères d’acceptation :** règles identiques Web/Native ; accès refusé côté serveur après expiration ; tests utilisateur gratuit/Premium/admin ; aucune dépendance à un simple booléen UI.
- **Priorité / complexité :** P0 / Élevée.

#### L1-02 — Implémenter activation et récupération acheteur

- **Objectif :** rendre fonctionnels le code Premium à l’inscription et la reconnaissance manuelle d’un achat Web.
- **Fichiers/zones :** auth, écrans Premium, nouvelles RPC/tables d’activation.
- **Dépendances :** format, durée, usage unique et source des codes ; procédure support.
- **Critères d’acceptation :** code validé côté serveur, tentatives limitées et journalisées ; liaison acheteur contrôlée ; messages d’erreur explicites.
- **Priorité / complexité :** P0 / Élevée.

#### L1-03 — Livrer la bibliothèque de versets

- **Objectif :** remplacer l’écran placeholder par l’historique, filtres et actions de la Web App.
- **Fichiers/zones :** `app/verses.tsx`, `verseService.ts`, hooks likes/partage.
- **Dépendances :** schéma et taxonomie des thèmes.
- **Critères d’acceptation :** états chargement/vide/erreur, pagination, filtre, like avec rollback réel, partage et deep link.
- **Priorité / complexité :** P1 / Moyenne.

#### L1-04 — Transactionnaliser la progression journalière

- **Objectif :** garantir qu’une journée est entièrement validée ou pas du tout.
- **Fichiers/zones :** nouvelle RPC/migration, `progressService.ts`, `ReadingPlanScreen.tsx`.
- **Dépendances :** règles de badge et activité rendues canoniques.
- **Critères d’acceptation :** RPC idempotente, transaction unique, une seule invalidation, test d’échec intermédiaire et concurrence double-tap.
- **Priorité / complexité :** P0 / Moyenne.

#### L1-05 — Sécuriser les RPC et stabiliser le schéma

- **Objectif :** fermer les accès inter-utilisateurs et réconcilier migrations/types.
- **Fichiers/zones :** migrations, types Supabase, appels typés.
- **Dépendances :** inventaire du schéma distant en lecture seule.
- **Critères d’acceptation :** aucune RPC utilisateur ne fait confiance à un identifiant arbitraire ; droits minimaux ; types régénérés ; environnement neuf reproductible à partir d’un baseline documenté.
- **Priorité / complexité :** P0 / Élevée.

### Lot 2 — Audio, statistiques et push

#### L2-01 — Reconcevoir le moteur audio natif

- **Objectif :** supporter MP3 et, si légalement/techniquement compatible, YouTube, avec un player global.
- **Fichiers/zones :** provider racine, service audio, `AudioPlayer.tsx`, configuration native.
- **Dépendances :** choix de bibliothèque native et validation des conditions YouTube.
- **Critères d’acceptation :** play/pause, seek, vitesse, volume, précédent/suivant, reprise persistée, mini-player inter-écrans et gestion d’erreur.
- **Priorité / complexité :** P1 / Élevée.

#### L2-02 — Valider l’arrière-plan et la session média

- **Objectif :** commandes écran verrouillé et continuité audio iOS/Android.
- **Fichiers/zones :** configuration Expo/EAS, service audio natif.
- **Dépendances :** L2-01, comptes de build et appareils physiques.
- **Critères d’acceptation :** tests physiques pause/reprise, interruption, casque, verrouillage et retour au premier plan sur les deux plateformes.
- **Priorité / complexité :** P1 / Élevée.

#### L2-03 — Séparer Expo Push et Web Push

- **Objectif :** ajouter le canal Native sans régression Web.
- **Fichiers/zones :** nouvelles migrations, hooks mobile, fonctions register/unregister/dispatch.
- **Dépendances :** EAS `projectId`, secrets Expo, audit du Web Push déployé.
- **Critères d’acceptation :** inscription/révocation de chaque canal, préférences communes, déduplication, fuseau, token expiré nettoyé, deep links natifs, non-régression Web.
- **Priorité / complexité :** P0 / Élevée.

#### L2-04 — Compléter les statistiques et badges

- **Objectif :** parité des graphes Web et retour visuel lors d’un badge débloqué.
- **Fichiers/zones :** écrans statistiques, RPC agrégées, calcul badge serveur.
- **Dépendances :** règles métier de période et fuseau.
- **Critères d’acceptation :** semaine navigable, six mois mensuels, cartes conformes, popup de nouveau badge une seule fois.
- **Priorité / complexité :** P2 / Moyenne.

### Lot 3 — Onboarding, profil, confidentialité et support

#### L3-01 — Créer l’onboarding et finaliser l’auth

- **Objectif :** expliquer le produit, choisir le plan et traiter tous les états de récupération de mot de passe.
- **Fichiers/zones :** nouvelles routes onboarding, auth, stockage de complétion.
- **Dépendances :** contenu validé et L1-02.
- **Critères d’acceptation :** parcours skippable/rejouable selon décision, choix explicite du plan, deep link reset invalide/expiré géré.
- **Priorité / complexité :** P1 / Moyenne.

#### L3-02 — Mettre en place consentements versionnés

- **Objectif :** conserver la preuve et permettre la modification des consentements pertinents.
- **Fichiers/zones :** schéma consentements, inscription, profil, textes juridiques.
- **Dépendances :** validation juridique des finalités et versions.
- **Critères d’acceptation :** horodatage, version, source et retrait enregistrés ; export inclut l’historique requis.
- **Priorité / complexité :** P1 / Moyenne.

#### L3-03 — Corriger export et suppression RGPD

- **Objectif :** rendre les deux parcours exhaustifs et vérifiables.
- **Fichiers/zones :** profil, fonctions Edge, tables liées, stockage.
- **Dépendances :** cartographie des données et politique de rétention.
- **Critères d’acceptation :** export complet téléchargeable ; suppression authentifiée, idempotente et suivie d’une déconnexion ; cas d’échec expliqué.
- **Priorité / complexité :** P0 / Élevée.

#### L3-04 — Ajouter thèmes et centre d’aide

- **Objectif :** clair/sombre/système et aide comparable au Web.
- **Fichiers/zones :** tokens UI, layout, paramètres, `app/profile/help.tsx`.
- **Dépendances :** système de design et canal support.
- **Critères d’acceptation :** thème persistant sans flash ; FAQ catégorisée/recherchable ; formulaire support validé et anti-spam.
- **Priorité / complexité :** P2 / Moyenne.

### Lot 4 — Stabilisation, tests et publication

#### L4-01 — Nettoyer l’architecture et renforcer les types

- **Objectif :** réduire les écrans monolithiques et supprimer les implémentations mortes.
- **Fichiers/zones :** ensemble de `src/features/`, `tsconfig.json`.
- **Dépendances :** Lots 1–3 suffisamment stabilisés.
- **Critères d’acceptation :** une source de vérité par domaine, aucun cast masquant le schéma, `strictNullChecks` actif et build TypeScript vert.
- **Priorité / complexité :** P1 / Moyenne.

#### L4-02 — Installer les garde-fous CI minimaux

- **Objectif :** détecter les régressions critiques sans construire une suite excessive.
- **Fichiers/zones :** `package.json`, configuration lint/tests/CI.
- **Dépendances :** contrats stabilisés.
- **Critères d’acceptation :** lint, typecheck, tests ciblés Premium/progression/push/RGPD et smoke navigation exécutés à chaque PR.
- **Priorité / complexité :** P1 / Moyenne.

#### L4-03 — Aligner Expo et préparer les builds

- **Objectif :** mettre les modules au niveau attendu, configurer EAS et produire des builds de recette.
- **Fichiers/zones :** dépendances, `app.json`, configuration EAS.
- **Dépendances :** comptes Apple/Google/EAS et identifiants d’application.
- **Critères d’acceptation :** `expo install --check` propre, build iOS/Android réussi, configuration par environnement et checklist store complétée.
- **Priorité / complexité :** P1 / Moyenne.

#### L4-04 — Recette de parité et observabilité

- **Objectif :** valider les parcours V2 et rendre les incidents diagnosticables.
- **Fichiers/zones :** instrumentation, journalisation, plan de recette.
- **Dépendances :** builds de recette et environnement staging.
- **Critères d’acceptation :** scénarios gratuits/Premium, offline/reprise, notifications, audio et RGPD signés ; erreurs corrélables sans données sensibles.
- **Priorité / complexité :** P1 / Moyenne.

## 7. Recommandations d’implémentation

1. **Traiter le backend comme source de vérité.** Premium, progression journalière, badges et consentements doivent être calculés ou validés côté serveur.
2. **Ne pas fusionner Expo Push et Web Push dans une même structure.** Partager les préférences et le journal, pas les identifiants techniques de canal.
3. **Préserver la Web App.** Ajouter les tables et dispatchers Native par migrations additives ; ne pas remplacer les fonctions Web Push sans test de non-régression.
4. **Stabiliser les contrats avant les écrans.** Générer les types depuis le schéma cible et refuser les payloads invalides aux frontières.
5. **Faire du Lot 1 une tranche verticale.** Un utilisateur doit pouvoir s’inscrire, activer/récupérer Premium, lire, valider une journée et consulter ses versets avec autorisations serveur vérifiées.
6. **Adopter des migrations réparatrices.** Ne pas réécrire des migrations possiblement déployées ; ajouter une migration corrective après comparaison distante.
7. **Limiter les tests aux risques forts.** Prioriser autorisation Premium, transaction de lecture, contrats push, suppression/export et quelques smoke tests sur appareil.
8. **Échouer explicitement sur une configuration absente.** Supprimer les fallbacks silencieux de production et différencier développement, staging et production.
9. **Mesurer avant d’optimiser l’UI.** Les listes longues de lecture/versets devront être paginées ou virtualisées, mais après correction des contrats fonctionnels.
10. **Découper progressivement.** Extraire les cas d’usage des grands écrans au fil des lots, sans réécriture globale prématurée.

## 8. Points nécessitant validation

### Produit et métier

- La durée de 30 jours commence-t-elle à la création du compte, au choix du plan ou à la première lecture ?
- Quelles fonctions restent gratuites après l’essai : verset du jour, premiers jours de lecture, statistiques, audio, notifications ?
- Quel plan est attribué par défaut et que devient la progression à l’expiration ou au changement de plan ?
- Le paiement Native reste-t-il hors périmètre, ou faut-il prévoir achats in-app et contraintes stores ?
- Les sources YouTube sont-elles conservées dans Native, compte tenu des contraintes de lecture en arrière-plan et de contrôle média ?
- Quels consentements sont juridiquement nécessaires, avec quelles versions et durées de conservation ?

### Infrastructure et exploitation

- Quel est le schéma réellement déployé sur les environnements Supabase, notamment pour les notifications et fonctions privilégiées ?
- Les fonctions Edge, secrets VAPID, cron de rappels et traitements d’expiration Premium sont-ils déployés et actifs ?
- Les policies/RPC présentes en production correspondent-elles aux dernières migrations du dépôt ?
- Un projet EAS, des identifiants Apple/Google et des appareils de recette sont-ils disponibles ?
- Quel canal de support doit recevoir le formulaire d’aide ?
- Quel environnement constitue la référence pour la recette de non-régression Web ?

## 9. Méthode et vérifications réalisées

- Lecture et inspection visuelle du cahier des charges V2 et des deux inventaires fonctionnels fournis.
- Inventaire des routes, fonctionnalités, hooks, services, migrations, fonctions Edge et configuration Expo.
- Recherche des implémentations réellement raccordées, des placeholders et du code mort.
- Vérification TypeScript : réussie avec la configuration actuelle.
- Vérification de cohérence des dépendances : installation cohérente, mais plusieurs versions Expo à aligner sur les correctifs recommandés du SDK 57.
- Génération de la configuration Expo publique : réussie ; absence de `projectId` EAS confirmée.
- Aucun test métier automatisé n’était disponible ; aucun test de charge, build store, appel au Supabase distant ou envoi réel de notification n’a été effectué.

Les documents fournis expriment la cible et des inventaires déclaratifs. Lorsqu’ils divergent du dépôt, l’état attribué dans la matrice reflète le comportement démontrable dans le code au 21 octobre 2026.
