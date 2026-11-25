ALTER TYPE public.notification_type
  ADD VALUE IF NOT EXISTS 'email_verified';

ALTER TYPE public.notification_type
  ADD VALUE IF NOT EXISTS 'onboarding_complete';

ALTER TYPE public.notification_type
  ADD VALUE IF NOT EXISTS 'membership_tier_changed';