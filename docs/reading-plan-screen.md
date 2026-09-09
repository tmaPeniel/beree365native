# Écran Lecture — état d'implémentation

## Vues

- Vue Focus : vue mobile par défaut, centrée sur un jour avec rail horizontal scrollable sur tous les jours du plan et auto-positionnement sur le jour courant.
- Les pastilles du rail Focus ont une largeur fixe et désactivent le scaling texte localement pour éviter la troncature des numéros à deux ou trois chiffres.
- Les pastilles du rail Focus indiquent l'état de lecture avec la palette de l'application : neutre pour non lu, beige/doré doux pour en cours, cuivre doux pour terminé.
- Vue Grille : organisation par blocs mensuels, cartes de jour en deux colonnes et recherche locale sur les passages. Toute la carte ouvre directement le jour en vue Focus ; les actions de progression restent indépendantes.
- La préférence de vue est persistée localement sous la clé `reading-view-mode` avec les valeurs `focus` ou `grid`.

## Logique métier raccordée côté UI et données

- Le jour courant suit la règle `clamp(1, duration_days, today - start_date + 1)` via `useDateService`.
- Les vues Focus et Grille consomment `getUserReadingPlanProgress(userId)` pour récupérer les passages du plan sélectionné et les statuts déjà cochés dans `user_progress`.
- `getUserReadingPlanProgress` évite les gros filtres `.in("chapter_id", [...])` sur tout un plan : les progressions de l'utilisateur sont chargées par `user_id`, puis filtrées côté app, afin d'éviter les erreurs Supabase/PostgREST `400 Bad Request` sur les plans longs.
- Les coches de passages sont optimistes : l'état visuel change immédiatement dans le cache React Query.
- En cas d'erreur de synchronisation, l'écran rollback le cache et affiche une alerte utilisateur.
- La recherche filtre côté client les passages déjà chargés.
- Les dates de la vue Focus et le regroupement mensuel de la vue Grille sont calculés depuis `profile.start_date` avec `getDateForDay`, puis formatés en français avec `date-fns`.
- La vue Focus attend la fin du calcul `useDateService` avant d'initialiser le jour sélectionné, afin que le rail affiche le vrai jour courant (`156`, `98`, etc.) et non un jour temporaire de chargement.

## Lecture audio du jour

- La vue Focus charge l'audio associe au jour selectionne via `useDailyAudio(planId, dayNumber)`.
- Le schema Supabase actif expose `audio_readings` avec `plan_id`, `day_number`, `source_type`, `source_url`, `youtube_url` et `duration_seconds`.
- La requete audio filtre toujours par `plan_id` et `day_number`; elle ne charge jamais un audio uniquement par numero de jour.
- `audioService.ts` normalise la source en `AudioSource` avec `sourceType: "youtube" | "mp3"` pour preparer une future lecture MP3 sans changer l'interface de l'ecran.
- `AudioPlayer.tsx` affiche un FAB audio flottant au-dessus de la navigation. Un appui ouvre désormais un lecteur immersif plein écran et lance ou reprend l'audio.
- Le FAB ferme suit le rendu de reference : cercle cuivre compact, icone Play/Pause blanche et anneau de progression cuivre/clair autour du bouton.
- Quand le lecteur est ouvert, le FAB est masque. Le lecteur utilise une modale native plein écran afin de recouvrir aussi la barre d'onglets. Le bouton chevron en haut réduit l'interface ; un nouvel appui sur le FAB restaure le plein écran.
- Le lecteur personnalisé Bérée suit une direction sombre et immersive : logo de marque recadré dans le disque cuivre, titre continu et défilable listant les passages du jour, numéro du jour mis en évidence, forme d'onde pressable, temps courant/durée, retour 10 secondes, Play/Pause central et avance 10 secondes.
- Les commandes Play/Pause envoyees par le FAB sont dedupliquees par identifiant pour eviter plusieurs ordres de lecture simultanes.
- La forme d'onde sert de barre de progression : un appui déplace directement la lecture à la position correspondante et distingue clairement la portion déjà lue.
- Le FAB utilise une pulsation discrète quand l'audio est disponible, un rebond au toucher, et le lecteur apparaît/disparaît avec une animation courte de fondu + translation.
- Le plein écran respecte les zones sûres iOS et Android et bascule temporairement la barre d'état en mode clair.
- Quand le lecteur est réduit, le player reste monté afin de conserver sa position et son état de lecture.
- Pour les sources YouTube, `react-native-youtube-iframe` est rendu hors écran dans une zone d'un pixel : l'utilisateur ne voit ni la vidéo, ni les contrôles, ni l'interface YouTube.
- Si aucun audio n'existe, le composant n'est pas affiche. Si le chargement est en cours, un skeleton discret apparait. Si une erreur survient, l'ecran de lecture reste utilisable et affiche seulement "Audio indisponible".

## Raccord backend

La mutation utilise `toggleChapterStatus(userId, chapterId, currentStatus)`, qui applique déjà :

1. INSERT/UPDATE `user_progress` avec `status` et `completed_at`.
2. `ActivityService.updateUserActivity(userId)`.
3. `calculateUserBadges(userId)`.
4. Invalidation des caches React Query liés au plan/progression côté écran.
