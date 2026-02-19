import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile } from '@/services/authService';
import { invalidateUserCacheSelective } from '@/services/readingPlan/optimizedCacheService';
import { useQueryClient } from '@tanstack/react-query';

interface EditProfileDialogProps {
  children: React.ReactNode;
}

/**
 * Dialog pour éditer le profil utilisateur
 */
const EditProfileDialog = ({ children }: EditProfileDialogProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialiser les valeurs quand le dialog s'ouvre
  useEffect(() => {
    if (isOpen && profile) {
      setFullName(profile.full_name || '');
      setStartDate(profile.start_date || '');
    }
  }, [isOpen, profile]);

  /**
   * Enregistre les modifications du profil
   */
  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const updates = {
        full_name: fullName,
        start_date: startDate
      };
      
      const result = await updateUserProfile(user.id, updates);
      
      if (result.success) {
        // Rafraîchir le profil d'abord
        await refreshProfile();
        
        // Ensuite invalider et refetcher tous les caches
        invalidateUserCacheSelective(user.id);
        
        // Invalider tous les caches React Query
        queryClient.removeQueries({ queryKey: ['optimized-reading-plan-data'] });
        queryClient.removeQueries({ queryKey: ['user-progress-optimized'] });
        queryClient.removeQueries({ queryKey: ['reading-plan-chapters'] });
        
        // Attendre un peu puis forcer un refetch complet
        setTimeout(async () => {
          await queryClient.refetchQueries({ 
            queryKey: ['optimized-reading-plan-data', user.id] 
          });
        }, 100);
        
        toast.success("Profil mis à jour avec succès");
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast.error("Erreur lors de la mise à jour du profil");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset les valeurs et ferme le dialog
   */
  const handleCancel = () => {
    setFullName(profile?.full_name || '');
    setStartDate(profile?.start_date || '');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Votre nom complet"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Date de début du plan de lecture</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSaveProfile} disabled={isLoading}>
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;