-- Supprimer le doublon de rappels de lecture
SELECT cron.unschedule('send-reading-reminders');

-- Supprimer les jobs appelant des fonctions inexistantes
SELECT cron.unschedule('daily-reading-reminder-20h');
SELECT cron.unschedule('daily-verse-sender-7h');
SELECT cron.unschedule('check-scheduled-notifications-every-15min');