
import { useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * Hook optimisé pour l'authentification avec mémorisation
 */
export const useOptimizedAuth = () => {
  const authContext = useAuth();
  
  // Retourner directement le contexte d'auth sans mémorisation excessive
  // La mémorisation est déjà gérée par useAuth
  return {
    user: authContext.user,
    profile: authContext.profile,
    isLoading: authContext.isLoading,
    isAuthenticated: !!authContext.user,
    triggerProgressUpdate: authContext.triggerProgressUpdate,
    progressUpdateCounter: authContext.progressUpdateCounter
  };
};
