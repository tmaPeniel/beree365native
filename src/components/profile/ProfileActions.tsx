
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { signOut } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQueryClient } from '@tanstack/react-query';
import EditProfileDialog from './EditProfileDialog';

/**
 * Boutons d'action pour le profil utilisateur
 */
const ProfileActions = ({ onEditProfile }: { onEditProfile: () => void }) => {
  const navigate = useNavigate();
  const { user } = useOptimizedAuth();
  const [isResetting, setIsResetting] = useState(false);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  /**
   * Gère la déconnexion de l'utilisateur
   */
  const handleLogout = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        toast.success("Vous êtes déconnecté");
        navigate('/');
      }
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleEditProfile = () => {
    // Utiliser la fonction exposée au niveau global (solution temporaire)
    if (typeof window !== 'undefined' && (window as any).__editProfileFunction) {
      (window as any).__editProfileFunction();
    } else {
      // Fallback sur la prop passée par le parent
      onEditProfile();
    }
  };

  /**
   * Réinitialise le plan de lecture de l'utilisateur
   */
  const handleResetPlan = async () => {
    if (!user?.id) return;
    
    setIsResetting(true);
    try {
      // Supprimer toute la progression de l'utilisateur
      const { error: progressError } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // Supprimer tous les badges de l'utilisateur
      const { error: badgesError } = await supabase
        .from('user_badges')
        .delete()
        .eq('user_id', user.id);

      if (badgesError) throw badgesError;

      // Remettre le jour courant à 1 et la date de début à aujourd'hui
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          current_day_number: 1,
          start_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Invalider le cache React Query
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      queryClient.invalidateQueries({ queryKey: ['user-badges'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['user-plan'] });
      queryClient.invalidateQueries({ queryKey: ['user-plan-duration'] });

      toast.success("Votre plan de lecture a été réinitialisé !");
      navigate('/dashboard');
    } catch (error) {
      console.error("Erreur lors de la réinitialisation:", error);
      toast.error("Erreur lors de la réinitialisation du plan");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className={isMobile ? "space-y-3" : "flex items-center justify-center gap-4"}>
      <EditProfileDialog>
        <Button 
          variant="outline" 
          className={`h-12 rounded-xl border-primary text-primary hover:bg-primary/10 ${isMobile ? "w-full" : "w-48"}`}
        >
          Modifier le profil
        </Button>
      </EditProfileDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="outline" 
            className={`h-12 rounded-xl border-destructive text-destructive hover:bg-destructive/10 ${isMobile ? "w-full" : "w-48"}`}
            disabled={isResetting}
          >
            {isResetting ? "Réinitialisation..." : "Réinitialiser mon plan"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la réinitialisation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir réinitialiser votre plan de lecture ? 
              Cette action supprimera définitivement toute votre progression et vos badges. 
              Vous recommencerez au jour 1.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetPlan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button 
        variant="outline" 
        className={`h-12 rounded-xl border-border text-foreground hover:bg-muted ${isMobile ? "w-full" : "w-48"}`}
        onClick={handleLogout}
      >
        Déconnexion
      </Button>
    </div>
  );
};

export default ProfileActions;
