
/**
 * Hook d'authentification optimisé avec système de heartbeat d'activité
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ActivityHeartbeat } from '@/services/auth/activityService';

export const useOptimizedAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [progressUpdateTrigger, setProgressUpdateTrigger] = useState(0);
  
  // Référence pour le système de heartbeat
  const heartbeatRef = useRef<ActivityHeartbeat | null>(null);

  // Fonction pour déclencher une mise à jour de la progression
  const triggerProgressUpdate = useCallback(() => {
    setProgressUpdateTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la récupération de la session:', error);
          return;
        }

        if (isMounted) {
          setUser(session?.user || null);
          setIsAuthenticated(!!session?.user);
          setIsLoading(false);

          // Démarrer le système de heartbeat si l'utilisateur est connecté
          if (session?.user) {
            heartbeatRef.current = ActivityHeartbeat.getInstance();
            heartbeatRef.current.start(session.user.id);
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'authentification:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('Auth state changed:', event);
        setUser(session?.user || null);
        setIsAuthenticated(!!session?.user);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Démarrer le heartbeat pour le nouvel utilisateur connecté
          heartbeatRef.current = ActivityHeartbeat.getInstance();
          heartbeatRef.current.start(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          // Arrêter le heartbeat lors de la déconnexion
          if (heartbeatRef.current) {
            heartbeatRef.current.stop();
            heartbeatRef.current = null;
          }
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      
      // Nettoyer le heartbeat lors du démontage du composant
      if (heartbeatRef.current) {
        heartbeatRef.current.stop();
        heartbeatRef.current = null;
      }
    };
  }, []);

  // Fonction pour forcer une mise à jour d'activité (utilisée lors d'actions importantes)
  const forceActivityUpdate = useCallback(() => {
    if (user && heartbeatRef.current) {
      heartbeatRef.current.forceUpdate(user.id);
    }
  }, [user]);

  return {
    user,
    isLoading,
    isAuthenticated,
    progressUpdateTrigger,
    triggerProgressUpdate,
    forceActivityUpdate
  };
};
