ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS membership_trial_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS membership_trial_expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS membership_trial_tier public.membership_tier;

CREATE INDEX IF NOT EXISTS idx_profiles_active_membership_trials
  ON public.profiles (membership_trial_expires_at)
  WHERE membership_trial_started_at IS NOT NULL
    AND membership_trial_expired_at IS NULL;

CREATE OR REPLACE FUNCTION public.prevent_member_membership_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND NOT public.is_staff(auth.uid())
     AND (
       NEW.membership_tier IS DISTINCT FROM OLD.membership_tier
       OR NEW.membership_status IS DISTINCT FROM OLD.membership_status
       OR NEW.membership_expires_at IS DISTINCT FROM OLD.membership_expires_at
       OR NEW.membership_trial_started_at IS DISTINCT FROM OLD.membership_trial_started_at
       OR NEW.membership_trial_expires_at IS DISTINCT FROM OLD.membership_trial_expires_at
       OR NEW.membership_trial_expired_at IS DISTINCT FROM OLD.membership_trial_expired_at
       OR NEW.membership_trial_tier IS DISTINCT FROM OLD.membership_trial_tier
     ) THEN
    RAISE EXCEPTION 'membership fields can only be changed by staff or trusted server operations'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_member_membership_field_updates ON public.profiles;
CREATE TRIGGER profiles_prevent_member_membership_field_updates
BEFORE UPDATE OF
  membership_tier,
  membership_status,
  membership_expires_at,
  membership_trial_started_at,
  membership_trial_expires_at,
  membership_trial_expired_at,
  membership_trial_tier
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_member_membership_field_updates();

GRANT UPDATE (
  membership_tier,
  membership_status,
  membership_expires_at,
  membership_trial_started_at,
  membership_trial_expires_at,
  membership_trial_expired_at,
  membership_trial_tier
)
ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.current_tier(_user_id uuid)
RETURNS public.membership_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN profile.membership_status = 'active'
      AND (profile.membership_expires_at IS NULL OR profile.membership_expires_at >= current_date)
      AND (
        profile.membership_trial_started_at IS NULL
        OR profile.membership_trial_expired_at IS NOT NULL
        OR profile.membership_expires_at IS NOT NULL
        OR profile.membership_tier IS DISTINCT FROM profile.membership_trial_tier
        OR profile.membership_trial_expires_at > now()
      )
      THEN profile.membership_tier
    ELSE 'observer'::public.membership_tier
  END
  FROM public.profiles AS profile
  WHERE profile.id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.start_membership_trial(_tier public.membership_tier)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _profile public.profiles%ROWTYPE;
  _expires_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF _tier = 'observer' THEN
    RAISE EXCEPTION 'Observer membership does not use a trial';
  END IF;

  SELECT *
  INTO _profile
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF _profile.membership_status <> 'active' THEN
    RAISE EXCEPTION 'only active members can start a membership trial';
  END IF;
  IF _profile.crm_stage = 'applicant'
     AND NULLIF(_profile.application_data->>'submitted_at', '') IS NULL THEN
    RAISE EXCEPTION 'complete onboarding before starting a membership trial';
  END IF;
  IF _profile.membership_trial_started_at IS NOT NULL THEN
    IF _profile.membership_trial_tier = _tier
       AND _profile.membership_trial_expired_at IS NULL
       AND _profile.membership_expires_at IS NULL
       AND _profile.membership_trial_expires_at > now() THEN
      RETURN _profile.membership_trial_expires_at;
    END IF;
    RAISE EXCEPTION 'the membership trial has already been used';
  END IF;
  IF _profile.membership_tier <> 'observer' THEN
    RAISE EXCEPTION 'only Observer members can start a membership trial';
  END IF;

  _expires_at := now() + interval '3 months';

  UPDATE public.profiles
  SET membership_tier = _tier,
      membership_status = 'active',
      membership_expires_at = NULL,
      membership_trial_started_at = now(),
      membership_trial_expires_at = _expires_at,
      membership_trial_expired_at = NULL,
      membership_trial_tier = _tier
  WHERE id = _profile.id;

  RETURN _expires_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_membership_trial(public.membership_tier)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_membership_trial(public.membership_tier)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_application(
  _user_id uuid,
  _full_name text,
  _organisation_name text,
  _organisation_type public.org_type,
  _role_title text,
  _location text,
  _website_url text,
  _linkedin_url text,
  _phone text,
  _sdg_focus text[],
  _sectors text[],
  _bio text,
  _application_data jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status public.membership_status;
  _saved_application_data jsonb;
  _crm_stage text;
  _requested_tier public.membership_tier;
BEGIN
  IF auth.uid() IS DISTINCT FROM _user_id AND NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF COALESCE(_application_data->>'requested_tier', '') NOT IN (
    'observer',
    'contributor',
    'growth_partner',
    'anchor',
    'strategic_partner'
  ) THEN
    RAISE EXCEPTION 'select a valid membership tier';
  END IF;
  _requested_tier := (_application_data->>'requested_tier')::public.membership_tier;

  SELECT membership_status, application_data, crm_stage
  INTO _status, _saved_application_data, _crm_stage
  FROM public.profiles
  WHERE id = _user_id;

  IF _status IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF _status NOT IN ('pending', 'active')
     OR (
       _status = 'active'
       AND (
         _crm_stage <> 'applicant'
         OR NULLIF(_saved_application_data->>'submitted_at', '') IS NOT NULL
       )
     ) THEN
    RAISE EXCEPTION 'application already processed';
  END IF;
  IF NULLIF(trim(_full_name), '') IS NULL
     OR NULLIF(trim(_organisation_name), '') IS NULL
     OR _organisation_type IS NULL
     OR NULLIF(trim(_role_title), '') IS NULL
     OR NULLIF(trim(_location), '') IS NULL THEN
    RAISE EXCEPTION 'complete all required onboarding fields';
  END IF;

  UPDATE public.profiles SET
    full_name = COALESCE(NULLIF(_full_name, ''), full_name),
    organisation_name = COALESCE(NULLIF(_organisation_name, ''), organisation_name),
    organisation_type = COALESCE(_organisation_type, organisation_type),
    role_title = COALESCE(NULLIF(_role_title, ''), role_title),
    location = COALESCE(NULLIF(_location, ''), location),
    website_url = NULLIF(_website_url, ''),
    linkedin_url = NULLIF(_linkedin_url, ''),
    phone = NULLIF(_phone, ''),
    sdg_focus = COALESCE(_sdg_focus, sdg_focus),
    sectors = COALESCE(_sectors, sectors),
    bio = NULLIF(_bio, ''),
    application_data = COALESCE(_application_data, application_data),
    membership_tier = CASE
      WHEN _requested_tier = 'observer' THEN 'observer'::public.membership_tier
      ELSE membership_tier
    END,
    membership_expires_at = CASE
      WHEN _requested_tier = 'observer' THEN NULL
      ELSE membership_expires_at
    END,
    membership_status = 'active',
    approved_at = COALESCE(approved_at, now()),
    approved_by = NULL,
    crm_stage = 'applicant'
  WHERE id = _user_id;

  IF _requested_tier <> 'observer' THEN
    PERFORM public.start_membership_trial(_requested_tier);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.process_membership_trial_expirations()
RETURNS void
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  WITH expired_trials AS (
    UPDATE public.profiles
    SET membership_tier = 'observer',
        membership_status = 'active',
        membership_expires_at = NULL,
        membership_trial_expired_at = now()
    WHERE membership_trial_started_at IS NOT NULL
      AND membership_trial_expired_at IS NULL
      AND membership_trial_expires_at <= now()
      AND membership_expires_at IS NULL
      AND membership_tier = membership_trial_tier
    RETURNING id, membership_trial_expires_at
  )
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  SELECT
    expired.id,
    'membership_expiry',
    'Your free membership period has ended',
    format(
      'Your 3-month free membership period ended on %s. Your account has returned to the free Observer tier. To access a paid tier again, choose Upgrade and complete a manual Paystack payment. No card was stored and no automatic payment was made.',
      to_char(expired.membership_trial_expires_at, 'FMDD FMMonth YYYY')
    ),
    '/upgrade'
  FROM expired_trials AS expired;
$$;

REVOKE EXECUTE ON FUNCTION public.process_membership_trial_expirations()
  FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'membership-trial-expiration',
  '*/15 * * * *',
  'SELECT public.process_membership_trial_expirations()'
);