import { supabase } from '@/integrations/supabase/client';

/**
 * Active le Premium pour un utilisateur (admin uniquement).
 */
export const grantPremium = async (
  targetUserId: string,
  months: number = 12,
  source: string = 'manuel_beree'
): Promise<void> => {
  const { error } = await supabase.rpc('admin_grant_premium', {
    target_user_id: targetUserId,
    months,
    source,
  } as any);
  if (error) throw error;
};

/**
 * Retire le Premium pour un utilisateur (admin uniquement).
 * L'utilisateur est automatiquement remis sur le plan canonique.
 */
export const revokePremium = async (targetUserId: string): Promise<void> => {
  const { error } = await supabase.rpc('admin_revoke_premium', {
    target_user_id: targetUserId,
  } as any);
  if (error) throw error;
};
