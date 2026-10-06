ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'onsite';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'online';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'hybrid';

ALTER TABLE public.events
  ADD COLUMN registration_link text,
  ADD COLUMN is_paid boolean NOT NULL DEFAULT false;

GRANT SELECT (is_paid) ON public.events TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_event_registration_link(_event_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link text;
  _min membership_tier;
BEGIN
  SELECT registration_link, min_tier_required
  INTO _link, _min
  FROM public.events
  WHERE id = _event_id;

  IF _link IS NULL THEN
    RETURN NULL;
  END IF;

  IF public.is_staff(auth.uid()) THEN
    RETURN _link;
  END IF;

  IF public.is_active_member(auth.uid())
     AND public.tier_rank(public.current_tier(auth.uid())) >= public.tier_rank(_min) THEN
    RETURN _link;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_event_registration_link(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_registration_link(uuid) TO authenticated;
