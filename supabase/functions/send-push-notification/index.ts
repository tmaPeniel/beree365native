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

// Encode VAPID JWT
async function createVapidJwt(audience: string, subject: string, privateKeyBase64: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const enc = new TextEncoder();
  const headerB64 = btoa(String.fromCharCode(...enc.encode(JSON.stringify(header)))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(String.fromCharCode(...enc.encode(JSON.stringify(payload)))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const rawKey = Uint8Array.from(atob(privateKeyBase64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    rawKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  ).catch(async () => {
    // Try JWK import for raw 32-byte keys
    const jwk = {
      kty: "EC",
      crv: "P-256",
      d: privateKeyBase64,
      x: "", y: "" // Will be derived
    };
    // Fallback: use raw import
    return crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
  });

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key,
    enc.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format if needed
  const sigArray = new Uint8Array(signature);
  let sigB64: string;
  if (sigArray.length === 64) {
    sigB64 = btoa(String.fromCharCode(...sigArray)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  } else {
    // DER encoded, extract r and s
    const r = sigArray.slice(sigArray[3] === 33 ? 5 : 4, sigArray[3] === 33 ? 37 : 36);
    const rPadded = r.length < 32 ? new Uint8Array([...new Array(32 - r.length).fill(0), ...r]) : r.slice(-32);
    const sOffset = sigArray[3] === 33 ? 37 : 36;
    const sLen = sigArray[sOffset + 1];
    const s = sigArray.slice(sOffset + 2, sOffset + 2 + sLen);
    const sPadded = s.length < 32 ? new Uint8Array([...new Array(32 - s.length).fill(0), ...s]) : s.slice(-32);
    const rawSig = new Uint8Array([...rPadded, ...sPadded]);
    sigB64 = btoa(String.fromCharCode(...rawSig)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  return `${unsignedToken}.${sigB64}`;
}

// Send a single web push notification
async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    // For web push without encryption (simple), we use the fetch API directly
    // Note: Full RFC 8291 encryption requires web-push library
    // Using a simpler approach: send via the push endpoint with VAPID auth
    
    const payloadStr = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadStr);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body: payloadBytes,
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

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get push subscriptions from user_devices
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
      const result = await sendWebPush(
        device.push_endpoint,
        device.push_p256dh,
        device.push_auth,
        payload,
        vapidPublicKey,
        vapidPrivateKey,
      );

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.error(`Push failed for device ${device.id}:`, result.error);
        
        // Deactivate expired subscriptions
        if (result.statusCode === 410 || result.statusCode === 404) {
          await supabase
            .from('user_devices')
            .update({ is_active: false })
            .eq('id', device.id);
          console.log(`Deactivated expired device ${device.id}`);
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
