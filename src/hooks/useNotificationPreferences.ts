import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from './useOptimizedAuth';

export type NotificationPreferences = {
  user_id: string;
  daily_verse_enabled: boolean;
  reading_reminder_enabled: boolean;
  badges_enabled: boolean;
  daily_verse_time: string;
  reading_reminder_time: string;
  timezone: string;
};

export function useNotificationPreferences() {
  const { user } = useOptimizedAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setPrefs(data as NotificationPreferences);
    } else {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const { data: created } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id, timezone: tz })
        .select()
        .single();
      if (created) setPrefs(created as NotificationPreferences);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = useCallback(
    async (patch: Partial<NotificationPreferences>) => {
      if (!user?.id || !prefs) return;
      const next = { ...prefs, ...patch };
      setPrefs(next);
      await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' });
    },
    [user?.id, prefs],
  );

  return { prefs, loading, update, reload: load };
}
