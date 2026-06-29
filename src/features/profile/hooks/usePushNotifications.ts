import { useCallback, useState } from "react";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/integrations/supabase/client";

type PermissionState = "granted" | "denied" | "undetermined" | "unsupported";

const isUnsupportedExpoGo =
  Platform.OS === "android" &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function getNotificationsModule() {
  if (isUnsupportedExpoGo) return null;
  return import("expo-notifications");
}

export function usePushNotifications() {
  const [isLoading, setIsLoading] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState>("undetermined");

  const refresh = useCallback(async () => {
    const Notifications = await getNotificationsModule();
    if (!Device.isDevice || !Notifications) {
      setPermission("unsupported");
      return;
    }

    const permissions = await Notifications.getPermissionsAsync();
    setPermission(permissions.status);
  }, []);

  const subscribe = useCallback(async () => {
    const Notifications = await getNotificationsModule();
    if (!Device.isDevice || !Notifications) {
      setPermission("unsupported");
      return false;
    }

    setIsLoading(true);
    try {
      let permissions = await Notifications.getPermissionsAsync();
      if (permissions.status !== "granted") {
        permissions = await Notifications.requestPermissionsAsync();
      }

      setPermission(permissions.status);
      if (permissions.status !== "granted") return false;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

      // TODO: renseigner `extra.eas.projectId` via EAS pour les builds de production.
      const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      setExpoPushToken(token.data);

      // TODO: adapter l'Edge Function pour persister les tokens Expo cote Supabase.
      const { error } = await supabase.functions.invoke("register-push-subscription", {
        body: {
          type: "expo",
          token: token.data,
          platform: Device.osName,
        },
      });

      if (error) throw error;
      return true;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    // TODO: ajouter une Edge Function mobile dediee pour supprimer le token Expo.
    setExpoPushToken(null);
    return true;
  }, []);

  const sendTest = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("send-test-push", {
      body: expoPushToken ? { type: "expo", token: expoPushToken } : undefined,
    });
    if (error) throw error;
    return data as { sent: number };
  }, [expoPushToken]);

  return {
    isSupported: permission !== "unsupported",
    permission,
    isSubscribed: !!expoPushToken,
    isLoading,
    subscribe,
    unsubscribe,
    sendTest,
    refresh,
  };
}
