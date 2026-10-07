ALTER TABLE public.events
ADD COLUMN schedule jsonb NOT NULL DEFAULT '[]'::jsonb;
