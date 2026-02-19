-- Créer la table de préférences de notifications
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reading_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reading_reminder_time TIME NOT NULL DEFAULT '20:00',
  daily_verse_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_verse_time TIME NOT NULL DEFAULT '07:00',
  badge_encouragement_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Créer la table de logs de notifications
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('reading_reminder', 'daily_verse', 'badge_encouragement')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  onesignal_notification_id TEXT
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Activer RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour notification_preferences
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour notification_logs
CREATE POLICY "Users can view their own notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notification logs"
  ON public.notification_logs
  FOR INSERT
  WITH CHECK (true);

-- Trigger pour auto-créer les préférences par défaut lors de la création d'un profil
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_notification_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();