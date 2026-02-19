/**
 * Carte de statut des notifications (version simplifiée)
 */

import React from 'react';
import { Smartphone, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const NotificationStatusCard: React.FC = () => {
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
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="flex items-center space-x-2">
                <p className="font-medium text-foreground">Notifications push</p>
                <Badge variant="secondary">Non configuré</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Les notifications ne sont pas encore disponibles
              </p>
            </div>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Les notifications push ne sont pas encore configurées pour cette application.
            Cette fonctionnalité sera disponible dans une prochaine version.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
