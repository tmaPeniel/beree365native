
## Ajouter la navigation hebdomadaire et la vue mensuelle dans les statistiques

### Objectif

Enrichir la section "Activite de la semaine" avec :
1. Des fleches de navigation pour consulter les semaines precedentes du mois en cours
2. Un systeme d'onglets (Semaine / Mois) pour basculer entre la vue jour par jour et une vue mensuelle avec un baton par semaine

### Architecture UI

```text
┌─────────────────────────────────────────┐
│  ACTIVITE                               │
│  [ Semaine ]  [ Mois ]     <- onglets   │
│                                         │
│  VUE SEMAINE :                          │
│  < Sem. 3 mars 2026 >   <- navigation   │
│   5 |     ████                          │
│   3 |████ ████      ████                │
│   0 └────────────────────               │
│     Lun Mar Mer Jeu Ven Sam Dim         │
│                                         │
│  VUE MOIS :                             │
│  < Mars 2026 >           <- navigation  │
│  10|████                                │
│   8|████ ████                           │
│   5|████ ████ ████                      │
│   0└────────────────                    │
│    Sem 1 Sem 2 Sem 3 Sem 4              │
└─────────────────────────────────────────┘
```

### Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/pages/ProfileStatistics.tsx` | Refonte de la section graphique avec onglets, navigation et nouvelles fonctions de donnees |

### Detail technique

#### 1. Etat local pour la navigation

- `viewMode` : `'week'` ou `'month'` (onglet actif)
- `weekOffset` : nombre entier (0 = semaine courante, -1 = semaine precedente, etc.), borne aux semaines du mois en cours
- `monthOffset` : nombre entier (0 = mois courant, -1 = mois precedent)

#### 2. Fonction `getWeeklyDailyBreakdown` parametree

Modifier la fonction existante pour accepter un `weekOffset` :
- Calcul du lundi de la semaine ciblee a partir de l'offset
- Meme logique de requete et regroupement par jour

#### 3. Nouvelle fonction `getMonthlyWeeklyBreakdown`

- Prend `userId` et `monthOffset`
- Calcule le 1er et dernier jour du mois cible
- Requete `user_progress` sur toute la plage du mois
- Regroupe les resultats par semaine (Sem 1 = jours 1-7, Sem 2 = jours 8-14, etc.)
- Retourne un tableau : `[{ week: 'Sem 1', count: 12 }, { week: 'Sem 2', count: 8 }, ...]`

#### 4. Queries React Query

- `weeklyBreakdown` : queryKey inclut `weekOffset` pour refetch automatique lors de la navigation
- Nouveau `monthlyBreakdown` : queryKey inclut `monthOffset`

#### 5. Composant UI

- Utilisation des composants `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` deja disponibles dans le projet
- Fleches de navigation avec `ChevronLeft` / `ChevronRight` de lucide-react
- Label central affichant la periode (ex: "Sem. 3 - Mars 2026" ou "Mars 2026")
- Limitation : pas de navigation au-dela du mois en cours pour la vue semaine, ni au-dela de 6 mois pour la vue mensuelle

#### 6. Limites de navigation

- Vue semaine : on ne peut pas aller au-dela de la 1ere semaine du mois en cours (vers le passe) ni apres la semaine courante (vers le futur)
- Vue mois : on peut remonter jusqu'a 6 mois en arriere, pas au-dela du mois courant vers le futur
