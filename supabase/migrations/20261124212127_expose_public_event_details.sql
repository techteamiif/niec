GRANT SELECT (
  id,
  title,
  description,
  event_type,
  start_date,
  end_date,
  location,
  is_virtual,
  max_attendees,
  min_tier_required,
  is_paid,
  access_price_kobo,
  image_url,
  schedule,
  community_of_practice
) ON TABLE public.events TO anon;