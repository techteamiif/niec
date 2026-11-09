ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_expires_at date;

GRANT SELECT (membership_expires_at) ON public.profiles TO authenticated;

ALTER TYPE public.notification_type
  ADD VALUE IF NOT EXISTS 'membership_expiry';

CREATE OR REPLACE FUNCTION public.membership_expiry_for(_paid_at timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  WITH payment_date AS (
    SELECT (_paid_at AT TIME ZONE 'UTC')::date AS paid_on
  )
  SELECT make_date(
    EXTRACT(YEAR FROM paid_on)::integer
      + CASE
          WHEN paid_on < make_date(EXTRACT(YEAR FROM paid_on)::integer, 11, 1) THEN 0
          ELSE 1
        END,
    11,
    1
  )
  FROM payment_date
$$;

REVOKE EXECUTE ON FUNCTION public.membership_expiry_for(timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_tier(_user_id uuid)
RETURNS public.membership_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN profile.membership_status = 'active'
      AND (profile.membership_expires_at IS NULL OR profile.membership_expires_at >= current_date)
      THEN profile.membership_tier
    ELSE 'observer'::public.membership_tier
  END
  FROM public.profiles AS profile
  WHERE profile.id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = _user_id
      AND profile.membership_status = 'active'
      AND (profile.membership_expires_at IS NULL OR profile.membership_expires_at >= current_date)
  )
$$;

WITH latest_successful_payment AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    COALESCE(paid_at, created_at) AS paid_at
  FROM public.membership_payments
  WHERE status = 'success'
    AND user_id IS NOT NULL
  ORDER BY user_id, COALESCE(paid_at, created_at) DESC
)
UPDATE public.profiles AS profile
SET membership_expires_at = public.membership_expiry_for(payment.paid_at)
FROM latest_successful_payment AS payment
WHERE profile.id = payment.user_id
  AND profile.membership_tier <> 'observer'
  AND profile.membership_expires_at IS NULL;

CREATE TABLE public.membership_expiry_reminders (
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at date NOT NULL,
  days_before integer NOT NULL CHECK (days_before IN (0, 3, 7, 14, 30, 60)),
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, expires_at, days_before)
);

ALTER TABLE public.membership_expiry_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.membership_expiry_reminders FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.process_membership_expiry_reminders()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  member record;
  reminder_days integer;
  inserted_count integer;
  expiry_label text;
BEGIN
  UPDATE public.profiles
  SET membership_status = 'lapsed'
  WHERE membership_status = 'active'
    AND membership_tier <> 'observer'
    AND membership_expires_at < current_date;

  FOR member IN
    SELECT id, full_name, membership_expires_at
    FROM public.profiles
    WHERE membership_status = 'active'
      AND membership_tier <> 'observer'
      AND membership_expires_at BETWEEN current_date AND current_date + 60
  LOOP
    FOR reminder_days IN
      SELECT unnest(ARRAY[60, 30, 14, 7, 3, 0])
    LOOP
      IF member.membership_expires_at <> current_date + reminder_days THEN
        CONTINUE;
      END IF;

      INSERT INTO public.membership_expiry_reminders (member_id, expires_at, days_before)
      VALUES (member.id, member.membership_expires_at, reminder_days)
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS inserted_count = ROW_COUNT;

      IF inserted_count > 0 THEN
        expiry_label := to_char(member.membership_expires_at, 'FMDD FMMonth YYYY');
        INSERT INTO public.notifications (recipient_id, type, title, message, link)
        VALUES (
          member.id,
          'membership_expiry',
          CASE
            WHEN reminder_days = 0 THEN 'Your NIEC membership expires today'
            ELSE format('Your NIEC membership expires in %s days', reminder_days)
          END,
          CASE
            WHEN reminder_days = 0
              THEN format('Your membership expires today (%s). Renew now to keep your membership active.', expiry_label)
            ELSE format('Your membership expires on %s. Renew now to keep your membership active.', expiry_label)
          END,
          '/upgrade'
        );
      END IF;
    END LOOP;
  END LOOP;
END
$$;

REVOKE EXECUTE ON FUNCTION public.process_membership_expiry_reminders() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'membership-expiry-reminders',
  '0 0 * * *',
  'SELECT public.process_membership_expiry_reminders()'
);