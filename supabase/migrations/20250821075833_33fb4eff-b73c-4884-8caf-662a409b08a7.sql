-- Update calculate_user_badges to support new criteria types
CREATE OR REPLACE FUNCTION public.calculate_user_badges(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _completed_chapters_count integer := 0;
  _completed_days integer := 0;
  _max_streak integer := 0;
  _max_same_hour_streak integer := 0;
  _morning_days integer := 0;
  _evening_days integer := 0;
  _resumed_after_gap boolean := false;
  _encouragements_used integer := 0;
  _badge RECORD;
  _count_required integer;
  _gap_days integer;
  _book text;
  _period text;
  _book_completed boolean;
BEGIN
  -- Base stats
  SELECT COUNT(*) FILTER (WHERE status = 'completed')
  INTO _completed_chapters_count
  FROM public.user_progress 
  WHERE user_id = _user_id;

  SELECT public.get_completed_days_count(_user_id)
  INTO _completed_days;

  -- Max consecutive daily streak (days with at least one completed reading)
  WITH daily AS (
    SELECT (completed_at AT TIME ZONE 'UTC')::date AS day
    FROM public.user_progress
    WHERE user_id = _user_id AND status = 'completed'
    GROUP BY 1
  ),
  seq AS (
    SELECT day, day - (row_number() over (order by day))::int AS grp
    FROM daily
  ),
  streaks AS (
    SELECT COUNT(*) AS len FROM seq GROUP BY grp
  )
  SELECT COALESCE(MAX(len), 0) INTO _max_streak FROM streaks;

  -- Morning/evening day counts based on the first reading per day
  WITH per_day AS (
    SELECT (completed_at AT TIME ZONE 'UTC')::date AS day,
           min(completed_at) AS first_time
    FROM public.user_progress
    WHERE user_id = _user_id AND status = 'completed'
    GROUP BY 1
  )
  SELECT
    COUNT(*) FILTER (WHERE (first_time::time) < time '07:00'),
    COUNT(*) FILTER (WHERE (first_time::time) >= time '21:00')
  INTO _morning_days, _evening_days
  FROM per_day;

  -- Max same-hour streak (earliest read time hour is identical across consecutive days)
  WITH per_day AS (
    SELECT (completed_at AT TIME ZONE 'UTC')::date AS day,
           extract(hour from min(completed_at))::int AS hr
    FROM public.user_progress
    WHERE user_id = _user_id AND status = 'completed'
    GROUP BY 1
  ),
  seq AS (
    SELECT day, hr, day - (row_number() over (partition by hr order by day))::int AS grp
    FROM per_day
  ),
  runs AS (
    SELECT hr, COUNT(*) AS len FROM seq GROUP BY hr, grp
  )
  SELECT COALESCE(MAX(len), 0) INTO _max_same_hour_streak FROM runs;

  -- Resume after gap (default check for > 3 days)
  WITH per_day AS (
    SELECT (completed_at AT TIME ZONE 'UTC')::date AS day,
           min(completed_at) AS first_time
    FROM public.user_progress
    WHERE user_id = _user_id AND status = 'completed'
    GROUP BY 1
  ),
  lagged AS (
    SELECT day, lag(day) over (order by day) AS prev_day
    FROM per_day
  )
  SELECT EXISTS(
    SELECT 1 FROM lagged 
    WHERE prev_day IS NOT NULL AND (day - prev_day) > interval '3 days'
  ) INTO _resumed_after_gap;

  -- Optional external metric: encouragements used (gracefully handle missing table)
  BEGIN
    SELECT COUNT(*) INTO _encouragements_used
    FROM public.encouragement_events
    WHERE user_id = _user_id;
  EXCEPTION WHEN undefined_table THEN
    _encouragements_used := 0;
  END;

  -- Evaluate each badge
  FOR _badge IN 
    SELECT id, criteria 
    FROM public.badges
  LOOP
    -- Skip if already unlocked
    IF EXISTS (
      SELECT 1 FROM public.user_badges 
      WHERE user_id = _user_id AND badge_id = _badge.id
    ) THEN
      CONTINUE;
    END IF;

    _count_required := COALESCE((_badge.criteria ->> 'count')::int, 0);
    _gap_days := COALESCE((_badge.criteria ->> 'gap_days')::int, 3);
    _book := NULLIF(_badge.criteria ->> 'book', '');
    _period := lower(COALESCE(_badge.criteria ->> 'period', ''));

    IF (_badge.criteria ->> 'type') = 'chapters_read' THEN
      IF _completed_chapters_count >= _count_required THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        VALUES (_user_id, _badge.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;

    ELSIF (_badge.criteria ->> 'type') = 'days_completed' THEN
      IF _completed_days >= _count_required THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        VALUES (_user_id, _badge.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;

    ELSIF (_badge.criteria ->> 'type') = 'milestone' THEN
      IF _completed_days >= _count_required THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        VALUES (_user_id, _badge.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;

    ELSIF (_badge.criteria ->> 'type') = 'streak_days' THEN
      IF _max_streak >= _count_required THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        VALUES (_user_id, _badge.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;

    ELSIF (_badge.criteria ->> 'type') = 'fixed_time_streak' THEN
      IF _max_same_hour_streak >= _count_required THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        VALUES (_user_id, _badge.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;

    ELSIF (_badge.criteria ->> 'type') = 'resume_after_gap' THEN
      DECLARE _has_resumed boolean;
      BEGIN
        WITH per_day AS (
          SELECT (completed_at AT TIME ZONE 'UTC')::date AS day
          FROM public.user_progress
          WHERE user_id = _user_id AND status = 'completed'
          GROUP BY 1
        ),
        lagged AS (
          SELECT day, lag(day) over (order by day) AS prev_day
          FROM per_day
        )
        SELECT EXISTS(
          SELECT 1 FROM lagged 
          WHERE prev_day IS NOT NULL AND (day - prev_day) > (_gap_days || ' days')::interval
        ) INTO _has_resumed;

        IF COALESCE(_has_resumed, false) THEN
          INSERT INTO public.user_badges (user_id, badge_id)
          VALUES (_user_id, _badge.id)
          ON CONFLICT (user_id, badge_id) DO NOTHING;
        END IF;
      END;

    ELSIF (_badge.criteria ->> 'type') = 'time_of_day' THEN
      IF (_period = 'morning' AND _morning_days >= _count_required)
         OR (_period = 'evening' AND _evening_days >= _count_required) THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        VALUES (_user_id, _badge.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;

    ELSIF (_badge.criteria ->> 'type') = 'book_completed' THEN
      IF _book IS NOT NULL THEN
        SELECT NOT EXISTS (
          SELECT 1
          FROM public.reading_plan_chapters c
          LEFT JOIN public.user_progress up
            ON up.chapter_id = c.id AND up.user_id = _user_id
          WHERE c.reference ILIKE _book || '%'
            AND (up.status IS NULL OR up.status <> 'completed')
        ) INTO _book_completed;

        IF COALESCE(_book_completed, false) THEN
          INSERT INTO public.user_badges (user_id, badge_id)
          VALUES (_user_id, _badge.id)
          ON CONFLICT (user_id, badge_id) DO NOTHING;
        END IF;
      END IF;

    ELSIF (_badge.criteria ->> 'type') = 'encouragements_used' THEN
      IF _encouragements_used >= _count_required THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        VALUES (_user_id, _badge.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$;