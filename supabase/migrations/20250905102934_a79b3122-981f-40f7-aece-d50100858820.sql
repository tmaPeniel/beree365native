-- Corriger le problème de search_path pour la fonction change_user_plan
CREATE OR REPLACE FUNCTION public.change_user_plan(new_plan_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Vérifier que le plan existe et est actif
  IF NOT EXISTS (
    SELECT 1 FROM public.reading_plans 
    WHERE id = new_plan_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;
  
  -- Supprimer toute la progression de l'utilisateur
  DELETE FROM public.user_progress 
  WHERE user_id = auth.uid();
  
  -- Supprimer tous les badges de l'utilisateur
  DELETE FROM public.user_badges 
  WHERE user_id = auth.uid();
  
  -- Mettre à jour le profil utilisateur
  UPDATE public.profiles 
  SET 
    selected_plan_id = new_plan_id,
    start_date = CURRENT_DATE,
    current_day_number = 1
  WHERE id = auth.uid();
END;
$$;