GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.membership_payments TO service_role;
GRANT UPDATE (membership_tier) ON TABLE public.profiles TO service_role;