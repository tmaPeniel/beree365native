/**
 * Edge Function pour envoyer des notifications push via Firebase Cloud Messaging
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.5';

const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  tag?: string;
  icon?: string;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  is_active: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚀 FCM Notification Request');

  try {
    if (!FCM_SERVER_KEY) {
      throw new Error('FCM_SERVER_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const notificationData: NotificationRequest = await req.json();
    
    console.log('📨 Notification data:', {
      title: notificationData.title,
      hasUserId: !!notificationData.userId,
      hasUserIds: !!notificationData.userIds,
      userIdsCount: notificationData.userIds?.length || 0
    });

    // Déterminer les utilisateurs cibles
    let targetUserIds: string[] = [];
    
    if (notificationData.userId) {
      targetUserIds = [notificationData.userId];
    } else if (notificationData.userIds && notificationData.userIds.length > 0) {
      targetUserIds = notificationData.userIds;
    } else {
      // Tous les utilisateurs actifs avec des subscriptions
      const { data: users, error: usersError } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .eq('is_active', true);
      
      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        throw usersError;
      }
      
      targetUserIds = [...new Set(users?.map(u => u.user_id) || [])];
    }

    console.log(`👥 Target users: ${targetUserIds.length}`);

    // Récupérer les subscriptions actives
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)
      .eq('is_active', true);

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ No active subscriptions found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active subscriptions',
          sent: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Found ${subscriptions.length} subscriptions`);

    // Envoyer les notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        try {
          // Vérifier si c'est un token natif (iOS/Android)
          const isNative = sub.endpoint.startsWith('ios:') || sub.endpoint.startsWith('android:');
          
          if (!isNative) {
            console.log(`⏭️ Skipping web subscription for user ${sub.user_id}`);
            return { success: false, reason: 'Web push (not FCM)' };
          }

          // Extraire le token FCM
          const fcmToken = sub.endpoint.split(':')[1];
          
          console.log(`📤 Sending to FCM token: ${fcmToken.substring(0, 20)}...`);

          // Envoyer via FCM
          const fcmResponse = await fetch(FCM_ENDPOINT, {
            method: 'POST',
            headers: {
              'Authorization': `key=${FCM_SERVER_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: fcmToken,
              notification: {
                title: notificationData.title,
                body: notificationData.body,
                sound: 'default',
                badge: '1',
                icon: notificationData.icon || 'notification_icon',
                tag: notificationData.tag || 'beree_notification',
              },
              data: notificationData.data || {},
              priority: 'high',
              content_available: true,
            }),
          });

          const fcmResult = await fcmResponse.json();
          
          if (fcmResult.failure === 1) {
            console.error(`❌ FCM error for user ${sub.user_id}:`, fcmResult);
            
            // Désactiver si token invalide
            if (fcmResult.results?.[0]?.error === 'InvalidRegistration' || 
                fcmResult.results?.[0]?.error === 'NotRegistered') {
              await supabase
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('id', sub.id);
              
              console.log(`🗑️ Deactivated invalid subscription for user ${sub.user_id}`);
            }
            
            throw new Error(fcmResult.results?.[0]?.error || 'FCM send failed');
          }

          console.log(`✅ Sent to user ${sub.user_id}`);

          // Logger le succès
          await supabase.from('notification_logs').insert({
            user_id: sub.user_id,
            push_subscription_id: sub.id,
            notification_type: notificationData.tag || 'fcm_notification',
            title: notificationData.title,
            body: notificationData.body,
            success: true,
          });

          return { success: true, userId: sub.user_id };
        } catch (error) {
          console.error(`❌ Failed for user ${sub.user_id}:`, error);
          
          // Logger l'échec
          await supabase.from('notification_logs').insert({
            user_id: sub.user_id,
            push_subscription_id: sub.id,
            notification_type: notificationData.tag || 'fcm_notification',
            title: notificationData.title,
            body: notificationData.body,
            success: false,
            error_message: error.message,
          });

          return { success: false, userId: sub.user_id, error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`📊 Results: ${successful} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed: failed,
        total: results.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ FCM function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
