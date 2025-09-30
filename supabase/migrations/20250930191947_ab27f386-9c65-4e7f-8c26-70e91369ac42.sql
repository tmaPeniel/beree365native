-- Activer les extensions nécessaires pour les cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Créer un cron job qui s'exécute toutes les 15 minutes
-- Il vérifie les préférences de chaque utilisateur et envoie les notifications au bon moment
SELECT cron.schedule(
  'check-scheduled-notifications-every-15min',
  '*/15 * * * *', -- Toutes les 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://xizlfyrjhzkzdchjezfn.supabase.co/functions/v1/check-scheduled-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpemxmeXJqaHpremRjaGplemZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Mjc0NDksImV4cCI6MjA2MzMwMzQ0OX0.fSIJdIhVVq76EgNdEpjB0qJu0PAACVuJs2IdC6irJmc"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
