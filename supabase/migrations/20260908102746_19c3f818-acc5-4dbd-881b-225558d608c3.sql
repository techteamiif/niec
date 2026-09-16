CREATE TABLE public.membership_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  organisation_name text NOT NULL,
  organisation_type text,
  role_title text,
  location text,
  website_url text,
  linkedin_url text,
  requested_tier public.membership_tier NOT NULL DEFAULT 'observer',
  tier_label text NOT NULL DEFAULT '',
  amount_naira numeric NOT NULL DEFAULT 0,
  payment_required boolean NOT NULL DEFAULT false,
  payment_status text NOT NULL DEFAULT 'not_required',
  payment_reference text,
  sdg_focus text[] NOT NULL DEFAULT '{}',
  sectors text[] NOT NULL DEFAULT '{}',
  goals text[] NOT NULL DEFAULT '{}',
  contributions text[] NOT NULL DEFAULT '{}',
  events_interested text[] NOT NULL DEFAULT '{}',
  event_role text,
  heard_from text,
  comm_preference text,
  aum_range text,
  investment_stage text,
  statement text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'submitted',
  review_note text NOT NULL DEFAULT '',
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.membership_applications TO authenticated;
GRANT UPDATE ON public.membership_applications TO authenticated;
GRANT ALL ON public.membership_applications TO service_role;

ALTER TABLE public.membership_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view their own application"
  ON public.membership_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can view all applications"
  ON public.membership_applications FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update applications"
  ON public.membership_applications FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER membership_applications_touch
  BEFORE UPDATE ON public.membership_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_membership_applications_created_at ON public.membership_applications (created_at DESC);
CREATE INDEX idx_membership_applications_email ON public.membership_applications (email);