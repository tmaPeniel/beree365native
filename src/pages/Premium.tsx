import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Award, BookOpen, Sparkles, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePremium } from '@/hooks/usePremium';

const features = [
  {
    icon: Bell,
    title: 'Notifications personnalisées',
    description: 'Rappel de lecture quotidien, verset du jour et encouragements.',
  },
  {
    icon: Award,
    title: 'Badges et récompenses',
    description: 'Débloquez des badges qui célèbrent votre fidélité dans la Parole.',
  },
  {
    icon: BookOpen,
    title: 'Plans de lecture supplémentaires',
    description: 'Accédez à plusieurs plans : chronologique, Nouveau Testament, thématiques…',
  },
];

const Premium: React.FC = () => {
  const { isPremium } = usePremium();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b">
        <div className="px-6 py-4 flex items-center space-x-4">
          <Link to="/profile">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Bérée Premium</h1>
        </div>
      </div>

      <div className="px-6 py-8 space-y-6 max-w-2xl mx-auto">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Allez plus loin avec Premium</h2>
          <p className="text-muted-foreground">
            Profitez d'une expérience enrichie pour soutenir votre marche quotidienne.
          </p>
        </div>

        <div className="space-y-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isPremium ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 text-center space-y-3">
              <p className="font-medium text-foreground">
                ✨ Vous êtes actuellement abonné Premium. Merci !
              </p>
              <Link to="/profile/subscription">
                <Button variant="outline">Voir mon abonnement</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Mail className="h-5 w-5" />
                <h3 className="font-semibold">Comment activer Premium ?</h3>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                Vous possédez le manuel Bérée ? Contactez un administrateur afin
                d'activer votre accès Premium pendant 12 mois.
              </p>
              <a href="mailto:contact@beree-365.app?subject=Activation%20Premium%20B%C3%A9r%C3%A9e">
                <Button className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Contacter un administrateur
                </Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Premium;
