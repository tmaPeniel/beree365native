
import { useMemo } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook optimisé pour l'authentification avec mémorisation
 */
export const useOptimizedAuth = () => {
  const authContext = useAuth();
  
  // Mémoriser les valeurs calculées pour éviter les re-rendus
  const memoizedAuth = useMemo(() => ({
    user: authContext.user,
    profile: authContext.profile,
    isLoading: authContext.isLoading,
    isAuthenticated: !!authContext.user,
    triggerProgressUpdate: authContext.triggerProgressUpdate,
    progressUpdateCounter: authContext.progressUpdateCounter
  }), [
    authContext.user, 
    authContext.profile, 
    authContext.isLoading,
    authContext.triggerProgressUpdate,
    authContext.progressUpdateCounter
  ]);
  
  return memoizedAuth;
};
