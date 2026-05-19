
ALTER TABLE public.user_devices 
  ADD COLUMN IF NOT EXISTS push_endpoint text,
  ADD COLUMN IF NOT EXISTS push_p256dh text,
  ADD COLUMN IF NOT EXISTS push_auth text;

ALTER TABLE public.user_devices ALTER COLUMN onesignal_player_id DROP NOT NULL;
