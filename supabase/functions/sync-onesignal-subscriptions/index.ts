import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface UserDevice {
  id: string;
  onesignal_player_id: string;
  user_id: string;
}

interface OneSignalPlayerResponse {
  id?: string;
  subscribed?: boolean;
  invalid_identifier?: boolean;
  notification_types?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting OneSignal subscription sync...');
    
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error('OneSignal credentials not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Récupérer tous les devices actifs
    const { data: devices, error } = await supabase
      .from('user_devices')
      .select('id, onesignal_player_id, user_id')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching devices:', error);
      throw error;
    }

    console.log(`📱 Found ${devices?.length || 0} active devices to check`);

    let syncedCount = 0;
    let deactivatedCount = 0;
    let errorCount = 0;
    const deactivatedIds: string[] = [];

    // Vérifier chaque player ID sur OneSignal
    for (const device of (devices as UserDevice[]) || []) {
      try {
        const response = await fetch(
          `https://onesignal.com/api/v1/players/${device.onesignal_player_id}?app_id=${ONESIGNAL_APP_ID}`,
          {
            headers: {
              'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
          }
        );

        if (!response.ok) {
          // Player ID invalide ou supprimé (404 ou autre erreur)
          console.log(`⚠️ Player ${device.onesignal_player_id} not found (status: ${response.status}), deactivating...`);
          
          const { error: updateError } = await supabase
            .from('user_devices')
            .update({ 
              is_active: false, 
              last_seen_at: new Date().toISOString() 
            })
            .eq('id', device.id);

          if (updateError) {
            console.error(`Error updating device ${device.id}:`, updateError);
            errorCount++;
          } else {
            deactivatedCount++;
            deactivatedIds.push(device.onesignal_player_id);
          }
          continue;
        }

        const playerData: OneSignalPlayerResponse = await response.json();
        
        // Vérifier si l'utilisateur est désabonné
        // notification_types: -2 = unsubscribed, 1 = subscribed
        const isUnsubscribed = !playerData.subscribed || 
                               playerData.invalid_identifier || 
                               playerData.notification_types === -2;

        if (isUnsubscribed) {
          console.log(`🔕 Player ${device.onesignal_player_id} is unsubscribed (subscribed: ${playerData.subscribed}, notification_types: ${playerData.notification_types}), deactivating...`);
          
          const { error: updateError } = await supabase
            .from('user_devices')
            .update({ 
              is_active: false, 
              last_seen_at: new Date().toISOString() 
            })
            .eq('id', device.id);

          if (updateError) {
            console.error(`Error updating device ${device.id}:`, updateError);
            errorCount++;
          } else {
            deactivatedCount++;
            deactivatedIds.push(device.onesignal_player_id);
          }
        } else {
          // Mettre à jour last_seen_at pour les devices actifs
          await supabase
            .from('user_devices')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', device.id);
          syncedCount++;
        }

        // Rate limiting pour éviter de surcharger l'API OneSignal (10 req/sec max)
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (deviceError) {
        console.error(`Error checking device ${device.id}:`, deviceError);
        errorCount++;
      }
    }

    const result = {
      message: 'OneSignal sync completed',
      totalChecked: devices?.length || 0,
      stillActive: syncedCount,
      deactivated: deactivatedCount,
      errors: errorCount,
      deactivatedPlayerIds: deactivatedIds,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Sync completed:', JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Sync error:', errorMessage);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
