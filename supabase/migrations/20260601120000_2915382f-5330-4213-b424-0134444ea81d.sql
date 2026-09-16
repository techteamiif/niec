
-- 1. Admin audit log
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit staff read" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "audit staff insert" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND actor_id = auth.uid());

CREATE INDEX idx_audit_created ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_audit_target ON public.admin_audit_log (target_type, target_id);

-- 2. CRM private staff notes about members
CREATE TABLE public.member_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_notes TO authenticated;
GRANT ALL ON public.member_notes TO service_role;
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes staff read" ON public.member_notes
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "notes staff write" ON public.member_notes
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "notes staff update" ON public.member_notes
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "notes staff delete" ON public.member_notes
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_notes_updated_at BEFORE UPDATE ON public.member_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. CRM tags on profile (staff-only labels: e.g. VIP, funder, mentor)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crm_tags text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crm_stage text NOT NULL DEFAULT 'lead';
-- stages: lead, applicant, onboarding, active, nurture, at_risk, churned

CREATE INDEX IF NOT EXISTS idx_profiles_crm_stage ON public.profiles (crm_stage);
CREATE INDEX IF NOT EXISTS idx_profiles_crm_tags ON public.profiles USING GIN (crm_tags);
