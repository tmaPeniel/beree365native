import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

async function sendWebPush(
  endpoint: string,
  payload: object,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body: new TextEncoder().encode(JSON.stringify(payload)),
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true, statusCode: response.status };
    } else if (response.status === 410 || response.status === 404) {
      return { success: false, statusCode: response.status, error: 'Subscription expired' };
    } else {
      const text = await response.text();
      return { success: false, statusCode: response.status, error: text };
    }
  } catch (error) {
    return { success: false, error: error.message };
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active push subscriptions found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push to ${devices.length} device(s)`);

    const payload = { title, body: message, tag: 'beree-notification' };
    let successCount = 0;
    let failCount = 0;

    for (const device of devices) {
      const result = await sendWebPush(device.push_endpoint, payload);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.error(`Push failed for device ${device.id}:`, result.error);
        
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
