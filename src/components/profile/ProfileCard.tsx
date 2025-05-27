
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ProfileHeader from '@/components/ProfileHeader';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile } from '@/services/authService';
import { invalidateUserCacheSelective } from '@/services/readingPlan/optimizedCacheService';
import { useQueryClient } from '@tanstack/react-query';

interface ProfileCardProps {
  onEdit?: () => void;
}

/**
 * Carte de profil avec fonctionnalité d'édition
 */
const ProfileCard = ({ onEdit }: ProfileCardProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [startDate, setStartDate] = useState(profile?.start_date || '');

  /**
   * Active le mode édition du profil
   */
  const handleEditProfile = () => {
    setIsEditing(true);
    if (onEdit) onEdit();
  };
  
  /**
   * Enregistre les modifications du profil
   */
  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      const updates = {
        full_name: fullName,
        start_date: startDate
      };
      
      const result = await updateUserProfile(user.id, updates);
      
      if (result.success) {
        setIsEditing(false);
        await refreshProfile();
        
        // Invalider tous les caches liés au plan de lecture après mise à jour
        console.log('🔄 Invalidating all reading plan caches after profile update...');
        
        // Invalider le cache global optimisé
        invalidateUserCacheSelective(user.id);
        
        // Invalider tous les caches React Query liés au plan de lecture
        await queryClient.invalidateQueries({ 
          queryKey: ['optimized-reading-plan-data', user.id] 
        });
        
        // Invalider aussi les caches de progression
        await queryClient.invalidateQueries({ 
          queryKey: ['user-progress-optimized', user.id] 
        });
        
        // Forcer un re-fetch immédiat
        await queryClient.refetchQueries({ 
          queryKey: ['optimized-reading-plan-data', user.id] 
        });
        
        console.log('✅ All caches invalidated and data refetched');
        
        toast.success("Profil mis à jour avec succès");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast.error("Erreur lors de la mise à jour du profil");
    }
  };
  
  /**
   * Annule l'édition du profil
   */
  const handleCancelEdit = () => {
    setFullName(profile?.full_name || '');
    setStartDate(profile?.start_date || '');
    setIsEditing(false);
  };

  // Exposer la fonction handleEditProfile via la référence
  React.useEffect(() => {
    // Rendre la fonction accessible globalement (pour la démonstration)
    if (typeof window !== 'undefined') {
      (window as any).__editProfileFunction = handleEditProfile;
    }
    
    return () => {
      // Nettoyer lors du démontage
      if (typeof window !== 'undefined') {
        delete (window as any).__editProfileFunction;
      }
    };
  }, []);

  return (
    <Card>
      <CardContent className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet
              </label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Votre nom complet"
              />
            </div>
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Date de début du plan de lecture
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex space-x-2 pt-2">
              <Button onClick={handleSaveProfile} className="bg-green-600 hover:bg-green-700">
                Enregistrer
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <ProfileHeader 
            name={profile?.full_name || user?.email || 'Utilisateur'}
            email={user?.email || ''}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
