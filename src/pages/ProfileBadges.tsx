import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BadgesSection from '@/components/profile/BadgesSection';

/**
 * Page dédiée aux badges et récompenses
 */
const ProfileBadges = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/profile">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Badges & Récompenses</h1>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6 py-6">
        <BadgesSection />
      </div>
    </div>
  );
};

export default ProfileBadges;