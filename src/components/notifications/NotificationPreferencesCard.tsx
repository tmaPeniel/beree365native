/**
 * Carte de préférences de notifications (version simplifiée)
 */

import React from 'react';
import { Settings, Bell, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const NotificationPreferencesCard: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Préférences de notifications</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 opacity-50">
        {/* Rappels de lecture */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Rappels de lecture quotidiens</p>
                <p className="text-sm text-muted-foreground">
                  Recevez un rappel pour votre lecture quotidienne
                </p>
              </div>
            </div>
            <div className="h-6 w-11 rounded-full bg-muted" />
          </div>
          
          <div className="ml-8 flex items-center space-x-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Heure:</span>
            <div className="px-2 py-1 text-sm border rounded bg-muted">
              20:00
            </div>
          </div>
        </div>

        <Separator />

        {/* Versets du jour */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Verset du jour</p>
                <p className="text-sm text-muted-foreground">
                  Recevez le verset quotidien le matin
                </p>
              </div>
            </div>
            <div className="h-6 w-11 rounded-full bg-muted" />
          </div>
          
          <div className="ml-8 flex items-center space-x-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Heure:</span>
            <div className="px-2 py-1 text-sm border rounded bg-muted">
              07:00
            </div>
          </div>
        </div>

        <Separator />

        {/* Encouragements badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Encouragements badges</p>
              <p className="text-sm text-muted-foreground">
                Recevez des félicitations quand vous obtenez un nouveau badge
              </p>
            </div>
          </div>
          <div className="h-6 w-11 rounded-full bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
};
