import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schéma de validation
const NotificationSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  userId: z.string().uuid().optional(),
  userIds: z.array(z.string().uuid()).optional(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Valider les données d'entrée
    const requestBody = await req.json();
    const validated = NotificationSchema.parse(requestBody);
    const { title, message, userId, userIds } = validated;

    // Validation
    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'Title and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OneSignal credentials from environment
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalRestApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!oneSignalAppId || !oneSignalRestApiKey) {
      console.error('OneSignal credentials not configured');
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get player IDs from database (priorité: user_devices, fallback: profiles)
    let playerIds: string[] = [];

    if (userIds && userIds.length > 0) {
      // Multiple users - chercher dans user_devices d'abord
      const { data: devicesData, error: devicesError } = await supabase
        .from('user_devices')
        .select('onesignal_player_id')
        .in('user_id', userIds)
        .eq('is_active', true)
        .not('onesignal_player_id', 'is', null);

      if (!devicesError && devicesData && devicesData.length > 0) {
        playerIds = devicesData.map(d => d.onesignal_player_id).filter(Boolean);
        console.log(`Found ${playerIds.length} player IDs in user_devices`);
      } else {
        // Fallback vers profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('onesignal_player_id')
          .in('id', userIds)
          .not('onesignal_player_id', 'is', null);

        if (profilesError) {
          console.error('Error fetching player IDs from profiles:', profilesError);
        } else if (profilesData) {
          playerIds = profilesData.map(p => p.onesignal_player_id).filter(Boolean);
          console.log(`Found ${playerIds.length} player IDs in profiles (fallback)`);
        }
      }
    } else if (userId) {
      // Single user - chercher dans user_devices d'abord
      const { data: deviceData, error: deviceError } = await supabase
        .from('user_devices')
        .select('onesignal_player_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .not('onesignal_player_id', 'is', null);

      if (!deviceError && deviceData && deviceData.length > 0) {
        playerIds = deviceData.map(d => d.onesignal_player_id).filter(Boolean);
        console.log(`Found ${playerIds.length} player ID(s) in user_devices for user ${userId}`);
      } else {
        // Fallback vers profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('onesignal_player_id')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('Error fetching player ID from profiles:', profileError);
        } else if (profileData?.onesignal_player_id) {
          playerIds = [profileData.onesignal_player_id];
          console.log(`Found player ID in profiles (fallback) for user ${userId}`);
        }
      }
    }

    if (playerIds.length === 0) {
      console.warn('No player IDs found for notification');
      return new Response(
        JSON.stringify({ error: 'No valid player IDs found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending notification to ${playerIds.length} player(s)`);

    // Send notification via OneSignal API
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalRestApiKey}`
      },
      body: JSON.stringify({
        app_id: oneSignalAppId,
        include_player_ids: playerIds,
        headings: { en: title },
        contents: { en: message }
      })
    });

    const oneSignalData = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
      console.error('OneSignal API error:', oneSignalData);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: oneSignalData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Notification sent successfully:', oneSignalData);

    return new Response(
      JSON.stringify({ success: true, data: oneSignalData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
