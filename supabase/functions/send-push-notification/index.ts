import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.5';
import webpush from 'https://esm.sh/web-push@3.6.6';

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

// Fonction pour envoyer une notification push avec web-push
async function sendPushNotification(
  subscription: PushSubscription,
  notification: PushNotificationRequest
): Promise<boolean> {
  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('❌ Clés VAPID manquantes');
      return false;
    }

    // Configurer web-push avec les clés VAPID
    webpush.setVapidDetails(
      'mailto:admin@beree.app',
      vapidPublicKey,
      vapidPrivateKey
    );

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
      tag: notification.tag || 'general',
      icon: notification.icon || '/beree-192x192.png',
      badge: notification.badge || '/beree-192x192.png',
      image: notification.image
    });

    console.log(`📤 Envoi notification à ${subscription.user_id}:`, notification.title);

    const response = await webpush.sendNotification(pushSubscription, payload);

    console.log(`✅ Notification envoyée avec succès à ${subscription.user_id}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur envoi notification à ${subscription.user_id}:`, error);
    
    // Si l'abonnement est invalide (410 Gone), le marquer comme inactif
    if (error.statusCode === 410) {
      console.log(`🗑️ Abonnement expiré pour ${subscription.user_id}, désactivation`);
      // Note: La désactivation sera faite dans la section principale
    }
    
    return false;
  }
}

serve(async (req) => {
  // Gérer les requêtes CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Fonction send-push-notification appelée');
    
    // Initialiser le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const notificationData: PushNotificationRequest = await req.json();
    console.log('📥 Données notification:', {
      title: notificationData.title,
      userId: notificationData.userId,
      userIds: notificationData.userIds?.length
    });

    // Validation des données requises
    if (!notificationData.title || !notificationData.body) {
      console.error('❌ Title et body sont requis');
      return new Response(
        JSON.stringify({ error: 'Title et body sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Déterminer les utilisateurs cibles
    let userIds: string[] = [];
    if (notificationData.userId) {
      userIds = [notificationData.userId];
      console.log(`🎯 Cible: utilisateur unique ${notificationData.userId}`);
    } else if (notificationData.userIds && notificationData.userIds.length > 0) {
      userIds = notificationData.userIds;
      console.log(`🎯 Cible: ${userIds.length} utilisateurs spécifiques`);
    } else {
      // Si aucun utilisateur spécifique, envoyer à tous les utilisateurs actifs
      const { data: allUsers } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .eq('is_active', true);
      
      if (allUsers) {
        userIds = [...new Set(allUsers.map(u => u.user_id))];
        console.log(`🎯 Cible: tous les utilisateurs actifs (${userIds.length})`);
      }
    }

    if (userIds.length === 0) {
      console.warn('⚠️ Aucun utilisateur trouvé');
      return new Response(
        JSON.stringify({ error: 'Aucun utilisateur trouvé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les abonnements push actifs pour ces utilisateurs
    console.log(`🔍 Recherche des abonnements pour ${userIds.length} utilisateur(s)`);
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Erreur récupération abonnements:', error);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des abonnements' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.warn('⚠️ Aucun abonnement actif trouvé');
      return new Response(
        JSON.stringify({ message: 'Aucun abonnement actif trouvé', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 ${subscriptions.length} abonnement(s) actif(s) trouvé(s)`);

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
      const errorMessage = result.status === 'rejected' ? String(result.reason) : null;

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

      // Si l'abonnement a expiré (410 Gone), le désactiver
      if (result.status === 'rejected' && String(result.reason).includes('410')) {
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', subscription.id);
      }
    }

    console.log(`✨ Résumé: ${successCount} succès, ${failedCount} échecs sur ${results.length} total`);

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
    console.error('❌ Erreur générale dans send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
