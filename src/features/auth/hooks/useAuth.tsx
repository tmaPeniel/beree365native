import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/integrations/supabase/client";
import {
  cleanupAuthState,
  redeemPendingPremiumCode,
  refreshUserProfile,
  syncPendingSignupConsents,
} from "@/features/auth/services/auth";
import { Profile } from "@/types/supabase";

type AuthContextType = {
  user: any | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  triggerProgressUpdate: () => void;
  progressUpdateCounter: number;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  refreshProfile: async () => {},
  triggerProgressUpdate: () => {},
  progressUpdateCounter: 0,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progressUpdateCounter, setProgressUpdateCounter] = useState(0);

  useEffect(() => {
    const synchronizePostSignupData = async (authenticatedUser: any) => {
      const [consentSync, redemption] = await Promise.all([
        syncPendingSignupConsents(authenticatedUser),
        redeemPendingPremiumCode(authenticatedUser),
      ]);

      if (consentSync.status === "rejected" || consentSync.status === "retry_later") {
        Alert.alert(
          "Consentement",
          consentSync.message ?? "Le consentement d'inscription n'a pas pu être synchronisé."
        );
      }

      if (redemption.status === "activated" || redemption.status === "rejected") {
        Alert.alert(
          redemption.status === "activated" ? "Premium activé" : "Code Premium",
          redemption.message ?? "Le code Premium n'a pas pu être traité."
        );
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        const authenticatedUser = session.user;

        setTimeout(() => {
          void (async () => {
            await synchronizePostSignupData(authenticatedUser);
            const userProfile = await refreshUserProfile(authenticatedUser.id);
            setProfile(userProfile);
          })();
        }, 0);
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        void cleanupAuthState().finally(() => router.replace("/(auth)/login"));
      }
    });

    const initAuth = async () => {
      setIsLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          await synchronizePostSignupData(session.user);
          const userProfile = await refreshUserProfile(session.user.id);
          setProfile(userProfile);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user?.id) return;
    const userProfile = await refreshUserProfile(user.id);
    setProfile(userProfile);
  };

  const triggerProgressUpdate = () => {
    setProgressUpdateCounter((value) => value + 1);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        refreshProfile,
        triggerProgressUpdate,
        progressUpdateCounter,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
