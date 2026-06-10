import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Crown, Calendar, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePremium } from '@/hooks/usePremium';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SOURCE_LABEL: Record<string, string> = {
  manuel_beree: 'Manuel Bérée',
  grandfather: 'Accès historique',
  code: 'Code d\'activation',
  payment: 'Paiement',
};

const ProfileSubscription: React.FC = () => {
  const {
    isPremium,
    isExpired,
    premiumStartDate,
    premiumEndDate,
    premiumSource,
    daysRemaining,
    isLoading,
  } = usePremium();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b">
        <div className="px-6 py-4 flex items-center space-x-4">
          <Link to="/profile">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Mon abonnement</h1>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
          </div>
        ) : isPremium ? (
          <>
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <Badge className="mb-1">Premium actif</Badge>
                    <h2 className="text-lg font-bold text-foreground">
                      Bérée Premium
                    </h2>
                  </div>
                </div>

                {daysRemaining !== null && (
                  <p className="text-sm text-muted-foreground">
                    Il vous reste <span className="font-semibold text-foreground">{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</span> d'accès.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4">
                {premiumStartDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date de début</p>
                      <p className="font-medium">
                        {format(premiumStartDate, 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                )}
                {premiumEndDate && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date d'expiration</p>
                      <p className="font-medium">
                        {format(premiumEndDate, 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                )}
                {premiumSource && (
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Origine</p>
                      <p className="font-medium">
                        {SOURCE_LABEL[premiumSource] || premiumSource}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Crown className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {isExpired ? 'Abonnement expiré' : 'Compte Gratuit'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isExpired
                    ? 'Votre accès Premium a pris fin.'
                    : 'Découvrez les avantages exclusifs de Bérée Premium.'}
                </p>
              </div>
              <Link to="/premium">
                <Button>Découvrir Premium</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProfileSubscription;
