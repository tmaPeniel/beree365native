/**
 * Page de diagnostic Capacitor et notifications
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedPushNotifications } from '@/hooks/useUnifiedPushNotifications';
import { capacitorNotificationService } from '@/services/notifications/capacitorNotificationService';
import { toast } from '@/hooks/use-toast';

export default function CapacitorDebug() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    platform,
    platformName,
    permission,
    isSubscribed,
    isInitializing,
    deviceToken,
    oneSignalPlayerId,
    reinitialize,
  } = useUnifiedPushNotifications();

  const [logs, setLogs] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const handleTestNotification = async () => {
    if (!user) return;

    setIsTesting(true);
    addLog('🧪 Envoi d\'une notification test...');

    try {
      const success = await capacitorNotificationService.sendNotification({
        title: '🧪 Test Capacitor',
        message: 'Notification de test envoyée avec succès !',
        userId: user.id,
      });

      if (success) {
        addLog('✅ Notification test envoyée avec succès');
        toast({
          title: 'Test réussi',
          description: 'Vérifiez votre appareil',
        });
      } else {
        addLog('❌ Échec de l\'envoi de la notification test');
        toast({
          title: 'Erreur',
          description: 'Impossible d\'envoyer la notification',
          variant: 'destructive',
        });
      }
    } catch (error) {
      addLog(`❌ Erreur: ${error}`);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReinitialize = async () => {
    addLog('🔄 Réinitialisation des notifications...');
    const success = await reinitialize();
    
    if (success) {
      addLog('✅ Réinitialisation réussie');
    } else {
      addLog('❌ Échec de la réinitialisation');
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    addLog('🧹 Logs effacés');
  };

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getPermissionIcon = () => {
    if (permission === 'granted') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (permission === 'denied') return <XCircle className="h-5 w-5 text-red-500" />;
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/profile/notifications')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Diagnostic Capacitor</h1>
          <p className="text-muted-foreground">
            Informations détaillées sur les notifications
          </p>
        </div>
      </div>

      {/* Platform Status */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Détection de plateforme</CardTitle>
          <CardDescription>
            Informations sur l'environnement d'exécution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Type de plateforme</span>
            <Badge variant={platform === 'capacitor' ? 'default' : 'secondary'}>
              {platform === 'capacitor' ? '📱 Capacitor Native' : 
               platform === 'despia' ? '🔷 Despia' : '🌐 Web'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Système d'exploitation</span>
            <Badge variant="outline">
              {platformName.toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Capacitor détecté</span>
            {getStatusIcon(platform === 'capacitor')}
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">En cours d'initialisation</span>
            {getStatusIcon(!isInitializing)}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Status */}
      <Card>
        <CardHeader>
          <CardTitle>🔔 Statut des permissions</CardTitle>
          <CardDescription>
            État actuel des permissions de notification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Permissions</span>
            <div className="flex items-center gap-2">
              {getPermissionIcon()}
              <Badge variant={permission === 'granted' ? 'default' : 'destructive'}>
                {permission}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Abonné aux notifications</span>
            {getStatusIcon(isSubscribed)}
          </div>

          {oneSignalPlayerId && (
            <div>
              <span className="font-medium">OneSignal Player ID</span>
              <p className="font-mono text-xs text-muted-foreground mt-1 break-all">
                {oneSignalPlayerId}
              </p>
            </div>
          )}

          {deviceToken && (
            <div>
              <span className="font-medium">Device Token</span>
              <p className="font-mono text-xs text-muted-foreground mt-1 break-all">
                {deviceToken}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>⚙️ Actions de diagnostic</CardTitle>
          <CardDescription>
            Testez et réinitialisez les notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleTestNotification}
            disabled={isTesting || !isSubscribed}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isTesting ? 'Envoi en cours...' : 'Envoyer une notification test'}
          </Button>

          <Button
            onClick={handleReinitialize}
            variant="outline"
            disabled={isInitializing}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réinitialiser les notifications
          </Button>

          <Button
            onClick={handleClearLogs}
            variant="ghost"
            className="w-full"
          >
            🧹 Effacer les logs
          </Button>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Logs de diagnostic</CardTitle>
          <CardDescription>
            Historique des événements et erreurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun log disponible
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index}>
                    <p className="font-mono text-xs">{log}</p>
                    {index < logs.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>📚 Instructions Android</CardTitle>
          <CardDescription>
            Comment vérifier les permissions manuellement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Sur Android :</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Ouvrir les Paramètres de l'appareil</li>
            <li>Aller dans Applications → Bérée 365</li>
            <li>Appuyer sur Notifications</li>
            <li>Vérifier que les notifications sont activées</li>
          </ol>

          <Separator className="my-4" />

          <p className="text-muted-foreground text-xs">
            Si les notifications ne fonctionnent toujours pas après avoir vérifié les permissions,
            essayez de désinstaller et réinstaller l'application.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
