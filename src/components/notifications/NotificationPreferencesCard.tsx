/**
 * Carte de préférences de notifications
 */

import React from 'react';
import { Settings, Bell, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { NotificationPreferences } from '@/types/notifications';

interface NotificationPreferencesCardProps {
  preferences: NotificationPreferences;
  isSubscribed: boolean;
  isUpdating: boolean;
  onUpdate: (key: keyof NotificationPreferences, value: boolean | string) => void;
}

export const NotificationPreferencesCard: React.FC<NotificationPreferencesCardProps> = ({
  preferences,
  isSubscribed,
  isUpdating,
  onUpdate
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Préférences de notifications</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <Switch
              checked={preferences.reading_reminder_enabled ?? true}
              onCheckedChange={(checked) => onUpdate('reading_reminder_enabled', checked)}
              disabled={isUpdating || !isSubscribed}
            />
          </div>
          
          {preferences.reading_reminder_enabled && (
            <div className="ml-8 flex items-center space-x-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Heure:</span>
              <input
                type="time"
                value={preferences.reading_reminder_time || '20:00'}
                onChange={(e) => onUpdate('reading_reminder_time', e.target.value)}
                className="px-2 py-1 text-sm border rounded bg-background"
                disabled={isUpdating || !isSubscribed}
              />
            </div>
          )}
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
            <Switch
              checked={preferences.daily_verse_enabled ?? true}
              onCheckedChange={(checked) => onUpdate('daily_verse_enabled', checked)}
              disabled={isUpdating || !isSubscribed}
            />
          </div>
          
          {preferences.daily_verse_enabled && (
            <div className="ml-8 flex items-center space-x-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Heure:</span>
              <input
                type="time"
                value={preferences.daily_verse_time || '07:00'}
                onChange={(e) => onUpdate('daily_verse_time', e.target.value)}
                className="px-2 py-1 text-sm border rounded bg-background"
                disabled={isUpdating || !isSubscribed}
              />
            </div>
          )}
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
          <Switch
            checked={preferences.badge_encouragement_enabled ?? true}
            onCheckedChange={(checked) => onUpdate('badge_encouragement_enabled', checked)}
            disabled={isUpdating || !isSubscribed}
          />
        </div>
      </CardContent>
    </Card>
  );
};
