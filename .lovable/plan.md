

## Plan : Intégrer le DatePicker dans "Mon plan actuel" et corriger le positionnement de l'expandable

### Problèmes identifiés

1. **Section "Mon plan actuel"** : Actuellement statique, doit devenir cliquable avec un contenu expandable contenant le DatePicker.

2. **Section "Changer de plan"** : Le contenu expandable est positionné **après la grille entière** (ligne 399) au lieu d'être directement sous la carte sélectionnée.

---

## Solution proposée

### 1. Mon plan actuel - Ajouter l'expandable avec DatePicker

**Structure actuelle :**
```
[Card du plan actuel - statique]
[Section Date de début - séparée]
```

**Nouvelle structure :**
```
[Card du plan actuel - cliquable avec ChevronDown]
   └── [Contenu expandable avec DatePicker et stats]
```

**Changements :**
- Ajouter un état `isCurrentPlanExpanded` pour gérer l'expansion
- Ajouter un indicateur ChevronDown sur la carte
- Déplacer le DatePicker dans le contenu expandable
- Supprimer la section "Date de début" séparée

---

### 2. Changer de plan - Corriger le positionnement

**Problème actuel :**
```tsx
<div className="grid grid-cols-2 gap-3">
  {plans.map(plan => <Card />)}
</div>
{/* Expandable ICI - après toute la grille */}
{expandedPlan && <ExpandedContent />}
```

**Solution - Approche par paires :**
Grouper les plans par paires (lignes de 2) et insérer l'expandable après la ligne contenant le plan sélectionné.

```tsx
{planPairs.map((pair, index) => (
  <React.Fragment key={index}>
    {/* Ligne de 2 cartes */}
    <div className="grid grid-cols-2 gap-3">
      {pair.map(plan => <Card />)}
    </div>
    
    {/* Expandable s'affiche si un plan de cette ligne est sélectionné */}
    {pair.some(p => p.id === expandedPlanId) && expandedPlan && (
      <ExpandedContent />
    )}
  </React.Fragment>
))}
```

---

## Modifications techniques

### Fichier : `src/pages/ReadingPlanManagement.tsx`

#### 1. Nouvel état pour l'expansion du plan actuel

```tsx
const [isCurrentPlanExpanded, setIsCurrentPlanExpanded] = useState(false);
```

#### 2. Nouvelle section "Mon plan actuel" avec expandable

```tsx
{currentPlan && (
  <section className="space-y-3">
    <h2 className="text-base font-semibold text-foreground">Mon plan actuel</h2>
    
    {/* Carte cliquable */}
    <Card 
      className="overflow-hidden border-primary/20 cursor-pointer"
      onClick={() => setIsCurrentPlanExpanded(!isCurrentPlanExpanded)}
    >
      <div className="relative h-28">
        {/* Image et contenu existant */}
        ...
        {/* Ajouter indicateur ChevronDown */}
        <div className={`absolute top-3 left-3 p-1 rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 ${isCurrentPlanExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
    </Card>
    
    {/* Contenu expandable avec DatePicker */}
    {isCurrentPlanExpanded && userProfile?.start_date && (
      <div className="p-4 bg-card rounded-xl border border-border space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Date de début */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Date de début :</p>
            <p className="font-semibold">{format(...)}</p>
          </div>
          <Popover>... {/* DatePicker */}</Popover>
        </div>
        
        {/* Stats du plan */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{currentPlan.duration_days} jours</span>
          <span>{passageCounts?.[currentPlan.id]} passages</span>
        </div>
        
        {/* Description si disponible */}
        {currentPlan.description && (
          <p className="text-sm text-muted-foreground">{currentPlan.description}</p>
        )}
      </div>
    )}
  </section>
)}
```

#### 3. Grouper les plans par paires et corriger le positionnement

```tsx
// Créer des paires de plans
const planPairs = React.useMemo(() => {
  if (!availablePlans) return [];
  const pairs: ReadingPlan[][] = [];
  for (let i = 0; i < availablePlans.length; i += 2) {
    pairs.push(availablePlans.slice(i, i + 2));
  }
  return pairs;
}, [availablePlans]);

// Dans le JSX
{planPairs.map((pair, pairIndex) => (
  <React.Fragment key={pairIndex}>
    <div className="grid grid-cols-2 gap-3">
      {pair.map(plan => (
        <PlanCard key={plan.id} ... />
      ))}
    </div>
    
    {/* Expandable directement après cette ligne si un plan de la paire est sélectionné */}
    {pair.some(p => p.id === expandedPlanId) && expandedPlan && (
      <div className="p-4 bg-card rounded-xl border ...">
        {/* Contenu expandable existant */}
      </div>
    )}
  </React.Fragment>
))}
```

---

## Suppression

| Élément | Action |
|---------|--------|
| Section "Date de début" séparée (lignes 270-336) | Supprimer (intégrée dans l'expandable du plan actuel) |

---

## Résultat attendu

```
┌─────────────────────────────────────┐
│  Mon plan actuel              ▼     │  <- Cliquable
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Date de début: 15 janvier 2025     │  <- Expandable
│  [Modifier la date]                 │
│  365 jours • 365 passages           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Changer de plan                    │
└─────────────────────────────────────┘
┌──────────┐  ┌──────────┐
│  Plan 1  │  │  Plan 2  │   <- Sélectionner Plan 2
└──────────┘  └──────────┘
┌─────────────────────────────────────┐
│  Détails Plan 2                     │   <- Expandable directement en dessous
│  [Sélectionner ce plan]             │
└─────────────────────────────────────┘
┌──────────┐  ┌──────────┐
│  Plan 3  │  │  Plan 4  │
└──────────┘  └──────────┘
```

---

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/pages/ReadingPlanManagement.tsx` | Refactorisation complète des deux sections |

