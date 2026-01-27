

## Plan : Simplifier l'affichage "Aujourd'hui" sur le Dashboard

### Problème identifié

Le composant `TodayDisplay` ressemble actuellement à un bouton interactif à cause de :
- Un fond coloré avec dégradé (`bg-gradient-to-r from-primary to-accent`)
- Une ombre prononcée (`shadow-lg`)
- Une animation au survol (`hover:animate-lift`)
- Des coins très arrondis (`rounded-xl`)

Ces éléments créent une attente d'interactivité qui n'existe pas.

---

## Solution proposée

Transformer le composant en un affichage textuel élégant et informatif, sans apparence de bouton.

### Nouveau design

```
Bienvenue [Prénom],

Aujourd'hui c'est le JOUR 45
lundi 27 janvier 2025
```

**Changements visuels :**
- Supprimer le fond coloré dégradé → texte sur fond transparent
- Supprimer l'ombre et l'animation hover
- Conserver une mise en évidence subtile pour le numéro du jour (couleur primary)
- Ajouter un séparateur visuel léger ou une icône calendrier optionnelle

---

## Modifications techniques

### Fichier : `src/components/TodayDisplay.tsx`

**Avant :**
```tsx
<div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-6 rounded-xl shadow-lg mb-6 hover:animate-lift transition-all duration-300 border-primary/20 py-[15px] border-0">
```

**Après :**
```tsx
<div className="mb-4">
  <p className="text-sm text-muted-foreground mb-1">Aujourd'hui c'est le</p>
  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
    JOUR <span className="text-primary">{dayNumber}</span>
  </h2>
  <p className="text-base text-muted-foreground capitalize">{formattedDate}</p>
</div>
```

### Changements clés

| Élément | Avant | Après |
|---------|-------|-------|
| Fond | Dégradé coloré | Transparent |
| Ombre | `shadow-lg` | Aucune |
| Animation hover | `hover:animate-lift` | Aucune |
| Coins | `rounded-xl` | Aucun |
| Padding | `p-6 py-[15px]` | `mb-4` (espacement seulement) |
| Numéro du jour | Blanc sur fond coloré | Couleur primary sur fond transparent |

### Suppression de l'import inutilisé

```tsx
// Supprimer cette ligne (non utilisée)
import DayNavigationControls from './DayNavigationControls';
```

---

## Aperçu du résultat

```
Bienvenue Jean,

Aujourd'hui c'est le
JOUR 45                    ← "45" en couleur primary (vert)
lundi 27 janvier 2025      ← Texte secondaire
```

Design épuré, informatif, et clairement non-interactif.

---

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/components/TodayDisplay.tsx` | Simplifier les styles, supprimer l'apparence de bouton |

