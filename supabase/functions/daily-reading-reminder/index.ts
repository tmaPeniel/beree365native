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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔔 Démarrage du rappel de lecture quotidien...');

    // Récupérer tous les utilisateurs avec leurs préférences de notification
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
          reading_reminder_time
        )
      `)
      .eq('is_active', true);

    if (usersError) {
      console.error('Erreur lors de la récupération des utilisateurs:', usersError);
      throw usersError;
    }

    console.log(`📊 ${users?.length || 0} utilisateurs trouvés`);

    let remindersSent = 0;
    let errors = 0;

    // Traiter chaque utilisateur
    for (const user of users || []) {
      try {
        // Vérifier si l'utilisateur a activé les rappels
        const preferences = user.notification_preferences?.[0];
        if (!preferences?.reading_reminder_enabled) {
          continue;
        }

        // Calculer le jour actuel pour cet utilisateur
        const startDate = new Date(user.start_date);
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const currentDay = Math.max(1, daysDiff + 1);

        // Récupérer les chapitres du jour actuel
        const { data: chapters, error: chaptersError } = await supabase
          .from('reading_plan_chapters')
          .select('id')
          .eq('plan_id', user.selected_plan_id)
          .eq('day_number', currentDay);

        if (chaptersError) {
          console.error(`Erreur lors de la récupération des chapitres pour l'utilisateur ${user.id}:`, chaptersError);
          continue;
        }

        if (!chapters || chapters.length === 0) {
          continue;
        }

        // Vérifier si l'utilisateur a complété sa lecture du jour
        const chapterIds = chapters.map(c => c.id);
        const { data: progress, error: progressError } = await supabase
          .from('user_progress')
          .select('id, status')
          .eq('user_id', user.id)
          .in('chapter_id', chapterIds)
          .eq('status', 'completed');

        if (progressError) {
          console.error(`Erreur lors de la vérification de la progression pour l'utilisateur ${user.id}:`, progressError);
          continue;
        }

        // Si l'utilisateur n'a pas complété tous les chapitres du jour
        const completedChapters = progress?.length || 0;
        if (completedChapters < chapters.length) {
          // Envoyer le rappel
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

          const { error: notificationError } = await supabase.functions.invoke('send-push-notification', {
            body: notificationRequest
          });

          if (notificationError) {
            console.error(`Erreur lors de l'envoi de la notification à ${user.id}:`, notificationError);
            errors++;
          } else {
            console.log(`✅ Rappel envoyé à ${user.full_name || user.id}`);
            remindersSent++;
          }
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de l'utilisateur ${user.id}:`, error);
        errors++;
      }
    }

    console.log(`🎯 Rappels envoyés: ${remindersSent}, Erreurs: ${errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent,
        errors,
        message: `Rappels de lecture traités avec succès`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erreur générale dans daily-reading-reminder:', error);
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