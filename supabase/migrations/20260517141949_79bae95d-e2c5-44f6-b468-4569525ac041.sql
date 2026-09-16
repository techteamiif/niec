
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS application_data jsonb NOT NULL DEFAULT '{}'::jsonb;
