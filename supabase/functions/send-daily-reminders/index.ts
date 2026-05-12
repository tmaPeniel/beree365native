import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CODEBASE_VAPID_PUBLIC_KEY = 'BDOkO6W2fMryZrRu2Z8JkDxbhK0zQACVyTWBDCJJHsl6QbDf1GFZpwG0ZqmvuM20CWvC085o-mbcdF0Rr8GMAMo';
const runtimeVapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PUBLIC_KEY = runtimeVapidPublicKey || CODEBASE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = 'mailto:contact@beree-365.app';

if (!runtimeVapidPublicKey) {
  console.warn('Runtime VAPID public key absente dans send-daily-reminders, fallback sur la clé du codebase');
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface Chapter {
  reference: string;
}

interface Device {
  user_id: string;
  push_endpoint: string;
  push_p256dh: string;
  push_auth: string;
}

async function sendWebPush(device: Device, payload: object): Promise<{ success: boolean; statusCode?: number }> {
  try {
    const subscription = {
      endpoint: device.push_endpoint,
      keys: { p256dh: device.push_p256dh, auth: device.push_auth },
    };
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 86400 });
    return { success: true, statusCode: 201 };
  } catch (error: any) {
    return { success: false, statusCode: error.statusCode };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Starting daily reminders job...');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    console.log(`⏰ Current UTC time: ${currentHour}:${currentMinute}`);

    // Fetch users with reminders enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id, full_name, start_date, current_day_number, selected_plan_id,
        notification_preferences!inner(reading_reminder_enabled, reading_reminder_time)
      `)
      .eq('notification_preferences.reading_reminder_enabled', true);

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users to notify', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter users by time window (±30 min)
    const usersToNotify = users.filter((user: any) => {
      const [prefHour, prefMinute] = user.notification_preferences.reading_reminder_time.split(':').map(Number);
      const diff = Math.abs((prefHour * 60 + prefMinute) - (currentHour * 60 + currentMinute));
      return diff <= 30;
    });

    if (usersToNotify.length === 0) {
      return new Response(JSON.stringify({ message: 'No users scheduled for this hour', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch active devices with push subscriptions
    const userIds = usersToNotify.map((u: any) => u.id);
    const { data: devices } = await supabase
      .from('user_devices')
      .select('user_id, push_endpoint, push_p256dh, push_auth')
      .in('user_id', userIds)
      .eq('is_active', true)
      .not('push_endpoint', 'is', null);

    console.log(`📱 Found ${devices?.length || 0} active devices`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToNotify as any[]) {
      try {
        const { data: chapters } = await supabase
          .from('reading_plan_chapters')
          .select('reference')
          .eq('plan_id', user.selected_plan_id)
          .eq('day_number', user.current_day_number);

        if (!chapters || chapters.length === 0) continue;

        const chaptersList = (chapters as Chapter[]).map(c => c.reference).join(', ');
        const title = `📖 Lecture du jour - Jour ${user.current_day_number}`;
        const message = `Vos chapitres : ${chaptersList}`;

        const userDevices = devices?.filter((d: any) => d.user_id === user.id) || [];
        if (userDevices.length === 0) continue;

        const payload = { title, body: message, tag: 'reading-reminder', data: { type: 'reading_reminder', day_number: user.current_day_number } };

        for (const device of userDevices) {
          const result = await sendWebPush(device as Device, payload);
          if (result.statusCode === 410 || result.statusCode === 404) {
            await supabase.from('user_devices').update({ is_active: false }).eq('push_endpoint', device.push_endpoint);
          }
        }

        await supabase.from('notification_logs').insert({
          user_id: user.id, notification_type: 'reading_reminder', title, body: message, success: true,
        });
        successCount++;
      } catch (error: any) {
        errorCount++;
        await supabase.from('notification_logs').insert({
          user_id: user.id, notification_type: 'reading_reminder', title: 'Failed', body: error.message, success: false, error_message: error.message,
        });
      }
    }

    return new Response(JSON.stringify({ message: 'Done', successCount, errorCount, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
