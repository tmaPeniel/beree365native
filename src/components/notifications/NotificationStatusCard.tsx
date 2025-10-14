/**
 * Carte de statut des notifications
 */

import React from 'react';
import { Smartphone, AlertCircle, X, TestTube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { NotificationStatusInfo } from '@/types/notifications';

interface NotificationStatusCardProps {
  status: NotificationStatusInfo;
  isSubscribed: boolean;
  isSupported: boolean;
  permission: NotificationPermission | 'unknown';
  isLoading: boolean;
  onToggle: () => void;
  onTest: () => void;
  isTesting: boolean;
}

export const NotificationStatusCard: React.FC<NotificationStatusCardProps> = ({
  status,
  isSubscribed,
  isSupported,
  permission,
  isLoading,
  onToggle,
  onTest,
  isTesting
}) => {
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5" />
          <span>Statut des notifications push</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="flex items-center space-x-2">
                <p className="font-medium text-foreground">Notifications push</p>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{status.description}</p>
            </div>
          </div>
          {isSupported && permission !== 'denied' && (
            <Switch
              checked={isSubscribed}
              onCheckedChange={onToggle}
              disabled={isLoading}
            />
          )}
        </div>

        {!isSupported && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Votre navigateur ne supporte pas les notifications push. 
              Utilisez un navigateur moderne pour profiter de cette fonctionnalité.
            </AlertDescription>
          </Alert>
        )}

        {permission === 'denied' && (
          <Alert variant="destructive">
            <X className="h-4 w-4" />
            <AlertDescription>
              Les permissions pour les notifications ont été refusées. 
              Pour les réactiver, allez dans les paramètres de votre navigateur.
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-2">
          <Button
            onClick={onTest}
            disabled={isTesting || !isSubscribed}
            variant="outline"
            className="w-full"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isTesting ? 'Envoi en cours...' : 'Tester les notifications'}
          </Button>
          {!isSubscribed && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Activez d'abord les notifications pour pouvoir les tester
            </p>
          )}
          {isSubscribed && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Envoyez une notification de test pour vérifier que tout fonctionne
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
