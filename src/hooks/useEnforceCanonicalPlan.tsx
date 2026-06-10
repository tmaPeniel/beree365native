import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { usePremium } from './usePremium';
import { supabase } from '@/integrations/supabase/client';

// Plan canonique 12 mois — imposé aux utilisateurs Gratuits
const CANONICAL_PLAN_ID = 'fa63f02b-7e58-4418-a0eb-58282fd8799d';

/**
 * Force les utilisateurs Gratuits sur le plan canonique 12 mois.
 * Silencieux : pas de toast.
 */
export const useEnforceCanonicalPlan = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { isPremium, isLoading } = usePremium();
  const enforcedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || !user?.id || !profile) return;
    if (isPremium) return;
    if (profile.selected_plan_id === CANONICAL_PLAN_ID) return;
    if (enforcedRef.current === user.id) return;

    enforcedRef.current = user.id;
    (async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ selected_plan_id: CANONICAL_PLAN_ID })
        .eq('id', user.id);

      if (error) {
        console.error('Enforce canonical plan failed:', error);
        enforcedRef.current = null;
        return;
      }
      await refreshProfile();
    })();
  }, [user?.id, profile, isPremium, isLoading, refreshProfile]);
};
