
/**
 * Composant pour protéger les routes qui nécessitent une authentification
 * Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Route protégée qui vérifie si l'utilisateur est authentifié
 * @param {React.ReactNode} children Composants enfants à afficher si l'utilisateur est authentifié
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Afficher un indicateur de chargement pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Rediriger vers la page de connexion si l'utilisateur n'est pas authentifié
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Afficher les enfants si l'utilisateur est authentifié
  return <>{children}</>;
};

export default ProtectedRoute;
