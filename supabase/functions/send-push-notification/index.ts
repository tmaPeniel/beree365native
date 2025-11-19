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

    // Get player IDs from database
    let playerIds: string[] = [];

    if (userIds && userIds.length > 0) {
      // Multiple users
      const { data, error } = await supabase
        .from('profiles')
        .select('onesignal_player_id')
        .in('id', userIds)
        .not('onesignal_player_id', 'is', null);

      if (error) {
        console.error('Error fetching player IDs:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch player IDs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      playerIds = data.map(profile => profile.onesignal_player_id).filter(Boolean);
    } else if (userId) {
      // Single user
      const { data, error } = await supabase
        .from('profiles')
        .select('onesignal_player_id')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching player ID:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch player ID' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (data?.onesignal_player_id) {
        playerIds = [data.onesignal_player_id];
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
