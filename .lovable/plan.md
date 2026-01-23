

## Plan : Augmenter la taille du Hero Card et positionner le texte en bas

### Objectif
Modifier le composant Hero Card sur la page Reading pour :
1. Augmenter significativement la hauteur du composant
2. Positionner le texte (titre du plan et barre de progression) en bas du composant

---

## Modification : `src/components/reading/FocusReadingView.tsx`

### Structure actuelle (lignes 88-125)
```tsx
<div className="relative overflow-hidden rounded-2xl text-primary-foreground">
  {/* Image de fond */}
  <img className="absolute inset-0 w-full h-full object-cover" />
  
  {/* Overlay avec padding simple */}
  <div className="relative bg-black/50 p-6">
    <div className="relative z-10">
      <h2>...</h2>
      <div>Progression...</div>
    </div>
  </div>
</div>
```

### Nouvelle structure proposée
```tsx
<div className="relative overflow-hidden rounded-2xl text-primary-foreground min-h-[200px]">
  {/* Image de fond - inchangée */}
  <img className="absolute inset-0 w-full h-full object-cover" />
  
  {/* Overlay avec flexbox pour ancrer le contenu en bas */}
  <div className="relative bg-black/50 min-h-[200px] p-6 flex flex-col justify-end">
    <div className="relative z-10">
      <h2>...</h2>
      <div>Progression...</div>
    </div>
  </div>
</div>
```

### Changements techniques

| Élément | Avant | Après |
|---------|-------|-------|
| Hauteur du container | Auto (basée sur le contenu) | `min-h-[200px]` (hauteur minimale fixe) |
| Overlay gradient | `p-6` simple | `min-h-[200px] p-6 flex flex-col justify-end` |
| Position du texte | En haut par défaut | Ancré en bas avec `justify-end` |

### Points clés
- `min-h-[200px]` : Fixe une hauteur minimale de 200px (ajustable selon vos préférences)
- `flex flex-col justify-end` : Utilise Flexbox pour pousser le contenu vers le bas
- L'image de fond s'adapte automatiquement grâce à `object-cover`
- Le motif décoratif BookOpen reste positionné en haut à droite

---

## Fichier modifié

| Fichier | Action |
|---------|--------|
| `src/components/reading/FocusReadingView.tsx` | Modifier les classes CSS du Hero Card |

