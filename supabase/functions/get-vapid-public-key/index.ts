import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FALLBACK_VAPID_PUBLIC_KEY = 'BDOkO6W2fMryZrRu2Z8JkDxbhK0zQACVyTWBDCJJHsl6QbDf1GFZpwG0ZqmvuM20CWvC085o-mbcdF0Rr8GMAMo';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') || FALLBACK_VAPID_PUBLIC_KEY;

  return new Response(JSON.stringify({ publicKey }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});