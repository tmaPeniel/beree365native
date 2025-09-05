import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Mail, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile } from '@/services/authService';
import { invalidateUserCacheSelective } from '@/services/readingPlan/optimizedCacheService';
import { useQueryClient } from '@tanstack/react-query';

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