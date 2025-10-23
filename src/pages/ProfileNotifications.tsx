/**
 * Page de gestion des notifications push
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedPushNotifications } from '@/hooks/useUnifiedPushNotifications';
import { despiaNotificationService } from '@/services/notifications/despiaNotificationService';
import { toast } from '@/hooks/use-toast';

export default function ProfileNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSubscribed, isLoading, subscribe, unsubscribe } = useUnifiedPushNotifications();

  const [title, setTitle] = useState('📖 Rappel de lecture');
  const [message, setMessage] = useState('N\'oubliez pas votre lecture quotidienne !');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSendTest = async () => {
    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour envoyer une notification',
        variant: 'destructive',
      });
      return;
    }

    if (!isSubscribed) {
      toast({
        title: 'Erreur',
        description: 'Vous devez activer les notifications avant de pouvoir les tester',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le titre et le message sont requis',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const success = await despiaNotificationService.sendNotification({
        title: title.trim(),
        message: message.trim(),
        userId: user.id,
      });

      if (success) {
        toast({
          title: 'Notification envoyée',
          description: 'La notification de test a été envoyée avec succès',
        });
      } else {
        toast({
          title: 'Erreur',
          description: 'Impossible d\'envoyer la notification',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'envoi',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/profile/settings')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Gérez vos préférences de notifications push
          </p>
        </div>
      </div>

      {/* Card de statut des notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>📱 Notifications Push</CardTitle>
              <Badge variant={isSubscribed ? 'default' : 'secondary'}>
                {isSubscribed ? 'Activées' : 'Désactivées'}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Recevez des rappels pour vos lectures quotidiennes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {isSubscribed ? 'Notifications activées' : 'Notifications désactivées'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isSubscribed 
                    ? 'Vous recevrez des notifications push'
                    : 'Activez les notifications pour recevoir des rappels'
                  }
                </p>
              </div>
            </div>
            <Button 
              onClick={handleToggleNotifications}
              variant={isSubscribed ? 'outline' : 'default'}
              disabled={isLoading}
            >
              {isLoading ? 'Chargement...' : (isSubscribed ? 'Désactiver' : 'Activer')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card de test de notification - visible uniquement si activé */}
      {isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle>🧪 Tester les notifications</CardTitle>
            <CardDescription>
              Envoyez-vous une notification de test pour vérifier que tout fonctionne
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la notification</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la notification"
                maxLength={50}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Contenu de la notification"
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/200 caractères
              </p>
            </div>

            <Button 
              onClick={handleSendTest}
              disabled={isSending || !title.trim() || !message.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? 'Envoi en cours...' : 'Envoyer la notification test'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Card de préférences futures */}
      <Card>
        <CardHeader>
          <CardTitle>⚙️ Préférences de notifications</CardTitle>
          <CardDescription>
            Configurez quand vous souhaitez recevoir des notifications (bientôt disponible)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 opacity-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Rappels de lecture quotidiens</p>
                <p className="text-sm text-muted-foreground">
                  Recevez un rappel pour votre lecture quotidienne
                </p>
              </div>
              <div className="h-6 w-11 rounded-full bg-muted" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Verset du jour</p>
                <p className="text-sm text-muted-foreground">
                  Recevez le verset quotidien le matin
                </p>
              </div>
              <div className="h-6 w-11 rounded-full bg-muted" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Encouragements badges</p>
                <p className="text-sm text-muted-foreground">
                  Recevez des félicitations quand vous obtenez un nouveau badge
                </p>
              </div>
              <div className="h-6 w-11 rounded-full bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
