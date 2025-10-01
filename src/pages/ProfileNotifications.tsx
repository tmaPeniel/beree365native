import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Clock, Check, X, AlertCircle, Smartphone, Settings, TestTube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { pushNotificationService, type NotificationPreferences } from '@/services/pushNotificationService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Page de gestion détaillée des notifications
 */
const ProfileNotifications = () => {
  const { 
    isSupported, 
    isSubscribed, 
    isLoading: pushLoading, 
    permission, 
    subscribe, 
    unsubscribe,
    requestPermission
  } = usePushNotifications();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Charger les préférences
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await pushNotificationService.getNotificationPreferences();
      if (prefs) {
        setPreferences({
          reading_reminder_enabled: prefs.reading_reminder_enabled ?? true,
          reading_reminder_time: prefs.reading_reminder_time ?? '20:00',
          daily_verse_enabled: prefs.daily_verse_enabled ?? true,
          daily_verse_time: prefs.daily_verse_time ?? '07:00',
          badge_encouragement_enabled: prefs.badge_encouragement_enabled ?? true
        });
      }
      setIsLoading(false);
    };
    loadPreferences();
  }, []);

  // Mettre à jour une préférence
  const updatePreference = async (key: keyof NotificationPreferences, value: boolean | string) => {
    setIsUpdating(true);
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    
    const success = await pushNotificationService.updateNotificationPreferences(newPrefs);
    if (success) {
      toast.success('Préférences mises à jour');
    } else {
      toast.error('Erreur lors de la mise à jour');
      // Revenir à l'ancienne valeur en cas d'erreur
      setPreferences(preferences);
    }
    setIsUpdating(false);
  };

  // Tester l'envoi de notification
  const testNotification = async () => {
    setIsTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Vous devez être connecté');
        return;
      }

      const { data, error } = await supabase.functions.invoke('test-push-notification', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Erreur test notification:', error);
        toast.error('Erreur lors du test: ' + error.message);
      } else {
        console.log('Résultat test:', data);
        toast.success('Notification de test envoyée ! Vérifiez vos notifications.');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du test');
    } finally {
      setIsTesting(false);
    }
  };

  // Obtenir le statut global des notifications
  const getGlobalStatus = () => {
    if (!isSupported) {
      return { 
        status: 'unsupported', 
        label: 'Non supporté', 
        variant: 'secondary' as const,
        icon: AlertCircle,
        description: 'Votre navigateur ne supporte pas les notifications push'
      };
    }
    if (permission === 'denied') {
      return { 
        status: 'denied', 
        label: 'Permissions refusées', 
        variant: 'destructive' as const,
        icon: X,
        description: 'Les permissions pour les notifications ont été refusées'
      };
    }
    if (isSubscribed) {
      return { 
        status: 'active', 
        label: 'Notifications actives', 
        variant: 'default' as const,
        icon: Check,
        description: 'Vous recevrez les notifications selon vos préférences'
      };
    }
    return { 
      status: 'inactive', 
      label: 'Notifications inactives', 
      variant: 'outline' as const,
      icon: Bell,
      description: 'Activez les notifications pour recevoir les rappels'
    };
  };

  const globalStatus = getGlobalStatus();
  const StatusIcon = globalStatus.icon;

  // Gérer l'activation/désactivation des notifications
  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      if (permission === 'denied') {
        toast.error('Les permissions ont été refusées. Veuillez les autoriser dans les paramètres de votre navigateur.');
        return;
      }
      if (permission === 'default') {
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          return;
        }
      }
      await subscribe();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/profile/settings">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6 py-6 space-y-6">
        {/* Statut global */}
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
                    <Badge variant={globalStatus.variant}>
                      {globalStatus.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{globalStatus.description}</p>
                </div>
              </div>
              {isSupported && permission !== 'denied' && (
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handleToggleNotifications}
                  disabled={pushLoading}
                />
              )}
            </div>

            {/* Alertes spéciales */}
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

            {/* Bouton de test */}
            {isSubscribed && (
              <div className="pt-2">
                <Button
                  onClick={testNotification}
                  disabled={isTesting}
                  variant="outline"
                  className="w-full"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTesting ? 'Envoi en cours...' : 'Tester les notifications'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Envoyez une notification de test pour vérifier que tout fonctionne
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Préférences de notifications */}
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
                  onCheckedChange={(checked) => updatePreference('reading_reminder_enabled', checked)}
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
                    onChange={(e) => updatePreference('reading_reminder_time', e.target.value)}
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
                  onCheckedChange={(checked) => updatePreference('daily_verse_enabled', checked)}
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
                    onChange={(e) => updatePreference('daily_verse_time', e.target.value)}
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
                onCheckedChange={(checked) => updatePreference('badge_encouragement_enabled', checked)}
                disabled={isUpdating || !isSubscribed}
              />
            </div>
          </CardContent>
        </Card>

        {/* Note informative */}
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Les notifications ne seront envoyées que si vous avez activé les notifications push 
            et accordé les permissions nécessaires à votre navigateur.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default ProfileNotifications;