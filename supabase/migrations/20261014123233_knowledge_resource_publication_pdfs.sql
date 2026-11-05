INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-resource-pdfs',
  'knowledge-resource-pdfs',
  true,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "knowledge resource PDFs upload staff"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-resource-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.is_staff(auth.uid())
);

CREATE POLICY "knowledge resource PDFs delete staff"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'knowledge-resource-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.is_staff(auth.uid())
);