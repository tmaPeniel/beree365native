# 00 - Maintenance de la documentation

Ce document sert de regle de travail pour garder la documentation de Beree 365 a jour au fil des evolutions.

## Objectif

Chaque modification importante du code doit laisser une trace documentaire courte et utile. La documentation doit aider a comprendre :

- ce qui a change ;
- ou se trouve le code concerne ;
- quelle decision technique a ete prise ;
- ce qui reste a faire si le changement est partiel.

## Quand mettre a jour la documentation

Mettre a jour la documentation quand un changement touche :

- la navigation, les routes ou les ecrans Expo Router ;
- un flux utilisateur : auth, lecture, progression, badges, profil, premium, notifications ;
- le schema Supabase, les migrations, les policies RLS ou les Edge Functions ;
- un service partage dans `src/services/` ;
- un hook partage dans `src/hooks/` ;
- la configuration projet : Expo, TypeScript, Babel, Supabase, notifications, variables d'environnement ;
- une decision d'architecture ou une dette technique volontaire.

Pour une correction purement visuelle ou tres locale, une mise a jour documentaire n'est necessaire que si le comportement utilisateur ou le design system change.

## Ou documenter

| Type de changement | Document a mettre a jour |
| --- | --- |
| Vue generale, stack, demarrage, structure | `README.md` |
| Migration web vers Expo Native | `docs/mobile-migration-audit.md` |
| Routes, onglets, ecrans et parcours | `README.md` ou un nouveau document dedie |
| Tables, fonctions SQL, RLS, Edge Functions | `supabase/migrations/` et notes courtes dans `README.md` |
| Flux metier et interactions utilisateur | `docs/mobile-migration-audit.md` pendant la migration |
| Services, hooks, API internes | `docs/mobile-migration-audit.md` pendant la migration |
| Design system, composants, styles natifs | `src/mobile/styles.ts` et notes courtes dans `README.md` |

## Format recommande

Preferer des ajouts courts :

```md
### Nom du changement

- Contexte : pourquoi le changement existe.
- Code concerne : `chemin/du/fichier.ts`.
- Comportement : ce que l'utilisateur ou le systeme observe.
- Notes : limites, TODO ou decision technique.
```

## Suivi pendant la migration native

Pendant la migration Expo Native, distinguer clairement :

- **Actif** : code utilise par l'app native actuelle.
- **Historique web/PWA** : documentation ou fichiers conserves pour reference.
- **A adapter** : logique reutilisable mais pas encore branchee au mobile.
- **A supprimer plus tard** : elements gardes temporairement pour securiser la migration.

## Regle de travail pour Codex

Quand Codex modifie ce projet, il doit verifier si la documentation est impactee et mettre a jour le ou les fichiers concernes dans le meme tour de travail, sauf demande contraire explicite.
