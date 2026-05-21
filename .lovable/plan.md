## Objectif
Corriger définitivement l’ancien logo visible dans la PWA installée, puis clarifier et fiabiliser le comportement des clés VAPID pour éliminer le faux diagnostic autour du pairing.

## Ce que je vais faire
1. **Uniformiser toutes les icônes PWA sur le nouveau logo**
   - Vérifier et corriger les références encore incohérentes entre `index.html`, `manifest.json`, `vite.config.ts` et `public/sw.js`.
   - Remplacer les anciennes ressources encore présentes ou ambiguës (`favicon.ico`, anciens fichiers `pwa-*`, référence erronée `beree-logo.png.png`).
   - S’assurer que les tailles 192x192, 512x512 et Apple touch icon pointent bien vers le nouveau logo généré.

2. **Corriger la configuration PWA pour éviter que l’ancien logo persiste sur appareil**
   - Nettoyer la config manifest injectée par Vite PWA pour qu’elle corresponde aux vrais fichiers publics.
   - Prévoir un mécanisme de mise à jour propre afin que l’icône utilisée par l’app installée se rafraîchisse correctement au prochain chargement/publication.
   - Vérifier si l’ancien `favicon.ico` peut reprendre la main sur certains appareils et le retirer si nécessaire.

3. **Fiabiliser le diagnostic VAPID côté app**
   - Garder le constat principal : un hash/digest affiché dans l’interface Supabase Secrets n’est pas la valeur runtime réelle et n’explique pas à lui seul le mismatch.
   - Améliorer le diagnostic utilisateur côté app pour afficher plus clairement :
     - la clé publique runtime réellement servie,
     - si l’abonnement courant a été créé avec une ancienne clé,
     - et si le problème vient d’un vrai mismatch public/privé ou d’une souscription navigateur obsolète.

4. **Ajouter un chemin de resynchronisation propre pour les tests push**
   - Ajouter l’action de resouscription forcée prévue dans le panneau de diagnostic.
   - Désabonner puis recréer proprement l’abonnement web courant pour qu’il utilise la clé VAPID active.

## Réponse à ton doute sur Supabase Secrets
Le fait que Supabase affiche une version masquée / digestée dans l’UI des secrets est normal : **ce n’est pas cette valeur affichée qui est lue par l’Edge Function**. À l’exécution, la fonction reçoit bien la vraie valeur stockée. Donc si `send-push-notification` détecte un mismatch, la cause la plus probable reste :
- soit une vraie paire public/privé non correspondante,
- soit un ancien abonnement navigateur encore lié à une ancienne clé publique.

## Détail technique
- Fichiers ciblés : `vite.config.ts`, `index.html`, `public/manifest.json`, `public/sw.js`, `src/services/pushService.ts`, `src/components/notifications/PushDiagnosticsPanel.tsx`
- Validation prévue :
  - vérifier que les références d’icônes convergent toutes vers le nouveau logo,
  - confirmer côté diagnostic que la clé VAPID runtime est bien récupérée,
  - et que la resouscription recrée un abonnement aligné avec la clé active.