
UPDATE public.profiles
SET membership_status = 'active',
    membership_tier = 'strategic_partner',
    approved_at = now(),
    approved_by = id,
    full_name = COALESCE(NULLIF(full_name, ''), 'Samuel Austin'),
    organisation_name = COALESCE(NULLIF(organisation_name, ''), 'Impact Investors Foundation'),
    organisation_type = COALESCE(organisation_type, 'foundation'),
    role_title = COALESCE(NULLIF(role_title, ''), 'Administrator')
WHERE email = 'samuelaaaustin33@gmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM public.profiles WHERE email = 'samuelaaaustin33@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles WHERE email = 'samuelaaaustin33@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
