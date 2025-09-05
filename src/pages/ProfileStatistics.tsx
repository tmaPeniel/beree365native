import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import StatsCard from '@/components/profile/StatsCard';

/**
 * Page dédiée aux statistiques détaillées
 */
const ProfileStatistics = () => {
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
            <h1 className="text-xl font-bold text-foreground">Statistiques</h1>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6 py-6">
        <StatsCard />
      </div>
    </div>
  );
};

export default ProfileStatistics;