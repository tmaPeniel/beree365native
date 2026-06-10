import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = "mailto:contact@beree-365.app";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error("Missing VAPID keys in send-daily-verse");
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface Device {
  user_id: string;
  push_endpoint: string;
  push_p256dh: string;
  push_auth: string;
}

async function sendWebPush(
  device: Device,
  payload: object,
): Promise<{ success: boolean; statusCode?: number }> {
  try {
    const subscription = {
      endpoint: device.push_endpoint,
      keys: { p256dh: device.push_p256dh, auth: device.push_auth },
    };
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 86400,
    });
    return { success: true, statusCode: 201 };
  } catch (error: any) {
    return { success: false, statusCode: error.statusCode };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📖 Starting daily verse notifications...");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select(
        `
        id, full_name, current_day_number,
        is_premium, premium_end_date,
        notification_preferences!inner(daily_verse_enabled, daily_verse_time)
      `,
      )
      .eq("notification_preferences.daily_verse_enabled", true)
      .eq("is_premium", true);

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to notify", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const nowMs = Date.now();
    const activePremiumUsers = users.filter((u: any) =>
      !u.premium_end_date || new Date(u.premium_end_date).getTime() > nowMs
    );

    const usersToNotify = activePremiumUsers.filter((user: any) => {
      const [prefHour, prefMinute] =
        user.notification_preferences.daily_verse_time.split(":").map(Number);
      let diff = Math.abs(
        prefHour * 60 + prefMinute - (currentHour * 60 + currentMinute),
      );
      if (diff > 720) diff = 1440 - diff;
      return diff <= 30;
    });

    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users scheduled", count: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userIds = usersToNotify.map((u: any) => u.id);
    const { data: devices } = await supabase
      .from("user_devices")
      .select("user_id, push_endpoint, push_p256dh, push_auth")
      .in("user_id", userIds)
      .eq("is_active", true)
      .not("push_endpoint", "is", null);

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToNotify as any[]) {
      try {
        const { data: verse } = await supabase
          .from("daily_verses")
          .select("reference, text")
          .eq("day_number", user.current_day_number)
          .single();

        if (!verse) continue;

        const userDevices =
          devices?.filter((d: any) => d.user_id === user.id) || [];
        if (userDevices.length === 0) continue;

        const title = `✨ Verset du jour - Jour ${user.current_day_number}`;
        const message = `${verse.reference}\n\n"${verse.text}"`;
        const payload = {
          title,
          body: message,
          tag: "daily-verse",
          data: {
            type: "daily_verse",
            day_number: user.current_day_number,
            reference: verse.reference,
          },
        };

        for (const device of userDevices) {
          const result = await sendWebPush(device as Device, payload);
          if (result.statusCode === 410 || result.statusCode === 404) {
            await supabase
              .from("user_devices")
              .update({ is_active: false })
              .eq("push_endpoint", device.push_endpoint);
          }
        }

        await supabase.from("notification_logs").insert({
          user_id: user.id,
          notification_type: "daily_verse",
          title,
          body: message,
          success: true,
        });
        successCount++;
      } catch (error: any) {
        errorCount++;
        await supabase.from("notification_logs").insert({
          user_id: user.id,
          notification_type: "daily_verse",
          title: "Failed",
          body: error.message,
          success: false,
          error_message: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Done",
        successCount,
        errorCount,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("❌ Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
