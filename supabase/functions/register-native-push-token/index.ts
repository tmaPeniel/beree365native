import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { isExpoPushToken } from '../_shared/expo-push.ts';

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

    const body = await req.json();
    const { appVersion, platform, projectId, token } = body ?? {};
    if (!isExpoPushToken(token) || !['ios', 'android'].includes(platform)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: jsonHeaders });
    }
    if (
      typeof projectId !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)
    ) {
      return new Response(JSON.stringify({ error: 'Invalid Expo project ID' }), { status: 400, headers: jsonHeaders });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('native_push_tokens')
      .upsert({
        app_version: typeof appVersion === 'string' ? appVersion : null,
        disabled_at: null,
        expo_push_token: token,
        last_seen_at: now,
        platform,
        project_id: projectId,
        updated_at: now,
        user_id: userId,
      }, { onConflict: 'expo_push_token' })
      .select('id')
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ id: data.id, ok: true }), { headers: jsonHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
