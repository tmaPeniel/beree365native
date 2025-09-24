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

    console.log('📜 Démarrage de l\'envoi du verset du jour...');

    // Récupérer le verset du jour (jour de l'année)
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const { data: verse, error: verseError } = await supabase
      .from('daily_verses')
      .select('*')
      .eq('day_number', dayOfYear)
      .single();

    if (verseError && verseError.code !== 'PGRST116') {
      console.error('Erreur lors de la récupération du verset:', verseError);
      throw verseError;
    }

    // Verset par défaut si aucun verset n'est trouvé
    const dailyVerse = verse || {
      reference: "Psaume 118:24",
      text: "C'est le jour que l'Éternel a fait : Qu'il soit pour nous un sujet d'allégresse et de joie !",
      wisdomType: "biblical"
    };

    console.log(`📖 Verset du jour: ${dailyVerse.reference}`);

    // Récupérer tous les utilisateurs avec préférences activées pour le verset du jour
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        notification_preferences (
          daily_verse_enabled,
          daily_verse_time
        )
      `)
      .eq('is_active', true);

    if (usersError) {
      console.error('Erreur lors de la récupération des utilisateurs:', usersError);
      throw usersError;
    }

    console.log(`📊 ${users?.length || 0} utilisateurs trouvés`);

    let versesSent = 0;
    let errors = 0;

    // Traiter chaque utilisateur
    for (const user of users || []) {
      try {
        // Vérifier si l'utilisateur a activé le verset du jour
        const preferences = user.notification_preferences?.[0];
        if (!preferences?.daily_verse_enabled) {
          continue;
        }

        // Préparer la notification
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

        // Envoyer la notification
        const { error: notificationError } = await supabase.functions.invoke('send-push-notification', {
          body: notificationRequest
        });

        if (notificationError) {
          console.error(`Erreur lors de l'envoi du verset à ${user.id}:`, notificationError);
          errors++;
        } else {
          console.log(`✅ Verset envoyé à ${user.full_name || user.id}`);
          versesSent++;
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de l'utilisateur ${user.id}:`, error);
        errors++;
      }
    }

    console.log(`🎯 Versets envoyés: ${versesSent}, Erreurs: ${errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        versesSent,
        errors,
        verse: dailyVerse,
        message: `Verset du jour envoyé avec succès`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erreur générale dans daily-verse-sender:', error);
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