
-- ============== ENUMS ==============
CREATE TYPE public.rfc_status AS ENUM ('open','accepted','parked','rejected');
CREATE TYPE public.rfc_reaction AS ENUM ('support','concern','watching');
CREATE TYPE public.mentorship_status AS ENUM ('requested','confirmed','completed','declined','cancelled');

-- ============== RFCs ==============
CREATE TABLE public.rfcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cop public.cop_type NOT NULL,
  author_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  status public.rfc_status NOT NULL DEFAULT 'open',
  decided_by uuid,
  decided_at timestamptz,
  decision_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfcs TO authenticated;
GRANT ALL ON public.rfcs TO service_role;
ALTER TABLE public.rfcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfcs read" ON public.rfcs FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "rfcs insert active" ON public.rfcs FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "rfcs update author/chair/staff" ON public.rfcs FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_staff(auth.uid()) OR public.is_cop_chair(auth.uid(), cop));
CREATE POLICY "rfcs delete author/staff" ON public.rfcs FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TRIGGER rfcs_touch BEFORE UPDATE ON public.rfcs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.rfc_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfc_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction public.rfc_reaction NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfc_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfc_reactions TO authenticated;
GRANT ALL ON public.rfc_reactions TO service_role;
ALTER TABLE public.rfc_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfcr read" ON public.rfc_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rfcr insert self" ON public.rfc_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "rfcr update self" ON public.rfc_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "rfcr delete self" ON public.rfc_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.rfc_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfc_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfc_comments TO authenticated;
GRANT ALL ON public.rfc_comments TO service_role;
ALTER TABLE public.rfc_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfcc read" ON public.rfc_comments FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "rfcc insert self" ON public.rfc_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "rfcc delete own/staff" ON public.rfc_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_staff(auth.uid()));

-- ============== MENTORSHIP ==============
CREATE TABLE public.mentorship_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL UNIQUE,
  topics text[] NOT NULL DEFAULT '{}',
  cops public.cop_type[] NOT NULL DEFAULT '{}',
  capacity_per_month int NOT NULL DEFAULT 2,
  availability text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorship_offers TO authenticated;
GRANT ALL ON public.mentorship_offers TO service_role;
ALTER TABLE public.mentorship_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers read" ON public.mentorship_offers FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "offers manage self" ON public.mentorship_offers FOR ALL TO authenticated
  USING (mentor_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (mentor_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TRIGGER offers_touch BEFORE UPDATE ON public.mentorship_offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.mentorship_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  topic text NOT NULL,
  message text NOT NULL DEFAULT '',
  proposed_time text NOT NULL DEFAULT '',
  status public.mentorship_status NOT NULL DEFAULT 'requested',
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorship_bookings TO authenticated;
GRANT ALL ON public.mentorship_bookings TO service_role;
ALTER TABLE public.mentorship_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings read parties" ON public.mentorship_bookings FOR SELECT TO authenticated
  USING (mentor_id = auth.uid() OR requester_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "bookings insert requester" ON public.mentorship_bookings FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "bookings update parties" ON public.mentorship_bookings FOR UPDATE TO authenticated
  USING (mentor_id = auth.uid() OR requester_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "bookings delete parties" ON public.mentorship_bookings FOR DELETE TO authenticated
  USING (mentor_id = auth.uid() OR requester_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TRIGGER bookings_touch BEFORE UPDATE ON public.mentorship_bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== BADGE AUTO-AWARDS ==============
CREATE OR REPLACE FUNCTION public.award_badge(_user_id uuid, _key text, _label text, _cop public.cop_type DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.member_badges (user_id, badge_key, label, cop)
  SELECT _user_id, _key, _label, _cop
  WHERE NOT EXISTS (
    SELECT 1 FROM public.member_badges
    WHERE user_id = _user_id AND badge_key = _key AND COALESCE(cop::text,'') = COALESCE(_cop::text,'')
  );
END $$;

-- Convenor badge on cop_roles
CREATE OR REPLACE FUNCTION public.badge_on_cop_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('chair','co_chair') THEN
    PERFORM public.award_badge(NEW.user_id, 'convenor', 'Convenor', NEW.cop);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER cop_roles_award_convenor
AFTER INSERT ON public.cop_roles
FOR EACH ROW EXECUTE FUNCTION public.badge_on_cop_role();

-- Author badge on knowledge_resources insert
CREATE OR REPLACE FUNCTION public.badge_on_resource()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.uploaded_by IS NOT NULL THEN
    PERFORM public.award_badge(NEW.uploaded_by, 'author', 'Author');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER resources_award_author
AFTER INSERT ON public.knowledge_resources
FOR EACH ROW EXECUTE FUNCTION public.badge_on_resource();

-- Mentor badge + engagement on booking completion
CREATE OR REPLACE FUNCTION public.badge_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.award_badge(NEW.mentor_id, 'mentor', 'Mentor');
    PERFORM public.bump_engagement(NEW.mentor_id, 5);
    PERFORM public.bump_engagement(NEW.requester_id, 2);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER bookings_award_mentor
AFTER UPDATE ON public.mentorship_bookings
FOR EACH ROW EXECUTE FUNCTION public.badge_on_booking();

-- Engagement bump + system note when RFC accepted
CREATE OR REPLACE FUNCTION public.on_rfc_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    PERFORM public.bump_engagement(NEW.author_id, 10);
    INSERT INTO public.notifications (recipient_id, type, title, message, link)
    VALUES (NEW.author_id, 'admin_action', 'Your proposal was accepted',
            'The CoP accepted: ' || NEW.title, '/cops/' || NEW.cop::text);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER rfcs_status_change
AFTER UPDATE ON public.rfcs
FOR EACH ROW EXECUTE FUNCTION public.on_rfc_status_change();

-- Notification on new mentorship booking (to mentor)
CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (NEW.mentor_id, 'admin_action', 'New mentorship request',
          'Topic: ' || NEW.topic, '/mentorship');
  RETURN NEW;
END $$;

CREATE TRIGGER booking_notify_mentor
AFTER INSERT ON public.mentorship_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_created();

-- Notification to requester on status change
CREATE OR REPLACE FUNCTION public.notify_booking_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO public.notifications (recipient_id, type, title, message, link)
    VALUES (NEW.requester_id, 'admin_action', 'Mentorship update',
            'Your request is now: ' || NEW.status::text, '/mentorship');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER booking_notify_status
AFTER UPDATE ON public.mentorship_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status();
