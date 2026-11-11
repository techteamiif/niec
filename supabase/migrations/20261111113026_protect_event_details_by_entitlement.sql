REVOKE SELECT ON TABLE public.events FROM PUBLIC, anon, authenticated;
REVOKE SELECT (
	description,
	schedule,
	location,
	is_virtual,
	virtual_link,
	registration_link,
	max_attendees
) ON TABLE public.events FROM PUBLIC, anon, authenticated;

GRANT SELECT (
	id,
	title,
	event_type,
	start_date,
	end_date,
	min_tier_required,
	created_by,
	is_paid,
	access_price_kobo,
	image_url,
	community_of_practice
) ON TABLE public.events TO authenticated;

CREATE OR REPLACE FUNCTION public.get_event_details(_event_id uuid)
RETURNS SETOF public.events
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
	SELECT event.*
	FROM public.events AS event
	WHERE event.id = _event_id
		AND auth.uid() IS NOT NULL
		AND (
			public.is_staff(auth.uid())
			OR event.created_by = auth.uid()
			OR public.has_resource_access('event', event.id)
		)
$$;

REVOKE ALL ON FUNCTION public.get_event_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_details(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_staff_events()
RETURNS SETOF public.events
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT event.*
	FROM public.events AS event
	WHERE public.is_staff(auth.uid())
	ORDER BY event.start_date DESC
$$;

REVOKE ALL ON FUNCTION public.get_staff_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_events() TO authenticated;
