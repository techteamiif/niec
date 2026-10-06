CREATE OR REPLACE FUNCTION public.notify_comment_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author uuid; _title text; _name text;
BEGIN
  SELECT author_id, LEFT(COALESCE(title, content), 80)
  INTO _author, _title
  FROM public.community_posts
  WHERE id = NEW.post_id;

  IF _author IS NULL OR _author = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO _name
  FROM public.profiles
  WHERE id = NEW.author_id;

  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (
    _author,
    'post_reply',
    'New comment on your post',
    COALESCE(_name, 'A member') || ' commented: ' || LEFT(NEW.content, 140),
    '/community'
  );

  RETURN NEW;
END $$;