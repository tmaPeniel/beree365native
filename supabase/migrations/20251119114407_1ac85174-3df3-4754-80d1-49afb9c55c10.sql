-- Insérer les préférences par défaut pour tous les utilisateurs existants qui n'en ont pas
INSERT INTO public.notification_preferences (
  user_id,
  reading_reminder_enabled,
  reading_reminder_time,
  daily_verse_enabled,
  daily_verse_time,
  badge_encouragement_enabled
)
SELECT 
  id,
  true,
  '20:00',
  true,
  '07:00',
  true
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.notification_preferences)
ON CONFLICT (user_id) DO NOTHING;