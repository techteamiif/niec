
-- POST LIKES
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes read" ON public.post_likes;
DROP POLICY IF EXISTS "likes insert own" ON public.post_likes;
DROP POLICY IF EXISTS "likes delete own" ON public.post_likes;
CREATE POLICY "likes read" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes insert own" ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "likes delete own" ON public.post_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_like_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS post_likes_count_trigger ON public.post_likes;
CREATE TRIGGER post_likes_count_trigger
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_like_count();

-- DIRECT MESSAGES
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dm read own" ON public.direct_messages;
DROP POLICY IF EXISTS "dm insert as sender" ON public.direct_messages;
DROP POLICY IF EXISTS "dm update recipient" ON public.direct_messages;
CREATE POLICY "dm read own" ON public.direct_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "dm insert as sender" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "dm update recipient" ON public.direct_messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS dm_recipient_idx ON public.direct_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dm_sender_idx ON public.direct_messages (sender_id, created_at DESC);

-- RPC
CREATE OR REPLACE FUNCTION public.increment_resource_download(_resource_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.knowledge_resources SET downloads_count = downloads_count + 1 WHERE id = _resource_id;
$$;

-- AVATARS bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars upload own" ON storage.objects;
DROP POLICY IF EXISTS "avatars update own" ON storage.objects;
DROP POLICY IF EXISTS "avatars delete own" ON storage.objects;
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime (guarded)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed admin into all 6 CoPs
INSERT INTO public.cop_memberships (member_id, cop)
SELECT p.id, c.cop
FROM public.profiles p
CROSS JOIN (VALUES
  ('gender_inclusive'::cop_type),('climate_green'::cop_type),('data_measurement'::cop_type),
  ('policy_advocacy'::cop_type),('digital_fintech'::cop_type),('creative_economy'::cop_type)
) AS c(cop)
WHERE p.email = 'samuelaaaustin33@gmail.com'
ON CONFLICT DO NOTHING;
