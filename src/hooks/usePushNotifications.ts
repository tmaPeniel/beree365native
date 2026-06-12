import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getCurrentSubscription,
  permissionState,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/push';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsSupported(pushSupported());
    setPermission(permissionState());
    const sub = await getCurrentSubscription();
    setIsSubscribed(!!sub);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const sub = await subscribeToPush();
      if (!sub) {
        setPermission(permissionState());
        return false;
      }
      const { error } = await supabase.functions.invoke('register-push-subscription', {
        body: sub,
      });
      if (error) throw error;
      setIsSubscribed(true);
      setPermission('granted');
      return true;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) {
        await supabase.functions.invoke('unregister-push-subscription', {
          body: { endpoint },
        });
      }
      setIsSubscribed(false);
      return true;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('send-test-push');
    if (error) throw error;
    return data as { sent: number };
  }, []);

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe, sendTest, refresh };
}
