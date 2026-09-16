
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
DECLARE _status membership_status; _joined timestamptz;
BEGIN
  SELECT membership_status, joined_at INTO _status, _joined FROM public.profiles WHERE id = _user_id;
  IF _status IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF _status <> 'pending' THEN RAISE EXCEPTION 'application already processed'; END IF;
  -- Allow within 15 minutes of profile creation, OR by the authenticated owner / staff.
  IF (now() - _joined) > interval '15 minutes'
     AND auth.uid() IS DISTINCT FROM _user_id
     AND NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
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
    crm_stage = 'applicant'
  WHERE id = _user_id;
END $$;
