

## Ajouter un onboarding pour les nouveaux utilisateurs

### Principe

Au lancement, l'app verifie `localStorage` (`beree-onboarding-completed`). Si absent, afficher 3 ecrans d'onboarding swipables avant la page d'accueil. Une fois termine ou skippe, stocker la valeur et ne plus jamais l'afficher.

### Flux

```text
App lance → Splash → onboarding vu ? 
                        Non → Onboarding (3 slides) → Page Index
                        Oui → Page Index
```

### Ecrans d'onboarding (3 slides)

1. **Bienvenue** -- Logo + "Parcourez la Bible en un an" + description courte
2. **Votre plan de lecture** -- Icone livre + "Choisissez parmi 4 plans adaptes a votre rythme"
3. **Suivez votre progression** -- Icone graphique + "Badges, statistiques et versets du jour" + bouton "Commencer"

Chaque slide : illustration/icone, titre, sous-titre. Navigation par dots + swipe. Bouton "Passer" en haut a droite sur chaque slide sauf le dernier.

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| `src/components/Onboarding.tsx` | Creer -- composant plein ecran avec 3 slides, dots, swipe, bouton Passer/Commencer |
| `src/App.tsx` | Modifier -- ajouter un etat `onboardingDone` (lu depuis localStorage), afficher `<Onboarding>` entre le splash et le router si pas encore vu |

### Detail technique

- **Stockage** : `useLocalStorage('beree-onboarding-completed', false)` (hook existant dans le projet)
- **Swipe** : gestion tactile avec `onTouchStart`/`onTouchEnd` natifs (pas de dependance supplementaire)
- **Animations** : transitions CSS `translate-x` entre slides, fade sur les dots
- **Bouton "Passer"** : marque l'onboarding comme complete et ferme
- **Bouton "Commencer"** (dernier slide) : idem
- **Integration dans App.tsx** : apres `splashComplete && !onboardingDone`, afficher `<Onboarding onComplete={() => setOnboardingDone(true)} />`, sinon afficher le `BrowserRouter` normalement

