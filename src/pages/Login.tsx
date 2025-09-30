
/**
 * Page de connexion
 * Permet aux utilisateurs de se connecter à leur compte
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { signIn } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Page de connexion
 */
const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [isLogin, setIsLogin] = React.useState(true);
  
  // Rediriger vers le tableau de bord si l'utilisateur est déjà authentifié
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, isLoading]);
  
  /**
   * Bascule entre les formulaires de connexion et d'inscription
   */
  const toggleForm = () => {
    setIsLogin(!isLogin);
    if (!isLogin) {
      // Si on passe de l'inscription à la connexion, naviguer vers /login
      navigate('/login');
    } else {
      // Si on passe de la connexion à l'inscription, naviguer vers /signup
      navigate('/signup');
    }
  };
  
  /**
   * Gère la soumission du formulaire de connexion
   * @param {Object} data Données du formulaire
   */
  const handleSubmit = async (data: { email: string; password: string; name?: string; startDate?: Date }) => {
    try {
      const result = await signIn(data.email, data.password);
      if (result.success) {
        toast.success("Connexion réussie");
        navigate('/dashboard');
      } else if (result.error) {
        // Afficher l'erreur directement dans le formulaire
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Erreur de connexion:", error);
      toast.error("Une erreur inattendue s'est produite");
    }
  };
  
  // Afficher un indicateur de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background animate-fade-in">
      <AuthForm 
        isLogin={isLogin} 
        toggleForm={toggleForm} 
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default Login;
