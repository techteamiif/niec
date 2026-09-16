
-- tier_meets helper
CREATE OR REPLACE FUNCTION public.tier_meets(_user_id uuid, _required membership_tier)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.tier_rank(public.current_tier(_user_id)) >= public.tier_rank(_required)
$$;

-- get_tier_usage: cop_count, mentorship_this_month
CREATE OR REPLACE FUNCTION public.get_tier_usage(_user_id uuid)
RETURNS TABLE(cop_count int, mentorship_this_month int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*)::int FROM public.cop_memberships WHERE member_id = _user_id),
    (SELECT count(*)::int FROM public.mentorship_bookings
      WHERE requester_id = _user_id
        AND created_at >= date_trunc('month', now()))
$$;

-- Enforce CoP join cap
CREATE OR REPLACE FUNCTION public.enforce_cop_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tier membership_tier; _count int; _cap int;
BEGIN
  SELECT membership_tier INTO _tier FROM public.profiles WHERE id = NEW.member_id;
  IF _tier IS NULL THEN RETURN NEW; END IF;
  _cap := CASE _tier
    WHEN 'observer' THEN 0
    WHEN 'contributor' THEN 1
    WHEN 'growth_partner' THEN 3
    ELSE 999
  END;
  SELECT count(*) INTO _count FROM public.cop_memberships WHERE member_id = NEW.member_id;
  IF _count >= _cap THEN
    RAISE EXCEPTION 'Your tier (%) allows joining % Communities of Practice. Upgrade to join more.', _tier, _cap
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_cop_cap ON public.cop_memberships;
CREATE TRIGGER trg_enforce_cop_cap BEFORE INSERT ON public.cop_memberships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cop_cap();

-- Enforce mentorship monthly cap (requester side)
CREATE OR REPLACE FUNCTION public.enforce_mentorship_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tier membership_tier; _count int; _cap int;
BEGIN
  SELECT membership_tier INTO _tier FROM public.profiles WHERE id = NEW.requester_id;
  IF _tier IS NULL THEN RETURN NEW; END IF;
  _cap := CASE _tier
    WHEN 'observer' THEN 0
    WHEN 'contributor' THEN 1
    WHEN 'growth_partner' THEN 3
    ELSE 999
  END;
  SELECT count(*) INTO _count FROM public.mentorship_bookings
    WHERE requester_id = NEW.requester_id
      AND created_at >= date_trunc('month', now());
  IF _count >= _cap THEN
    RAISE EXCEPTION 'Your tier (%) allows % mentorship bookings per month. Upgrade to book more.', _tier, _cap
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_mentorship_cap ON public.mentorship_bookings;
CREATE TRIGGER trg_enforce_mentorship_cap BEFORE INSERT ON public.mentorship_bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_mentorship_cap();

-- Enforce event capacity
CREATE OR REPLACE FUNCTION public.enforce_event_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _max int; _count int;
BEGIN
  SELECT max_attendees INTO _max FROM public.events WHERE id = NEW.event_id;
  IF _max IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO _count FROM public.event_registrations WHERE event_id = NEW.event_id;
  IF _count >= _max THEN
    RAISE EXCEPTION 'This event is full (% attendees).', _max USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_event_capacity ON public.event_registrations;
CREATE TRIGGER trg_enforce_event_capacity BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_capacity();

-- Tier upgrade request → notify admins
CREATE OR REPLACE FUNCTION public.request_tier_upgrade(_requested membership_tier, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid; _name text; _current membership_tier;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT full_name, membership_tier INTO _name, _current FROM public.profiles WHERE id = _uid;
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  SELECT ur.user_id, 'admin_action',
    'Tier upgrade request',
    COALESCE(_name,'A member') || ' requested upgrade from ' || _current::text || ' to ' || _requested::text
      || COALESCE(E'\n\nNote: ' || _note, ''),
    '/admin'
  FROM public.user_roles ur
  WHERE ur.role IN ('admin','super_admin');
END $$;

GRANT EXECUTE ON FUNCTION public.tier_meets(uuid, membership_tier) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tier_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_tier_upgrade(membership_tier, text) TO authenticated;
