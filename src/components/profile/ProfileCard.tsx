
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ProfileHeader from '@/components/ProfileHeader';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile } from '@/services/authService';

/**
 * Carte de profil avec fonctionnalité d'édition
 */
const ProfileCard = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [startDate, setStartDate] = useState(profile?.start_date || '');

  /**
   * Active le mode édition du profil
   */
  const handleEditProfile = () => {
    setIsEditing(true);
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
