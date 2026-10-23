import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/integrations/supabase/client";

export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }
};

/**
 * Retourne l'identifiant vérifié de l'utilisateur authentifié.
 *
 * Les opérations RPC sensibles ne doivent jamais accepter comme source de
 * vérité un identifiant fourni par un écran ou un appelant métier.
 */
export const requireCurrentUserId = async (): Promise<string> => {
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("Utilisateur non authentifié");
  }

  return user.id;
};

export const cleanupAuthState = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const authKeys = keys.filter((key) => key.startsWith("supabase.auth.") || key.includes("sb-"));
  if (authKeys.length > 0) {
    await AsyncStorage.multiRemove(authKeys);
  }
};
