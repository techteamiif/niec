DROP POLICY IF EXISTS "events staff write" ON public.events;

CREATE POLICY "events enterprise and staff insert" ON public.events
FOR INSERT TO authenticated
WITH CHECK (
  public.is_staff(auth.uid())
  OR (
    created_by = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
  )
);
