-- Ajouter la foreign key manquante entre notification_preferences et profiles
ALTER TABLE public.notification_preferences 
ADD CONSTRAINT fk_notification_preferences_user 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;