import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Mail, Calendar, Trash2, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile } from '@/services/authService';
import { invalidateUserCacheSelective } from '@/services/readingPlan/optimizedCacheService';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Page complète d'édition du profil utilisateur
 */
const ProfileEdit = () => {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Initialiser les valeurs
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setStartDate(profile.start_date || '');
    }
  }, [profile]);

  const userName = profile?.full_name || user?.email || 'Utilisateur';
  const userInitials = userName
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();

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
        navigate('/profile');
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast.error("Erreur lors de la mise à jour du profil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || confirmEmail !== user.email) {
      toast.error("L'email saisi ne correspond pas à votre compte");
      return;
    }
    setIsDeleting(true);
    try {
      const response = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user.id }
      });
      if (response.error) throw new Error(response.error.message);

      toast.success('Votre compte a été supprimé avec succès');
      setDeleteDialogOpen(false);
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du compte. Veuillez réessayer.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-foreground">Modifier le profil</h1>
            </div>
            <Button 
              onClick={handleSaveProfile} 
              disabled={isLoading}
              className="hidden sm:flex"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6 py-6 space-y-6">
        {/* Photo de profil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Photo de profil</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src="" alt={userName} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Changez votre photo de profil
                </p>
                <Button variant="outline" size="sm" disabled>
                  Choisir une photo
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Fonctionnalité à venir
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informations personnelles</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label htmlFor="email">Adresse email</Label>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas être modifié
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Plan de lecture */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Plan de lecture</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début du plan de lecture</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Changer cette date recalculera votre progression
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Zone de danger */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span>Supprimer mon compte</span>
            </CardTitle>
            <CardDescription>
              Action irréversible — toutes vos données seront supprimées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Attention</p>
                  <p className="text-muted-foreground mt-1">
                    La suppression de votre compte est définitive et irréversible.
                    Toutes vos données seront immédiatement effacées :
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                    <li>Votre progression de lecture</li>
                    <li>Vos badges et récompenses</li>
                    <li>Vos préférences et paramètres</li>
                    <li>Votre historique de notifications</li>
                  </ul>
                </div>
              </div>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer définitivement mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression du compte</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4">
                      <p>
                        Cette action est irréversible. Toutes vos données seront
                        définitivement supprimées de nos serveurs.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-email">
                          Pour confirmer, saisissez votre email : <strong>{user?.email}</strong>
                        </Label>
                        <Input
                          id="confirm-email"
                          type="email"
                          placeholder="Votre email"
                          value={confirmEmail}
                          onChange={(e) => setConfirmEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmEmail('')}>
                    Annuler
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || confirmEmail !== user?.email}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Suppression...' : 'Supprimer mon compte'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Bouton mobile */}
        <div className="sm:hidden pb-6">
          <Button 
            onClick={handleSaveProfile} 
            disabled={isLoading}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit;