/**
 * Page de gestion des notifications (version simplifiée)
 * Les notifications ne sont pas encore configurées
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/profile/settings')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Gérez vos préférences de notifications
          </p>
        </div>
      </div>

      {/* Alert d'information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fonctionnalité en développement</AlertTitle>
        <AlertDescription>
          Les notifications push ne sont pas encore configurées pour cette application.
          Cette fonctionnalité sera disponible dans une prochaine version.
        </AlertDescription>
      </Alert>

      {/* Card de statut */}
      <Card>
        <CardHeader>
          <CardTitle>📱 Notifications Push</CardTitle>
          <CardDescription>
            Recevez des rappels pour vos lectures quotidiennes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Les notifications ne sont pas encore disponibles
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card de préférences */}
      <Card>
        <CardHeader>
          <CardTitle>⚙️ Préférences</CardTitle>
          <CardDescription>
            Configurez vos préférences de notifications (bientôt disponible)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 opacity-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Rappels de lecture quotidiens</p>
                <p className="text-sm text-muted-foreground">
                  Recevez un rappel pour votre lecture quotidienne
                </p>
              </div>
              <div className="h-6 w-11 rounded-full bg-muted" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Verset du jour</p>
                <p className="text-sm text-muted-foreground">
                  Recevez le verset quotidien le matin
                </p>
              </div>
              <div className="h-6 w-11 rounded-full bg-muted" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Encouragements badges</p>
                <p className="text-sm text-muted-foreground">
                  Recevez des félicitations quand vous obtenez un nouveau badge
                </p>
              </div>
              <div className="h-6 w-11 rounded-full bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
