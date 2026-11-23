ALTER TABLE public.resource_purchases
	ALTER COLUMN user_id DROP NOT NULL,
	ADD COLUMN guest_email text;

ALTER TABLE public.resource_purchases
	ADD CONSTRAINT resource_purchases_user_or_guest_email_check
	CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL);

CREATE INDEX resource_purchases_guest_email_idx
	ON public.resource_purchases (lower(guest_email))
	WHERE guest_email IS NOT NULL;

GRANT EXECUTE ON FUNCTION public.increment_resource_download(uuid) TO service_role;