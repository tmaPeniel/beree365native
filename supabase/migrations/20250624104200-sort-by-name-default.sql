
-- Modifier la fonction get_user_stats pour trier par défaut par nom d'utilisateur
CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email VARCHAR(255),
  start_date DATE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN,
  completed_chapters_count BIGINT,
  total_days_completed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.full_name,
    au.email,
    p.start_date,
    p.last_login_at,
    p.is_active,
    COALESCE(up.completed_count, 0) AS completed_chapters_count,
    public.get_completed_days_count(p.id) AS total_days_completed
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN (
    SELECT 
      upg.user_id, 
      COUNT(*) AS completed_count
    FROM public.user_progress upg
    WHERE upg.status = 'completed'
    GROUP BY upg.user_id
  ) up ON p.id = up.user_id
  ORDER BY p.full_name ASC NULLS LAST;
END;
$$;
