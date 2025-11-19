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
  onesignal_player_id: string;
  start_date: string;
  current_day_number: number;
  selected_plan_id: string;
  reading_reminder_time: string;
}

interface Chapter {
  reference: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Starting daily reminders job...');
    
    // Créer le client Supabase avec le service role key
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

    // Obtenir l'heure actuelle en UTC
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    console.log(`⏰ Current UTC time: ${currentHour}:${currentMinute}`);

    // Récupérer tous les utilisateurs avec les rappels activés et un player_id
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        onesignal_player_id,
        start_date,
        current_day_number,
        selected_plan_id,
        notification_preferences!inner(
          reading_reminder_enabled,
          reading_reminder_time
        )
      `)
      .eq('notification_preferences.reading_reminder_enabled', true)
      .not('onesignal_player_id', 'is', null);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`📊 Found ${users?.length || 0} users with reminders enabled`);

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to notify', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrer les utilisateurs dont l'heure de rappel correspond à l'heure actuelle (±30 min)
    const usersToNotify: UserToNotify[] = users.filter((user: any) => {
      const prefTime = user.notification_preferences.reading_reminder_time;
      const [prefHour, prefMinute] = prefTime.split(':').map(Number);
      
      // Calculer la différence en minutes
      const prefTimeInMinutes = prefHour * 60 + prefMinute;
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const diffMinutes = Math.abs(prefTimeInMinutes - currentTimeInMinutes);
      
      // Accepter si la différence est <= 30 minutes
      return diffMinutes <= 30;
    }).map((user: any) => ({
      id: user.id,
      full_name: user.full_name,
      onesignal_player_id: user.onesignal_player_id,
      start_date: user.start_date,
      current_day_number: user.current_day_number,
      selected_plan_id: user.selected_plan_id,
      reading_reminder_time: user.notification_preferences.reading_reminder_time,
    }));

    console.log(`🎯 ${usersToNotify.length} users to notify at this hour`);

    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users scheduled for this hour', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    let errorCount = 0;

    // Traiter chaque utilisateur
    for (const user of usersToNotify) {
      try {
        console.log(`📖 Processing user ${user.id} (Day ${user.current_day_number})`);

        // Récupérer les chapitres du jour pour cet utilisateur
        const { data: chapters, error: chaptersError } = await supabase
          .from('reading_plan_chapters')
          .select('reference')
          .eq('plan_id', user.selected_plan_id)
          .eq('day_number', user.current_day_number);

        if (chaptersError) {
          console.error(`❌ Error fetching chapters for user ${user.id}:`, chaptersError);
          throw chaptersError;
        }

        if (!chapters || chapters.length === 0) {
          console.log(`⚠️ No chapters found for user ${user.id} on day ${user.current_day_number}`);
          continue;
        }

        // Construire le message
        const chaptersList = (chapters as Chapter[]).map(c => c.reference).join(', ');
        const title = `📖 Lecture du jour - Jour ${user.current_day_number}`;
        const message = `Vos chapitres : ${chaptersList}`;

        console.log(`📤 Sending notification to ${user.onesignal_player_id}`);
        console.log(`   Title: ${title}`);
        console.log(`   Message: ${message}`);

        // Envoyer la notification via OneSignal
        const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            include_player_ids: [user.onesignal_player_id],
            headings: { en: title },
            contents: { en: message },
            data: {
              type: 'reading_reminder',
              day_number: user.current_day_number,
            },
          }),
        });

        const oneSignalData = await oneSignalResponse.json();

        if (!oneSignalResponse.ok) {
          console.error(`❌ OneSignal API error:`, oneSignalData);
          throw new Error(`OneSignal error: ${JSON.stringify(oneSignalData)}`);
        }

        console.log(`✅ Notification sent successfully:`, oneSignalData);

        // Logger le succès
        await supabase.from('notification_logs').insert({
          user_id: user.id,
          notification_type: 'reading_reminder',
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
          notification_type: 'reading_reminder',
          title: 'Failed to send',
          body: error.message,
          success: false,
          error_message: error.message,
        });
      }
    }

    const result = {
      message: 'Daily reminders job completed',
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
    console.error('❌ Fatal error in daily reminders job:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
