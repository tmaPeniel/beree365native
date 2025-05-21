
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const signUp = async (email: string, password: string, fullName: string, startDate: Date) => {
  try {
    // First create the user account
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) throw signUpError;
    
    // Disable RLS temporarily to allow profile creation
    await supabase.rpc('disable_rls');
    
    if (authData.user) {
      // Create a profile for the user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          start_date: startDate.toISOString().split('T')[0]
        });
      
      // Re-enable RLS after profile creation
      await supabase.rpc('enable_rls');
      
      if (profileError) throw profileError;
      return { success: true, user: authData.user };
    }
    
    return { success: false, error: "Inscription réussie, mais l'utilisateur n'a pas été créé" };
  } catch (error: any) {
    toast.error(`Erreur d'inscription: ${error.message}`);
    return { success: false, error: error.message };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    return { success: true, user: data.user };
  } catch (error: any) {
    toast.error(`Erreur de connexion: ${error.message}`);
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    toast.error(`Erreur de déconnexion: ${error.message}`);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return null;
  }
};

export const updateUserProfile = async (userId: string, updates: { full_name?: string, start_date?: string }) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
    toast.success("Profil mis à jour avec succès");
    return { success: true, data };
  } catch (error: any) {
    toast.error(`Erreur de mise à jour: ${error.message}`);
    return { success: false, error: error.message };
  }
};
