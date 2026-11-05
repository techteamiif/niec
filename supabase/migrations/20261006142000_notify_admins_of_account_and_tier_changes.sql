CREATE OR REPLACE FUNCTION public.notify_admins_of_account_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  SELECT
    roles.user_id,
    'admin_message',
    'New user registration',
    COALESCE(NULLIF(NEW.full_name, ''), 'A new user')
      || ' created an account (' || NEW.email || ').',
    '/admin'
  FROM public.user_roles AS roles
  WHERE roles.role IN ('admin', 'super_admin');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_admins_of_account_creation_trg ON public.profiles;
CREATE TRIGGER notify_admins_of_account_creation_trg
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_of_account_creation();
REVOKE ALL ON FUNCTION public.notify_admins_of_account_creation() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_admins_of_tier_upgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.tier_rank(NEW.membership_tier) <= public.tier_rank(OLD.membership_tier) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  SELECT
    roles.user_id,
    'admin_message',
    'Member upgraded their account',
    COALESCE(NULLIF(NEW.full_name, ''), 'A member')
      || ' (' || NEW.email || ') upgraded from '
      || replace(OLD.membership_tier::text, '_', ' ')
      || ' to ' || replace(NEW.membership_tier::text, '_', ' ') || '.',
    '/admin'
  FROM public.user_roles AS roles
  WHERE roles.role IN ('admin', 'super_admin');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_admins_of_tier_upgrade_trg ON public.profiles;
CREATE TRIGGER notify_admins_of_tier_upgrade_trg
AFTER UPDATE OF membership_tier ON public.profiles
FOR EACH ROW
WHEN (OLD.membership_tier IS DISTINCT FROM NEW.membership_tier)
EXECUTE FUNCTION public.notify_admins_of_tier_upgrade();
REVOKE ALL ON FUNCTION public.notify_admins_of_tier_upgrade() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_registered_members_of_event_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  SELECT
    registrations.member_id,
    'event_reminder',
    'Event details updated: ' || NEW.title,
    'The details for "' || NEW.title || '" have changed. Please review the updated event information.',
    '/event/' || NEW.id::text
  FROM public.event_registrations AS registrations
  WHERE registrations.event_id = NEW.id
    AND registrations.status = 'registered';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_registered_members_of_event_update_trg ON public.events;
CREATE TRIGGER notify_registered_members_of_event_update_trg
AFTER UPDATE ON public.events
FOR EACH ROW
WHEN (
  OLD.title IS DISTINCT FROM NEW.title
  OR OLD.description IS DISTINCT FROM NEW.description
  OR OLD.event_type IS DISTINCT FROM NEW.event_type
  OR OLD.start_date IS DISTINCT FROM NEW.start_date
  OR OLD.end_date IS DISTINCT FROM NEW.end_date
  OR OLD.location IS DISTINCT FROM NEW.location
  OR OLD.is_virtual IS DISTINCT FROM NEW.is_virtual
  OR OLD.virtual_link IS DISTINCT FROM NEW.virtual_link
  OR OLD.registration_link IS DISTINCT FROM NEW.registration_link
  OR OLD.is_paid IS DISTINCT FROM NEW.is_paid
  OR OLD.min_tier_required IS DISTINCT FROM NEW.min_tier_required
  OR OLD.max_attendees IS DISTINCT FROM NEW.max_attendees
)
EXECUTE FUNCTION public.notify_registered_members_of_event_update();
REVOKE ALL ON FUNCTION public.notify_registered_members_of_event_update() FROM PUBLIC, anon, authenticated;
