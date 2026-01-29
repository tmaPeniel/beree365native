

## Plan : Corriger le flux de réinitialisation de mot de passe

### Problèmes identifiés

1. **SplashScreen bloque le traitement du token** (3 secondes de délai avant que le BrowserRouter soit monté)
2. **Race condition** entre `useAuth.tsx` et `ResetPassword.tsx` qui ont chacun leur propre listener `onAuthStateChange`
3. **Timeouts insuffisants** dans `ResetPassword.tsx`
4. **Le hash URL peut être consommé** avant que le listener soit actif

---

## Solution proposée

### Approche : Traitement du hash en amont + bypass du SplashScreen

1. Détecter immédiatement si l'URL contient un token de recovery (`#access_token=...&type=recovery`)
2. Si oui, bypasser le SplashScreen pour monter le BrowserRouter immédiatement
3. Utiliser `supabase.auth.setSession()` ou `supabase.auth.exchangeCodeForSession()` pour gérer le token de manière explicite
4. Éviter les conflits avec le listener dans `useAuth.tsx`

---

## Modifications techniques

### Fichier 1 : `src/hooks/useSplashScreen.tsx`

Ajouter une détection du recovery token pour bypasser le splash.

```tsx
import { useState, useEffect } from 'react';

const SPLASH_DURATION = 3000;

// Vérifie si l'URL contient un token de recovery
const isRecoveryUrl = () => {
  const hash = window.location.hash;
  return hash.includes('type=recovery') || hash.includes('type=signup');
};

export const useSplashScreen = () => {
  // Bypass le splash si c'est une URL de recovery
  const [isVisible, setIsVisible] = useState(!isRecoveryUrl());
  const [isComplete, setIsComplete] = useState(isRecoveryUrl());

  useEffect(() => {
    // Si déjà complété (recovery URL), ne rien faire
    if (isComplete) return;
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setIsComplete(true);
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [isComplete]);

  return { isVisible, isComplete };
};
```

---

### Fichier 2 : `src/pages/ResetPassword.tsx`

Refactoriser pour un traitement plus robuste du token.

```tsx
const ResetPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [hasProcessedToken, setHasProcessedToken] = useState(false);

  // ... form setup ...

  useEffect(() => {
    // Ne traiter qu'une seule fois
    if (hasProcessedToken) return;

    const processRecoveryToken = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      console.log("Processing recovery token:", { type, hasToken: !!accessToken });

      // Si c'est une URL de recovery avec un token valide
      if (type === 'recovery' && accessToken) {
        try {
          // Établir la session manuellement
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (error) {
            console.error("Erreur setSession:", error);
            setIsValidToken(false);
            toast.error("Lien de réinitialisation invalide ou expiré");
            setTimeout(() => navigate('/forgot-password'), 2000);
          } else if (data.session) {
            console.log("Session établie avec succès");
            setIsValidToken(true);
            // Nettoyer le hash de l'URL
            window.history.replaceState({}, '', '/reset-password');
            toast.success("Lien valide. Définissez votre nouveau mot de passe.");
          }
        } catch (err) {
          console.error("Erreur lors du traitement du token:", err);
          setIsValidToken(false);
        }
        setHasProcessedToken(true);
        return;
      }

      // Fallback: écouter l'événement PASSWORD_RECOVERY
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth event in ResetPassword:", event);
        
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidToken(true);
          setHasProcessedToken(true);
          toast.success("Lien valide. Définissez votre nouveau mot de passe.");
        }
      });

      // Vérifier si une session recovery existe déjà
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Session existante - vérifier le contexte
        console.log("Session existante trouvée");
        setIsValidToken(true);
        setHasProcessedToken(true);
      } else {
        // Aucun token et pas de session - timeout
        setTimeout(() => {
          if (!hasProcessedToken) {
            console.log("Timeout - lien invalide");
            setIsValidToken(false);
            setHasProcessedToken(true);
            toast.error("Lien de réinitialisation invalide ou expiré");
            navigate('/forgot-password');
          }
        }, 5000); // Timeout plus long
      }

      return () => subscription.unsubscribe();
    };

    processRecoveryToken();
  }, [navigate, hasProcessedToken]);

  // ... reste du composant ...
};
```

---

### Fichier 3 : `src/hooks/useAuth.tsx`

Ajouter la gestion de `PASSWORD_RECOVERY` pour éviter les conflits.

```tsx
// Dans onAuthStateChange, ajouter :
} else if (event === 'PASSWORD_RECOVERY') {
  // Ne pas interférer avec le flux de réinitialisation
  console.log("PASSWORD_RECOVERY event - délégué à ResetPassword");
  // Ne pas appeler setUser ou navigate ici
}
```

---

## Résumé des changements

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useSplashScreen.tsx` | Bypass du splash pour les URLs de recovery |
| `src/pages/ResetPassword.tsx` | Traitement explicite du token avec `setSession()` |
| `src/hooks/useAuth.tsx` | Ignorer l'événement `PASSWORD_RECOVERY` |

---

## Points clés de la solution

1. **Bypass du SplashScreen** → Le token est traité immédiatement
2. **`setSession()` explicite** → Pas de dépendance à l'événement automatique
3. **Nettoyage de l'URL** → Le hash est supprimé après traitement
4. **Timeout plus long** → 5 secondes au lieu de 3
5. **Flag `hasProcessedToken`** → Évite le traitement multiple

