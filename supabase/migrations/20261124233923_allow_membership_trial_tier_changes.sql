CREATE OR REPLACE FUNCTION public.change_membership_trial_tier(_tier public.membership_tier)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _profile public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
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
    RAISE EXCEPTION 'only active members can change their trial tier';
  END IF;
  IF _profile.membership_trial_started_at IS NULL
     OR _profile.membership_trial_expired_at IS NOT NULL
     OR _profile.membership_expires_at IS NOT NULL
     OR _profile.membership_trial_expires_at IS NULL
     OR _profile.membership_trial_expires_at <= now()
     OR _profile.membership_trial_tier IS NULL
     OR _profile.membership_tier IS DISTINCT FROM _profile.membership_trial_tier THEN
    RAISE EXCEPTION 'an active free membership trial is required to change tiers';
  END IF;

  IF _profile.membership_tier IS DISTINCT FROM _tier THEN
    UPDATE public.profiles
    SET membership_tier = _tier,
        membership_trial_tier = _tier
    WHERE id = _profile.id;
  END IF;

  RETURN _profile.membership_trial_expires_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.change_membership_trial_tier(public.membership_tier)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_membership_trial_tier(public.membership_tier)
  TO authenticated;