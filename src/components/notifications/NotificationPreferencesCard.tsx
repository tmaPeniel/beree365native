/**
 * Carte de préférences de notifications
 */

import React from 'react';
import { Settings, Bell, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Skeleton } from '@/components/ui/skeleton';

export const NotificationPreferencesCard: React.FC = () => {
  const { preferences, updatePreferences, isLoading, isSaving } = useNotificationPreferences();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Préférences de notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

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
              checked={preferences.reading_reminder_enabled}
              onCheckedChange={(checked) =>
                updatePreferences({ reading_reminder_enabled: checked })
              }
              disabled={isSaving}
            />
          </div>
          
          {preferences.reading_reminder_enabled && (
            <div className="ml-8 flex items-center space-x-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Heure:</span>
              <Input
                type="time"
                value={preferences.reading_reminder_time}
                onChange={(e) =>
                  updatePreferences({ reading_reminder_time: e.target.value })
                }
                disabled={isSaving}
                className="w-32"
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
              checked={preferences.daily_verse_enabled}
              onCheckedChange={(checked) =>
                updatePreferences({ daily_verse_enabled: checked })
              }
              disabled={isSaving}
            />
          </div>
          
          {preferences.daily_verse_enabled && (
            <div className="ml-8 flex items-center space-x-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Heure:</span>
              <Input
                type="time"
                value={preferences.daily_verse_time}
                onChange={(e) =>
                  updatePreferences({ daily_verse_time: e.target.value })
                }
                disabled={isSaving}
                className="w-32"
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
            checked={preferences.badge_encouragement_enabled}
            onCheckedChange={(checked) =>
              updatePreferences({ badge_encouragement_enabled: checked })
            }
            disabled={isSaving}
          />
        </div>
      </CardContent>
    </Card>
  );
};
