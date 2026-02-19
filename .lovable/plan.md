
## Utiliser `verse_likes` pour afficher le vrai nombre de likes dans VerseList

### Problème identifié

La page `/verses` (VerseList) appelle `getAllVersesUpToDay()` dans `verseService.ts`, qui fait un `select('*')` sur `daily_verses`. Cette table a bien une colonne `likes_count` maintenue par trigger, **mais** :

- Les versets "par défaut" (générés localement pour les jours sans entrée en base) n'ont pas de `likes_count`
- La requête actuelle ne fait pas de jointure avec `verse_likes`, donc si le trigger n'a pas correctement mis à jour `likes_count`, les totaux peuvent être désynchronisés

### Solution proposée

Modifier `getAllVersesUpToDay` dans `src/services/readingPlan/verseService.ts` pour **sélectionner avec jointure** :

```sql
-- Équivalent de ce que Supabase fera :
SELECT dv.*, COUNT(vl.id) as computed_likes
FROM daily_verses dv
LEFT JOIN verse_likes vl ON vl.verse_day_number = dv.day_number
WHERE dv.day_number <= maxDayNumber
GROUP BY dv.id
ORDER BY dv.day_number DESC
```

En code Supabase JS :
```typescript
const { data } = await supabase
  .from('daily_verses')
  .select('*, verse_likes(count)')
  .lte('day_number', maxDayNumber)
  .order('day_number', { ascending: false });
```

Puis normaliser le résultat pour extraire `verse_likes[0].count` comme `likes_count`.

### Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/services/readingPlan/verseService.ts` | Modifier `getAllVersesUpToDay` pour joindre `verse_likes` et calculer le vrai `likes_count` en temps réel |

### Détail de l'implémentation

Dans `getAllVersesUpToDay`, remplacer `select('*')` par `select('*, verse_likes(count)')`. Supabase retourne alors :

```json
{
  "id": "...",
  "day_number": 1,
  "likes_count": 5,  // colonne existante (trigger)
  "verse_likes": [{ "count": 5 }]  // jointure réelle
}
```

On utilise `verse_likes[0]?.count ?? 0` pour écraser `likes_count` avec la valeur calculée dynamiquement depuis la table `verse_likes`, garantissant ainsi la cohérence même si le trigger est en retard.

### Bénéfice

- Les likes affichés dans la liste seront **toujours exacts**, calculés depuis `verse_likes` en temps réel
- Aucun changement de schéma nécessaire
- La performance reste bonne car c'est une seule requête avec `LEFT JOIN` côté base
