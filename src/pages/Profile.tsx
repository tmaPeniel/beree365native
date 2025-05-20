
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import ProfileHeader from '@/components/ProfileHeader';
import NavBar from '@/components/NavBar';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { signOut, updateUserProfile } from '@/services/authService';
import { getOverallProgress } from '@/services/readingPlanService';
import { useQuery } from '@tanstack/react-query';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [startDate, setStartDate] = useState(profile?.start_date || '');
  
  // Fetch user stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: () => user ? getOverallProgress(user.id) : null,
    enabled: !!user
  });
  
  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      toast.success("Vous êtes déconnecté");
      navigate('/');
    }
  };
  
  const handleEditProfile = () => {
    setIsEditing(true);
  };
  
  const handleSaveProfile = async () => {
    if (!user) return;
    
    const updates = {
      full_name: fullName,
      start_date: startDate
    };
    
    const result = await updateUserProfile(user.id, updates);
    
    if (result.success) {
      setIsEditing(false);
      refreshProfile();
    }
  };
  
  const handleCancelEdit = () => {
    setFullName(profile?.full_name || '');
    setStartDate(profile?.start_date || '');
    setIsEditing(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Profil</h1>
        <p className="text-gray-500">Gérez vos informations personnelles</p>
      </div>
      
      <div className="p-6 space-y-6">
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
        
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Statistiques de lecture</h2>
            {isLoading ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 text-sm">Jours complétés</p>
                  <p className="text-2xl font-bold text-green-500">{stats?.passagesRead || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 text-sm">Chapitres lus</p>
                  <p className="text-2xl font-bold text-green-500">{stats?.passagesRead || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-gray-500 text-sm">Progression totale</p>
                  <p className="text-2xl font-bold text-green-500">{stats?.progressPercentage || 0}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl border-green-500 text-green-500 hover:bg-green-50"
            onClick={handleEditProfile}
            disabled={isEditing}
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
      </div>
      
      <NavBar />
    </div>
  );
};

export default Profile;
