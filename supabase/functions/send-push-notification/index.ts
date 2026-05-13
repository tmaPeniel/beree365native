import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import webpush from "npm:web-push@3.6.7";
import { p256 } from "npm:@noble/curves@1.4.0/p256";

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

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = 'mailto:contact@beree-365.app';

function b64urlToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let vapidPairValid = false;
let vapidPairError: string | null = null;
let derivedPublicKey: string | null = null;

try {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys missing in environment');
  }
  const privBytes = b64urlToBytes(VAPID_PRIVATE_KEY);
  if (privBytes.length !== 32) {
    throw new Error(`VAPID private key must decode to 32 bytes (got ${privBytes.length})`);
  }
  const pubBytes = p256.getPublicKey(privBytes, false); // 65 bytes uncompressed (0x04||X||Y)
  derivedPublicKey = bytesToB64url(pubBytes);
  if (derivedPublicKey !== VAPID_PUBLIC_KEY) {
    vapidPairError = `VAPID public/private keys do not match. Public from secret length=${VAPID_PUBLIC_KEY.length}, derived length=${derivedPublicKey.length}`;
  } else {
    vapidPairValid = true;
  }
} catch (e: any) {
  vapidPairError = e?.message || String(e);
}

console.log('[send-push-notification] Boot. VAPID pair valid=', vapidPairValid,
  'pubLen=', VAPID_PUBLIC_KEY.length, 'privLen=', VAPID_PRIVATE_KEY.length,
  vapidPairError ? `err=${vapidPairError}` : '');

if (vapidPairValid) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function truncate(str: string | null | undefined, n = 60): string {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

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
      statusCode: error?.statusCode,
      error: typeof error?.body === 'string' ? error.body : (error?.message || String(error)),
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  console.log('[send-push-notification] ▶️ Invocation reçue');

  if (!vapidPairValid) {
    console.error('[send-push-notification] ❌ Paire VAPID invalide:', vapidPairError);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'VAPID_KEY_PAIR_INVALID',
        detail: vapidPairError,
        hint: "La clé publique VAPID stockée ne correspond pas à la clé privée. Régénère une paire VAPID et mets à jour les secrets VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY.",
        runtimePublicKeyLength: VAPID_PUBLIC_KEY.length,
        runtimePrivateKeyLength: VAPID_PRIVATE_KEY.length,
        derivedPublicKeyPreview: derivedPublicKey ? derivedPublicKey.slice(0, 12) + '…' : null,
        runtimePublicKeyPreview: VAPID_PUBLIC_KEY ? VAPID_PUBLIC_KEY.slice(0, 12) + '…' : null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const requestBody = await req.json().catch(() => ({}));
    console.log('[send-push-notification] Body brut:', JSON.stringify(requestBody));

    const parsed = NotificationSchema.safeParse(requestBody);
    if (!parsed.success) {
      console.error('[send-push-notification] ❌ Validation échouée:', parsed.error.flatten());
      return new Response(
        JSON.stringify({ error: 'Invalid body', details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { title, message, userId, userIds } = parsed.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const targetUserIds = userIds || (userId ? [userId] : []);
    console.log('[send-push-notification] Cibles:', targetUserIds);

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No target users specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('id, user_id, push_endpoint, push_p256dh, push_auth, last_seen_at')
      .in('user_id', targetUserIds)
      .eq('is_active', true)
      .not('push_endpoint', 'is', null)
      .not('push_p256dh', 'is', null)
      .not('push_auth', 'is', null);

    if (devicesError) {
      console.error('[send-push-notification] ❌ Erreur fetch devices:', devicesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch devices', details: devicesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[send-push-notification] Devices actifs trouvés: ${devices?.length ?? 0}`);
    devices?.forEach((d) => {
      console.log(`  • device ${d.id} user=${d.user_id} endpoint=${truncate(d.push_endpoint, 80)}`);
    });

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          devicesFound: 0,
          sent: 0,
          failed: 0,
          error: 'No active push subscriptions found for target users',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = { title, body: message, tag: 'beree-notification' };
    const results: Array<{
      deviceId: string;
      userId: string;
      endpoint: string;
      success: boolean;
      statusCode?: number;
      error?: string;
    }> = [];
    let successCount = 0;
    let failCount = 0;

    for (const device of devices) {
      const result = await sendWebPush(device, payload);

      results.push({
        deviceId: device.id,
        userId: device.user_id,
        endpoint: truncate(device.push_endpoint, 80),
        success: result.success,
        statusCode: result.statusCode,
        error: result.error,
      });

      if (result.success) {
        successCount++;
        console.log(`[send-push-notification] ✅ Push OK device=${device.id}`);
        await supabase.from('notification_logs').insert({
          user_id: device.user_id,
          notification_type: 'manual_test',
          title,
          body: message,
          success: true,
        });
      } else {
        failCount++;
        console.error(`[send-push-notification] ❌ Push KO device=${device.id} status=${result.statusCode} err=${result.error}`);

        await supabase.from('notification_logs').insert({
          user_id: device.user_id,
          notification_type: 'manual_test',
          title,
          body: message,
          success: false,
          error_message: `${result.statusCode}: ${result.error}`,
        });

        if (result.statusCode === 410 || result.statusCode === 404) {
          console.log(`[send-push-notification] Désactivation device expiré ${device.id}`);
          await supabase
            .from('user_devices')
            .update({ is_active: false })
            .eq('id', device.id);
        }
      }
    }

    const elapsed = Date.now() - startedAt;
    console.log(`[send-push-notification] ⏹ Terminé en ${elapsed}ms — devices=${devices.length} sent=${successCount} failed=${failCount}`);

    return new Response(
      JSON.stringify({
        ok: true,
        devicesFound: devices.length,
        sent: successCount,
        failed: failCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[send-push-notification] ❌ Exception:', error);
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
