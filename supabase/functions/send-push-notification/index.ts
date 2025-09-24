import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  title: string;
  body: string;
  data?: any;
  tag?: string;
  icon?: string;
  badge?: string;
  image?: string;
  userId?: string;
  userIds?: string[];
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  is_active: boolean;
}

// Fonction pour générer les clés VAPID à partir de la clé privée
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Fonction pour créer l'en-tête Authorization JWT pour VAPID
async function createVapidAuthHeader(endpoint: string): Promise<string> {
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  
  if (!vapidPrivateKey || !vapidPublicKey) {
    throw new Error('Clés VAPID manquantes');
  }

  // Extraire l'origine de l'endpoint
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Créer le payload JWT
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 heures
    sub: 'mailto:admin@beree.app'
  };

  // Pour simplifier, nous utiliserons une bibliothèque JWT
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  // Note: Pour une implémentation complète, il faudrait signer avec la clé privée VAPID
  // Pour le moment, nous retournons une clé basique
  return `vapid t=${encodedHeader}.${encodedPayload}.signature, k=${vapidPublicKey}`;
}

// Fonction pour envoyer une notification push
async function sendPushNotification(
  subscription: PushSubscription,
  notification: PushNotificationRequest
): Promise<boolean> {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key
      }
    };

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      tag: notification.tag,
      icon: notification.icon || '/beree-192x192.png',
      badge: notification.badge || '/beree-192x192.png',
      image: notification.image
    });

    // Créer l'en-tête d'autorisation VAPID
    const authHeader = await createVapidAuthHeader(subscription.endpoint);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': authHeader,
        'TTL': '86400' // 24 heures
      },
      body: payload
    });

    if (!response.ok) {
      console.error(`Erreur push notification pour ${subscription.user_id}:`, response.status, response.statusText);
      return false;
    }

    console.log(`Notification envoyée avec succès à ${subscription.user_id}`);
    return true;
  } catch (error) {
    console.error(`Erreur lors de l'envoi de la notification à ${subscription.user_id}:`, error);
    return false;
  }
}

serve(async (req) => {
  // Gérer les requêtes CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialiser le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const notificationData: PushNotificationRequest = await req.json();

    // Validation des données requises
    if (!notificationData.title || !notificationData.body) {
      return new Response(
        JSON.stringify({ error: 'Title et body sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Déterminer les utilisateurs cibles
    let userIds: string[] = [];
    if (notificationData.userId) {
      userIds = [notificationData.userId];
    } else if (notificationData.userIds && notificationData.userIds.length > 0) {
      userIds = notificationData.userIds;
    } else {
      // Si aucun utilisateur spécifique, envoyer à tous les utilisateurs actifs
      const { data: allUsers } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .eq('is_active', true);
      
      if (allUsers) {
        userIds = [...new Set(allUsers.map(u => u.user_id))];
      }
    }

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun utilisateur trouvé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les abonnements push actifs pour ces utilisateurs
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (error) {
      console.error('Erreur lors de la récupération des abonnements:', error);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des abonnements' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucun abonnement actif trouvé', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Envoyer les notifications à tous les abonnements
    const results = await Promise.allSettled(
      subscriptions.map(subscription => 
        sendPushNotification(subscription, notificationData)
      )
    );

    // Compter les succès et échecs
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;

    const failedCount = results.length - successCount;

    // Logger les résultats dans la table notification_logs
    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      const result = results[i];
      const success = result.status === 'fulfilled' && result.value === true;
      const errorMessage = result.status === 'rejected' ? result.reason : null;

      await supabase
        .from('notification_logs')
        .insert({
          user_id: subscription.user_id,
          push_subscription_id: subscription.id,
          notification_type: notificationData.tag || 'general',
          title: notificationData.title,
          body: notificationData.body,
          success,
          error_message: errorMessage
        });
    }

    return new Response(
      JSON.stringify({
        message: `Notifications envoyées à ${subscriptions.length} abonnement(s)`,
        sent: successCount,
        failed: failedCount,
        total: subscriptions.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur dans send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});