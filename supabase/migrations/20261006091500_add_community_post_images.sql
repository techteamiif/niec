ALTER TABLE public.community_posts
ADD COLUMN image_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-post-images',
  'community-post-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "community post images upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "community post images delete own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'community-post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
