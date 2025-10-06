/**
 * Page de gestion des notifications - Version simplifiée
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, AlertCircle, Check, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { preferencesService } from '@/services/notifications/preferencesService';
import { notificationTestService } from '@/services/notifications/testService';
import { NotificationStatusCard } from '@/components/notifications/NotificationStatusCard';
import { NotificationPreferencesCard } from '@/components/notifications/NotificationPreferencesCard';
import { NotificationPreferences, NotificationStatusInfo } from '@/types/notifications';
import { DEFAULT_NOTIFICATION_PREFS, NOTIFICATION_MESSAGES } from '@/constants/notifications';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const ProfileNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { 
    isSupported, 
    isSubscribed, 
    isLoading: pushLoading, 
    permission, 
    subscribe, 
    unsubscribe,
    requestPermission
  } = usePushNotifications();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Vérifier l'authentification
  useEffect(() => {
    if (!user) {
      toast.error('Vous devez être connecté pour gérer les notifications');
      navigate('/login');
    }
  }, [user, navigate]);

  // Charger les préférences
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await preferencesService.get();
      setPreferences(prefs);
      setIsLoading(false);
    };
    loadPreferences();
  }, []);

  // Mettre à jour une préférence
  const updatePreference = async (key: keyof NotificationPreferences, value: boolean | string) => {
    setIsUpdating(true);
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    
    const success = await preferencesService.update(newPrefs);
    if (success) {
      toast.success(NOTIFICATION_MESSAGES.PREFERENCES_UPDATED);
    } else {
      toast.error(NOTIFICATION_MESSAGES.PREFERENCES_ERROR);
      setPreferences(preferences);
    }
    setIsUpdating(false);
  };

  // Tester les notifications
  const handleTest = async () => {
    setIsTesting(true);
    await notificationTestService.sendTest();
    setIsTesting(false);
  };

  // Obtenir le statut global
  const getGlobalStatus = (): NotificationStatusInfo => {
    if (!isSupported) {
      return { 
        status: 'unsupported', 
        label: 'Non supporté', 
        variant: 'secondary',
        icon: AlertCircle,
        description: 'Votre navigateur ne supporte pas les notifications push'
      };
    }
    if (permission === 'denied') {
      return { 
        status: 'denied', 
        label: 'Permissions refusées', 
        variant: 'destructive',
        icon: X,
        description: 'Les permissions pour les notifications ont été refusées'
      };
    }
    if (isSubscribed) {
      return { 
        status: 'active', 
        label: 'Notifications actives', 
        variant: 'default',
        icon: Check,
        description: 'Vous recevrez les notifications selon vos préférences'
      };
    }
    return { 
      status: 'inactive', 
      label: 'Notifications inactives', 
      variant: 'outline',
      icon: Bell,
      description: 'Activez les notifications pour recevoir les rappels'
    };
  };

  // Gérer l'activation/désactivation
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
        <NotificationStatusCard
          status={getGlobalStatus()}
          isSubscribed={isSubscribed}
          isSupported={isSupported}
          permission={permission}
          isLoading={pushLoading}
          onToggle={handleToggleNotifications}
          onTest={handleTest}
          isTesting={isTesting}
        />

        <NotificationPreferencesCard
          preferences={preferences}
          isSubscribed={isSubscribed}
          isUpdating={isUpdating}
          onUpdate={updatePreference}
        />

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
