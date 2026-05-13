# Plan de correction des notifications push

## Objectif
Rétablir l’envoi des notifications push Web en supprimant l’erreur `403 permission denied: invalid JWT provided`.

## Ce que je vais faire
1. **Éliminer l’ambiguïté sur les clés VAPID**
   - Retirer le fallback codé en dur côté Edge Functions.
   - Faire reposer l’envoi sur une seule source de vérité pour la paire VAPID utilisée au runtime.
   - Ajouter un contrôle explicite au démarrage qui échoue proprement si la paire est absente ou incohérente.

2. **Ajouter un diagnostic serveur plus précis**
   - Exposer des métadonnées sûres sur la config VAPID active (présence, longueurs, comparaison public key frontend/runtime, sans jamais exposer la clé privée).
   - Faire remonter dans la réponse de test un indicateur clair quand l’erreur provient de la signature VAPID et non de la souscription navigateur.

3. **Sécuriser le flux de réabonnement frontend**
   - Garder la récupération de la clé publique active depuis Supabase.
   - Forcer un resync propre de la souscription avant test si la clé associée à la souscription locale ne correspond plus.
   - Afficher dans le panneau de diagnostic l’état exact de correspondance entre clé frontend, clé runtime et souscription locale.

4. **Valider la cause racine avec un test ciblé**
   - Redéployer les Edge Functions concernées.
   - Rejouer un test d’envoi.
   - Vérifier dans les logs si l’erreur disparaît ou si elle confirme définitivement un problème de paire VAPID runtime à remplacer.

## Résultat attendu
- Si les secrets runtime sont corrects, les notifications repartent.
- Si les secrets runtime sont incohérents, l’app affichera un diagnostic clair indiquant qu’il faut remplacer la paire VAPID au lieu de continuer à échouer silencieusement.

## Détail technique
- Fichier frontend concerné : `src/services/pushService.ts`
- UI de diagnostic : `src/components/notifications/PushDiagnosticsPanel.tsx`
- Edge Functions :
  - `supabase/functions/send-push-notification/index.ts`
  - `supabase/functions/send-daily-reminders/index.ts`
  - `supabase/functions/send-daily-verse/index.ts`
  - `supabase/functions/get-vapid-public-key/index.ts`

## Hypothèse principale validée à ce stade
- La souscription navigateur a changé, donc le réabonnement fonctionne.
- La clé publique exposée par `get-vapid-public-key` est bien celle attendue.
- Le `403 invalid JWT` persiste malgré cela, ce qui pointe fortement vers une **paire VAPID runtime invalide ou non appairée** dans les secrets Supabase.