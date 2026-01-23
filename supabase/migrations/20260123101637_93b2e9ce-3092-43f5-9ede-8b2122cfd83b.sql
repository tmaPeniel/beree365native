-- Fonction de nettoyage des logs de notifications de plus d'un mois
CREATE OR REPLACE FUNCTION public.cleanup_old_notification_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notification_logs
  WHERE sent_at < NOW() - INTERVAL '1 month';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleanup completed: % notification logs deleted', deleted_count;
END;
$$;