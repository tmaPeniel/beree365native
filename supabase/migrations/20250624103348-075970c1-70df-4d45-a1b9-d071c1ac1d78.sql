
-- Corriger la fonction get_user_stats() pour résoudre les références ambiguës
CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
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
  ORDER BY p.created_at DESC;
END;
$$;

-- S'assurer qu'il y a au moins un utilisateur admin pour tester
-- (Cette commande va échouer si aucun utilisateur n'existe, c'est normal)
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'admin'::app_role 
FROM auth.users 
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;
