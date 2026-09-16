
-- 1) Notify post author on new comment
CREATE OR REPLACE FUNCTION public.notify_comment_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author uuid; _title text; _name text;
BEGIN
  SELECT author_id, LEFT(COALESCE(title, content), 80) INTO _author, _title FROM public.community_posts WHERE id = NEW.post_id;
  IF _author IS NULL OR _author = NEW.author_id THEN RETURN NEW; END IF;
  SELECT full_name INTO _name FROM public.profiles WHERE id = NEW.author_id;
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (_author, 'post_reply', 'New comment on your post',
          COALESCE(_name,'A member') || ' commented: ' || LEFT(NEW.body, 140),
          '/community');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_comment_on_post_trg ON public.comments;
CREATE TRIGGER notify_comment_on_post_trg AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_comment_on_post();

-- 2) Notify post author on new like
CREATE OR REPLACE FUNCTION public.notify_like_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author uuid; _name text;
BEGIN
  SELECT author_id INTO _author FROM public.community_posts WHERE id = NEW.post_id;
  IF _author IS NULL OR _author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT full_name INTO _name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (_author, 'post_reply', 'Someone liked your post',
          COALESCE(_name,'A member') || ' liked your post.',
          '/community');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_like_on_post_trg ON public.post_likes;
CREATE TRIGGER notify_like_on_post_trg AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_like_on_post();

-- 3) Notify DM recipient
CREATE OR REPLACE FUNCTION public.notify_direct_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  SELECT full_name INTO _name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (NEW.recipient_id, 'admin_message',
          'New message from ' || COALESCE(_name,'a member'),
          LEFT(NEW.content, 140),
          '/messages?to=' || NEW.sender_id::text);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_direct_message_trg ON public.direct_messages;
CREATE TRIGGER notify_direct_message_trg AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_direct_message();

-- 4) Notify RFC author on new comment
CREATE OR REPLACE FUNCTION public.notify_rfc_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author uuid; _title text; _cop text; _name text;
BEGIN
  SELECT author_id, title, cop::text INTO _author, _title, _cop FROM public.rfcs WHERE id = NEW.rfc_id;
  IF _author IS NULL OR _author = NEW.author_id THEN RETURN NEW; END IF;
  SELECT full_name INTO _name FROM public.profiles WHERE id = NEW.author_id;
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (_author, 'post_reply',
          'New comment on your proposal',
          COALESCE(_name,'A member') || ' commented on "' || COALESCE(_title,'your RFC') || '"',
          '/cops/' || _cop);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_rfc_comment_trg ON public.rfc_comments;
CREATE TRIGGER notify_rfc_comment_trg AFTER INSERT ON public.rfc_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_rfc_comment();

-- 5) Event registration confirmation for the registrant
CREATE OR REPLACE FUNCTION public.notify_event_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text; _starts timestamptz;
BEGIN
  SELECT title, starts_at INTO _title, _starts FROM public.events WHERE id = NEW.event_id;
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (NEW.member_id, 'event_reminder',
          'You''re registered for ' || COALESCE(_title,'an event'),
          'Starts ' || to_char(_starts, 'FMDay, DD Mon YYYY HH24:MI'),
          '/events');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_event_registration_trg ON public.event_registrations;
CREATE TRIGGER notify_event_registration_trg AFTER INSERT ON public.event_registrations
FOR EACH ROW EXECUTE FUNCTION public.notify_event_registration();

-- 6) Deal interest → notify submitter
CREATE OR REPLACE FUNCTION public.notify_deal_interest()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _submitter uuid; _title text;
BEGIN
  SELECT submitted_by, enterprise_name INTO _submitter, _title FROM public.deal_opportunities WHERE id = NEW.deal_id;
  IF _submitter IS NULL OR _submitter = NEW.investor_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (_submitter, 'deal_match',
          'New investor interest',
          'A member expressed interest in ' || COALESCE(_title,'your deal'),
          '/deal-room');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_deal_interest_trg ON public.deal_interests;
CREATE TRIGGER notify_deal_interest_trg AFTER INSERT ON public.deal_interests
FOR EACH ROW EXECUTE FUNCTION public.notify_deal_interest();

-- 7) Staff broadcast RPC
CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(
  _recipient_ids uuid[], _title text, _message text, _link text DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _recipient_ids IS NULL OR array_length(_recipient_ids,1) IS NULL THEN RETURN 0; END IF;
  IF COALESCE(btrim(_title),'') = '' THEN RAISE EXCEPTION 'title required'; END IF;
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  SELECT r, 'admin_message', _title, COALESCE(_message,''), NULLIF(_link,'')
  FROM unnest(_recipient_ids) AS r;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.admin_broadcast_notification(uuid[], text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notification(uuid[], text, text, text) TO authenticated;
