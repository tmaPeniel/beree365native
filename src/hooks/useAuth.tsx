
/**
 * Hook de gestion de l'authentification
 * Fournit un contexte pour gérer l'état d'authentification dans toute l'application
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser, getUserProfile } from '@/services/authService';
import { Profile } from '@/types/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Type pour le contexte d'authentification
type AuthContextType = {
  user: any | null;           // Données utilisateur de Supabase Auth
  profile: Profile | null;    // Profil utilisateur de notre base de données
  isLoading: boolean;         // Indique si nous sommes en train de charger les données
  isAuthenticated: boolean;   // Indique si l'utilisateur est authentifié
  refreshProfile: () => Promise<void>; // Fonction pour rafraîchir le profil
};

// Créer le contexte avec des valeurs par défaut
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  refreshProfile: async () => {}
});

/**
 * Fournisseur du contexte d'authentification
 * @param {ReactNode} children Composants enfants
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Effet pour initialiser l'authentification
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        // Récupérer l'utilisateur actuel
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        if (currentUser) {
          // Récupérer le profil de l'utilisateur
          const userProfile = await getUserProfile(currentUser.id);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation de l'authentification:", error);
        toast.error("Erreur lors du chargement de votre profil");
      } finally {
        setIsLoading(false);
      }
    };

    // Configurer l'écouteur d'événements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Événement d'authentification:", event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        
        // Utiliser setTimeout pour éviter les problèmes potentiels de blocage
        setTimeout(async () => {
          try {
            const userProfile = await getUserProfile(session.user.id);
            setProfile(userProfile);
          } catch (error) {
            console.error("Erreur lors de la récupération du profil:", error);
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        navigate('/login');
      }
    });

    // Initialiser l'authentification
    initAuth();

    // Nettoyage lors du démontage
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  /**
   * Rafraîchit les données du profil utilisateur
   */
  const refreshProfile = async () => {
    if (user) {
      try {
        const userProfile = await getUserProfile(user.id);
        setProfile(userProfile);
      } catch (error) {
        console.error("Erreur lors du rafraîchissement du profil:", error);
        toast.error("Impossible de rafraîchir votre profil");
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte d'authentification
 * @returns {AuthContextType} Contexte d'authentification
 */
export const useAuth = () => useContext(AuthContext);
