CREATE OR REPLACE FUNCTION public.clear_my_reading_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  DELETE FROM public.notifications_sent WHERE user_id = current_user_id;
  DELETE FROM public.verse_likes WHERE user_id = current_user_id;
  DELETE FROM public.user_badges WHERE user_id = current_user_id;
  DELETE FROM public.user_progress WHERE user_id = current_user_id;

  UPDATE public.profiles
  SET
    start_date = CURRENT_DATE,
    current_day_number = 1
  WHERE id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_my_reading_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_my_reading_data() TO authenticated;
