
CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND membership_status = 'active'
  )
$$;

DROP POLICY IF EXISTS "profiles self read" ON public.profiles;

CREATE POLICY "profiles self read" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.is_staff(auth.uid())
  OR (membership_status = 'active' AND public.is_active_member(auth.uid()))
);
