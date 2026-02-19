-- Fonction pour synchroniser current_day_number avec la date actuelle
CREATE OR REPLACE FUNCTION public.sync_current_day_numbers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mettre à jour current_day_number pour tous les utilisateurs
  -- Limiter entre 1 et duration_days du plan sélectionné
  UPDATE public.profiles p
  SET current_day_number = LEAST(
    COALESCE(rp.duration_days, 365),
    GREATEST(1, CURRENT_DATE - p.start_date + 1)
  )
  FROM public.reading_plans rp
  WHERE p.start_date IS NOT NULL
    AND p.selected_plan_id = rp.id;
  
  -- Logger le nombre de profils mis à jour
  RAISE NOTICE 'Synchronized current_day_number for % profiles', 
    (SELECT COUNT(*) FROM public.profiles WHERE start_date IS NOT NULL);
END;
$$;