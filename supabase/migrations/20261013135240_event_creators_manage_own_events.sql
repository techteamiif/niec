DROP POLICY IF EXISTS "events creator or staff update" ON public.events;
CREATE POLICY "events creator or staff update"
ON public.events FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.is_staff(auth.uid()))
WITH CHECK (created_by = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "events creator or staff delete" ON public.events;
CREATE POLICY "events creator or staff delete"
ON public.events FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.is_staff(auth.uid()));