import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendExpoPush } from '../_shared/expo-push.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    const userId = claims?.claims?.sub as string | undefined;
    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: tokens, error } = await admin
      .from('native_push_tokens')
      .select('id, expo_push_token')
      .eq('user_id', userId)
      .is('disabled_at', null);
    if (error) throw error;

    let sent = 0;
    const errors: Array<{ id: string; error?: string }> = [];
    for (const token of tokens ?? []) {
      const result = await sendExpoPush(token.expo_push_token, {
        body: 'Tes notifications mobiles sont bien activées ✨',
        data: { route: '/(tabs)/dashboard', type: 'test' },
        title: 'Bérée 365',
      });

      if (result.ok) {
        sent += 1;
      } else {
        errors.push({ id: token.id, error: result.error });
      }

      if (result.deviceNotRegistered) {
        const now = new Date().toISOString();
        await admin
          .from('native_push_tokens')
          .update({ disabled_at: now, updated_at: now })
          .eq('id', token.id);
      }
    }

    return new Response(JSON.stringify({ errors, sent, total: tokens?.length ?? 0 }), {
      headers: jsonHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
