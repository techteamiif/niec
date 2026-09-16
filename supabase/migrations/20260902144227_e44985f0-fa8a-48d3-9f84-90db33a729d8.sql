CREATE TABLE public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text,
  tier membership_tier not null,
  amount_kobo integer not null,
  currency text not null default 'NGN',
  reference text not null unique,
  status text not null default 'pending',
  provider text not null default 'paystack',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

GRANT SELECT ON public.membership_payments TO authenticated;
GRANT ALL ON public.membership_payments TO service_role;

ALTER TABLE public.membership_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view their own payments"
ON public.membership_payments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE INDEX idx_membership_payments_user ON public.membership_payments(user_id);