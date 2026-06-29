CREATE OR REPLACE FUNCTION public.get_reading_plan_catalog()
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  duration_days integer,
  is_active boolean,
  created_at timestamp with time zone,
  image_url text,
  is_available boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rp.id,
    rp.name,
    rp.description,
    rp.duration_days,
    rp.is_active,
    rp.created_at,
    rp.image_url,
    rp.is_active AS is_available
  FROM public.reading_plans rp
  ORDER BY
    CASE WHEN rp.is_active THEN 0 ELSE 1 END,
    rp.duration_days DESC,
    rp.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_reading_plan_catalog() TO anon, authenticated;
