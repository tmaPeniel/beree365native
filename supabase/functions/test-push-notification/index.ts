import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Fonction de test pour envoyer une notification push à l'utilisateur actuel
 * Usage: Appeler cette fonction depuis l'application pour tester l'envoi de notifications
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Test de notification push');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer l'utilisateur depuis l'authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header manquant' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ Erreur authentification:', userError);
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👤 Test pour utilisateur: ${user.id}`);

    // Vérifier que l'utilisateur a un abonnement actif
    const { data: subscription } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!subscription) {
      console.warn('⚠️ Pas d\'abonnement push actif');
      return new Response(
        JSON.stringify({ 
          error: 'Aucun abonnement push actif trouvé',
          message: 'Veuillez d\'abord activer les notifications dans les paramètres'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Abonnement trouvé:', subscription.endpoint.substring(0, 50) + '...');
    
    // Déterminer le type d'endpoint
    const isNativeAndroid = subscription.endpoint.startsWith('android:') || 
                           subscription.endpoint.includes('fcm.googleapis.com');
    const isWebPush = subscription.endpoint.startsWith('https://') && 
                     !subscription.endpoint.includes('fcm.googleapis.com');
    
    console.log('🔍 Type d\'endpoint:', { isNativeAndroid, isWebPush, endpoint: subscription.endpoint.substring(0, 80) });

    // Vérifier les clés VAPID
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    
    console.log('🔑 Clés VAPID:', {
      publicKeyPresent: !!vapidPublic,
      publicKeyLength: vapidPublic?.length,
      privateKeyPresent: !!vapidPrivate,
      privateKeyLength: vapidPrivate?.length
    });

    // Envoyer une notification de test
    const testNotification = {
      title: '🧪 Test de notification',
      body: 'Si vous voyez ce message, les notifications fonctionnent correctement !',
      tag: 'test',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      },
      userId: user.id
    };

    console.log('📤 Envoi notification de test...');

    let data: any = null;
    let error: any = null;

    // Envoyer via FCM pour Android natif
    if (isNativeAndroid) {
      console.log('📱 Envoi via FCM (Android natif)...');
      const result = await supabase.functions.invoke('send-fcm-notification', {
        body: testNotification
      });
      data = result.data;
      error = result.error;
    }
    
    // Envoyer via Web Push pour PWA
    if (isWebPush) {
      console.log('🌐 Envoi via Web Push (PWA)...');
      const result = await supabase.functions.invoke('send-push-notification', {
        body: testNotification
      });
      data = result.data;
      error = result.error;
    }

    if (!isNativeAndroid && !isWebPush) {
      console.error('❌ Type d\'endpoint non supporté');
      return new Response(
        JSON.stringify({ 
          error: 'Type d\'endpoint non supporté',
          endpoint: subscription.endpoint.substring(0, 80)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (error) {
      console.error('❌ Erreur envoi:', error);
      
      // Logger l'échec
      await supabase.from('notification_logs').insert({
        user_id: user.id,
        notification_type: 'test',
        title: testNotification.title,
        body: testNotification.body,
        success: false,
        error_message: JSON.stringify(error)
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de l\'envoi de la notification',
          details: error,
          endpoint_type: isNativeAndroid ? 'native' : 'web'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Notification envoyée:', data);

    // Vérifier les logs de notification
    const { data: logs } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(5);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification de test envoyée avec succès',
        subscription: {
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          created_at: subscription.created_at
        },
        vapidConfig: {
          publicKeyConfigured: !!vapidPublic,
          privateKeyConfigured: !!vapidPrivate
        },
        sendResult: data,
        recentLogs: logs
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur dans test-push-notification:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
