/**
 * Hook de gestion du consentement cookies
 * Conforme au RGPD
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CookieConsent {
  essential: boolean; // Toujours true
  analytics: boolean;
  consentedAt: string;
}

const COOKIE_CONSENT_KEY = 'cookie-consent';
const CONSENT_VERSION = '1.0';

export const useCookieConsent = () => {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Charger le consentement depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookieConsent;
        setConsent(parsed);
        setShowBanner(false);
      } catch (error) {
        console.warn('Erreur parsing cookie consent:', error);
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
    setIsLoading(false);
  }, []);

  // Enregistrer le consentement en base de données
  const saveConsentToDatabase = useCallback(async (
    consentType: string, 
    consentGiven: boolean
  ) => {
    if (!user) return;

    try {
      // Utiliser fetch directement pour les tables non typées
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `https://xizlfyrjhzkzdchjezfn.supabase.co/rest/v1/user_consents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpemxmeXJqaHpremRjaGplemZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Mjc0NDksImV4cCI6MjA2MzMwMzQ0OX0.fSIJdIhVVq76EgNdEpjB0qJu0PAACVuJs2IdC6irJmc',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: user.id,
            consent_type: consentType,
            consent_given: consentGiven,
            consent_version: CONSENT_VERSION,
            user_agent: navigator.userAgent
          })
        }
      );
      
      if (!response.ok) {
        console.error('Erreur enregistrement consentement:', response.statusText);
      }
    } catch (error) {
      console.error('Erreur enregistrement consentement:', error);
    }
  }, [user]);

  // Sauvegarder le consentement
  const saveConsent = useCallback(async (newConsent: CookieConsent) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);

    // Enregistrer en base de données si connecté
    if (user) {
      await saveConsentToDatabase('cookies_essential', true);
      await saveConsentToDatabase('cookies_analytics', newConsent.analytics);
    }
  }, [user, saveConsentToDatabase]);

  // Accepter tous les cookies
  const acceptAll = useCallback(async () => {
    const newConsent: CookieConsent = {
      essential: true,
      analytics: true,
      consentedAt: new Date().toISOString()
    };
    await saveConsent(newConsent);
  }, [saveConsent]);

  // Refuser les cookies optionnels
  const rejectAll = useCallback(async () => {
    const newConsent: CookieConsent = {
      essential: true,
      analytics: false,
      consentedAt: new Date().toISOString()
    };
    await saveConsent(newConsent);
  }, [saveConsent]);

  // Sauvegarder les préférences personnalisées
  const savePreferences = useCallback(async (analytics: boolean) => {
    const newConsent: CookieConsent = {
      essential: true,
      analytics,
      consentedAt: new Date().toISOString()
    };
    await saveConsent(newConsent);
  }, [saveConsent]);

  // Réinitialiser le consentement (pour permettre de le modifier)
  const resetConsent = useCallback(() => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    setConsent(null);
    setShowBanner(true);
  }, []);

  return { 
    consent, 
    showBanner, 
    isLoading,
    acceptAll, 
    rejectAll, 
    savePreferences,
    resetConsent
  };
};

export default useCookieConsent;
