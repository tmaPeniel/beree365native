# Harmonisation aux couleurs du logo Bérée

## Objectif
Éliminer toutes les couleurs vertes résiduelles (`green-*`, `emerald-*`) et garantir que l'app utilise systématiquement la palette du logo : **brun chaud `beree-500` (#a86d20)** + **or `sun` (#e8a82c)**, en light et dark mode.

## Diagnostic
Le système de tokens (`index.css`, `tailwind.config.ts`) est déjà correctement aligné sur brun/or. Le problème vient de **classes Tailwind vertes codées en dur** dans une vingtaine de composants/pages (legacy d'auth, spinners, célébrations, navigation).

## Changements

### 1. Tokens & palette (déjà OK — vérif seulement)
- `index.css` : `--primary` brun, `--accent` or → conservés
- `tailwind.config.ts` : palette `beree` brune + `sun` or → conservés
- Ajustement mineur : enrichir le dark mode si nécessaire (déjà cohérent)

### 2. Remplacer tous les `green-*` / `emerald-*` par tokens sémantiques

**Pages auth** (look brun/or au lieu de vert) :
- `src/pages/Login.tsx`, `Signup.tsx`, `SignupStep1.tsx`, `SignupStep2.tsx`, `ForgotPassword.tsx`, `Index.tsx`
- `src/components/AuthForm.tsx`
- Spinners : `border-green-500` → `border-primary`
- Boutons : `bg-green-600 hover:bg-green-700` → `bg-primary hover:bg-primary/90`
- Liens : `text-green-600 hover:text-green-700` → `text-primary hover:text-primary/80`
- Bordures cards : `border-t-green-500` → `border-t-primary`
- Titres succès : `text-green-600` → `text-primary`
- Encarts info : `bg-green-50 border-green-200 text-green-800` → `bg-secondary border-border text-secondary-foreground`

**Composants** :
- `src/components/ProgressStats.tsx` spinner → `border-primary`
- `src/components/DayNavigationControls.tsx` bouton "jour courant" → tons `secondary`/`primary`
- `src/components/admin/UserStatsTable.tsx` spinner → `border-primary`
- `src/components/animations/CelebrationEffects.tsx` : seul cas où le vert peut rester (validation/réussite). Réponse utilisateur : **remplacer par or** → `text-sun`, `shadow-sun/50`, `from-sun to-sun-deep`

### 3. Conserver
- Tons rouges `destructive` (erreurs)
- Verts dans graphiques de statistiques si présents et lisibles → re-mappés vers `accent`/`primary` également pour cohérence

### 4. Dark mode
- Tokens déjà adaptés (primary devient or pour le contraste)
- Vérifier que les nouvelles classes sémantiques fonctionnent visuellement dans `.dark`

## Hors scope
- Pas de changement de logique métier
- Pas de modification des images/illustrations
- Pas de refonte de layout

## Fichiers impactés (≈10)
`Login.tsx`, `Signup.tsx`, `SignupStep1.tsx`, `SignupStep2.tsx`, `ForgotPassword.tsx`, `Index.tsx`, `AuthForm.tsx`, `ProgressStats.tsx`, `DayNavigationControls.tsx`, `UserStatsTable.tsx`, `CelebrationEffects.tsx`

## Vérification
Après build, relancer `rg "green-|emerald-"` dans `src/` → doit retourner 0 résultat (hors commentaires).
