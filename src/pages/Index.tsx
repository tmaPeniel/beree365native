
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import Logo from '@/components/Logo';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useOptimizedAuth();

  // Fonction pour gérer le clic sur "Commencer"
  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  // Affichage pendant le chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 animate-enter">
      <div className="max-w-md w-full text-center">
        <Logo size="large" className="mb-6" />
        
        <h1 className="text-3xl font-bold mb-4 text-gray-800">
          Lisez la Bible en un an
        </h1>
        
        <p className="text-gray-600 mb-8">
          Suivez votre lecture quotidienne, établissez une routine spirituelle et progressez pas à pas.
        </p>
        
        <div className="space-y-4">
          <Button 
            onClick={handleGetStarted}
            className="w-full h-12 rounded-full bg-beree-500 hover:bg-beree-600"
          >
            {isAuthenticated ? 'Tableau de bord' : 'Commencer'}
          </Button>
          
          {!isAuthenticated && (
            <div className="flex space-x-4">
              <Link to="/login" className="flex-1 block">
                <Button variant="outline" className="w-full rounded-full border-beree-500 text-beree-500 hover:bg-beree-50">
                  Connexion
                </Button>
              </Link>
              
              <Link to="/signup" className="flex-1 block">
                <Button variant="outline" className="w-full rounded-full border-beree-500 text-beree-500 hover:bg-beree-50">
                  Inscription
                </Button>
              </Link>
            </div>
          )}

          {isAuthenticated && (
            <div className="flex space-x-4">
              <Link to="/reading" className="flex-1 block">
                <Button variant="outline" className="w-full rounded-full border-beree-500 text-beree-500 hover:bg-beree-50">
                  Plan de lecture
                </Button>
              </Link>
              
              <Link to="/profile" className="flex-1 block">
                <Button variant="outline" className="w-full rounded-full border-beree-500 text-beree-500 hover:bg-beree-50">
                  Profil
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-16 mb-8">
        <img 
          src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
          alt="Bible ouverte" 
          className="w-full max-w-md rounded-2xl shadow-md"
        />
      </div>
    </div>
  );
};

export default Index;
