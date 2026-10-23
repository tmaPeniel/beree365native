# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Lecteurs francophones utilisant Bérée 365 pour suivre quotidiennement un plan de lecture biblique sur mobile. Cette définition est déduite des écrans, documents fonctionnels et audits du dépôt.

## Product Purpose

Bérée 365 accompagne une lecture biblique quotidienne : passages du jour, progression, verset quotidien, favoris, statistiques, badges et contenus audio. La réussite signifie que l’utilisateur peut reprendre son parcours de manière fiable sur le Web et sur mobile.

## Operating Context

Application Expo/React Native pour iOS et Android, connectée à la même base Supabase que la Web App. Le backend existant doit rester compatible avec le Web ; les changements de base nécessitent une validation explicite du propriétaire du produit.

## Capabilities and Constraints

- Supabase reste la source de vérité pour l’authentification, les profils, les plans, la progression, Premium, les consentements et les préférences.
- Le mobile doit s’adapter aux contrats existants avant d’envisager une modification de base.
- Les opérations sensibles doivent dériver l’utilisateur de la session authentifiée.
- Les fonctions Native incomplètes sont livrées progressivement sans casser les parcours Web existants.
- Les règles commerciales Premium, le comportement lors d’un changement de plan et le canal Push Native restent des décisions ouvertes. Le paiement intégré est reporté à un lot ultérieur.

## Brand Commitments

Le produit s’appelle Bérée 365. L’interface existante emploie une palette chaude et sobre, une typographie Inter, des surfaces claires et un ton français simple, rassurant et direct.

## Evidence on Hand

- Cahier des charges et documents fonctionnels fournis par le propriétaire.
- Audits techniques dans `docs/audits/`.
- Implémentation Native existante dans `app/` et `src/features/`.
- Aucun témoignage, chiffre marketing ou contenu éditorial externe ne doit être inventé.

## Product Principles

- Préserver la continuité entre Web et Native.
- Rendre la progression quotidienne simple et fiable.
- Montrer clairement les états de chargement, d’absence de données et d’erreur.
- Ne jamais présenter une fonction comme active tant que son contrat serveur n’existe pas.
- Conserver une expérience lisible et accessible sur iOS et Android.
