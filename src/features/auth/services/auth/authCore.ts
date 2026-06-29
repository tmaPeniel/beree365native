import { supabase } from "@/integrations/supabase/client";

export const signUp = async (
  email: string,
  password: string,
  fullName: string,
  startDate: string,
  planId: string
) => {
  try {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          start_date: startDate,
          plan_id: planId,
        },
      },
    });

    if (signUpError) throw signUpError;

    // TODO: enregistrer le consentement CGU cote mobile sans navigator.userAgent.
    return authData.user
      ? { success: true, user: authData.user }
      : { success: false, error: "Inscription réussie, mais l'utilisateur n'a pas été créé" };
  } catch (error: any) {
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
    let friendlyMessage = "Erreur de connexion. Vérifiez vos identifiants";

    if (error.message === "Invalid login credentials") {
      friendlyMessage = "Email ou mot de passe incorrect";
    } else if (error.message?.includes("Email not confirmed")) {
      friendlyMessage = "Veuillez confirmer votre email avant de vous connecter";
    } else if (error.message?.includes("Invalid email")) {
      friendlyMessage = "Adresse email invalide";
    }

    return { success: false, error: friendlyMessage };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "beree365://reset-password",
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updatePassword = async (newPassword: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
