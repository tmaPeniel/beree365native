
## Ajouter un graphique en barres hebdomadaire dans /profile/statistics

### Objectif

Ajouter une nouvelle Card sous les statistiques existantes avec un graphique en barres (BarChart via recharts) affichant le nombre de passages cochés pour chaque jour de la semaine en cours (Lun → Dim).

### Architecture technique

`recharts` est déjà installé. Le composant `ChartContainer` de `src/components/ui/chart.tsx` est disponible et suit les conventions du projet. Il sera utilisé pour encapsuler le `BarChart`.

### Données à récupérer

Une nouvelle fonction `getWeeklyDailyBreakdown` sera ajoutée dans `ProfileStatistics.tsx`. Elle :
1. Calcule les 7 dates de la semaine en cours (lundi → dimanche)
2. Requête `user_progress` avec `completed_at` entre lundi 00h00 et aujourd'hui
3. Regroupe les résultats par jour et retourne un tableau de 7 objets :

```typescript
[
  { day: 'Lun', count: 3 },
  { day: 'Mar', count: 1 },
  { day: 'Mer', count: 0 },
  { day: 'Jeu', count: 5 },
  { day: 'Ven', count: 2 },
  { day: 'Sam', count: 0 },
  { day: 'Dim', count: 0 },
]
```

### Graphique

Utilisation de `BarChart` de recharts, encapsulé dans `ChartContainer` :
- Axe X : jours de la semaine (Lun, Mar, ..., Dim)
- Axe Y : nombre de passages (entiers, minimum 0)
- Couleur des barres : `hsl(var(--primary))`
- Tooltip simple au survol
- Hauteur fixe adaptée mobile : environ 160px

### Nouvelle Card à insérer dans `ProfileStatistics.tsx`

Placée entre les stats détaillées (grille 2 colonnes) et la fin du contenu :

```
┌─────────────────────────────────────────┐
│  ACTIVITÉ DE LA SEMAINE                 │
│                                         │
│   5 ┤     ████                          │
│   4 ┤     ████                          │
│   3 ┤████ ████      ████                │
│   2 ┤████ ████ ████ ████                │
│   1 ┤████ ████ ████ ████ ████           │
│   0 └──────────────────────────         │
│     Lun Mar Mer Jeu Ven Sam Dim         │
└─────────────────────────────────────────┘
```

### Résumé des modifications

| Fichier | Modification |
|---------|-------------|
| `src/pages/ProfileStatistics.tsx` | Ajout de `getWeeklyDailyBreakdown`, un `useQuery`, les imports recharts/chart, et une nouvelle Card avec `BarChart` |

Aucune modification de base de données ou edge function nécessaire.
