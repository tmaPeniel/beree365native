/**
 * Page d'inscription - redirige vers la première étape
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Signup = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    } else {
      // Rediriger vers la première étape de l'inscription
      navigate('/signup/step1');
    }
  }, [isAuthenticated, navigate, isLoading]);
  
  // Afficher un indicateur de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return null;
};

export default Signup;