CREATE OR REPLACE FUNCTION public.prevent_member_membership_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND NOT public.is_staff(auth.uid())
     AND (
       NEW.membership_tier IS DISTINCT FROM OLD.membership_tier
       OR NEW.membership_status IS DISTINCT FROM OLD.membership_status
       OR NEW.membership_expires_at IS DISTINCT FROM OLD.membership_expires_at
     ) THEN
    RAISE EXCEPTION 'membership fields can only be changed by staff or trusted server operations'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_prevent_member_membership_field_updates
BEFORE UPDATE OF membership_tier, membership_status, membership_expires_at
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_member_membership_field_updates();