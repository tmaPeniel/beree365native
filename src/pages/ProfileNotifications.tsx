/**
 * Page de gestion des notifications push natives (Web Push API)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedPushNotifications } from '@/hooks/useUnifiedPushNotifications';
import { pushService } from '@/services/pushService';
import { toast } from '@/hooks/use-toast';
import { NotificationPreferencesCard } from '@/components/notifications/NotificationPreferencesCard';

export default function ProfileNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    isSubscribed, 
    isLoading, 
    isInitializing,
    permission,
    subscribe, 
    unsubscribe,
    reinitialize
  } = useUnifiedPushNotifications();

  const [title, setTitle] = useState('📖 Rappel de lecture');
  const [message, setMessage] = useState("N'oubliez pas votre lecture quotidienne !");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const handleSendTest = async () => {
    if (!user || !isSubscribed || !title.trim() || !message.trim()) {
      toast({
        title: 'Erreur',
        description: 'Vérifiez que vous êtes connecté, abonné et que les champs sont remplis',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const success = await pushService.sendNotification({
        title: title.trim(),
        message: message.trim(),
        userId: user.id,
      });

      toast({
        title: success ? 'Notification envoyée' : 'Erreur',
        description: success ? 'Notification envoyée avec succès' : "Échec de l'envoi",
        variant: success ? 'default' : 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/profile/settings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Notifications Push</h1>
          <p className="text-sm text-muted-foreground">Gérez vos notifications</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Badge variant={permission === 'granted' ? 'default' : 'destructive'}>
          <Bell className="h-3 w-3 mr-1" />
          {permission === 'granted' ? 'Autorisées' : 'Refusées'}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSubscribed ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5" />}
            État des notifications
          </CardTitle>
          <CardDescription>
            {isSubscribed ? 'Vous recevez les notifications' : 'Notifications désactivées'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => isSubscribed ? unsubscribe() : subscribe()} disabled={isLoading} className="flex-1" variant={isSubscribed ? 'destructive' : 'default'}>
              {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : isSubscribed ? <BellOff className="h-4 w-4 mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
              {isSubscribed ? 'Désactiver' : 'Activer'}
            </Button>
            <Button onClick={reinitialize} disabled={isLoading} variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test de notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isSubscribed} />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} disabled={!isSubscribed} rows={3} />
          </div>
          <Button onClick={handleSendTest} disabled={!isSubscribed || isSending} className="w-full">
            {isSending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer un test
          </Button>
        </CardContent>
      </Card>

      <NotificationPreferencesCard />
    </div>
  );
}
