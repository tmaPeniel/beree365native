
/**
 * Hook d'authentification optimisé avec système de heartbeat d'activité
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ActivityHeartbeat } from '@/services/auth/activityService';

interface UserProfile {
  id: string;
  full_name: string | null;
  start_date: string | null;
  current_day_number: number;
  last_login_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

export const useOptimizedAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [progressUpdateTrigger, setProgressUpdateTrigger] = useState(0);
  
  // Référence pour le système de heartbeat
  const heartbeatRef = useRef<ActivityHeartbeat | null>(null);

  // Fonction pour déclencher une mise à jour de la progression
  const triggerProgressUpdate = useCallback(() => {
    setProgressUpdateTrigger(prev => prev + 1);
  }, []);

  // Fonction pour charger le profil utilisateur
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Erreur lors du chargement du profil:', error);
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    }
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
          
          if (session?.user) {
            await loadUserProfile(session.user.id);
            // Démarrer le système de heartbeat
            heartbeatRef.current = ActivityHeartbeat.getInstance();
            heartbeatRef.current.start(session.user.id);
          }
          
          setIsLoading(false);
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
          await loadUserProfile(session.user.id);
          // Démarrer le heartbeat pour le nouvel utilisateur connecté
          heartbeatRef.current = ActivityHeartbeat.getInstance();
          heartbeatRef.current.start(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
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
  }, [loadUserProfile]);

  // Fonction pour forcer une mise à jour d'activité (utilisée lors d'actions importantes)
  const forceActivityUpdate = useCallback(() => {
    if (user && heartbeatRef.current) {
      heartbeatRef.current.forceUpdate(user.id);
    }
  }, [user]);

  return {
    user,
    profile,
    isLoading,
    isAuthenticated,
    progressUpdateTrigger,
    triggerProgressUpdate,
    forceActivityUpdate
  };
};
