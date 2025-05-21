
/**
 * Hook de gestion de l'authentification
 * Fournit un contexte pour gérer l'état d'authentification dans toute l'application
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  getCurrentUser, 
  refreshUserProfile, 
  cleanupAuthState 
} from '@/services/auth';
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
  triggerProgressUpdate: () => void;   // Fonction pour signaler une mise à jour de progression
  progressUpdateCounter: number;      // Compteur pour déclencher les mises à jour
};

// Créer le contexte avec des valeurs par défaut
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  refreshProfile: async () => {},
  triggerProgressUpdate: () => {},
  progressUpdateCounter: 0
});

/**
 * Fournisseur du contexte d'authentification
 * @param {ReactNode} children Composants enfants
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [progressUpdateCounter, setProgressUpdateCounter] = useState<number>(0);
  const navigate = useNavigate();

  // Effet pour initialiser l'authentification
  useEffect(() => {
    console.log("Initialisation de l'authentification");
    
    // Configurer l'écouteur d'événements d'authentification (avant tout!)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Événement d'authentification:", event, session ? "Session valide" : "Pas de session");
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("Utilisateur connecté:", session.user.id);
        setUser(session.user);
        
        // Utiliser setTimeout pour éviter les problèmes potentiels de blocage
        setTimeout(async () => {
          try {
            console.log("Récupération du profil après connexion...");
            const userProfile = await refreshUserProfile(session.user.id);
            console.log("Profil récupéré après connexion:", userProfile);
            setProfile(userProfile);
          } catch (error) {
            console.error("Erreur lors de la récupération du profil après connexion:", error);
            toast.error("Erreur lors du chargement de votre profil");
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        console.log("Utilisateur déconnecté");
        // Nettoyer l'état d'authentification
        cleanupAuthState();
        setUser(null);
        setProfile(null);
        navigate('/login');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("Token d'authentification rafraîchi");
      }
    });

    // Récupérer la session initiale
    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        console.log("Vérification de la session initiale...");
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Session initiale:", session ? "Valide" : "Pas de session");
        
        if (session?.user) {
          console.log("Utilisateur dans session:", session.user.id);
          setUser(session.user);
          
          try {
            console.log("Récupération du profil initial...");
            // Utiliser la fonction de rafraîchissement du profil
            const userProfile = await refreshUserProfile(session.user.id);
            console.log("Profil initial récupéré:", userProfile);
            setProfile(userProfile);
          } catch (error) {
            console.error("Erreur lors de la récupération initiale du profil:", error);
            toast.error("Erreur lors du chargement de votre profil");
          }
        } else {
          console.log("Aucun utilisateur dans la session initiale");
          setProfile(null);
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation de l'authentification:", error);
        toast.error("Erreur lors du chargement de votre profil");
      } finally {
        setIsLoading(false);
      }
    };

    // Initialiser l'authentification
    initAuth();

    // Nettoyage lors du démontage
    return () => {
      console.log("Démontage du provider d'authentification");
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  /**
   * Rafraîchit les données du profil utilisateur
   */
  const refreshProfile = async () => {
    if (!user) {
      console.error("refreshProfile: Aucun utilisateur connecté");
      return;
    }
    
    try {
      console.log("Rafraîchissement du profil pour", user.id);
      const userProfile = await refreshUserProfile(user.id);
      console.log("Profil rafraîchi:", userProfile);
      setProfile(userProfile);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement du profil:", error);
      toast.error("Impossible de rafraîchir votre profil");
    }
  };

  /**
   * Déclenche une mise à jour de la progression de lecture
   * Cette fonction est appelée après chaque modification du statut d'un chapitre
   */
  const triggerProgressUpdate = () => {
    console.log("Déclenchement d'une mise à jour de progression");
    setProgressUpdateCounter(prev => prev + 1);
  };

  const contextValue = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    refreshProfile,
    triggerProgressUpdate,
    progressUpdateCounter
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte d'authentification
 * @returns {AuthContextType} Contexte d'authentification
 */
export const useAuth = () => useContext(AuthContext);
