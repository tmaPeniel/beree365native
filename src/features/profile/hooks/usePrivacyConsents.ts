import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const ANALYTICS_CONSENT_TYPE = 'cookies_analytics';
const CONSENT_VERSION = '1.0';

export function usePrivacyConsents() {
  const { user } = useAuth();
  const [analytics, setAnalyticsState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setAnalyticsState(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await supabase
        .from('user_consents')
        .select('consent_given')
        .eq('user_id', user.id)
        .eq('consent_type', ANALYTICS_CONSENT_TYPE)
        .order('consented_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (loadError) throw loadError;
      setAnalyticsState(data?.consent_given ?? false);
    } catch {
      setAnalyticsState(false);
      setError("Impossible de charger votre consentement Analytics.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setAnalytics = useCallback(async (enabled: boolean) => {
    if (!user?.id || savingRef.current) {
      return { success: false, error: "Le consentement n'est pas disponible." };
    }

    const previous = analytics;
    const now = new Date().toISOString();
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setAnalyticsState(enabled);

    try {
      const { error: saveError } = await supabase.from('user_consents').insert({
        user_id: user.id,
        consent_type: ANALYTICS_CONSENT_TYPE,
        consent_version: CONSENT_VERSION,
        consent_given: enabled,
        consented_at: now,
        revoked_at: enabled ? null : now,
        user_agent: 'beree-native',
      });

      if (saveError) throw saveError;
      return { success: true };
    } catch {
      setAnalyticsState(previous);
      const message = "Impossible d'enregistrer votre consentement Analytics.";
      setError(message);
      return { success: false, error: message };
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [analytics, user?.id]);

  return { analytics, loading, saving, error, setAnalytics, reload: load };
}
