ALTER TABLE public.event_attendees
ADD COLUMN attending boolean NOT NULL DEFAULT true;

GRANT UPDATE (attending) ON public.event_attendees TO authenticated;

CREATE POLICY "event attendees update own response"
ON public.event_attendees FOR UPDATE TO authenticated
USING (member_id = auth.uid())
WITH CHECK (
  member_id = auth.uid()
  AND (
    NOT attending
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_attendees.event_id
        AND public.tier_rank(public.current_tier(auth.uid()))
          >= public.tier_rank(events.min_tier_required)
    )
  )
);

CREATE OR REPLACE FUNCTION private.maintain_event_attendee_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.event_attendee_counts (event_id, attendee_count)
    VALUES (NEW.event_id, CASE WHEN NEW.attending THEN 1 ELSE 0 END)
    ON CONFLICT (event_id) DO UPDATE
      SET attendee_count = event_attendee_counts.attendee_count
        + CASE WHEN NEW.attending THEN 1 ELSE 0 END;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.attending THEN
      UPDATE public.event_attendee_counts
      SET attendee_count = GREATEST(attendee_count - 1, 0)
      WHERE event_id = OLD.event_id;
    END IF;
    RETURN OLD;
  ELSIF NEW.attending IS DISTINCT FROM OLD.attending THEN
    UPDATE public.event_attendee_counts
    SET attendee_count = GREATEST(
      attendee_count + CASE WHEN NEW.attending THEN 1 ELSE -1 END,
      0
    )
    WHERE event_id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER maintain_event_attendee_count ON public.event_attendees;

CREATE TRIGGER maintain_event_attendee_count
AFTER INSERT OR DELETE OR UPDATE OF attending ON public.event_attendees
FOR EACH ROW EXECUTE FUNCTION private.maintain_event_attendee_count();
