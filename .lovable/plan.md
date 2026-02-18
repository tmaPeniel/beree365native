
## Centrer l'en-tête de la page /profile

### Objectif

Passer le header de la page profil d'une disposition **horizontale** (avatar + texte côte à côte) à une disposition **verticale centrée** (avatar au-dessus, nom + email en dessous, bouton "Éditer le profil" en dessous), comme dans l'image de référence.

### Modification actuelle vs souhaitée

Actuellement (lignes 133-157 de `src/pages/Profile.tsx`) :
```
[ Avatar ]  Nom de l'utilisateur
            email@exemple.com

[Éditer le profil]
```

Après modification :
```
        [ Avatar ]
      Nom de l'utilisateur
        email@exemple.com
      [ Éditer le profil ]
```

### Modification : `src/pages/Profile.tsx`

Un seul bloc HTML à modifier — le header (lignes 133-157).

Remplacer `flex items-center space-x-4` par `flex flex-col items-center text-center` pour que les éléments s'empilent verticalement et soient centrés.

```tsx
<div className="bg-card border-b">
  <div className="px-6 py-8 flex flex-col items-center text-center">
    <Avatar className="h-20 w-20 mb-3">
      <AvatarImage src="" alt={userName} />
      <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
        {userInitials}
      </AvatarFallback>
    </Avatar>
    <h1 className="text-2xl font-bold text-foreground">{userName}</h1>
    <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => navigate('/profile/edit')}
      className="flex items-center gap-2 mt-4"
    >
      <Pencil className="h-4 w-4" />
      Éditer le profil
    </Button>
  </div>
</div>
```

### Détails visuels

- Avatar légèrement agrandi (h-16 → h-20) pour mieux correspondre au style de l'image
- `text-center` appliqué sur le conteneur pour centrer nom et email
- Espacement `mb-3` entre avatar et texte
- Bouton "Éditer le profil" centré naturellement grâce à `items-center` du parent

### Résumé

| Fichier | Modification |
|---------|-------------|
| `src/pages/Profile.tsx` | Changer la disposition du header de `flex` horizontal à `flex-col items-center text-center` |
