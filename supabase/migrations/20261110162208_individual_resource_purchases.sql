ALTER TABLE public.events
	ADD COLUMN access_price_kobo integer CHECK (access_price_kobo IS NULL OR access_price_kobo > 0);

ALTER TABLE public.knowledge_resources
	ADD COLUMN access_price_kobo integer CHECK (access_price_kobo IS NULL OR access_price_kobo > 0),
	ADD CONSTRAINT knowledge_paid_resources_require_private_file
		CHECK (
			access_price_kobo IS NULL
			OR (file_url !~* '^https?://' AND executive_summary_url IS NULL)
		);

ALTER TABLE public.deal_opportunities
	ADD COLUMN access_price_kobo integer CHECK (access_price_kobo IS NULL OR access_price_kobo > 0);

GRANT SELECT (access_price_kobo) ON public.events TO authenticated, anon;
GRANT SELECT (access_price_kobo) ON public.deal_opportunities TO authenticated;
GRANT SELECT (access_price_kobo) ON public.knowledge_resources TO authenticated;

CREATE TABLE public.resource_purchases (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	resource_type text NOT NULL CHECK (resource_type IN ('event', 'knowledge', 'deal')),
	resource_id uuid NOT NULL,
	amount_kobo integer NOT NULL CHECK (amount_kobo > 0),
	currency text NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
	reference text NOT NULL UNIQUE,
	status text NOT NULL DEFAULT 'pending'
		CHECK (status IN ('pending', 'success', 'failed', 'abandoned', 'flagged')),
	metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamptz NOT NULL DEFAULT now(),
	paid_at timestamptz
);

CREATE INDEX resource_purchases_user_resource_status_idx
	ON public.resource_purchases (user_id, resource_type, resource_id, status);

ALTER TABLE public.resource_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.resource_purchases FROM anon, authenticated;
GRANT SELECT ON public.resource_purchases TO authenticated;
GRANT ALL ON public.resource_purchases TO service_role;

CREATE POLICY "Members view their own resource purchases"
	ON public.resource_purchases FOR SELECT TO authenticated
	USING (user_id = (SELECT auth.uid()) OR public.is_staff((SELECT auth.uid())));

CREATE OR REPLACE FUNCTION private.has_resource_purchase(
	_resource_type text,
	_resource_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.resource_purchases AS purchase
		WHERE purchase.user_id = (SELECT auth.uid())
			AND purchase.resource_type = _resource_type
			AND purchase.resource_id = _resource_id
			AND purchase.status = 'success'
	)
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_resource_purchase(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_resource_access(_resource_type text, _resource_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
	_min_tier public.membership_tier;
BEGIN
	IF auth.uid() IS NULL THEN
		RETURN false;
	END IF;

	IF _resource_type = 'event' THEN
		SELECT min_tier_required INTO _min_tier FROM public.events WHERE id = _resource_id;
	ELSIF _resource_type = 'knowledge' THEN
		SELECT min_tier_required INTO _min_tier FROM public.knowledge_resources WHERE id = _resource_id;
	ELSIF _resource_type = 'deal' THEN
		SELECT min_tier_required INTO _min_tier FROM public.deal_opportunities WHERE id = _resource_id;
	ELSE
		RETURN false;
	END IF;

	IF _min_tier IS NULL THEN
		RETURN false;
	END IF;

	RETURN public.is_staff(auth.uid())
		OR private.has_resource_purchase(_resource_type, _resource_id)
		OR (
			public.is_active_member(auth.uid())
			AND public.tier_rank(public.current_tier(auth.uid())) >= public.tier_rank(_min_tier)
		);
END;
$$;

REVOKE ALL ON FUNCTION public.has_resource_access(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_resource_access(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_event_virtual_link(_event_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
	_link text;
	_min membership_tier;
BEGIN
	SELECT virtual_link, min_tier_required
	INTO _link, _min
	FROM public.events
	WHERE id = _event_id;

	IF _link IS NULL THEN
		RETURN NULL;
	END IF;
	IF public.is_staff(auth.uid())
		 OR EXISTS (
			SELECT 1 FROM public.events
			WHERE id = _event_id AND created_by = auth.uid()
		 )
		 OR private.has_resource_purchase('event', _event_id)
		 OR (
			 public.is_active_member(auth.uid())
			 AND public.tier_rank(public.current_tier(auth.uid())) >= public.tier_rank(_min)
		 ) THEN
		RETURN _link;
	END IF;

	RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_event_registration_link(_event_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
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
	IF public.is_staff(auth.uid())
		 OR EXISTS (
			SELECT 1 FROM public.events
			WHERE id = _event_id AND created_by = auth.uid()
		 )
		 OR private.has_resource_purchase('event', _event_id)
		 OR (
			 public.is_active_member(auth.uid())
			 AND public.tier_rank(public.current_tier(auth.uid())) >= public.tier_rank(_min)
		 ) THEN
		RETURN _link;
	END IF;

	RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "event attendees insert own" ON public.event_attendees;
CREATE POLICY "event attendees insert own"
	ON public.event_attendees FOR INSERT TO authenticated
	WITH CHECK (
		member_id = (SELECT auth.uid())
		AND EXISTS (
			SELECT 1
			FROM public.events AS event
			WHERE event.id = event_attendees.event_id
				AND (
					private.has_resource_purchase('event', event.id)
					OR public.tier_rank(public.current_tier((SELECT auth.uid())))
						>= public.tier_rank(event.min_tier_required)
				)
		)
	);

DROP POLICY IF EXISTS "event attendees update own response" ON public.event_attendees;
CREATE POLICY "event attendees update own response"
	ON public.event_attendees FOR UPDATE TO authenticated
	USING (member_id = (SELECT auth.uid()))
	WITH CHECK (
		member_id = (SELECT auth.uid())
		AND (
			NOT attending
			OR EXISTS (
				SELECT 1
				FROM public.events AS event
				WHERE event.id = event_attendees.event_id
					AND (
						private.has_resource_purchase('event', event.id)
						OR public.tier_rank(public.current_tier((SELECT auth.uid())))
							>= public.tier_rank(event.min_tier_required)
					)
			)
		)
	);

DROP POLICY IF EXISTS "deals read tier" ON public.deal_opportunities;
CREATE POLICY "deals read tier"
	ON public.deal_opportunities FOR SELECT TO authenticated
	USING (
		public.is_staff((SELECT auth.uid()))
		OR public.tier_rank(public.current_tier((SELECT auth.uid())))
			>= public.tier_rank(min_tier_required)
		OR private.has_resource_purchase('deal', id)
	);

CREATE OR REPLACE FUNCTION public.get_deal_room_items()
RETURNS TABLE (
	id uuid,
	title text,
	enterprise_name text,
	sector text,
	status public.deal_status,
	category text,
	min_tier_required public.membership_tier,
	created_at timestamptz,
	access_price_kobo integer,
	can_access boolean,
	description text,
	currency text,
	ticket_size_min numeric,
	ticket_size_max numeric,
	instrument_type public.instrument_type
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
	SELECT
		deal.id,
		deal.title,
		deal.enterprise_name,
		deal.sector,
		deal.status,
		deal.category,
		deal.min_tier_required,
		deal.created_at,
		deal.access_price_kobo,
		access.can_access,
		CASE WHEN access.can_access THEN deal.description ELSE NULL END,
		CASE WHEN access.can_access THEN deal.currency ELSE NULL END,
		CASE WHEN access.can_access THEN deal.ticket_size_min ELSE NULL END,
		CASE WHEN access.can_access THEN deal.ticket_size_max ELSE NULL END,
		CASE WHEN access.can_access THEN deal.instrument_type ELSE NULL END
	FROM public.deal_opportunities AS deal
	CROSS JOIN LATERAL (
		SELECT
			public.is_staff((SELECT auth.uid()))
			OR (
				public.is_active_member((SELECT auth.uid()))
				AND public.tier_rank(public.current_tier((SELECT auth.uid())))
					>= public.tier_rank(deal.min_tier_required)
			)
			OR private.has_resource_purchase('deal', deal.id) AS can_access
	) AS access
	WHERE (SELECT auth.uid()) IS NOT NULL
		AND (
			access.can_access
			OR (deal.access_price_kobo IS NOT NULL AND deal.status = 'open')
		)
	ORDER BY deal.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_deal_room_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_deal_room_items() TO authenticated;

UPDATE public.knowledge_resources
SET file_url = regexp_replace(
	file_url,
	'^https?://[^/]+/storage/v1/object/public/knowledge-resource-pdfs/',
	''
)
WHERE file_url ~* '^https?://[^/]+/storage/v1/object/public/knowledge-resource-pdfs/';

DROP POLICY IF EXISTS "knowledge resource PDFs read entitled" ON storage.objects;
CREATE POLICY "knowledge resource PDFs read entitled"
	ON storage.objects FOR SELECT TO authenticated
	USING (
		bucket_id = 'knowledge-resource-pdfs'
		AND EXISTS (
			SELECT 1
			FROM public.knowledge_resources AS resource
			WHERE resource.file_url = storage.objects.name
				AND public.has_resource_access('knowledge', resource.id)
		)
	);

UPDATE storage.buckets
SET public = false
WHERE id = 'knowledge-resource-pdfs';
