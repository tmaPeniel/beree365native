import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendPush } from '../_shared/webpush.ts';

// Returns "HH:MM" in the user's timezone for the current moment.
function currentTimeInTimezone(tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return fmt.format(new Date());
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}

function localDateInTimezone(tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(new Date()); // YYYY-MM-DD
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function withinWindow(prefTime: string, nowHHMM: string, windowMinutes = 15): boolean {
  // prefTime may be "HH:MM" or "HH:MM:SS"
  const [ph, pm] = prefTime.split(':').map((x) => parseInt(x, 10));
  const [nh, nm] = nowHHMM.split(':').map((x) => parseInt(x, 10));
  const pref = ph * 60 + pm;
  const now = nh * 60 + nm;
  const diff = now - pref;
  return diff >= 0 && diff < windowMinutes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verse of the day — by day of year (1..366)
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getUTCFullYear(), 0, 0).getTime()) / 86400000,
    );
    const { data: verse } = await admin
      .from('daily_verses')
      .select('day_number, reference, text')
      .eq('day_number', dayOfYear)
      .maybeSingle();
    if (!verse) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no verse' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('user_id, daily_verse_enabled, daily_verse_time, timezone')
      .eq('daily_verse_enabled', true);
    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;
    for (const p of prefs) {
      const tz = p.timezone || 'UTC';
      const nowHHMM = currentTimeInTimezone(tz);
      if (!withinWindow(p.daily_verse_time, nowHHMM)) continue;
      const refDate = localDateInTimezone(tz);
      const refId = `verse-${refDate}`;

      // Anti-doublon
      const { error: insertErr } = await admin
        .from('notifications_sent')
        .insert({ user_id: p.user_id, kind: 'daily_verse', ref_id: refId });
      if (insertErr) continue; // unique violation = already sent

      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', p.user_id);
      if (!subs) continue;
      for (const s of subs) {
        const res = await sendPush(s, {
          title: '🌅 Sagesse du jour',
          body: `${verse.reference} — ${(verse.text || '').slice(0, 120)}`,
          url: '/dashboard',
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
