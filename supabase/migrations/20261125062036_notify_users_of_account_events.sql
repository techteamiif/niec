CREATE OR REPLACE FUNCTION public.notify_user_of_email_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id
    AND email IS DISTINCT FROM NEW.email;

  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  SELECT
    profile.id,
    'email_verified',
    'Your email has been verified',
    'Your NIEC Connect email address is confirmed. Sign in to continue your onboarding or access your account.',
    '/login'
  FROM public.profiles AS profile
  WHERE profile.id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_user_of_email_verification_trg ON auth.users;
CREATE TRIGGER notify_user_of_email_verification_trg
AFTER UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (
  (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  OR (
    OLD.email IS DISTINCT FROM NEW.email
    AND NEW.email_confirmed_at IS NOT NULL
  )
)
EXECUTE FUNCTION public.notify_user_of_email_verification();

REVOKE ALL ON FUNCTION public.notify_user_of_email_verification()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_user_of_onboarding_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (
    NEW.id,
    'onboarding_complete',
    'Your NIEC account setup is complete',
    'Thank you for completing your NIEC onboarding. Sign in to view your account and next steps.',
    '/dashboard'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_user_of_onboarding_completion_trg ON public.profiles;
CREATE TRIGGER notify_user_of_onboarding_completion_trg
AFTER UPDATE OF application_data ON public.profiles
FOR EACH ROW
WHEN (
  NULLIF(OLD.application_data->>'submitted_at', '') IS NULL
  AND NULLIF(NEW.application_data->>'submitted_at', '') IS NOT NULL
)
EXECUTE FUNCTION public.notify_user_of_onboarding_completion();

REVOKE ALL ON FUNCTION public.notify_user_of_onboarding_completion()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_user_of_membership_tier_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _message text;
BEGIN
  IF NEW.membership_trial_expired_at IS DISTINCT FROM OLD.membership_trial_expired_at
     AND NEW.membership_trial_expired_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  _message := format(
    'Your membership tier changed from %s to %s.',
    replace(OLD.membership_tier::text, '_', ' '),
    replace(NEW.membership_tier::text, '_', ' ')
  );

  IF NEW.membership_trial_started_at IS NOT NULL
     AND NEW.membership_trial_expired_at IS NULL
     AND NEW.membership_trial_expires_at > now()
     AND NEW.membership_expires_at IS NULL THEN
    _message := _message || format(
      ' Your 3-month free trial remains active through %s. No payment is due before then.',
      to_char(NEW.membership_trial_expires_at, 'FMDD FMMonth YYYY')
    );
  END IF;

  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (
    NEW.id,
    'membership_tier_changed',
    'Your membership tier changed',
    _message,
    '/upgrade'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_user_of_membership_tier_change_trg ON public.profiles;
CREATE TRIGGER notify_user_of_membership_tier_change_trg
AFTER UPDATE OF membership_tier ON public.profiles
FOR EACH ROW
WHEN (OLD.membership_tier IS DISTINCT FROM NEW.membership_tier)
EXECUTE FUNCTION public.notify_user_of_membership_tier_change();

REVOKE ALL ON FUNCTION public.notify_user_of_membership_tier_change()
  FROM PUBLIC, anon, authenticated;