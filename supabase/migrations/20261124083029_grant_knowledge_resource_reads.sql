GRANT SELECT ON TABLE public.knowledge_resources TO authenticated, service_role;

GRANT SELECT (
	id,
	title,
	description,
	resource_type,
	community_of_practice,
	min_tier_required,
	cover_image_url,
	created_at
) ON TABLE public.knowledge_resources TO anon;