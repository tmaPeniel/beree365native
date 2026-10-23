import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  clearPendingSignupConsentsForEmail,
  queueSignupConsents,
} from "./signupConsentService";

const PENDING_PREMIUM_CODE_KEY = "beree.pending-premium-code";

type PendingPremiumCode = {
  code: string;
  email: string;
};

type PremiumCodeRpcResult = {
  duration_months?: number;
  error?: string;
  success: boolean;
};

export type PremiumCodeRedemptionResult = {
  message?: string;
  status: "none" | "activated" | "rejected" | "retry_later";
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const queuePremiumCode = async (email: string, code: string) => {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return;

  const pending: PendingPremiumCode = {
    code: normalizedCode,
    email: normalizeEmail(email),
  };

  await AsyncStorage.setItem(PENDING_PREMIUM_CODE_KEY, JSON.stringify(pending));
};

const clearPendingPremiumCodeForEmail = async (email: string) => {
  const rawPending = await AsyncStorage.getItem(PENDING_PREMIUM_CODE_KEY);
  if (!rawPending) return;

  try {
    const pending = JSON.parse(rawPending) as PendingPremiumCode;
    if (pending.email === normalizeEmail(email)) {
      await AsyncStorage.removeItem(PENDING_PREMIUM_CODE_KEY);
    }
  } catch {
    await AsyncStorage.removeItem(PENDING_PREMIUM_CODE_KEY);
  }
};

const getPremiumCodeErrorMessage = (error?: string) => {
  switch (error) {
    case "empty_code":
      return "Saisissez un code Premium.";
    case "not_authenticated":
      return "Votre session a expiré. Reconnectez-vous pour utiliser ce code.";
    case "invalid_code":
      return "Le code Premium est invalide.";
    case "inactive_code":
      return "Le code Premium n'est plus actif.";
    case "expired_code":
      return "Le code Premium a expiré.";
    case "code_exhausted":
      return "Le nombre maximal d'utilisations de ce code est atteint.";
    case "already_redeemed":
      return "Ce code Premium a déjà été utilisé sur ce compte.";
    default:
      return "Le code Premium n'a pas pu être activé.";
  }
};

export const redeemPremiumCode = async (
  code: string
): Promise<PremiumCodeRedemptionResult> => {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { status: "rejected", message: getPremiumCodeErrorMessage("empty_code") };
  }

  try {
    const { data, error } = await supabase.rpc("redeem_premium_signup_code", {
      _code: normalizedCode,
    });

    if (error) {
      return {
        status: "retry_later",
        message: "Le code Premium ne peut pas être vérifié pour le moment. Réessayez plus tard.",
      };
    }

    const result = data as PremiumCodeRpcResult | null;
    if (result?.success) {
      return {
        status: "activated",
        message: result.duration_months
          ? `Premium activé pour ${result.duration_months} mois.`
          : "Premium activé.",
      };
    }

    return { status: "rejected", message: getPremiumCodeErrorMessage(result?.error) };
  } catch {
    return {
      status: "retry_later",
      message: "Le code Premium ne peut pas être vérifié pour le moment. Réessayez plus tard.",
    };
  }
};

export const redeemPendingPremiumCode = async (
  user: Pick<User, "email" | "id">
): Promise<PremiumCodeRedemptionResult> => {
  const rawPending = await AsyncStorage.getItem(PENDING_PREMIUM_CODE_KEY);
  if (!rawPending) return { status: "none" };

  let pending: PendingPremiumCode;
  try {
    pending = JSON.parse(rawPending) as PendingPremiumCode;
  } catch {
    await AsyncStorage.removeItem(PENDING_PREMIUM_CODE_KEY);
    return { status: "rejected", message: "Le code Premium enregistré est illisible." };
  }

  if (!user.email || pending.email !== normalizeEmail(user.email)) {
    return { status: "none" };
  }

  const result = await redeemPremiumCode(pending.code);
  if (result.status !== "retry_later") {
    await AsyncStorage.removeItem(PENDING_PREMIUM_CODE_KEY);
  }

  return result;
};

export const signUp = async (
  email: string,
  password: string,
  fullName: string,
  startDate: string,
  premiumCode?: string
) => {
  const hasPremiumCode = Boolean(premiumCode?.trim());

  try {
    await queueSignupConsents(email);

    if (hasPremiumCode) {
      await queuePremiumCode(email, premiumCode!);
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          start_date: startDate,
        },
      },
    });

    if (signUpError) throw signUpError;

    if (!authData.user) {
      throw new Error("Inscription réussie, mais l'utilisateur n'a pas été créé");
    }

    return { success: true, user: authData.user };
  } catch (error: any) {
    await clearPendingSignupConsentsForEmail(email);
    if (hasPremiumCode) {
      await clearPendingPremiumCodeForEmail(email);
    }
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

export const deleteCurrentUserAccount = async () => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return {
        success: false,
        error: "Votre session a expiré. Reconnectez-vous avant de supprimer votre compte.",
      };
    }

    const { data, error } = await supabase.functions.invoke("delete-user-account", {
      body: { userId: user.id },
    });

    if (error || data?.success !== true) {
      return {
        success: false,
        error: "La suppression du compte a échoué. Réessayez dans quelques instants.",
      };
    }

    // L'utilisateur n'existe plus côté serveur : seule la session locale reste à fermer.
    await supabase.auth.signOut({ scope: "local" });

    return { success: true };
  } catch {
    return {
      success: false,
      error: "La suppression du compte a échoué. Réessayez dans quelques instants.",
    };
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
