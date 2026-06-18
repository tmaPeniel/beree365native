
-- 1. Premium columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS premium_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS premium_source text;

-- 2. Core flag
CREATE OR REPLACE FUNCTION public.is_premium_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT p.is_premium AND (p.premium_end_date IS NULL OR p.premium_end_date > now())
    FROM public.profiles p WHERE p.id = _user_id
  ), false);
$$;

-- 3. Canonical plan helper
CREATE OR REPLACE FUNCTION public.get_canonical_plan_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.reading_plans
   WHERE name = 'Canonique 12 mois' AND is_active = true LIMIT 1;
$$;

-- 4. Anti-self-edit trigger (allow when no authenticated user OR caller is admin)
CREATE OR REPLACE FUNCTION public.prevent_premium_self_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Server-side contexts (migrations, cron, edge functions using service role) have no auth.uid()
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins are always allowed (covers admin RPCs called from the client)
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.is_premium IS DISTINCT FROM OLD.is_premium
     OR NEW.premium_start_date IS DISTINCT FROM OLD.premium_start_date
     OR NEW.premium_end_date IS DISTINCT FROM OLD.premium_end_date
     OR NEW.premium_source IS DISTINCT FROM OLD.premium_source
  THEN
    RAISE EXCEPTION 'Premium fields can only be modified by an administrator';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_premium_self_edit ON public.profiles;
CREATE TRIGGER trg_prevent_premium_self_edit
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_premium_self_edit();

-- 5. Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_grant_premium(
  target_user_id uuid, months integer DEFAULT 12, source text DEFAULT 'manuel_beree'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  IF months IS NULL OR months <= 0 THEN
    RAISE EXCEPTION 'months must be > 0';
  END IF;
  UPDATE public.profiles
  SET is_premium = true,
      premium_start_date = now(),
      premium_end_date = now() + make_interval(months => months),
      premium_source = COALESCE(source, 'manuel_beree')
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_premium(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _canonical uuid := public.get_canonical_plan_id();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  UPDATE public.profiles
  SET is_premium = false,
      premium_start_date = NULL,
      premium_end_date = NULL,
      premium_source = NULL,
      selected_plan_id = COALESCE(_canonical, selected_plan_id)
  WHERE id = target_user_id;
END;
$$;

-- 6. Expiration cron function
CREATE OR REPLACE FUNCTION public.expire_premium_subscriptions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _canonical uuid := public.get_canonical_plan_id();
        _expired_count integer;
BEGIN
  UPDATE public.profiles
  SET is_premium = false,
      premium_start_date = NULL,
      premium_end_date = NULL,
      premium_source = NULL,
      selected_plan_id = COALESCE(_canonical, selected_plan_id)
  WHERE is_premium = true
    AND premium_end_date IS NOT NULL
    AND premium_end_date <= now();
  GET DIAGNOSTICS _expired_count = ROW_COUNT;
  RAISE NOTICE 'Premium expiration: % users downgraded', _expired_count;
END;
$$;

-- 7. notification_preferences RLS
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Premium users can insert their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Premium users can insert their own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_premium_active(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Premium users can update their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Premium users can update their own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.is_premium_active(auth.uid()));

-- 8. user_devices RLS
DROP POLICY IF EXISTS "Users can insert their own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Premium users can insert their own devices" ON public.user_devices;
CREATE POLICY "Premium users can insert their own devices"
  ON public.user_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_premium_active(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Premium users can update their own devices" ON public.user_devices;
CREATE POLICY "Premium users can update their own devices"
  ON public.user_devices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.is_premium_active(auth.uid()));

-- 9. Badge calculation: premium-gated
CREATE OR REPLACE FUNCTION public.calculate_user_badges(_user_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  _completed_chapters_count integer := 0;
  _completed_days integer := 0;
  _max_streak integer := 0;
  _max_same_hour_streak integer := 0;
  _morning_days integer := 0;
  _evening_days integer := 0;
  _resumed_after_gap boolean := false;
  _encouragements_used integer := 0;
  _user_plan_id UUID;
  _badge RECORD;
  _count_required integer;
  _gap_days integer;
  _book text;
  _period text;
  _book_completed boolean;
BEGIN
  IF NOT public.is_premium_active(_user_id) THEN
    RETURN;
  END IF;

  SELECT selected_plan_id INTO _user_plan_id FROM public.profiles WHERE id = _user_id;

  SELECT COUNT(*) FILTER (WHERE status = 'completed')
  INTO _completed_chapters_count
  FROM public.user_progress WHERE user_id = _user_id;

  SELECT public.get_completed_days_count(_user_id) INTO _completed_days;

  WITH daily AS (
    SELECT (completed_at AT TIME ZONE 'UTC')::date AS day
    FROM public.user_progress WHERE user_id = _user_id AND status = 'completed' GROUP BY 1
  ),
  seq AS (SELECT day, day - (row_number() over (order by day))::int AS grp FROM daily),
  streaks AS (SELECT COUNT(*) AS len FROM seq GROUP BY grp)
  SELECT COALESCE(MAX(len), 0) INTO _max_streak FROM streaks;

  WITH per_day AS (
    SELECT (completed_at AT TIME ZONE 'UTC')::date AS day, min(completed_at) AS first_time
    FROM public.user_progress WHERE user_id = _user_id AND status = 'completed' GROUP BY 1
  )
  SELECT
    COUNT(*) FILTER (WHERE (first_time::time) < time '07:00'),
    COUNT(*) FILTER (WHERE (first_time::time) >= time '21:00')
  INTO _morning_days, _evening_days FROM per_day;

  WITH per_day AS (
    SELECT (completed_at AT TIME ZONE 'UTC')::date AS day,
           extract(hour from min(completed_at))::int AS hr
    FROM public.user_progress WHERE user_id = _user_id AND status = 'completed' GROUP BY 1
  ),
  seq AS (SELECT day, hr, day - (row_number() over (partition by hr order by day))::int AS grp FROM per_day),
  runs AS (SELECT hr, COUNT(*) AS len FROM seq GROUP BY hr, grp)
  SELECT COALESCE(MAX(len), 0) INTO _max_same_hour_streak FROM runs;

  WITH per_day AS (
    SELECT (completed_at AT TIME ZONE 'UTC')::date AS day, min(completed_at) AS first_time
    FROM public.user_progress WHERE user_id = _user_id AND status = 'completed' GROUP BY 1
  ),
  lagged AS (SELECT day, lag(day) over (order by day) AS prev_day FROM per_day)
  SELECT EXISTS(SELECT 1 FROM lagged WHERE prev_day IS NOT NULL AND (day - prev_day) > 3)
  INTO _resumed_after_gap;

  BEGIN
    SELECT COUNT(*) INTO _encouragements_used
    FROM public.encouragement_events WHERE user_id = _user_id;
  EXCEPTION WHEN undefined_table THEN _encouragements_used := 0;
  END;

  FOR _badge IN SELECT id, criteria FROM public.badges LOOP
    IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = _user_id AND badge_id = _badge.id) THEN CONTINUE; END IF;
    _count_required := COALESCE((_badge.criteria ->> 'count')::int, 0);
    _gap_days := COALESCE((_badge.criteria ->> 'gap_days')::int, 3);
    _book := NULLIF(_badge.criteria ->> 'book', '');
    _period := lower(COALESCE((_badge.criteria ->> 'period'), ''));

    IF (_badge.criteria ->> 'type') = 'chapters_read' THEN
      IF _completed_chapters_count >= _count_required THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user_id, _badge.id) ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    ELSIF (_badge.criteria ->> 'type') = 'days_completed' OR (_badge.criteria ->> 'type') = 'milestone' THEN
      IF _completed_days >= _count_required THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user_id, _badge.id) ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    ELSIF (_badge.criteria ->> 'type') = 'streak_days' THEN
      IF _max_streak >= _count_required THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user_id, _badge.id) ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    ELSIF (_badge.criteria ->> 'type') = 'fixed_time_streak' THEN
      IF _max_same_hour_streak >= _count_required THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user_id, _badge.id) ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    ELSIF (_badge.criteria ->> 'type') = 'resume_after_gap' THEN
      DECLARE _has_resumed boolean;
      BEGIN
        WITH per_day AS (
          SELECT (completed_at AT TIME ZONE 'UTC')::date AS day
          FROM public.user_progress WHERE user_id = _user_id AND status = 'completed' GROUP BY 1
        ),
        lagged AS (SELECT day, lag(day) over (order by day) AS prev_day FROM per_day)
        SELECT EXISTS(SELECT 1 FROM lagged WHERE prev_day IS NOT NULL AND (day - prev_day) > _gap_days)
        INTO _has_resumed;
        IF COALESCE(_has_resumed, false) THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user_id, _badge.id) ON CONFLICT (user_id, badge_id) DO NOTHING;
        END IF;
      END;
    ELSIF (_badge.criteria ->> 'type') = 'time_of_day' THEN
      IF (_period = 'morning' AND _morning_days >= _count_required)
         OR (_period = 'evening' AND _evening_days >= _count_required) THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user_id, _badge.id) ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    ELSIF (_badge.criteria ->> 'type') = 'book_completed' THEN
      IF _book IS NOT NULL AND _user_plan_id IS NOT NULL THEN
        SELECT NOT EXISTS (
          SELECT 1 FROM public.reading_plan_chapters c
          LEFT JOIN public.user_progress up ON up.chapter_id = c.id AND up.user_id = _user_id
          WHERE c.reference ILIKE _book || '%'
            AND c.plan_id = _user_plan_id
            AND (up.status IS NULL OR up.status <> 'completed')
        ) INTO _book_completed;
        IF COALESCE(_book_completed, false) THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user_id, _badge.id) ON CONFLICT (user_id, badge_id) DO NOTHING;
        END IF;
      END IF;
    ELSIF (_badge.criteria ->> 'type') = 'encouragements_used' THEN
      IF _encouragements_used >= _count_required THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user_id, _badge.id) ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$function$;

-- 10. change_user_plan: Free users restricted to canonical
CREATE OR REPLACE FUNCTION public.change_user_plan(new_plan_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _canonical uuid := public.get_canonical_plan_id();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reading_plans WHERE id = new_plan_id AND is_active = true) THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;
  IF NOT public.is_premium_active(auth.uid()) AND new_plan_id <> _canonical THEN
    RAISE EXCEPTION 'Premium subscription required to select this plan';
  END IF;
  DELETE FROM public.user_progress WHERE user_id = auth.uid();
  DELETE FROM public.user_badges WHERE user_id = auth.uid();
  UPDATE public.profiles
  SET selected_plan_id = new_plan_id, start_date = CURRENT_DATE, current_day_number = 1
  WHERE id = auth.uid();
END;
$function$;

-- 11. get_user_stats extended with premium info
DROP FUNCTION IF EXISTS public.get_user_stats();
CREATE OR REPLACE FUNCTION public.get_user_stats()
 RETURNS TABLE(
   user_id uuid, full_name text, email character varying, start_date date,
   last_login_at timestamp with time zone, is_active boolean,
   completed_chapters_count bigint, total_days_completed integer,
   is_premium boolean, premium_start_date timestamptz,
   premium_end_date timestamptz, premium_source text
 ) LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  RETURN QUERY
  SELECT 
    p.id, p.full_name, au.email, p.start_date, p.last_login_at,
    public.is_user_active(p.id, 7),
    COALESCE(up.completed_count, 0),
    public.get_completed_days_count(p.id),
    COALESCE(p.is_premium, false) AND (p.premium_end_date IS NULL OR p.premium_end_date > now()),
    p.premium_start_date, p.premium_end_date, p.premium_source
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN (
    SELECT upg.user_id, COUNT(*) AS completed_count
    FROM public.user_progress upg WHERE upg.status = 'completed' GROUP BY upg.user_id
  ) up ON p.id = up.user_id
  ORDER BY p.full_name ASC NULLS LAST;
END;
$function$;

-- 12. Grandfather admins as Premium 12 months
UPDATE public.profiles p
SET is_premium = true,
    premium_start_date = now(),
    premium_end_date = now() + interval '12 months',
    premium_source = 'grandfather'
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
)
AND p.is_premium = false;

-- 13. Cron daily expiration
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-premium-subscriptions-daily') THEN
      PERFORM cron.unschedule('expire-premium-subscriptions-daily');
    END IF;
    PERFORM cron.schedule(
      'expire-premium-subscriptions-daily',
      '15 3 * * *',
      $cron$SELECT public.expire_premium_subscriptions();$cron$
    );
  END IF;
END $$;
