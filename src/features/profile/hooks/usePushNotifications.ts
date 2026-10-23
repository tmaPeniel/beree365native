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

      if (!projectId) {
        throw new Error("L'identifiant du projet EAS n'est pas configuré.");
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          importance: Notifications.AndroidImportance.DEFAULT,
          name: "Notifications Bérée 365",
        });
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      setExpoPushToken(token.data);

      const { error } = await supabase.functions.invoke("register-native-push-token", {
        body: {
          appVersion: Constants.expoConfig?.version,
          platform: Platform.OS,
          projectId,
          token: token.data,
        },
      });

      if (error) throw error;
      return true;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!expoPushToken) return true;

    const { error } = await supabase.functions.invoke("unregister-native-push-token", {
      body: { token: expoPushToken },
    });
    if (error) throw error;

    setExpoPushToken(null);
    return true;
  }, [expoPushToken]);

  const sendTest = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("send-native-test-push");
    if (error) throw error;
    return data as { sent: number };
  }, []);

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
