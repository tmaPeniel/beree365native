/**
 * Page de débogage des notifications (version simplifiée)
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationDebug() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/profile/settings/notifications')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">🔧 Débogage Notifications</h1>
          <p className="text-muted-foreground">Diagnostiquez vos problèmes de notifications</p>
        </div>
      </div>

      {/* Alert principal */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fonctionnalité non configurée</AlertTitle>
        <AlertDescription>
          Les notifications push ne sont pas encore configurées pour cette application.
          Cette page de débogage sera disponible une fois les notifications activées.
        </AlertDescription>
      </Alert>

      {/* Statut de l'abonnement */}
      <Card>
        <CardHeader>
          <CardTitle>Statut de l'abonnement</CardTitle>
          <CardDescription>Informations sur votre abonnement push</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-8 text-center">
            <p className="text-muted-foreground">
              Aucune configuration de notification disponible
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle>Historique récent</CardTitle>
          <CardDescription>Les dernières tentatives d'envoi</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucune notification envoyée pour le moment.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
