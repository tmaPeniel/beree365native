import React from 'react';
import { ArrowLeft, Award, Crown, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import BadgesSection from '@/components/profile/BadgesSection';
import { usePremium } from '@/hooks/usePremium';

/**
 * Page dédiée aux badges et récompenses (Premium uniquement)
 */
const ProfileBadges = () => {
  const { isPremium } = usePremium();

  return (
    <div className="min-h-screen bg-background">
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

      <div className="px-6 py-6">
        {isPremium ? (
          <BadgesSection />
        ) : (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-8 text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                  <Lock className="h-5 w-5" />
                  Réservé à Premium
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  Les badges et récompenses sont une fonctionnalité Premium.
                  Débloquez Béréen Curieux, Chercheur des Écritures, Gardien de la Flamme,
                  Béréen Fidèle, Maître Béréen et bien plus encore.
                </p>
              </div>
              <Link to="/premium">
                <Button>
                  <Crown className="h-4 w-4 mr-2" />
                  Découvrir Premium
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProfileBadges;
