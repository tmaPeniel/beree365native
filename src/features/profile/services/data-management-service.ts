import { supabase } from "@/integrations/supabase/client";

export async function clearCurrentUserReadingData(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase.rpc("clear_my_reading_data");

    if (error) throw error;
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Vos données de lecture n'ont pas pu être effacées. Réessayez dans quelques instants.",
    };
  }
}
