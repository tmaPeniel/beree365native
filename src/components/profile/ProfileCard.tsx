
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ProfileHeader from '@/components/ProfileHeader';
import { useAuth } from '@/hooks/useAuth';

interface ProfileCardProps {
  onEdit?: () => void;
}

/**
 * Carte de profil avec fonctionnalité d'édition
 */
const ProfileCard = ({ onEdit }: ProfileCardProps) => {
  const { user, profile } = useAuth();

  return (
    <Card>
      <CardContent className="p-6">
        <ProfileHeader 
          name={profile?.full_name || user?.email || 'Utilisateur'}
          email={user?.email || ''}
        />
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
