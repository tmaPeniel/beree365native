
-- Créer un enum pour les rôles utilisateur
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Créer la table user_roles pour gérer les rôles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Ajouter des colonnes à la table profiles pour le tracking
ALTER TABLE public.profiles 
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_active BOOLEAN DEFAULT false;

-- Activer RLS sur user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fonction de sécurité pour vérifier les rôles (SECURITY DEFINER pour éviter la récursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fonction pour vérifier si l'utilisateur actuel est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Politique RLS pour user_roles - les admins peuvent tout voir, les utilisateurs voient leurs propres rôles
CREATE POLICY "Admins can view all roles, users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  user_id = auth.uid()
);

-- Politique pour insérer des rôles (seuls les admins peuvent assigner des rôles)
CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Politique pour mettre à jour des rôles (seuls les admins)
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Politique pour supprimer des rôles (seuls les admins)
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fonction pour mettre à jour la dernière connexion
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    last_login_at = now(),
    is_active = true
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger pour mettre à jour automatiquement la dernière connexion
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.update_last_login();

-- Fonction pour obtenir les statistiques des utilisateurs (pour les admins)
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
    p.id,
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
      user_id, 
      COUNT(*) AS completed_count
    FROM public.user_progress 
    WHERE status = 'completed'
    GROUP BY user_id
  ) up ON p.id = up.user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Insérer le premier utilisateur admin (remplacez l'UUID par votre ID utilisateur si vous en avez un)
-- Cette commande échouera si aucun utilisateur n'existe encore, c'est normal
-- INSERT INTO public.user_roles (user_id, role) 
-- SELECT id, 'admin'::app_role 
-- FROM auth.users 
-- LIMIT 1
-- ON CONFLICT DO NOTHING;
