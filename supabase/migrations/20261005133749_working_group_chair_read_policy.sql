DROP POLICY IF EXISTS "wg read" ON public.working_groups;

CREATE POLICY "wg read" ON public.working_groups
FOR SELECT TO authenticated
USING (
  public.is_active_member(auth.uid())
  OR public.is_staff(auth.uid())
  OR public.is_cop_chair(auth.uid(), cop)
);