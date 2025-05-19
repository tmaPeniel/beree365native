
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ProfileHeader from '@/components/ProfileHeader';
import NavBar from '@/components/NavBar';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Profile = () => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    // Simulate logout
    toast.success("Vous êtes déconnecté");
    
    // Redirect to home
    setTimeout(() => {
      navigate('/');
    }, 1000);
  };
  
  const handleEditProfile = () => {
    toast.info("Cette fonctionnalité sera disponible prochainement");
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
            <ProfileHeader 
              name="Jean Dupont"
              email="jean.dupont@example.com"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Statistiques de lecture</h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">Jours consécutifs</p>
                <p className="text-2xl font-bold text-beree-500">7</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">Chapitres lus</p>
                <p className="text-2xl font-bold text-beree-500">21</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                <p className="text-gray-500 text-sm">Progression totale</p>
                <p className="text-2xl font-bold text-beree-500">5.7%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl border-beree-500 text-beree-500 hover:bg-beree-50"
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
      </div>
      
      <NavBar />
    </div>
  );
};

export default Profile;
