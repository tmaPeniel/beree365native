
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Add some sample reading plan chapters
    const chapters = [];
    
    // Jour 1 - Genèse
    chapters.push({ day_number: 1, reference: "Genèse 1", description: "Création du monde" });
    chapters.push({ day_number: 1, reference: "Genèse 2", description: "Création de l'homme et de la femme" });
    chapters.push({ day_number: 1, reference: "Psaumes 1", description: "L'homme heureux" });
    
    // Jour 2 - Genèse suite
    chapters.push({ day_number: 2, reference: "Genèse 3", description: "La chute" });
    chapters.push({ day_number: 2, reference: "Genèse 4", description: "Caïn et Abel" });
    chapters.push({ day_number: 2, reference: "Psaumes 2", description: "Le règne du Messie" });
    
    // Jour 3
    chapters.push({ day_number: 3, reference: "Genèse 5", description: "Généalogie d'Adam" });
    chapters.push({ day_number: 3, reference: "Genèse 6", description: "Corruption de l'humanité et Noé" });
    chapters.push({ day_number: 3, reference: "Proverbes 1", description: "Introduction aux Proverbes" });
    
    // Jour 4
    chapters.push({ day_number: 4, reference: "Genèse 7", description: "Le déluge" });
    chapters.push({ day_number: 4, reference: "Genèse 8", description: "Fin du déluge" });
    chapters.push({ day_number: 4, reference: "Matthieu 1", description: "Généalogie de Jésus" });
    
    // Jour 5
    chapters.push({ day_number: 5, reference: "Genèse 9", description: "Alliance avec Noé" });
    chapters.push({ day_number: 5, reference: "Genèse 10", description: "Table des nations" });
    chapters.push({ day_number: 5, reference: "Matthieu 2", description: "Naissance de Jésus" });
    
    // Insert chapters
    const { error: chaptersError } = await supabaseClient
      .from('reading_plan_chapters')
      .upsert(chapters, { onConflict: 'day_number,reference' });
    
    if (chaptersError) throw chaptersError;
    
    // Add some sample daily verses
    const verses = [
      {
        day_number: 1,
        reference: "Jean 3:16",
        text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle."
      },
      {
        day_number: 2,
        reference: "Psaumes 23:1",
        text: "L'Éternel est mon berger: je ne manquerai de rien."
      },
      {
        day_number: 3,
        reference: "Philippiens 4:13",
        text: "Je puis tout par celui qui me fortifie."
      },
      {
        day_number: 4,
        reference: "Proverbes 3:5-6",
        text: "Confie-toi en l'Éternel de tout ton cœur, Et ne t'appuie pas sur ta sagesse; Reconnais-le dans toutes tes voies, Et il aplanira tes sentiers."
      },
      {
        day_number: 5,
        reference: "Romains 8:28",
        text: "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein."
      }
    ];
    
    const { error: versesError } = await supabaseClient
      .from('daily_verses')
      .upsert(verses, { onConflict: 'day_number' });
    
    if (versesError) throw versesError;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Données d'exemple ajoutées avec succès",
        chaptersCount: chapters.length,
        versesCount: verses.length
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
