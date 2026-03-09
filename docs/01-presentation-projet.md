# 01 - Présentation du Projet Beree

## 1.1 Mission

**Beree** est une application web progressive (PWA) de lecture biblique quotidienne. Elle accompagne l'utilisateur dans un parcours structuré de lecture de la Bible sur 6 ou 12 mois, avec suivi de progression, badges de motivation, versets quotidiens et notifications push.

**Éditeur** : SISAP Editions

## 1.2 Objectifs

- Permettre à l'utilisateur de lire l'intégralité de la Bible en suivant un plan structuré (180 ou 365 jours)
- Offrir un suivi de progression quotidien (passages lus, jours complétés, pourcentage global)
- Motiver l'utilisateur via des badges de récompense débloqués automatiquement
- Proposer un verset du jour avec système de likes communautaire
- Envoyer des rappels quotidiens via notifications push (OneSignal)
- Supporter le mode clair/sombre et être mobile-first

## 1.3 Stack Technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + shadcn/ui (Radix UI) |
| **State Management** | React Context (Auth) + TanStack React Query (données) |
| **Routing** | React Router DOM v6 |
| **Backend / BDD** | Supabase (PostgreSQL, Auth, Edge Functions, Storage) |
| **Notifications** | OneSignal (push notifications) |
| **Graphiques** | Recharts |
| **Animations** | CSS Keyframes Tailwind (fade-in, slide-up, press, badge-glow, etc.) |
| **PWA** | vite-plugin-pwa + Service Worker |
| **Validation** | Zod + React Hook Form |

## 1.4 Architecture Globale

```
┌─────────────────────────────────────┐
│         Frontend (React PWA)        │
│  ┌──────────┐  ┌──────────────────┐ │
│  │  Pages    │  │   Components     │ │
│  └──────────┘  └──────────────────┘ │
│  ┌──────────┐  ┌──────────────────┐ │
│  │  Hooks   │  │   Services       │ │
│  └──────────┘  └──────────────────┘ │
└──────────────┬──────────────────────┘
               │ Supabase JS Client
┌──────────────▼──────────────────────┐
│         Supabase Backend            │
│  ┌──────────┐  ┌──────────────────┐ │
│  │ Auth     │  │ PostgreSQL       │ │
│  └──────────┘  └──────────────────┘ │
│  ┌──────────┐  ┌──────────────────┐ │
│  │ Edge Fn  │  │ Storage          │ │
│  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         OneSignal (Push)            │
└─────────────────────────────────────┘
```

## 1.5 Plans de Lecture Disponibles

| Plan | Durée | Type |
|------|-------|------|
| Canonique 6 mois | 180 jours | Ordre canonique (Genèse → Apocalypse) |
| Canonique 12 mois | 365 jours | Ordre canonique (Genèse → Apocalypse) |
| Chronologique 6 mois | 180 jours | Ordre chronologique des événements |
| Chronologique 12 mois | 365 jours | Ordre chronologique des événements |

Chaque plan contient des **passages** (chapitres bibliques) répartis par jour. Un jour peut avoir 1 à N passages.

## 1.6 Rôles Utilisateur

| Rôle | Permissions |
|------|-------------|
| `user` | Accès à toutes les fonctionnalités standard (lecture, profil, badges, versets) |
| `admin` | Accès au tableau de bord admin (statistiques globales, gestion des utilisateurs) |

Les rôles sont stockés dans une table dédiée `user_roles` (jamais dans le profil).

## 1.7 URL de Production

- **Application** : https://beree-365.lovable.app
- **Supabase Project ID** : `xizlfyrjhzkzdchjezfn`
