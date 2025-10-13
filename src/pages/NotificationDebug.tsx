import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Send, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { notificationDebugService, type NotificationDebugInfo } from '@/services/notifications/debugService';
import { toast } from 'sonner';

export default function NotificationDebug() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<NotificationDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  const loadDebugInfo = async () => {
    setIsLoading(true);
    const info = await notificationDebugService.getDebugInfo();
    setDebugInfo(info);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadDebugInfo();
  }, [user, navigate]);

  const handleTest = async () => {
    setIsTesting(true);
    const success = await notificationDebugService.testNotification();
    
    if (success) {
      toast.success('Notification de test envoyée !');
      // Recharger les infos pour voir le nouveau log
      setTimeout(loadDebugInfo, 2000);
    } else {
      toast.error('Échec de l\'envoi de la notification de test');
    }
    
    setIsTesting(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const getPlatformBadge = () => {
    if (!debugInfo) return null;
    
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      native: 'default',
      web: 'secondary',
      unknown: 'destructive'
    };

    return (
      <Badge variant={variants[debugInfo.platform]}>
        {debugInfo.platform === 'native' ? '📱 Android Natif' : 
         debugInfo.platform === 'web' ? '🌐 PWA Web' : 
         '❓ Inconnu'}
      </Badge>
    );
  };

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
        <Button
          variant="outline"
          size="icon"
          onClick={loadDebugInfo}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Statut de l'abonnement */}
      <Card>
        <CardHeader>
          <CardTitle>Statut de l'abonnement</CardTitle>
          <CardDescription>Informations sur votre abonnement push</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Plateforme:</span>
            {getPlatformBadge()}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Abonnement actif:</span>
            {debugInfo?.hasSubscription ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Type d'endpoint:</span>
            <p className="text-sm text-muted-foreground">{debugInfo?.endpointType}</p>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Endpoint:</span>
            <p className="text-xs text-muted-foreground font-mono break-all">
              {debugInfo?.endpointPreview}
            </p>
          </div>

          {debugInfo?.createdAt && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Créé le:</span>
              <p className="text-sm text-muted-foreground">
                {new Date(debugInfo.createdAt).toLocaleString('fr-FR')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test de notification */}
      <Card>
        <CardHeader>
          <CardTitle>Envoyer une notification de test</CardTitle>
          <CardDescription>
            Testez si votre configuration fonctionne correctement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleTest}
            disabled={!debugInfo?.hasSubscription || isTesting}
            className="w-full"
          >
            {isTesting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer une notification de test
              </>
            )}
          </Button>
          
          {!debugInfo?.hasSubscription && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Vous devez d'abord activer les notifications dans les paramètres.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Historique des notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Historique récent</CardTitle>
          <CardDescription>Les 10 dernières tentatives d'envoi</CardDescription>
        </CardHeader>
        <CardContent>
          {debugInfo?.latestLogs && debugInfo.latestLogs.length > 0 ? (
            <div className="space-y-3">
              {debugInfo.latestLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  {log.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{log.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {log.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.sent_at).toLocaleString('fr-FR')}
                    </p>
                    {!log.success && log.error_message && (
                      <p className="text-xs text-red-500 mt-2 font-mono">
                        {log.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucune notification envoyée pour le moment.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Aide */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Problèmes courants:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Sur Android natif, le type d'endpoint doit être "Android FCM"</li>
            <li>Sur PWA web, le type d'endpoint doit être "Web Push"</li>
            <li>Vérifiez que FCM_SERVER_KEY est configuré dans Supabase</li>
            <li>Les notifications ne fonctionnent pas sur les émulateurs Android</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
