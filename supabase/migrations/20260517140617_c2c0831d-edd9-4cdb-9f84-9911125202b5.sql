
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('member', 'admin', 'super_admin');
CREATE TYPE public.org_type AS ENUM ('investor','dfi','social_enterprise','government','foundation','accelerator','research','corporate','other');
CREATE TYPE public.membership_tier AS ENUM ('observer','contributor','growth_partner','anchor','strategic_partner');
CREATE TYPE public.membership_status AS ENUM ('pending','active','lapsed','suspended');
CREATE TYPE public.post_type AS ENUM ('discussion','opportunity','event','knowledge','announcement');
CREATE TYPE public.cop_type AS ENUM ('gender_inclusive','climate_green','data_measurement','policy_advocacy','digital_fintech','creative_economy','general');
CREATE TYPE public.post_visibility AS ENUM ('all_members','contributor_plus','growth_partner_plus','anchor_plus');
CREATE TYPE public.event_type AS ENUM ('convening','deal_room','cop_meeting','webinar','boot_camp','policy_roundtable');
CREATE TYPE public.registration_status AS ENUM ('registered','attended','cancelled');
CREATE TYPE public.instrument_type AS ENUM ('equity','debt','grant','blended','convertible_note','revenue_share');
CREATE TYPE public.deal_status AS ENUM ('open','under_review','matched','closed');
CREATE TYPE public.resource_type AS ENUM ('report','case_study','policy_brief','dataset','presentation','toolkit');
CREATE TYPE public.notification_type AS ENUM ('welcome','post_reply','event_reminder','deal_match','admin_message','tier_upgrade');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  organisation_name text DEFAULT '',
  organisation_type public.org_type DEFAULT 'other',
  role_title text DEFAULT '',
  membership_tier public.membership_tier NOT NULL DEFAULT 'observer',
  membership_status public.membership_status NOT NULL DEFAULT 'pending',
  avatar_url text,
  bio text,
  location text DEFAULT '',
  sdg_focus text[] DEFAULT '{}',
  sectors text[] DEFAULT '{}',
  linkedin_url text,
  website_url text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  engagement_score integer NOT NULL DEFAULT 0,
  last_active_at timestamptz NOT NULL DEFAULT now()
);

-- ============ USER ROLES (separate table for safe checks) ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.current_tier(_user_id uuid)
RETURNS public.membership_tier LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT membership_tier FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.tier_rank(_tier public.membership_tier)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _tier
    WHEN 'observer' THEN 1
    WHEN 'contributor' THEN 2
    WHEN 'growth_partner' THEN 3
    WHEN 'anchor' THEN 4
    WHEN 'strategic_partner' THEN 5
  END
$$;

-- ============ COMMUNITY POSTS ============
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  post_type public.post_type NOT NULL DEFAULT 'discussion',
  community_of_practice public.cop_type NOT NULL DEFAULT 'general',
  tags text[] DEFAULT '{}',
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  visibility public.post_visibility NOT NULL DEFAULT 'all_members',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ EVENTS ============
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_type public.event_type NOT NULL DEFAULT 'convening',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  location text DEFAULT '',
  is_virtual boolean NOT NULL DEFAULT false,
  virtual_link text,
  max_attendees integer,
  min_tier_required public.membership_tier NOT NULL DEFAULT 'observer',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.registration_status NOT NULL DEFAULT 'registered',
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, member_id)
);

-- ============ DEAL ROOM ============
CREATE TABLE public.deal_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  enterprise_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sector text DEFAULT '',
  ticket_size_min numeric DEFAULT 0,
  ticket_size_max numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  instrument_type public.instrument_type NOT NULL DEFAULT 'equity',
  sdg_alignment text[] DEFAULT '{}',
  status public.deal_status NOT NULL DEFAULT 'open',
  min_tier_required public.membership_tier NOT NULL DEFAULT 'growth_partner',
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deal_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deal_opportunities(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deal_id, investor_id)
);

-- ============ KNOWLEDGE ============
CREATE TABLE public.knowledge_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  resource_type public.resource_type NOT NULL DEFAULT 'report',
  file_url text NOT NULL DEFAULT '',
  community_of_practice public.cop_type NOT NULL DEFAULT 'general',
  min_tier_required public.membership_tier NOT NULL DEFAULT 'observer',
  downloads_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ COP MEMBERSHIPS ============
CREATE TABLE public.cop_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cop public.cop_type NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, cop)
);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ TRIGGERS ============
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  INSERT INTO public.notifications (recipient_id, type, title, message)
  VALUES (NEW.id, 'welcome', 'Welcome to NIEC',
          'Your application is under review. You''ll be notified when an admin approves you.');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at on posts
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER posts_touch BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- comments_count auto-maintain
CREATE OR REPLACE FUNCTION public.bump_comment_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER comments_count_trg
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.bump_comment_count();

-- ============ RLS ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cop_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- profiles: own row + active members visible to active members; staff full
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_staff(auth.uid())
       OR (membership_status = 'active' AND EXISTS (
            SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.membership_status = 'active')));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profiles staff insert" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "profiles staff delete" ON public.profiles FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

-- user_roles: user reads own; super_admin manages
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "roles super admin manage" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- community_posts: active members can read posts at their tier or below; staff all
CREATE POLICY "posts read" ON public.community_posts FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid()) OR (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND membership_status = 'active')
    AND (
      visibility = 'all_members'
      OR (visibility = 'contributor_plus'    AND public.tier_rank(public.current_tier(auth.uid())) >= 2)
      OR (visibility = 'growth_partner_plus' AND public.tier_rank(public.current_tier(auth.uid())) >= 3)
      OR (visibility = 'anchor_plus'         AND public.tier_rank(public.current_tier(auth.uid())) >= 4)
    )
  )
);
CREATE POLICY "posts insert own" ON public.community_posts FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid()
            AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND membership_status = 'active'));
CREATE POLICY "posts update own or staff" ON public.community_posts FOR UPDATE TO authenticated
USING (author_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "posts delete own or staff" ON public.community_posts FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.is_staff(auth.uid()));

-- comments
CREATE POLICY "comments read" ON public.comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id));
CREATE POLICY "comments insert own" ON public.comments FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments update own" ON public.comments FOR UPDATE TO authenticated
USING (author_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "comments delete own or staff" ON public.comments FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.is_staff(auth.uid()));

-- events: active members read; staff write
CREATE POLICY "events read" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events staff write" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "events staff update" ON public.events FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "events staff delete" ON public.events FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- registrations
CREATE POLICY "regs read" ON public.event_registrations FOR SELECT TO authenticated
USING (member_id = auth.uid() OR public.is_staff(auth.uid())
       OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND membership_status = 'active'));
CREATE POLICY "regs insert own" ON public.event_registrations FOR INSERT TO authenticated WITH CHECK (member_id = auth.uid());
CREATE POLICY "regs update own" ON public.event_registrations FOR UPDATE TO authenticated USING (member_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "regs delete own" ON public.event_registrations FOR DELETE TO authenticated USING (member_id = auth.uid() OR public.is_staff(auth.uid()));

-- deals: tier gating
CREATE POLICY "deals read tier" ON public.deal_opportunities FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR public.tier_rank(public.current_tier(auth.uid())) >= public.tier_rank(min_tier_required));
CREATE POLICY "deals staff write" ON public.deal_opportunities FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "deals staff update" ON public.deal_opportunities FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "deals staff delete" ON public.deal_opportunities FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "deal_interests read" ON public.deal_interests FOR SELECT TO authenticated
USING (investor_id = auth.uid() OR public.is_staff(auth.uid())
       OR public.tier_rank(public.current_tier(auth.uid())) >= 4);
CREATE POLICY "deal_interests insert own" ON public.deal_interests FOR INSERT TO authenticated
WITH CHECK (investor_id = auth.uid()
            AND public.tier_rank(public.current_tier(auth.uid())) >= 3);
CREATE POLICY "deal_interests delete own" ON public.deal_interests FOR DELETE TO authenticated USING (investor_id = auth.uid() OR public.is_staff(auth.uid()));

-- knowledge
CREATE POLICY "knowledge read tier" ON public.knowledge_resources FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR public.tier_rank(public.current_tier(auth.uid())) >= public.tier_rank(min_tier_required));
CREATE POLICY "knowledge staff write" ON public.knowledge_resources FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "knowledge staff update" ON public.knowledge_resources FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "knowledge staff delete" ON public.knowledge_resources FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- cop memberships
CREATE POLICY "cop read" ON public.cop_memberships FOR SELECT TO authenticated USING (true);
CREATE POLICY "cop insert own" ON public.cop_memberships FOR INSERT TO authenticated WITH CHECK (member_id = auth.uid());
CREATE POLICY "cop delete own" ON public.cop_memberships FOR DELETE TO authenticated USING (member_id = auth.uid() OR public.is_staff(auth.uid()));

-- notifications
CREATE POLICY "notif read own" ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "notif staff insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) OR recipient_id = auth.uid());
CREATE POLICY "notif delete own" ON public.notifications FOR DELETE TO authenticated USING (recipient_id = auth.uid() OR public.is_staff(auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
