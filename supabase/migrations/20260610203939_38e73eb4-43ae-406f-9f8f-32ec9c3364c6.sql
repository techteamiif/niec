
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
  SELECT membership_status INTO _status FROM public.profiles WHERE id = _user_id;
  IF _status IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF _status <> 'pending' THEN
    RAISE EXCEPTION 'application already processed';
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

REVOKE ALL ON FUNCTION public.submit_application(uuid, text, text, org_type, text, text, text, text, text, text[], text[], text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_application(uuid, text, text, org_type, text, text, text, text, text, text[], text[], text, jsonb) TO anon, authenticated;
