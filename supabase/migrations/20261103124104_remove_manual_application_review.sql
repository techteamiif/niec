DROP POLICY IF EXISTS "Staff can update applications"
  ON public.membership_applications;

REVOKE UPDATE ON TABLE public.membership_applications FROM authenticated;