-- Créer la table user_devices pour support multi-appareils
CREATE TABLE public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onesignal_player_id TEXT NOT NULL,
  device_platform TEXT,
  device_token TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, onesignal_player_id)
);

-- RLS policies pour user_devices
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own devices"
  ON public.user_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices"
  ON public.user_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices"
  ON public.user_devices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
  ON public.user_devices FOR DELETE
  USING (auth.uid() = user_id);

-- Migrer les player_ids existants de profiles vers user_devices
INSERT INTO public.user_devices (user_id, onesignal_player_id, device_platform)
SELECT id, onesignal_player_id, device_platform
FROM public.profiles
WHERE onesignal_player_id IS NOT NULL
ON CONFLICT (user_id, onesignal_player_id) DO NOTHING;