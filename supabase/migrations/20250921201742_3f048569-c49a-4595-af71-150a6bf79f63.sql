-- Activer les extensions nécessaires pour les tâches cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Programmer le rappel de lecture quotidien à 20h (UTC+1 = 19h UTC)
SELECT cron.schedule(
  'daily-reading-reminder-20h',
  '0 19 * * *', -- 19h UTC = 20h heure française
  $$
  SELECT
    net.http_post(
        url:='https://xizlfyrjhzkzdchjezfn.supabase.co/functions/v1/daily-reading-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpemxmeXJqaHpremRjaGplemZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Mjc0NDksImV4cCI6MjA2MzMwMzQ0OX0.fSIJdIhVVq76EgNdEpjB0qJu0PAACVuJs2IdC6irJmc"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Programmer l'envoi du verset du jour à 7h (UTC+1 = 6h UTC)
SELECT cron.schedule(
  'daily-verse-sender-7h',
  '0 6 * * *', -- 6h UTC = 7h heure française
  $$
  SELECT
    net.http_post(
        url:='https://xizlfyrjhzkzdchjezfn.supabase.co/functions/v1/daily-verse-sender',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpemxmeXJqaHpremRjaGplemZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Mjc0NDksImV4cCI6MjA2MzMwMzQ0OX0.fSIJdIhVVq76EgNdEpjB0qJu0PAACVuJs2IdC6irJmc"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);