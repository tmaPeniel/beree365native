-- Correction de la fonction get_completed_days_count pour filtrer par plan sélectionné
CREATE OR REPLACE FUNCTION public.get_completed_days_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  completed_days_count INTEGER;
  user_plan_id UUID;
BEGIN
  -- Récupérer le plan sélectionné par l'utilisateur
  SELECT selected_plan_id INTO user_plan_id
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Si pas de plan sélectionné, retourner 0
  IF user_plan_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Compter les jours où tous les chapitres sont marqués comme 'completed'
  -- en filtrant par le plan sélectionné
  SELECT COUNT(DISTINCT rpc.day_number)
  INTO completed_days_count
  FROM public.reading_plan_chapters rpc
  WHERE rpc.plan_id = user_plan_id
  AND NOT EXISTS (
    -- Vérifier qu'il n'y a aucun chapitre non complété pour ce jour
    SELECT 1 
    FROM public.reading_plan_chapters rpc2 
    LEFT JOIN public.user_progress up ON (rpc2.id = up.chapter_id AND up.user_id = p_user_id)
    WHERE rpc2.day_number = rpc.day_number 
    AND rpc2.plan_id = user_plan_id
    AND (up.status IS NULL OR up.status != 'completed')
  );
  
  RETURN COALESCE(completed_days_count, 0);
END;
$function$;