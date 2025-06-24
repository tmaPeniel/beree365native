
/**
 * Page d'inscription
 * Permet aux utilisateurs de créer un nouveau compte
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { signUp } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Page d'inscription
 */
const Signup = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [isLogin, setIsLogin] = React.useState(false);
  
  // Rediriger vers le tableau de bord si l'utilisateur est déjà authentifié
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, isLoading]);
  
  /**
   * Bascule entre les formulaires d'inscription et de connexion
   */
  const toggleForm = () => {
    setIsLogin(!isLogin);
    if (isLogin) {
      navigate('/signup');
    } else {
      navigate('/login');
    }
  };
  
  /**
   * Gère la soumission du formulaire d'inscription
   */
  const handleSubmit = async (data: { email: string; password: string; name?: string; startDate?: Date }) => {
    try {
      console.log("Tentative d'inscription avec les données:", data);
      
      if (!data.name || !data.startDate) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      
      const result = await signUp(data.email, data.password, data.name, data.startDate);
      
      if (result.success) {
        toast.success("Inscription réussie ! Bienvenue !");
        // Attendre un peu pour que l'authentification se propage
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        console.error("Échec de l'inscription:", result.error);
        toast.error(result.error || "Erreur lors de l'inscription");
      }
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      toast.error(`Erreur d'inscription: ${error.message}`);
    }
  };
  
  // Afficher un indicateur de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-fade-in">
      <AuthForm 
        isLogin={isLogin} 
        toggleForm={toggleForm} 
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default Signup;
