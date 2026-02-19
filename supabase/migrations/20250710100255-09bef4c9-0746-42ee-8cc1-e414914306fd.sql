-- Améliorer la fonction is_user_active pour considérer aussi les actions de lecture
CREATE OR REPLACE FUNCTION public.is_user_active(p_user_id uuid, days_threshold integer DEFAULT 7)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  last_login TIMESTAMP WITH TIME ZONE;
  last_reading TIMESTAMP WITH TIME ZONE;
  most_recent_activity TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Récupérer la dernière connexion
  SELECT last_login_at INTO last_login
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Récupérer la dernière activité de lecture
  SELECT MAX(completed_at) INTO last_reading
  FROM public.user_progress
  WHERE user_id = p_user_id AND status = 'completed';
  
  -- Prendre la plus récente des deux dates
  most_recent_activity := GREATEST(
    COALESCE(last_login, '1970-01-01'::timestamp with time zone),
    COALESCE(last_reading, '1970-01-01'::timestamp with time zone)
  );
  
  -- Retourner true si activité récente dans les X derniers jours
  RETURN (most_recent_activity > (NOW() - INTERVAL '1 day' * days_threshold));
END;
$$;

-- Améliorer la fonction get_user_stats pour utiliser la logique d'activité améliorée
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
    -- Utiliser la fonction is_user_active améliorée
    public.is_user_active(p.id, 7) AS is_active,
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

-- Créer une fonction pour mettre à jour l'activité utilisateur
CREATE OR REPLACE FUNCTION public.update_user_activity(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mettre à jour last_login_at pour refléter l'activité récente
  UPDATE public.profiles
  SET 
    last_login_at = NOW(),
    is_active = true
  WHERE id = p_user_id;
END;
$$;