CREATE TABLE public.event_attendees (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, member_id)
);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_attendees FROM anon;
GRANT SELECT, INSERT, DELETE ON public.event_attendees TO authenticated;
GRANT ALL ON public.event_attendees TO service_role;

CREATE POLICY "event attendees read own or event managers"
ON public.event_attendees FOR SELECT TO authenticated
USING (
  member_id = auth.uid()
  OR public.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_attendees.event_id
      AND events.created_by = auth.uid()
  )
);

CREATE POLICY "event attendees insert own"
ON public.event_attendees FOR INSERT TO authenticated
WITH CHECK (
  member_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_attendees.event_id
      AND public.tier_rank(public.current_tier(auth.uid()))
        >= public.tier_rank(events.min_tier_required)
  )
);

CREATE POLICY "event attendees delete own or event managers"
ON public.event_attendees FOR DELETE TO authenticated
USING (
  member_id = auth.uid()
  OR public.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_attendees.event_id
      AND events.created_by = auth.uid()
  )
);

CREATE TABLE public.event_attendee_counts (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  attendee_count integer NOT NULL DEFAULT 0 CHECK (attendee_count >= 0)
);

ALTER TABLE public.event_attendee_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_attendee_counts FROM anon;
GRANT SELECT ON public.event_attendee_counts TO authenticated;
GRANT ALL ON public.event_attendee_counts TO service_role;

CREATE POLICY "event attendee counts read"
ON public.event_attendee_counts FOR SELECT TO authenticated
USING (true);

INSERT INTO public.event_attendee_counts (event_id, attendee_count)
SELECT events.id, count(event_attendees.member_id)::integer
FROM public.events
LEFT JOIN public.event_attendees ON event_attendees.event_id = events.id
GROUP BY events.id;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.maintain_event_attendee_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.event_attendee_counts (event_id, attendee_count)
    VALUES (NEW.event_id, 1)
    ON CONFLICT (event_id) DO UPDATE
      SET attendee_count = event_attendee_counts.attendee_count + 1;
    RETURN NEW;
  END IF;

  UPDATE public.event_attendee_counts
  SET attendee_count = GREATEST(attendee_count - 1, 0)
  WHERE event_id = OLD.event_id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION private.maintain_event_attendee_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER maintain_event_attendee_count
AFTER INSERT OR DELETE ON public.event_attendees
FOR EACH ROW EXECUTE FUNCTION private.maintain_event_attendee_count();