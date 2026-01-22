-- Table pour tracer les consentements RGPD
CREATE TABLE public.user_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'terms', 'cookies_essential', 'cookies_analytics'
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_version TEXT NOT NULL,
  user_agent TEXT,
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Index pour recherche rapide par utilisateur
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX idx_user_consents_type ON public.user_consents(consent_type);

-- RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir leurs propres consentements
CREATE POLICY "Users can view own consents" ON public.user_consents
  FOR SELECT USING (auth.uid() = user_id);

-- Politique : insertion autorisée (user_id peut être null pour cookies anonymes)
CREATE POLICY "Allow insert consents" ON public.user_consents
  FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Politique : les utilisateurs peuvent révoquer leurs consentements
CREATE POLICY "Users can update own consents" ON public.user_consents
  FOR UPDATE USING (auth.uid() = user_id);