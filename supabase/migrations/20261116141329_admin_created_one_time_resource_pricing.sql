UPDATE public.events AS event
SET access_price_kobo = NULL
WHERE event.access_price_kobo IS NOT NULL
	AND NOT EXISTS (
		SELECT 1
		FROM public.user_roles AS creator_role
		WHERE creator_role.user_id = event.created_by
			AND creator_role.role IN ('admin', 'super_admin')
	);

UPDATE public.knowledge_resources AS resource
SET access_price_kobo = NULL
WHERE resource.access_price_kobo IS NOT NULL
	AND NOT EXISTS (
		SELECT 1
		FROM public.user_roles AS creator_role
		WHERE creator_role.user_id = resource.uploaded_by
			AND creator_role.role IN ('admin', 'super_admin')
	);

UPDATE public.deal_opportunities AS deal
SET access_price_kobo = NULL
WHERE deal.access_price_kobo IS NOT NULL
	AND NOT EXISTS (
		SELECT 1
		FROM public.user_roles AS creator_role
		WHERE creator_role.user_id = deal.submitted_by
			AND creator_role.role IN ('admin', 'super_admin')
	);

CREATE OR REPLACE FUNCTION private.enforce_admin_created_one_time_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	_creator_id uuid;
	_is_admin_creator boolean;
BEGIN
	IF NEW.access_price_kobo IS NULL THEN
		RETURN NEW;
	END IF;

	_creator_id := NULLIF(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid;
	_is_admin_creator := _creator_id IS NOT NULL AND EXISTS (
		SELECT 1
		FROM public.user_roles AS creator_role
		WHERE creator_role.user_id = _creator_id
			AND creator_role.role IN ('admin', 'super_admin')
	);

	IF TG_OP = 'UPDATE'
		AND NEW.access_price_kobo IS NOT DISTINCT FROM OLD.access_price_kobo THEN
		IF NOT _is_admin_creator THEN
			NEW.access_price_kobo := NULL;
		END IF;
		RETURN NEW;
	END IF;

	IF (SELECT auth.uid()) IS NULL OR NOT _is_admin_creator THEN
		RAISE EXCEPTION 'One-time pricing is only available for admin-created resources.'
			USING ERRCODE = '42501';
	END IF;

	RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_admin_created_one_time_price() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER events_require_admin_creator_for_one_time_price
BEFORE INSERT OR UPDATE OF access_price_kobo, created_by
ON public.events
FOR EACH ROW
EXECUTE FUNCTION private.enforce_admin_created_one_time_price('created_by');

CREATE TRIGGER knowledge_require_admin_creator_for_one_time_price
BEFORE INSERT OR UPDATE OF access_price_kobo, uploaded_by
ON public.knowledge_resources
FOR EACH ROW
EXECUTE FUNCTION private.enforce_admin_created_one_time_price('uploaded_by');

CREATE TRIGGER deals_require_admin_creator_for_one_time_price
BEFORE INSERT OR UPDATE OF access_price_kobo, submitted_by
ON public.deal_opportunities
FOR EACH ROW
EXECUTE FUNCTION private.enforce_admin_created_one_time_price('submitted_by');