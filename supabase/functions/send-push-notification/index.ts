import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NotificationSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  userId: z.string().uuid().optional(),
  userIds: z.array(z.string().uuid()).optional(),
});

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = 'mailto:contact@beree-365.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function sendWebPush(
  device: { push_endpoint: string; push_p256dh: string; push_auth: string },
  payload: object,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const subscription = {
      endpoint: device.push_endpoint,
      keys: {
        p256dh: device.push_p256dh,
        auth: device.push_auth,
      },
    };

    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 86400,
    });

    return { success: true, statusCode: 201 };
  } catch (error: any) {
    return {
      success: false,
      statusCode: error.statusCode,
      error: error.body || error.message,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const validated = NotificationSchema.parse(requestBody);
    const { title, message, userId, userIds } = validated;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const targetUserIds = userIds || (userId ? [userId] : []);

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No target users specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('id, user_id, push_endpoint, push_p256dh, push_auth')
      .in('user_id', targetUserIds)
      .eq('is_active', true)
      .not('push_endpoint', 'is', null);

    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch devices' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active push subscriptions found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Sending push to ${devices.length} device(s)`);

    const payload = { title, body: message, tag: 'beree-notification' };
    let successCount = 0;
    let failCount = 0;

    for (const device of devices) {
      const result = await sendWebPush(device, payload);

      if (result.success) {
        successCount++;
        // Logger le succès
        await supabase.from('notification_logs').insert({
          user_id: device.user_id,
          notification_type: 'manual_test',
          title,
          body: message,
          success: true,
        });
      } else {
        failCount++;
        console.error(`Push failed for device ${device.id} (${result.statusCode}):`, result.error);

        await supabase.from('notification_logs').insert({
          user_id: device.user_id,
          notification_type: 'manual_test',
          title,
          body: message,
          success: false,
          error_message: `${result.statusCode}: ${result.error}`,
        });

        if (result.statusCode === 410 || result.statusCode === 404) {
          await supabase
            .from('user_devices')
            .update({ is_active: false })
            .eq('id', device.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
