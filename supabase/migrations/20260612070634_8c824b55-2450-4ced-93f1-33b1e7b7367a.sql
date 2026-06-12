-- Refonte du système de notifications : suppression intégrale
-- Tables, fonctions et triggers liés au push

-- Triggers liés aux préférences de notifications
DROP TRIGGER IF EXISTS create_notification_preferences_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;

-- Fonctions push spécifiques
DROP FUNCTION IF EXISTS public.get_user_push_subscription_status() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_notification_history() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_notification_logs() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_notification_preferences() CASCADE;

-- Tables push
DROP TABLE IF EXISTS public.notification_logs CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.user_devices CASCADE;
-- push_subscriptions n'existe pas dans la liste mais on sécurise au cas où
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;