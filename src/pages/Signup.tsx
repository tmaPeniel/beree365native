
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
      // Si on passe de la connexion à l'inscription, naviguer vers /signup
      navigate('/signup');
    } else {
      // Si on passe de l'inscription à la connexion, naviguer vers /login
      navigate('/login');
    }
  };
  
  /**
   * Gère la soumission du formulaire d'inscription
   * @param {Object} data Données du formulaire
   */
  const handleSubmit = async (data: { email: string; password: string; name?: string; startDate?: Date }) => {
    try {
      if (data.name && data.startDate) {
        const result = await signUp(data.email, data.password, data.name, data.startDate);
        if (result.success) {
          toast.success("Inscription réussie ! Bienvenue !");
          navigate('/dashboard');
        }
      } else {
        toast.error("Veuillez remplir tous les champs");
      }
    } catch (error) {
      console.error("Erreur d'inscription:", error);
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
