
-- CoP leadership roles
CREATE TYPE public.cop_role AS ENUM ('chair', 'co_chair', 'steward');

CREATE TABLE public.cop_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cop cop_type NOT NULL,
  user_id uuid NOT NULL,
  role cop_role NOT NULL DEFAULT 'steward',
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cop, user_id, role)
);

GRANT SELECT ON public.cop_roles TO authenticated;
GRANT ALL ON public.cop_roles TO service_role;
ALTER TABLE public.cop_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cop_roles read" ON public.cop_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "cop_roles staff manage" ON public.cop_roles FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.is_cop_chair(_user_id uuid, _cop cop_type)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cop_roles
    WHERE user_id = _user_id AND cop = _cop AND role IN ('chair','co_chair')
  )
$$;

-- Working groups inside a CoP
CREATE TYPE public.working_group_status AS ENUM ('active','closed','archived');

CREATE TABLE public.working_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cop cop_type NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  deliverable text NOT NULL DEFAULT '',
  status working_group_status NOT NULL DEFAULT 'active',
  lead_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.working_groups TO authenticated;
GRANT ALL ON public.working_groups TO service_role;
ALTER TABLE public.working_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wg read" ON public.working_groups FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "wg insert chair/staff" ON public.working_groups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_staff(auth.uid()) OR public.is_cop_chair(auth.uid(), cop)));
CREATE POLICY "wg update chair/staff/lead" ON public.working_groups FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR public.is_cop_chair(auth.uid(), cop) OR lead_id = auth.uid());
CREATE POLICY "wg delete chair/staff" ON public.working_groups FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()) OR public.is_cop_chair(auth.uid(), cop));

CREATE TRIGGER wg_touch BEFORE UPDATE ON public.working_groups
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.working_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.working_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.working_group_members TO authenticated;
GRANT ALL ON public.working_group_members TO service_role;
ALTER TABLE public.working_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wgm read" ON public.working_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "wgm join self" ON public.working_group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "wgm leave self or staff" ON public.working_group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Polls
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cop cop_type NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  multi_select boolean NOT NULL DEFAULT false,
  closes_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT ALL ON public.polls TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polls read" ON public.polls FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "polls insert chair/staff" ON public.polls FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_staff(auth.uid()) OR public.is_cop_chair(auth.uid(), cop)));
CREATE POLICY "polls update chair/staff" ON public.polls FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR public.is_cop_chair(auth.uid(), cop));
CREATE POLICY "polls delete chair/staff" ON public.polls FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()) OR public.is_cop_chair(auth.uid(), cop));

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id, option_index)
);

GRANT SELECT, INSERT, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes read" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "votes insert self" ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "votes delete self" ON public.poll_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Member badges
CREATE TABLE public.member_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_key text NOT NULL,
  label text NOT NULL,
  cop cop_type,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  awarded_by uuid,
  UNIQUE (user_id, badge_key, cop)
);

GRANT SELECT ON public.member_badges TO authenticated;
GRANT ALL ON public.member_badges TO service_role;
ALTER TABLE public.member_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges read" ON public.member_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "badges staff manage" ON public.member_badges FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Engagement scoring triggers
CREATE OR REPLACE FUNCTION public.bump_engagement(_user_id uuid, _delta int)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET engagement_score = GREATEST(engagement_score + _delta, 0), last_active_at = now() WHERE id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.engagement_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM public.bump_engagement(NEW.author_id, 5);
  ELSIF TG_OP = 'DELETE' THEN PERFORM public.bump_engagement(OLD.author_id, -5);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER engagement_posts AFTER INSERT OR DELETE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.engagement_on_post();

CREATE OR REPLACE FUNCTION public.engagement_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM public.bump_engagement(NEW.author_id, 2);
  ELSIF TG_OP = 'DELETE' THEN PERFORM public.bump_engagement(OLD.author_id, -2);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER engagement_comments AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.engagement_on_comment();

CREATE OR REPLACE FUNCTION public.engagement_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT author_id INTO _author FROM public.community_posts WHERE id = NEW.post_id;
    IF _author IS NOT NULL AND _author <> NEW.user_id THEN PERFORM public.bump_engagement(_author, 1); END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT author_id INTO _author FROM public.community_posts WHERE id = OLD.post_id;
    IF _author IS NOT NULL AND _author <> OLD.user_id THEN PERFORM public.bump_engagement(_author, -1); END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER engagement_likes AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.engagement_on_like();

CREATE OR REPLACE FUNCTION public.engagement_on_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM public.bump_engagement(NEW.member_id, 3);
  ELSIF TG_OP = 'DELETE' THEN PERFORM public.bump_engagement(OLD.member_id, -3);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER engagement_regs AFTER INSERT OR DELETE ON public.event_registrations
FOR EACH ROW EXECUTE FUNCTION public.engagement_on_registration();

-- Pinned posts per CoP: add column
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS pinned_in_cop boolean NOT NULL DEFAULT false;

-- Leaderboard view (top contributors per CoP, last 30 days)
CREATE OR REPLACE VIEW public.cop_leaderboard AS
SELECT
  cm.cop,
  cm.member_id AS user_id,
  p.full_name,
  p.avatar_url,
  p.engagement_score,
  COALESCE((SELECT COUNT(*) FROM public.community_posts cp WHERE cp.author_id = cm.member_id AND cp.community_of_practice = cm.cop AND cp.created_at > now() - interval '30 days'), 0) AS posts_30d
FROM public.cop_memberships cm
JOIN public.profiles p ON p.id = cm.member_id;

GRANT SELECT ON public.cop_leaderboard TO authenticated;
