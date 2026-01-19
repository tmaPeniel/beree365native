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

interface UserToNotify {
  id: string;
  full_name: string | null;
  current_day_number: number;
  daily_verse_time: string;
}

interface UserDevice {
  user_id: string;
  onesignal_player_id: string;
}

interface DailyVerse {
  reference: string;
  text: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📖 Starting daily verse notifications job...');
    
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    console.log(`⏰ Current UTC time: ${currentHour}:${currentMinute}`);

    // Récupérer les utilisateurs avec daily_verse activé
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        current_day_number,
        notification_preferences!inner(
          daily_verse_enabled,
          daily_verse_time
        )
      `)
      .eq('notification_preferences.daily_verse_enabled', true);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`📊 Found ${users?.length || 0} users with daily verse enabled`);

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to notify', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrer les utilisateurs dont l'heure correspond (±30 min)
    const usersToNotify: UserToNotify[] = users.filter((user: any) => {
      const prefTime = user.notification_preferences.daily_verse_time;
      const [prefHour, prefMinute] = prefTime.split(':').map(Number);
      
      const prefTimeInMinutes = prefHour * 60 + prefMinute;
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      let diffMinutes = Math.abs(prefTimeInMinutes - currentTimeInMinutes);
      if (diffMinutes > 720) diffMinutes = 1440 - diffMinutes;
      
      return diffMinutes <= 30;
    }).map((user: any) => ({
      id: user.id,
      full_name: user.full_name,
      current_day_number: user.current_day_number,
      daily_verse_time: user.notification_preferences.daily_verse_time,
    }));

    console.log(`🎯 ${usersToNotify.length} users to notify at this hour`);

    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users scheduled for this hour', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer tous les appareils actifs pour ces utilisateurs
    const userIds = usersToNotify.map(u => u.id);
    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('user_id, onesignal_player_id')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (devicesError) {
      console.error('❌ Error fetching devices:', devicesError);
      throw devicesError;
    }

    console.log(`📱 Found ${devices?.length || 0} active devices`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToNotify) {
      try {
        console.log(`📖 Processing user ${user.id} (Day ${user.current_day_number})`);

        // Récupérer le verset du jour
        const { data: verse, error: verseError } = await supabase
          .from('daily_verses')
          .select('reference, text')
          .eq('day_number', user.current_day_number)
          .single();

        if (verseError || !verse) {
          console.log(`⚠️ No verse for day ${user.current_day_number}`);
          continue;
        }

        // Récupérer les appareils de l'utilisateur
        const userDevices = (devices as UserDevice[])?.filter(d => d.user_id === user.id) || [];
        const playerIds = userDevices.map(d => d.onesignal_player_id);

        if (playerIds.length === 0) {
          console.log(`⚠️ No active devices for user ${user.id}`);
          continue;
        }

        const title = `✨ Verset du jour - Jour ${user.current_day_number}`;
        const message = `${verse.reference}\n\n"${verse.text}"`;

        console.log(`📤 Sending verse to ${playerIds.length} device(s)`);
        console.log(`   Title: ${title}`);

        // Envoyer la notification via OneSignal à TOUS les appareils
        const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            include_player_ids: playerIds,
            headings: { en: title },
            contents: { en: message },
            data: {
              type: 'daily_verse',
              day_number: user.current_day_number,
              reference: verse.reference,
            },
          }),
        });

        const oneSignalData = await oneSignalResponse.json();

        if (!oneSignalResponse.ok) {
          console.error(`❌ OneSignal API error:`, oneSignalData);
          throw new Error(`OneSignal error: ${JSON.stringify(oneSignalData)}`);
        }

        console.log(`✅ Verse notification sent successfully:`, oneSignalData);

        // Désactiver automatiquement les player IDs invalides retournés par OneSignal
        if (oneSignalData.errors?.invalid_player_ids && oneSignalData.errors.invalid_player_ids.length > 0) {
          console.log(`🔕 Deactivating ${oneSignalData.errors.invalid_player_ids.length} invalid player IDs`);
          for (const invalidId of oneSignalData.errors.invalid_player_ids) {
            const { error: updateError } = await supabase
              .from('user_devices')
              .update({ is_active: false, last_seen_at: new Date().toISOString() })
              .eq('onesignal_player_id', invalidId);
            
            if (updateError) {
              console.error(`Error deactivating player ${invalidId}:`, updateError);
            } else {
              console.log(`✅ Deactivated invalid player ID: ${invalidId}`);
            }
          }
        }

        // Logger le succès
        await supabase.from('notification_logs').insert({
          user_id: user.id,
          notification_type: 'daily_verse',
          title,
          body: message,
          success: true,
          onesignal_notification_id: oneSignalData.id,
        });

        successCount++;
      } catch (error: any) {
        console.error(`❌ Error processing user ${user.id}:`, error);
        errorCount++;

        // Logger l'échec
        await supabase.from('notification_logs').insert({
          user_id: user.id,
          notification_type: 'daily_verse',
          title: 'Failed to send',
          body: error.message,
          success: false,
          error_message: error.message,
        });
      }
    }

    const result = {
      message: 'Daily verse notifications job completed',
      totalUsers: usersToNotify.length,
      successCount,
      errorCount,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Job completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Fatal error in daily verse job:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
