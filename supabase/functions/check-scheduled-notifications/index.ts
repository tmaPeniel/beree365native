import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  title: string;
  body: string;
  data?: any;
  tag?: string;
  userId: string;
}

// Fonction pour vérifier si l'heure actuelle correspond à l'heure cible (marge de 15 minutes)
function isTimeMatch(targetTime: string, currentDate: Date): boolean {
  const [hours, minutes] = targetTime.split(':').map(Number);
  const currentHours = currentDate.getHours();
  const currentMinutes = currentDate.getMinutes();
  
  // Calculer les minutes totales depuis minuit
  const targetTotalMinutes = hours * 60 + minutes;
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  
  // Vérifier si on est dans la fenêtre de 15 minutes
  const diff = Math.abs(currentTotalMinutes - targetTotalMinutes);
  return diff < 15;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('🔧 Configuration:', {
      supabaseUrl: supabaseUrl?.substring(0, 30) + '...',
      hasServiceKey: !!supabaseServiceKey
    });
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    console.log(`🕐 Vérification notifications - ${now.toISOString()} (${currentTime})`);

    // Récupérer tous les utilisateurs actifs avec leurs préférences
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        current_day_number,
        start_date,
        selected_plan_id,
        notification_preferences (
          reading_reminder_enabled,
          reading_reminder_time,
          daily_verse_enabled,
          daily_verse_time
        )
      `)
      .eq('is_active', true);

    if (usersError) {
      console.error('❌ Erreur récupération utilisateurs:', usersError);
      throw usersError;
    }

    console.log(`📊 ${users?.length || 0} utilisateurs actifs trouvés`);
    
    if (users && users.length > 0) {
      console.log('👥 Détails utilisateurs:');
      for (const user of users) {
        const prefs = user.notification_preferences?.[0];
        console.log(`  - ${user.full_name || user.id}:`, {
          hasPrefs: !!prefs,
          readingReminder: prefs?.reading_reminder_enabled ? prefs.reading_reminder_time : 'désactivé',
          dailyVerse: prefs?.daily_verse_enabled ? prefs.daily_verse_time : 'désactivé'
        });
      }
    }

    let readingRemindersSent = 0;
    let dailyVersesSent = 0;
    let errors = 0;

    // Récupérer le verset du jour une seule fois
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const { data: verse } = await supabase
      .from('daily_verses')
      .select('*')
      .eq('day_number', dayOfYear)
      .single();

    const dailyVerse = verse || {
      reference: "Psaume 118:24",
      text: "C'est le jour que l'Éternel a fait : Qu'il soit pour nous un sujet d'allégresse et de joie !",
      wisdomType: "biblical"
    };

    // Traiter chaque utilisateur
    for (const user of users || []) {
      try {
        const preferences = user.notification_preferences?.[0];
        if (!preferences) {
          console.log(`⚠️ ${user.full_name || user.id}: pas de préférences`);
          continue;
        }

        // Vérifier les rappels de lecture
        if (preferences.reading_reminder_enabled && preferences.reading_reminder_time) {
          const timeMatches = isTimeMatch(preferences.reading_reminder_time, now);
          console.log(`🔍 ${user.full_name || user.id} - Rappel lecture ${preferences.reading_reminder_time}: ${timeMatches ? 'OUI ✅' : 'non'}`);
          
          if (timeMatches) {
            console.log(`⏰ ENVOI rappel pour ${user.full_name || user.id}`);
            
            // Calculer le jour actuel
            const startDate = new Date(user.start_date);
            const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const currentDay = Math.max(1, daysDiff + 1);

            // Récupérer les chapitres du jour
            const { data: chapters } = await supabase
              .from('reading_plan_chapters')
              .select('id')
              .eq('plan_id', user.selected_plan_id)
              .eq('day_number', currentDay);

            if (chapters && chapters.length > 0) {
              // Vérifier la progression
              const chapterIds = chapters.map(c => c.id);
              const { data: progress } = await supabase
                .from('user_progress')
                .select('id, status')
                .eq('user_id', user.id)
                .in('chapter_id', chapterIds)
                .eq('status', 'completed');

              const completedChapters = progress?.length || 0;
              if (completedChapters < chapters.length) {
                const notificationRequest: NotificationRequest = {
                  title: '📖 Rappel de lecture',
                  body: 'Il est temps de faire votre lecture quotidienne !',
                  tag: 'reading_reminder',
                  data: {
                    type: 'reading_reminder',
                    action: 'open_reading',
                    day_number: currentDay
                  },
                  userId: user.id
                };

                // Envoyer via FCM (native) et Web Push (web)
                const [fcmResult, webPushResult] = await Promise.allSettled([
                  supabase.functions.invoke('send-fcm-notification', { body: notificationRequest }),
                  supabase.functions.invoke('send-push-notification', { body: notificationRequest })
                ]);

                const fcmSuccess = fcmResult.status === 'fulfilled' && !fcmResult.value.error;
                const webPushSuccess = webPushResult.status === 'fulfilled' && !webPushResult.value.error;

                if (!fcmSuccess && !webPushSuccess) {
                  console.error(`❌ Erreur rappel pour ${user.id}:`, { fcmResult, webPushResult });
                  errors++;
                } else {
                  console.log(`✅ Rappel envoyé à ${user.full_name || user.id} (FCM: ${fcmSuccess}, Web: ${webPushSuccess})`);
                  readingRemindersSent++;
                }
              } else {
                console.log(`✓ ${user.full_name || user.id} a déjà complété sa lecture`);
              }
            }
          }
        }

        // Vérifier le verset du jour
        if (preferences.daily_verse_enabled && preferences.daily_verse_time) {
          const timeMatches = isTimeMatch(preferences.daily_verse_time, now);
          console.log(`🔍 ${user.full_name || user.id} - Verset quotidien ${preferences.daily_verse_time}: ${timeMatches ? 'OUI ✅' : 'non'}`);
          
          if (timeMatches) {
            console.log(`⏰ ENVOI verset pour ${user.full_name || user.id}`);
            
            const notificationRequest: NotificationRequest = {
              title: `📜 Verset du jour - ${dailyVerse.reference}`,
              body: dailyVerse.text.length > 100 
                ? dailyVerse.text.substring(0, 100) + '...'
                : dailyVerse.text,
              tag: 'daily_verse',
              data: {
                type: 'daily_verse',
                reference: dailyVerse.reference,
                text: dailyVerse.text,
                wisdomType: dailyVerse.wisdomType
              },
              userId: user.id
            };

            // Envoyer via FCM (native) et Web Push (web)
            const [fcmResult, webPushResult] = await Promise.allSettled([
              supabase.functions.invoke('send-fcm-notification', { body: notificationRequest }),
              supabase.functions.invoke('send-push-notification', { body: notificationRequest })
            ]);

            const fcmSuccess = fcmResult.status === 'fulfilled' && !fcmResult.value.error;
            const webPushSuccess = webPushResult.status === 'fulfilled' && !webPushResult.value.error;

            if (!fcmSuccess && !webPushSuccess) {
              console.error(`❌ Erreur verset pour ${user.id}:`, { fcmResult, webPushResult });
              errors++;
            } else {
              console.log(`✅ Verset envoyé à ${user.full_name || user.id} (FCM: ${fcmSuccess}, Web: ${webPushSuccess})`);
              dailyVersesSent++;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Erreur traitement ${user.id}:`, error);
        errors++;
      }
    }

    console.log(`🎯 Résumé: ${readingRemindersSent} rappels, ${dailyVersesSent} versets, ${errors} erreurs`);

    return new Response(
      JSON.stringify({
        success: true,
        readingRemindersSent,
        dailyVersesSent,
        errors,
        timestamp: now.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
