import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const PENDING_SIGNUP_CONSENTS_KEY = 'beree.pending-signup-consents';
const SIGNUP_CONSENT_VERSION = '1.0';
const SIGNUP_CONSENT_SOURCE = 'beree-native-signup';
const SIGNUP_CONSENT_TYPES = ['terms', 'cookies_essential'] as const;

type PendingSignupConsents = {
  acceptedAt: string;
  email: string;
  version: string;
};

export type SignupConsentSyncResult = {
  message?: string;
  status: 'none' | 'recorded' | 'rejected' | 'retry_later';
};

const syncingUsers = new Set<string>();
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const queueSignupConsents = async (email: string) => {
  const pending: PendingSignupConsents = {
    acceptedAt: new Date().toISOString(),
    email: normalizeEmail(email),
    version: SIGNUP_CONSENT_VERSION,
  };

  await AsyncStorage.setItem(PENDING_SIGNUP_CONSENTS_KEY, JSON.stringify(pending));
};

export const clearPendingSignupConsentsForEmail = async (email: string) => {
  const rawPending = await AsyncStorage.getItem(PENDING_SIGNUP_CONSENTS_KEY);
  if (!rawPending) return;

  try {
    const pending = JSON.parse(rawPending) as PendingSignupConsents;
    if (pending.email === normalizeEmail(email)) {
      await AsyncStorage.removeItem(PENDING_SIGNUP_CONSENTS_KEY);
    }
  } catch {
    await AsyncStorage.removeItem(PENDING_SIGNUP_CONSENTS_KEY);
  }
};

export const syncPendingSignupConsents = async (
  user: Pick<User, 'email' | 'id'>,
): Promise<SignupConsentSyncResult> => {
  if (syncingUsers.has(user.id)) return { status: 'none' };

  const rawPending = await AsyncStorage.getItem(PENDING_SIGNUP_CONSENTS_KEY);
  if (!rawPending) return { status: 'none' };

  let pending: PendingSignupConsents;
  try {
    pending = JSON.parse(rawPending) as PendingSignupConsents;
  } catch {
    await AsyncStorage.removeItem(PENDING_SIGNUP_CONSENTS_KEY);
    return { status: 'rejected', message: "Le consentement d'inscription enregistré est illisible." };
  }

  if (!user.email || pending.email !== normalizeEmail(user.email)) {
    return { status: 'none' };
  }

  if (
    pending.version !== SIGNUP_CONSENT_VERSION
    || Number.isNaN(new Date(pending.acceptedAt).getTime())
  ) {
    await AsyncStorage.removeItem(PENDING_SIGNUP_CONSENTS_KEY);
    return { status: 'rejected', message: "Le consentement d'inscription doit être accepté à nouveau." };
  }

  syncingUsers.add(user.id);
  try {
    const { data: existing, error: loadError } = await supabase
      .from('user_consents')
      .select('consent_type')
      .eq('user_id', user.id)
      .eq('consent_version', pending.version)
      .eq('user_agent', SIGNUP_CONSENT_SOURCE)
      .in('consent_type', [...SIGNUP_CONSENT_TYPES]);

    if (loadError) throw loadError;

    const existingTypes = new Set((existing ?? []).map((item) => item.consent_type));
    const missingTypes = SIGNUP_CONSENT_TYPES.filter((type) => !existingTypes.has(type));

    if (missingTypes.length > 0) {
      const { error: insertError } = await supabase.from('user_consents').insert(
        missingTypes.map((consentType) => ({
          user_id: user.id,
          consent_type: consentType,
          consent_version: pending.version,
          consent_given: true,
          consented_at: pending.acceptedAt,
          revoked_at: null,
          user_agent: SIGNUP_CONSENT_SOURCE,
        })),
      );

      if (insertError) throw insertError;
    }

    await AsyncStorage.removeItem(PENDING_SIGNUP_CONSENTS_KEY);
    return { status: 'recorded' };
  } catch {
    return {
      status: 'retry_later',
      message: "Votre consentement d'inscription sera synchronisé à la prochaine connexion.",
    };
  } finally {
    syncingUsers.delete(user.id);
  }
};
