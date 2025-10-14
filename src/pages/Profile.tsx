import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  BarChart3, 
  Award, 
  Heart, 
  MessageSquare, 
  Settings, 
  Info, 
  Share,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Page de profil moderne inspirée de YouVersion
 */
const Profile = () => {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const userName = profile?.full_name || user?.email || 'Utilisateur';
  const userInitials = userName
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();

  const profileOptions = [
    {
      label: 'Plan de lecture',
      description: 'Gérer votre plan de lecture',
      icon: BookOpen,
      to: '/reading-plan',
      color: 'text-primary'
    },
    {
      label: 'Statistiques',
      description: 'Voir vos progrès',
      icon: BarChart3,
      to: '/profile/statistics',
      color: 'text-primary'
    },
    {
      label: 'Badges',
      description: 'Vos récompenses et accomplissements',
      icon: Award,
      to: '/profile/badges',
      color: 'text-accent'
    },
    {
      label: 'Verset du jour',
      description: 'Méditer sur la Parole',
      icon: Heart,
      to: '/verses',
      color: 'text-primary'
    },
    {
      label: 'Paramètres',
      description: 'Gérer vos préférences',
      icon: Settings,
      to: '/profile/settings',
      color: 'text-muted-foreground'
    },
    {
      label: 'À propos',
      description: 'Informations sur l\'application',
      icon: Info,
      to: '/profile/about',
      color: 'text-muted-foreground'
    },
    {
      label: 'Partager l\'app',
      description: 'Inviter vos amis',
      icon: Share,
      onClick: () => {
        if (navigator.share) {
          navigator.share({
            title: 'Bereé - Plan de lecture biblique',
            text: 'Découvrez cette super app de lecture biblique !',
            url: window.location.origin,
          });
        } else {
          navigator.clipboard.writeText(window.location.origin);
          toast.success('Lien copié dans le presse-papiers');
        }
      },
      color: 'text-primary'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header avec profil utilisateur */}
      <div className="bg-card border-b">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" alt={userName} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{userName}</h1>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des options */}
      <div className="px-6 py-4">
        <div className="space-y-1">
          {profileOptions.map((option, index) => (
            <div key={index}>
              {option.to ? (
                <Link
                  to={option.to}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full bg-muted ${option.color}`}>
                      <option.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {option.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ) : (
                <button
                  onClick={option.onClick}
                  className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full bg-muted ${option.color}`}>
                      <option.icon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {option.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              )}
            </div>
          ))}

          {/* Séparateur */}
          <div className="border-t my-4"></div>

          {/* Déconnexion */}
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-destructive/10 transition-colors group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-full bg-muted text-destructive">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-destructive">
                  Déconnexion
                </h3>
                <p className="text-sm text-muted-foreground">
                  Se déconnecter de l'application
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors" />
          </button>
        </div>
      </div>

      {/* Dialog de confirmation de déconnexion */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à votre compte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Profile;