REVOKE SELECT ON TABLE public.events FROM PUBLIC, anon;
REVOKE SELECT (
  description,
  location,
  is_virtual,
  virtual_link,
  max_attendees,
  created_by,
  created_at,
  registration_link,
  schedule,
  community_of_practice,
  access_price_kobo
) ON TABLE public.events FROM PUBLIC, anon;

GRANT SELECT (
  id,
  title,
  event_type,
  start_date,
  end_date,
  min_tier_required,
  is_paid,
  image_url
) ON public.events TO anon;

DROP POLICY IF EXISTS "public event catalog previews" ON public.events;
CREATE POLICY "public event catalog previews"
ON public.events
FOR SELECT
TO anon
USING (end_date >= now());

REVOKE SELECT ON TABLE public.knowledge_resources FROM PUBLIC, anon;
REVOKE SELECT (
  file_url,
  executive_summary_url,
  downloads_count,
  uploaded_by,
  access_price_kobo
) ON TABLE public.knowledge_resources FROM PUBLIC, anon;

GRANT SELECT (
  id,
  title,
  description,
  resource_type,
  community_of_practice,
  min_tier_required,
  cover_image_url,
  created_at
) ON public.knowledge_resources TO anon;

DROP POLICY IF EXISTS "public knowledge resource previews" ON public.knowledge_resources;
CREATE POLICY "public knowledge resource previews"
ON public.knowledge_resources
FOR SELECT
TO anon
USING (true);