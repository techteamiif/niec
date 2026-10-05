CREATE OR REPLACE FUNCTION public.notify_event_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text; _starts timestamptz;
BEGIN
  SELECT title, start_date INTO _title, _starts
  FROM public.events
  WHERE id = NEW.event_id;

  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (NEW.member_id, 'event_reminder',
          'You''re registered for ' || COALESCE(_title,'an event'),
          'Starts ' || to_char(_starts, 'FMDay, DD Mon YYYY HH24:MI'),
          '/events');
  RETURN NEW;
END $$;