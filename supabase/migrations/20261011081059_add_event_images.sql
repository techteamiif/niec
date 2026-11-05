ALTER TABLE public.events
ADD COLUMN image_url text;

GRANT SELECT (image_url) ON public.events TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "event images upload eligible creators" ON storage.objects;
CREATE POLICY "event images upload eligible creators"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    public.is_staff(auth.uid())
    OR (
      public.is_active_member(auth.uid())
      AND public.tier_rank(public.current_tier(auth.uid()))
        >= public.tier_rank('contributor'::public.membership_tier)
    )
  )
);

DROP POLICY IF EXISTS "event images delete own" ON storage.objects;
CREATE POLICY "event images delete own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);