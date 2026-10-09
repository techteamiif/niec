CREATE OR REPLACE FUNCTION public.submit_application(
  _user_id uuid,
  _full_name text,
  _organisation_name text,
  _organisation_type org_type,
  _role_title text,
  _location text,
  _website_url text,
  _linkedin_url text,
  _phone text,
  _sdg_focus text[],
  _sectors text[],
  _bio text,
  _application_data jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _status membership_status;
BEGIN
  SELECT membership_status INTO _status
  FROM public.profiles
  WHERE id = _user_id;

  IF _status IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF _status <> 'pending' THEN
    RAISE EXCEPTION 'application already processed';
  END IF;
  IF auth.uid() IS DISTINCT FROM _user_id AND NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NULLIF(trim(_full_name), '') IS NULL
     OR NULLIF(trim(_organisation_name), '') IS NULL
     OR _organisation_type IS NULL
     OR NULLIF(trim(_role_title), '') IS NULL
     OR NULLIF(trim(_location), '') IS NULL THEN
    RAISE EXCEPTION 'complete all required onboarding fields';
  END IF;

  UPDATE public.profiles SET
    full_name = COALESCE(NULLIF(_full_name, ''), full_name),
    organisation_name = COALESCE(NULLIF(_organisation_name, ''), organisation_name),
    organisation_type = COALESCE(_organisation_type, organisation_type),
    role_title = COALESCE(NULLIF(_role_title, ''), role_title),
    location = COALESCE(NULLIF(_location, ''), location),
    website_url = NULLIF(_website_url, ''),
    linkedin_url = NULLIF(_linkedin_url, ''),
    phone = NULLIF(_phone, ''),
    sdg_focus = COALESCE(_sdg_focus, sdg_focus),
    sectors = COALESCE(_sectors, sectors),
    bio = NULLIF(_bio, ''),
    application_data = COALESCE(_application_data, application_data),
    membership_status = 'active',
    approved_at = COALESCE(approved_at, now()),
    approved_by = NULL,
    crm_stage = 'applicant'
  WHERE id = _user_id;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  INSERT INTO public.notifications (recipient_id, type, title, message)
  VALUES (
    NEW.id,
    'welcome',
    'Welcome to NIEC',
    'Please complete your onboarding to activate your membership.'
  );
  RETURN NEW;
END
$$;

UPDATE public.profiles
SET membership_status = 'active',
    approved_at = COALESCE(approved_at, now()),
    approved_by = NULL
WHERE membership_status = 'pending'
  AND crm_stage = 'applicant';

UPDATE public.notifications
SET message = 'Please complete your onboarding to activate your membership.'
WHERE title = 'Welcome to NIEC'
  AND message = 'Your application is under review. You''ll be notified when an admin approves you.';
