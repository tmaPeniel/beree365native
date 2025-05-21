
/**
 * Page de profil utilisateur
 * Permet à l'utilisateur de voir et modifier ses informations personnelles
 */

import React from 'react';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import ProfileCard from '@/components/profile/ProfileCard';
import StatsCard from '@/components/profile/StatsCard';
import ProfileActions from '@/components/profile/ProfileActions';
import ProfileHeader from '@/components/profile/ProfileHeader';

/**
 * Page de profil utilisateur
 */
const Profile = () => {
  const { isLoading } = useAuth();
  
  // Afficher un indicateur de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* En-tête de la page */}
      <ProfileHeader />
      
      <div className="p-6 space-y-6">
        {/* Carte de profil */}
        <ProfileCard />
        
        {/* Carte de statistiques */}
        <StatsCard />
        
        {/* Boutons d'action */}
        <ProfileActions onEditProfile={() => {
          // Trouver l'élément bouton de modification du profil et le déclencher
          const editButton = document.querySelector('button.border-green-500');
          if (editButton instanceof HTMLButtonElement) {
            editButton.click();
          }
        }} />
      </div>
      
      {/* Barre de navigation */}
      <NavBar />
    </div>
  );
};

export default Profile;
