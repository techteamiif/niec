ALTER TABLE public.profiles
  ADD COLUMN cover_image_url text;

GRANT SELECT (cover_image_url) ON public.profiles TO authenticated;