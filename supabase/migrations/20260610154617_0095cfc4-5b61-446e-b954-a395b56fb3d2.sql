
DROP POLICY IF EXISTS "comments insert own" ON public.comments;
CREATE POLICY "comments insert own" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "cop insert own" ON public.cop_memberships;
CREATE POLICY "cop insert own" ON public.cop_memberships
  FOR INSERT TO authenticated
  WITH CHECK (member_id = auth.uid() AND public.is_active_member(auth.uid()));

REVOKE SELECT ON public.events FROM anon, authenticated;
GRANT SELECT (
  id, title, description, event_type, start_date, end_date,
  location, is_virtual, max_attendees, min_tier_required,
  created_by, created_at
) ON public.events TO authenticated;
GRANT SELECT (
  id, title, description, event_type, start_date, end_date,
  location, is_virtual, max_attendees, min_tier_required,
  created_by, created_at
) ON public.events TO anon;
GRANT SELECT ON public.events TO service_role;

CREATE OR REPLACE FUNCTION public.get_event_virtual_link(_event_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _link text; _min membership_tier;
BEGIN
  SELECT virtual_link, min_tier_required INTO _link, _min
  FROM public.events WHERE id = _event_id;
  IF _link IS NULL THEN RETURN NULL; END IF;
  IF public.is_staff(auth.uid()) THEN RETURN _link; END IF;
  IF public.is_active_member(auth.uid())
     AND public.tier_rank(public.current_tier(auth.uid())) >= public.tier_rank(_min) THEN
    RETURN _link;
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_event_virtual_link(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_virtual_link(uuid) TO authenticated;

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, full_name, avatar_url, organisation_name, organisation_type,
  role_title, membership_tier, membership_status, bio, location,
  sdg_focus, sectors, linkedin_url, website_url, joined_at,
  approved_at, last_active_at
) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.profiles WHERE id = auth.uid() $$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.profiles ORDER BY joined_at DESC LIMIT 2000;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_profiles(_ids uuid[])
RETURNS SETOF public.profiles
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.profiles WHERE id = ANY(_ids);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_get_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_profiles(uuid[]) TO authenticated;

DROP POLICY IF EXISTS "avatars public read" ON storage.objects;

REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, text, text, cop_type) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_engagement(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.badge_on_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.badge_on_cop_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.badge_on_resource() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.engagement_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.engagement_on_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.engagement_on_post() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.engagement_on_registration() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_booking_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_booking_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_rfc_status_change() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.tier_rank(membership_tier) SET search_path = public;
