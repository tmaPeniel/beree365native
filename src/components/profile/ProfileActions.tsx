
import React from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { signOut } from '@/services/authService';

/**
 * Boutons d'action pour le profil utilisateur
 */
const ProfileActions = ({ onEditProfile }: { onEditProfile: () => void }) => {
  const navigate = useNavigate();
  
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

  return (
    <div className="space-y-4">
      <Button 
        variant="outline" 
        className="w-full h-12 rounded-xl border-green-500 text-green-500 hover:bg-green-50"
        onClick={handleEditProfile}
      >
        Modifier le profil
      </Button>
      
      <Separator />
      
      <Button 
        variant="outline" 
        className="w-full h-12 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100"
        onClick={handleLogout}
      >
        Déconnexion
      </Button>
    </div>
  );
};

export default ProfileActions;
