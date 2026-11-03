DROP POLICY IF EXISTS "knowledge read tier" ON public.knowledge_resources;
DROP POLICY IF EXISTS "knowledge read all authenticated" ON public.knowledge_resources;

CREATE POLICY "knowledge read all authenticated"
ON public.knowledge_resources
FOR SELECT
TO authenticated
USING (true);