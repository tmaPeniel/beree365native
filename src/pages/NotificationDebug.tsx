/**
 * Page de débogage des notifications (version simplifiée)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { despiaNotificationService } from '@/services/notifications/despiaNotificationService';
import { toast } from 'sonner';
import { useUnifiedPushNotifications } from '@/hooks/useUnifiedPushNotifications';

export default function NotificationDebug() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSubscribed } = useUnifiedPushNotifications();
  const [title, setTitle] = useState('📖 Notification de test');
  const [message, setMessage] = useState('Ceci est une notification de test depuis Beree');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSendTest = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (!isSubscribed) {
      toast.error('Vous devez être abonné aux notifications');
      return;
    }

    if (!title.trim() || !message.trim()) {
      toast.error('Le titre et le message sont requis');
      return;
    }

    setIsSending(true);
    try {
      const success = await despiaNotificationService.sendNotification({
        userId: user.id,
        title: title.trim(),
        message: message.trim()
      });

      if (success) {
        toast.success('Notification envoyée avec succès !');
      } else {
        toast.error('Erreur lors de l\'envoi de la notification');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la notification');
    } finally {
      setIsSending(false);
    }
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
      </div>

      {/* Test Form */}
      <Card>
        <CardHeader>
          <CardTitle>Envoyer une notification de test</CardTitle>
          <CardDescription>
            Testez l'envoi de notifications push sur votre appareil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la notification</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entrez le titre"
              maxLength={100}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Entrez le message de la notification"
              rows={4}
              maxLength={200}
            />
          </div>

          <Button 
            onClick={handleSendTest} 
            disabled={isSending || !isSubscribed}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Envoi en cours...' : 'Envoyer la notification'}
          </Button>

          {!isSubscribed && (
            <p className="text-sm text-muted-foreground text-center">
              Vous devez d'abord activer les notifications dans les paramètres
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
