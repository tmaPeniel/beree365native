# Ecrans Profil detailles - architecture cible

Ce document decrit l'architecture fonctionnelle cible des ecrans Profil natifs. Les routes Expo Router restent dans `app/profile/*` et deleguent l'implementation aux ecrans de `src/features/profile/screens/`.

## Etat d'implementation

- `ProfileBadges` : implemente avec grille 3 colonnes, etat verrouille, cadenas et modal detail.
- `ProfileStatistics` : implemente avec `CircularProgress` XL, chips de periode et graphique `react-native-svg`.
- `ProfileNotifications` : implemente avec permission `expo-notifications`, toggles, horaires par chips, appareils et centre de notifications.
- `ProfileSubscription` et `PremiumScreen` : implementes cote UI, paiement reel a valider.
- `ReadingPlanSelection` : implemente depuis `/reading-plan` pour afficher les plans de lecture, distinguer selection/disponible/Premium/indisponible, confirmer le changement et rafraichir les caches de lecture.
- `ProfilePrivacy` : implemente avec consentements locaux, export JSON via partage et appel Edge Function de suppression.
- `ProfileHelp`, `ProfileAbout`, `Terms`, `CookiesPolicy` : implementes avec un rendu markdown natif leger.
- `ProfileEdit` : implemente avec formulaire natif et sauvegarde profil ; avatar pret cote UI, `expo-image-picker` reste a ajouter pour camera/galerie.

## Routes et responsabilites

| Route | Ecran cible | Responsabilite |
| --- | --- | --- |
| `/profile/badges` | `ProfileBadges` | Afficher les badges debloques/verrouilles et le detail d'un badge. |
| `/profile/statistics` | `ProfileStatistics` | Afficher la progression, les graphiques d'activite et les statistiques detaillees. |
| `/profile/notifications` | `ProfileNotifications` | Gerer les permissions push, les preferences, les appareils et le centre de notifications. |
| `/profile/subscription` | `ProfileSubscription` | Montrer le statut Gratuit/Premium et orienter vers l'activation Premium. |
| `/reading-plan` | `ReadingPlanSelection` | Afficher le catalogue des plans, selectionner un plan actif et expliquer les plans verrouilles ou indisponibles. |
| `/premium` | `PremiumScreen` | Presenter les avantages Premium, l'activation et le code promo. |
| `/profile/privacy` | `ProfilePrivacy` | Gerer les consentements, l'export et la suppression de compte. |
| `/profile/help` | `ProfileHelp` | Afficher l'aide en contenu natif. |
| `/profile/about` | `ProfileAbout` | Afficher les informations de l'application en contenu natif. |
| `/profile/edit` | `ProfileEdit` | Modifier avatar et informations de profil. |

## 4.1 ProfileBadges

- Grille 3 colonnes avec badges debloques et verrouilles.
- Tap sur un badge : modal detail avec image, nom, description, date d'obtention ou condition de deblocage.
- Badge verrouille : icone grisee, opacite reduite et cadenas visible.
- Donnees attendues : `badges`, `user_badges`, date `unlocked_at`, criteres de deblocage.
- UI recommandee : `FlatList` avec `numColumns={3}` et modal native.

## 4.2 ProfileStatistics

- `CircularProgress` XL : jours lus / total du plan.
- `ActivityChart` multi-periodes : `7j`, `30j`, `Tout`.
- Librairie graphique a valider : `victory-native` ou `react-native-svg-charts`.
- Stats detaillees : streak max, streak actuel, chapitres lus, jours actifs.
- Toggle periode : chips horizontaux.
- Donnees attendues : progression globale, historique d'activite quotidienne, streaks et total de chapitres.

## 4.3 ProfileNotifications

- Toggle principal : `Activer les notifications push`.
- Activation : demander la permission via `expo-notifications`, puis enregistrer le device cote backend/OneSignal.
- Sous-toggles :
  - Rappel quotidien avec time picker.
  - Verset du jour avec time picker.
  - Badges.
- Liste des appareils connectes pour la synchronisation multi-device.
- Centre de notifications : `FlatList` des notifications recues.
- Interactions du centre :
  - Swipe gauche pour supprimer.
  - Tap pour ouvrir le lien associe : verset, jour de lecture ou autre destination.
  - Badge non-lu avec point visuel.
- Backend attendu : table de preferences, table d'appareils, table de notifications utilisateur.

## 4.4 ProfileSubscription et Premium

- `ProfileSubscription` affiche une carte de statut :
  - Gratuit.
  - Premium actif avec date d'expiration si applicable.
  - Premium expire.
- Si Gratuit ou expire : CTA `Passer a Premium` vers `/premium`.
- `PremiumScreen` :
  - Hero visuel.
  - Liste d'avantages avec icones et titres.
  - Bouton `Activer`.
  - Champ code promo et bouton `Appliquer`.
- Paiement a valider business : `expo-in-app-purchases` ou RevenueCat.
- Donnees attendues : `is_premium`, `premium_start_date`, `premium_end_date`, `premium_source`, code promo valide cote serveur.

## 4.4bis ReadingPlanSelection

- Route : `/reading-plan`, accessible depuis le menu Profil.
- Donnees : `getReadingPlanCatalog()` consomme la RPC `get_reading_plan_catalog` quand elle est disponible, puis se replie sur les plans visibles par RLS.
- Etats UI :
  - `Actuel` : plan associe a `profiles.selected_plan_id`.
  - `Disponible` : plan actif selectionnable par l'utilisateur courant.
  - `Premium` : plan actif mais bloque par le gating Premium cote app et par la RPC `change_user_plan`.
  - `Indisponible` : plan inactif expose par le catalogue et non selectionnable.
- Changement de plan : confirmation native obligatoire, car `change_user_plan` remet la progression, les badges, la date de debut et le jour courant a zero.

## 4.5 ProfilePrivacy

- Toggles de consentement :
  - Analytics.
  - Marketing.
- Bouton `Exporter mes donnees` : declenchement d'un email contenant un export JSON.
- Bouton `Supprimer mon compte` : parcours confirme et irreversible.
- Backend attendu : stockage des consentements, Edge Function d'export, Edge Function de suppression de compte.

## 4.6 ProfileHelp, ProfileAbout, Terms et CookiesPolicy

- Rendu recommande : markdown natif avec `react-native-markdown-display` pour garder la coherence visuelle.
- Alternative : `react-native-webview` uniquement si le contenu doit venir d'une page HTML distante.
- Contenus cibles :
  - Aide.
  - A propos.
  - Conditions d'utilisation.
  - Politique cookies.
- Le contenu doit rester lisible en mobile, avec typographie et espacements du theme natif.

## 4.7 ProfileEdit

- Presentation cible : modal `formSheet` quand la plateforme le supporte, sinon ecran natif standard.
- Avatar tappable :
  - Choix camera ou galerie avec `expo-image-picker`.
  - Upload et sauvegarde de l'URL avatar cote Supabase.
- Champs valides :
  - Nom complet.
  - Email si modifiable selon les regles auth.
  - Date de debut du plan si exposee dans ce formulaire.
- Bouton `Enregistrer` sticky en bas.
- Validation recommandee : Zod avant envoi.

## Dependances a valider

- Graphiques : `victory-native` ou `react-native-svg-charts`.
- Markdown : `react-native-markdown-display`.
- WebView optionnelle : `react-native-webview`.
- Image picker : `expo-image-picker`.
- Paiement : RevenueCat ou `expo-in-app-purchases`, decision business requise.
- Swipe actions : `react-native-gesture-handler` avec une abstraction locale reutilisable.

## Ordre d'implementation conseille

1. Finaliser `ProfileBadges` et `ProfileStatistics`, car ils s'appuient surtout sur les donnees existantes.
2. Implementer `ProfileSubscription` et `PremiumScreen` sans paiement reel, avec CTA et code promo branche cote serveur plus tard.
3. Implementer `ProfileEdit` avec validation locale, puis upload avatar.
4. Implementer `ProfilePrivacy`, car export/suppression demandent des garanties backend.
5. Implementer `ProfileNotifications`, car multi-device, OneSignal et centre de notifications demandent schema backend et Edge Functions.
6. Migrer Help/About/Terms/CookiesPolicy en markdown natif.
