import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendPush } from '../_shared/webpush.ts';

function currentTimeInTimezone(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date());
  } catch { return new Date().toISOString().slice(11, 16); }
}

function localDateInTimezone(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  } catch { return new Date().toISOString().slice(0, 10); }
}

function withinWindow(prefTime: string, nowHHMM: string, windowMinutes = 15): boolean {
  const [ph, pm] = prefTime.split(':').map((x) => parseInt(x, 10));
  const [nh, nm] = nowHHMM.split(':').map((x) => parseInt(x, 10));
  const diff = (nh * 60 + nm) - (ph * 60 + pm);
  return diff >= 0 && diff < windowMinutes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('user_id, reading_reminder_enabled, reading_reminder_time, timezone')
      .eq('reading_reminder_enabled', true);
    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;
    for (const p of prefs) {
      const tz = p.timezone || 'UTC';
      const nowHHMM = currentTimeInTimezone(tz);
      if (!withinWindow(p.reading_reminder_time, nowHHMM)) continue;
      const refDate = localDateInTimezone(tz);
      const refId = `reading-${refDate}`;

      const { error: insertErr } = await admin
        .from('notifications_sent')
        .insert({ user_id: p.user_id, kind: 'reading_reminder', ref_id: refId });
      if (insertErr) continue;

      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', p.user_id);
      if (!subs) continue;
      for (const s of subs) {
        const res = await sendPush(s, {
          title: '📖 Rappel de lecture',
          body: 'N\'oublie pas ta lecture du jour 🙏',
          url: '/reading',
          tag: refId,
        });
        if (res.ok) totalSent++;
        if (res.gone) await admin.from('push_subscriptions').delete().eq('id', s.id);
      }
    }

    return new Response(JSON.stringify({ sent: totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
