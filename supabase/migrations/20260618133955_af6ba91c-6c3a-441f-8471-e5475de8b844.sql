
-- Table des codes
CREATE TABLE public.premium_signup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  duration_months integer NOT NULL DEFAULT 12 CHECK (duration_months > 0),
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.premium_signup_codes TO service_role;
ALTER TABLE public.premium_signup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage premium codes"
  ON public.premium_signup_codes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_premium_signup_codes_updated_at
  BEFORE UPDATE ON public.premium_signup_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table des rédemptions
CREATE TABLE public.premium_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_id uuid NOT NULL REFERENCES public.premium_signup_codes(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_id)
);

GRANT SELECT ON public.premium_code_redemptions TO authenticated;
GRANT ALL ON public.premium_code_redemptions TO service_role;
ALTER TABLE public.premium_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own redemptions"
  ON public.premium_code_redemptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins see all redemptions"
  ON public.premium_code_redemptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fonction de rédemption
CREATE OR REPLACE FUNCTION public.redeem_premium_signup_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _row public.premium_signup_codes%ROWTYPE;
  _normalized text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  _normalized := upper(btrim(coalesce(_code, '')));
  IF _normalized = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_code');
  END IF;

  SELECT * INTO _row FROM public.premium_signup_codes
   WHERE upper(code) = _normalized FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF NOT _row.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'inactive_code');
  END IF;

  IF _row.expires_at IS NOT NULL AND _row.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired_code');
  END IF;

  IF _row.max_uses IS NOT NULL AND _row.used_count >= _row.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_exhausted');
  END IF;

  IF EXISTS (SELECT 1 FROM public.premium_code_redemptions
              WHERE user_id = _user_id AND code_id = _row.id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_redeemed');
  END IF;

  -- Accorder premium
  UPDATE public.profiles
     SET is_premium = true,
         premium_start_date = now(),
         premium_end_date = now() + make_interval(months => _row.duration_months),
         premium_source = 'signup_code'
   WHERE id = _user_id;

  UPDATE public.premium_signup_codes
     SET used_count = used_count + 1
   WHERE id = _row.id;

  INSERT INTO public.premium_code_redemptions (user_id, code_id)
  VALUES (_user_id, _row.id);

  RETURN jsonb_build_object('success', true, 'duration_months', _row.duration_months);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_premium_signup_code(text) TO authenticated;
