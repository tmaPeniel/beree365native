import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

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
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setPrefs(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (loadError) throw loadError;
      if (data) {
        setPrefs(data as NotificationPreferences);
        return;
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const { data: created, error: createError } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id, timezone })
        .select()
        .single();

      if (createError) throw createError;
      setPrefs(created as NotificationPreferences);
    } catch {
      setPrefs(null);
      setError("Impossible de charger vos préférences de notifications.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = useCallback(
    async (patch: Partial<Omit<NotificationPreferences, 'user_id'>>) => {
      if (!user?.id || !prefs || saving) {
        return { success: false, error: "Les préférences ne sont pas disponibles." };
      }

      const previous = prefs;
      const next = { ...prefs, ...patch };
      setPrefs(next);
      setSaving(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('notification_preferences')
          .update(patch)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        return { success: true };
      } catch {
        setPrefs(previous);
        const message = "Impossible d'enregistrer vos préférences.";
        setError(message);
        return { success: false, error: message };
      } finally {
        setSaving(false);
      }
    },
    [user?.id, prefs, saving],
  );

  return { prefs, loading, saving, error, update, reload: load };
}
