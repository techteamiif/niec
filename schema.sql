


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'member',
    'admin',
    'super_admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."cop_role" AS ENUM (
    'chair',
    'co_chair',
    'steward'
);


ALTER TYPE "public"."cop_role" OWNER TO "postgres";


CREATE TYPE "public"."cop_type" AS ENUM (
    'giis-inclusive-impact',
    'climate-green-finance',
    'niiric',
    'policy-acii',
    'capital-deals',
    'eso-collaborative',
    'general'
);


ALTER TYPE "public"."cop_type" OWNER TO "postgres";


CREATE TYPE "public"."deal_status" AS ENUM (
    'open',
    'under_review',
    'matched',
    'closed'
);


ALTER TYPE "public"."deal_status" OWNER TO "postgres";


CREATE TYPE "public"."event_type" AS ENUM (
    'convening',
    'deal_room',
    'cop_meeting',
    'webinar',
    'boot_camp',
    'policy_roundtable'
);


ALTER TYPE "public"."event_type" OWNER TO "postgres";


CREATE TYPE "public"."instrument_type" AS ENUM (
    'equity',
    'debt',
    'grant',
    'blended',
    'convertible_note',
    'revenue_share'
);


ALTER TYPE "public"."instrument_type" OWNER TO "postgres";


CREATE TYPE "public"."membership_status" AS ENUM (
    'pending',
    'active',
    'lapsed',
    'suspended'
);


ALTER TYPE "public"."membership_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_tier" AS ENUM (
    'observer',
    'contributor',
    'growth_partner',
    'anchor',
    'strategic_partner'
);


ALTER TYPE "public"."membership_tier" OWNER TO "postgres";


CREATE TYPE "public"."mentorship_status" AS ENUM (
    'requested',
    'confirmed',
    'completed',
    'declined',
    'cancelled'
);


ALTER TYPE "public"."mentorship_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'welcome',
    'post_reply',
    'event_reminder',
    'deal_match',
    'admin_message',
    'tier_upgrade'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."org_type" AS ENUM (
    'investor',
    'dfi',
    'social_enterprise',
    'government',
    'foundation',
    'accelerator',
    'research',
    'corporate',
    'other'
);


ALTER TYPE "public"."org_type" OWNER TO "postgres";


CREATE TYPE "public"."post_type" AS ENUM (
    'discussion',
    'opportunity',
    'event',
    'knowledge',
    'announcement'
);


ALTER TYPE "public"."post_type" OWNER TO "postgres";


CREATE TYPE "public"."post_visibility" AS ENUM (
    'all_members',
    'contributor_plus',
    'growth_partner_plus',
    'anchor_plus'
);


ALTER TYPE "public"."post_visibility" OWNER TO "postgres";


CREATE TYPE "public"."registration_status" AS ENUM (
    'registered',
    'attended',
    'cancelled'
);


ALTER TYPE "public"."registration_status" OWNER TO "postgres";


CREATE TYPE "public"."resource_type" AS ENUM (
    'report',
    'case_study',
    'policy_brief',
    'dataset',
    'presentation',
    'toolkit'
);


ALTER TYPE "public"."resource_type" OWNER TO "postgres";


CREATE TYPE "public"."rfc_reaction" AS ENUM (
    'support',
    'concern',
    'watching'
);


ALTER TYPE "public"."rfc_reaction" OWNER TO "postgres";


CREATE TYPE "public"."rfc_status" AS ENUM (
    'open',
    'accepted',
    'parked',
    'rejected'
);


ALTER TYPE "public"."rfc_status" OWNER TO "postgres";


CREATE TYPE "public"."working_group_status" AS ENUM (
    'active',
    'closed',
    'archived'
);


ALTER TYPE "public"."working_group_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_broadcast_notification"("_recipient_ids" "uuid"[], "_title" "text", "_message" "text", "_link" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."admin_broadcast_notification"("_recipient_ids" "uuid"[], "_title" "text", "_message" "text", "_link" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" NOT NULL,
    "organisation_name" "text" DEFAULT ''::"text",
    "organisation_type" "public"."org_type" DEFAULT 'other'::"public"."org_type",
    "role_title" "text" DEFAULT ''::"text",
    "membership_tier" "public"."membership_tier" DEFAULT 'observer'::"public"."membership_tier" NOT NULL,
    "membership_status" "public"."membership_status" DEFAULT 'pending'::"public"."membership_status" NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "location" "text" DEFAULT ''::"text",
    "sdg_focus" "text"[] DEFAULT '{}'::"text"[],
    "sectors" "text"[] DEFAULT '{}'::"text"[],
    "linkedin_url" "text",
    "website_url" "text",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "engagement_score" integer DEFAULT 0 NOT NULL,
    "last_active_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" "text",
    "application_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "crm_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "crm_stage" "text" DEFAULT 'lead'::"text" NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_profiles"("_ids" "uuid"[]) RETURNS SETOF "public"."profiles"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.profiles WHERE id = ANY(_ids);
END $$;


ALTER FUNCTION "public"."admin_get_profiles"("_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_profiles"() RETURNS SETOF "public"."profiles"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.profiles ORDER BY joined_at DESC LIMIT 2000;
END $$;


ALTER FUNCTION "public"."admin_list_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_badge"("_user_id" "uuid", "_key" "text", "_label" "text", "_cop" "public"."cop_type" DEFAULT NULL::"public"."cop_type") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.member_badges (user_id, badge_key, label, cop)
  SELECT _user_id, _key, _label, _cop
  WHERE NOT EXISTS (
    SELECT 1 FROM public.member_badges
    WHERE user_id = _user_id AND badge_key = _key AND COALESCE(cop::text,'') = COALESCE(_cop::text,'')
  );
END $$;


ALTER FUNCTION "public"."award_badge"("_user_id" "uuid", "_key" "text", "_label" "text", "_cop" "public"."cop_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."badge_on_booking"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.award_badge(NEW.mentor_id, 'mentor', 'Mentor');
    PERFORM public.bump_engagement(NEW.mentor_id, 5);
    PERFORM public.bump_engagement(NEW.requester_id, 2);
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."badge_on_booking"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."badge_on_cop_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.role IN ('chair','co_chair') THEN
    PERFORM public.award_badge(NEW.user_id, 'convenor', 'Convenor', NEW.cop);
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."badge_on_cop_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."badge_on_resource"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.uploaded_by IS NOT NULL THEN
    PERFORM public.award_badge(NEW.uploaded_by, 'author', 'Author');
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."badge_on_resource"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_comment_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."bump_comment_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_engagement"("_user_id" "uuid", "_delta" integer) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.profiles SET engagement_score = GREATEST(engagement_score + _delta, 0), last_active_at = now() WHERE id = _user_id;
$$;


ALTER FUNCTION "public"."bump_engagement"("_user_id" "uuid", "_delta" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_like_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."bump_like_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_tier"("_user_id" "uuid") RETURNS "public"."membership_tier"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT membership_tier FROM public.profiles WHERE id = _user_id
$$;


ALTER FUNCTION "public"."current_tier"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_cop_cap"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE _tier membership_tier; _count int; _cap int;
BEGIN
  SELECT membership_tier INTO _tier FROM public.profiles WHERE id = NEW.member_id;
  IF _tier IS NULL THEN RETURN NEW; END IF;
  _cap := CASE _tier
    WHEN 'observer' THEN 0
    WHEN 'contributor' THEN 1
    WHEN 'growth_partner' THEN 3
    ELSE 999
  END;
  SELECT count(*) INTO _count FROM public.cop_memberships WHERE member_id = NEW.member_id;
  IF _count >= _cap THEN
    RAISE EXCEPTION 'Your tier (%) allows joining % Communities of Practice. Upgrade to join more.', _tier, _cap
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."enforce_cop_cap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_event_capacity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE _max int; _count int;
BEGIN
  SELECT max_attendees INTO _max FROM public.events WHERE id = NEW.event_id;
  IF _max IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO _count FROM public.event_registrations WHERE event_id = NEW.event_id;
  IF _count >= _max THEN
    RAISE EXCEPTION 'This event is full (% attendees).', _max USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."enforce_event_capacity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_mentorship_cap"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE _tier membership_tier; _count int; _cap int;
BEGIN
  SELECT membership_tier INTO _tier FROM public.profiles WHERE id = NEW.requester_id;
  IF _tier IS NULL THEN RETURN NEW; END IF;
  _cap := CASE _tier
    WHEN 'observer' THEN 0
    WHEN 'contributor' THEN 1
    WHEN 'growth_partner' THEN 3
    ELSE 999
  END;
  SELECT count(*) INTO _count FROM public.mentorship_bookings
    WHERE requester_id = NEW.requester_id
      AND created_at >= date_trunc('month', now());
  IF _count >= _cap THEN
    RAISE EXCEPTION 'Your tier (%) allows % mentorship bookings per month. Upgrade to book more.', _tier, _cap
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."enforce_mentorship_cap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."engagement_on_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM public.bump_engagement(NEW.author_id, 2);
  ELSIF TG_OP = 'DELETE' THEN PERFORM public.bump_engagement(OLD.author_id, -2);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;


ALTER FUNCTION "public"."engagement_on_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."engagement_on_like"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE _author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT author_id INTO _author FROM public.community_posts WHERE id = NEW.post_id;
    IF _author IS NOT NULL AND _author <> NEW.user_id THEN PERFORM public.bump_engagement(_author, 1); END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT author_id INTO _author FROM public.community_posts WHERE id = OLD.post_id;
    IF _author IS NOT NULL AND _author <> OLD.user_id THEN PERFORM public.bump_engagement(_author, -1); END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;


ALTER FUNCTION "public"."engagement_on_like"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."engagement_on_post"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM public.bump_engagement(NEW.author_id, 5);
  ELSIF TG_OP = 'DELETE' THEN PERFORM public.bump_engagement(OLD.author_id, -5);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;


ALTER FUNCTION "public"."engagement_on_post"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."engagement_on_registration"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM public.bump_engagement(NEW.member_id, 3);
  ELSIF TG_OP = 'DELETE' THEN PERFORM public.bump_engagement(OLD.member_id, -3);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;


ALTER FUNCTION "public"."engagement_on_registration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_event_virtual_link"("_event_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE _link text; _min membership_tier;
BEGIN
  SELECT virtual_link, min_tier_required INTO _link, _min
  FROM public.events WHERE id = _event_id;
  IF _link IS NULL THEN RETURN NULL; END IF;
  IF public.is_staff(auth.uid()) THEN RETURN _link; END IF;
  IF public.is_active_member(auth.uid())
     AND public.tier_rank(public.current_tier(auth.uid())) >= public.tier_rank(_min) THEN
    RETURN _link;
  END IF;
  RETURN NULL;
END $$;


ALTER FUNCTION "public"."get_event_virtual_link"("_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_profile"() RETURNS SETOF "public"."profiles"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT * FROM public.profiles WHERE id = auth.uid() $$;


ALTER FUNCTION "public"."get_my_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tier_usage"("_user_id" "uuid") RETURNS TABLE("cop_count" integer, "mentorship_this_month" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    (SELECT count(*)::int FROM public.cop_memberships WHERE member_id = _user_id),
    (SELECT count(*)::int FROM public.mentorship_bookings
      WHERE requester_id = _user_id
        AND created_at >= date_trunc('month', now()))
$$;


ALTER FUNCTION "public"."get_tier_usage"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  INSERT INTO public.notifications (recipient_id, type, title, message)
  VALUES (NEW.id, 'welcome', 'Welcome to NIEC',
          'Your application is under review. You''ll be notified when an admin approves you.');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_resource_download"("_resource_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.knowledge_resources SET downloads_count = downloads_count + 1 WHERE id = _resource_id;
$$;


ALTER FUNCTION "public"."increment_resource_download"("_resource_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_member"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND membership_status = 'active'
  )
$$;


ALTER FUNCTION "public"."is_active_member"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_cop_chair"("_user_id" "uuid", "_cop" "public"."cop_type") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cop_roles
    WHERE user_id = _user_id AND cop = _cop AND role IN ('chair','co_chair')
  )
$$;


ALTER FUNCTION "public"."is_cop_chair"("_user_id" "uuid", "_cop" "public"."cop_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin')
  )
$$;


ALTER FUNCTION "public"."is_staff"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_booking_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  VALUES (NEW.mentor_id, 'admin_action', 'New mentorship request',
          'Topic: ' || NEW.topic, '/mentorship');
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notify_booking_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_booking_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO public.notifications (recipient_id, type, title, message, link)
    VALUES (NEW.requester_id, 'admin_action', 'Mentorship update',
            'Your request is now: ' || NEW.status::text, '/mentorship');
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."notify_booking_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_comment_on_post"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."notify_comment_on_post"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_deal_interest"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."notify_deal_interest"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_direct_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."notify_direct_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_event_registration"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."notify_event_registration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_like_on_post"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."notify_like_on_post"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_rfc_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."notify_rfc_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_rfc_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    PERFORM public.bump_engagement(NEW.author_id, 10);
    INSERT INTO public.notifications (recipient_id, type, title, message, link)
    VALUES (NEW.author_id, 'admin_action', 'Your proposal was accepted',
            'The CoP accepted: ' || NEW.title, '/cops/' || NEW.cop::text);
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."on_rfc_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_tier_upgrade"("_requested" "public"."membership_tier", "_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE _uid uuid; _name text; _current membership_tier;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT full_name, membership_tier INTO _name, _current FROM public.profiles WHERE id = _uid;
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  SELECT ur.user_id, 'admin_action',
    'Tier upgrade request',
    COALESCE(_name,'A member') || ' requested upgrade from ' || _current::text || ' to ' || _requested::text
      || COALESCE(E'\n\nNote: ' || _note, ''),
    '/admin'
  FROM public.user_roles ur
  WHERE ur.role IN ('admin','super_admin');
END $$;


ALTER FUNCTION "public"."request_tier_upgrade"("_requested" "public"."membership_tier", "_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_application"("_user_id" "uuid", "_full_name" "text", "_organisation_name" "text", "_organisation_type" "public"."org_type", "_role_title" "text", "_location" "text", "_website_url" "text", "_linkedin_url" "text", "_phone" "text", "_sdg_focus" "text"[], "_sectors" "text"[], "_bio" "text", "_application_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE _status membership_status; _joined timestamptz;
BEGIN
  SELECT membership_status, joined_at INTO _status, _joined FROM public.profiles WHERE id = _user_id;
  IF _status IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF _status <> 'pending' THEN RAISE EXCEPTION 'application already processed'; END IF;
  -- Allow within 15 minutes of profile creation, OR by the authenticated owner / staff.
  IF (now() - _joined) > interval '15 minutes'
     AND auth.uid() IS DISTINCT FROM _user_id
     AND NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE public.profiles SET
    full_name = COALESCE(NULLIF(_full_name, ''), full_name),
    organisation_name = COALESCE(NULLIF(_organisation_name, ''), organisation_name),
    organisation_type = COALESCE(_organisation_type, organisation_type),
    role_title = COALESCE(NULLIF(_role_title, ''), role_title),
    location = COALESCE(NULLIF(_location, ''), location),
    website_url = NULLIF(_website_url, ''),
    linkedin_url = NULLIF(_linkedin_url, ''),
    phone = NULLIF(_phone, ''),
    sdg_focus = COALESCE(_sdg_focus, sdg_focus),
    sectors = COALESCE(_sectors, sectors),
    bio = NULLIF(_bio, ''),
    application_data = COALESCE(_application_data, application_data),
    crm_stage = 'applicant'
  WHERE id = _user_id;
END $$;


ALTER FUNCTION "public"."submit_application"("_user_id" "uuid", "_full_name" "text", "_organisation_name" "text", "_organisation_type" "public"."org_type", "_role_title" "text", "_location" "text", "_website_url" "text", "_linkedin_url" "text", "_phone" "text", "_sdg_focus" "text"[], "_sectors" "text"[], "_bio" "text", "_application_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tier_meets"("_user_id" "uuid", "_required" "public"."membership_tier") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.tier_rank(public.current_tier(_user_id)) >= public.tier_rank(_required)
$$;


ALTER FUNCTION "public"."tier_meets"("_user_id" "uuid", "_required" "public"."membership_tier") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tier_rank"("_tier" "public"."membership_tier") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT CASE _tier
    WHEN 'observer' THEN 1
    WHEN 'contributor' THEN 2
    WHEN 'growth_partner' THEN 3
    WHEN 'anchor' THEN 4
    WHEN 'strategic_partner' THEN 5
  END
$$;


ALTER FUNCTION "public"."tier_rank"("_tier" "public"."membership_tier") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "parent_comment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "post_type" "public"."post_type" DEFAULT 'discussion'::"public"."post_type" NOT NULL,
    "community_of_practice" "public"."cop_type" DEFAULT 'general'::"public"."cop_type" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "likes_count" integer DEFAULT 0 NOT NULL,
    "comments_count" integer DEFAULT 0 NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "visibility" "public"."post_visibility" DEFAULT 'all_members'::"public"."post_visibility" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pinned_in_cop" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."community_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cop_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "cop" "public"."cop_type" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cop_memberships" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."cop_leaderboard" WITH ("security_invoker"='true') AS
 SELECT "cm"."cop",
    "cm"."member_id" AS "user_id",
    "p"."full_name",
    "p"."avatar_url",
    "p"."engagement_score",
    COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."community_posts" "cp"
          WHERE (("cp"."author_id" = "cm"."member_id") AND ("cp"."community_of_practice" = "cm"."cop") AND ("cp"."created_at" > ("now"() - '30 days'::interval)))), (0)::bigint) AS "posts_30d"
   FROM ("public"."cop_memberships" "cm"
     JOIN "public"."profiles" "p" ON (("p"."id" = "cm"."member_id")));


ALTER VIEW "public"."cop_leaderboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cop_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cop" "public"."cop_type" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."cop_role" DEFAULT 'steward'::"public"."cop_role" NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cop_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deal_interests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "interest_note" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."deal_interests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deal_opportunities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "enterprise_name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "sector" "text" DEFAULT ''::"text",
    "ticket_size_min" numeric DEFAULT 0,
    "ticket_size_max" numeric DEFAULT 0,
    "currency" "text" DEFAULT 'NGN'::"text" NOT NULL,
    "instrument_type" "public"."instrument_type" DEFAULT 'equity'::"public"."instrument_type" NOT NULL,
    "sdg_alignment" "text"[] DEFAULT '{}'::"text"[],
    "status" "public"."deal_status" DEFAULT 'open'::"public"."deal_status" NOT NULL,
    "min_tier_required" "public"."membership_tier" DEFAULT 'growth_partner'::"public"."membership_tier" NOT NULL,
    "submitted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL
);


ALTER TABLE "public"."deal_opportunities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."direct_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."direct_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "status" "public"."registration_status" DEFAULT 'registered'::"public"."registration_status" NOT NULL,
    "registered_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "event_type" "public"."event_type" DEFAULT 'convening'::"public"."event_type" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "location" "text" DEFAULT ''::"text",
    "is_virtual" boolean DEFAULT false NOT NULL,
    "virtual_link" "text",
    "max_attendees" integer,
    "min_tier_required" "public"."membership_tier" DEFAULT 'observer'::"public"."membership_tier" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "community_of_practice" "public"."cop_type"
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "resource_type" "public"."resource_type" DEFAULT 'report'::"public"."resource_type" NOT NULL,
    "file_url" "text" DEFAULT ''::"text" NOT NULL,
    "community_of_practice" "public"."cop_type" DEFAULT 'general'::"public"."cop_type" NOT NULL,
    "min_tier_required" "public"."membership_tier" DEFAULT 'observer'::"public"."membership_tier" NOT NULL,
    "downloads_count" integer DEFAULT 0 NOT NULL,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."knowledge_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "cop" "public"."cop_type",
    "awarded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "awarded_by" "uuid"
);


ALTER TABLE "public"."member_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "pinned" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."member_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "organisation_name" "text" NOT NULL,
    "organisation_type" "text",
    "role_title" "text",
    "location" "text",
    "website_url" "text",
    "linkedin_url" "text",
    "requested_tier" "public"."membership_tier" DEFAULT 'observer'::"public"."membership_tier" NOT NULL,
    "tier_label" "text" DEFAULT ''::"text" NOT NULL,
    "amount_naira" numeric DEFAULT 0 NOT NULL,
    "payment_required" boolean DEFAULT false NOT NULL,
    "payment_status" "text" DEFAULT 'not_required'::"text" NOT NULL,
    "payment_reference" "text",
    "sdg_focus" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "sectors" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "goals" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "contributions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "events_interested" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "event_role" "text",
    "heard_from" "text",
    "comm_preference" "text",
    "aum_range" "text",
    "investment_stage" "text",
    "statement" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "review_note" "text" DEFAULT ''::"text" NOT NULL,
    "emailed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."membership_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "full_name" "text",
    "tier" "public"."membership_tier" NOT NULL,
    "amount_kobo" integer NOT NULL,
    "currency" "text" DEFAULT 'NGN'::"text" NOT NULL,
    "reference" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider" "text" DEFAULT 'paystack'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone
);


ALTER TABLE "public"."membership_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mentorship_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mentor_id" "uuid" NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "topic" "text" NOT NULL,
    "message" "text" DEFAULT ''::"text" NOT NULL,
    "proposed_time" "text" DEFAULT ''::"text" NOT NULL,
    "status" "public"."mentorship_status" DEFAULT 'requested'::"public"."mentorship_status" NOT NULL,
    "decided_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mentorship_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mentorship_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mentor_id" "uuid" NOT NULL,
    "topics" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "cops" "public"."cop_type"[] DEFAULT '{}'::"public"."cop_type"[] NOT NULL,
    "capacity_per_month" integer DEFAULT 2 NOT NULL,
    "availability" "text" DEFAULT ''::"text" NOT NULL,
    "bio" "text" DEFAULT ''::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mentorship_offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" DEFAULT ''::"text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "link" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."poll_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "poll_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "option_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."poll_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."polls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cop" "public"."cop_type" NOT NULL,
    "question" "text" NOT NULL,
    "options" "jsonb" NOT NULL,
    "multi_select" boolean DEFAULT false NOT NULL,
    "closes_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."polls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."post_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfc_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rfc_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rfc_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfc_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rfc_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction" "public"."rfc_reaction" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rfc_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfcs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cop" "public"."cop_type" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "status" "public"."rfc_status" DEFAULT 'open'::"public"."rfc_status" NOT NULL,
    "decided_by" "uuid",
    "decided_at" timestamp with time zone,
    "decision_note" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rfcs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."working_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."working_group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."working_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cop" "public"."cop_type" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "deliverable" "text" DEFAULT ''::"text" NOT NULL,
    "status" "public"."working_group_status" DEFAULT 'active'::"public"."working_group_status" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."working_groups" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cop_memberships"
    ADD CONSTRAINT "cop_memberships_member_id_cop_key" UNIQUE ("member_id", "cop");



ALTER TABLE ONLY "public"."cop_memberships"
    ADD CONSTRAINT "cop_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cop_roles"
    ADD CONSTRAINT "cop_roles_cop_user_id_role_key" UNIQUE ("cop", "user_id", "role");



ALTER TABLE ONLY "public"."cop_roles"
    ADD CONSTRAINT "cop_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deal_interests"
    ADD CONSTRAINT "deal_interests_deal_id_investor_id_key" UNIQUE ("deal_id", "investor_id");



ALTER TABLE ONLY "public"."deal_interests"
    ADD CONSTRAINT "deal_interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deal_opportunities"
    ADD CONSTRAINT "deal_opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_event_id_member_id_key" UNIQUE ("event_id", "member_id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_resources"
    ADD CONSTRAINT "knowledge_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_badges"
    ADD CONSTRAINT "member_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_badges"
    ADD CONSTRAINT "member_badges_user_id_badge_key_cop_key" UNIQUE ("user_id", "badge_key", "cop");



ALTER TABLE ONLY "public"."member_notes"
    ADD CONSTRAINT "member_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_applications"
    ADD CONSTRAINT "membership_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_payments"
    ADD CONSTRAINT "membership_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_payments"
    ADD CONSTRAINT "membership_payments_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."mentorship_bookings"
    ADD CONSTRAINT "mentorship_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mentorship_offers"
    ADD CONSTRAINT "mentorship_offers_mentor_id_key" UNIQUE ("mentor_id");



ALTER TABLE ONLY "public"."mentorship_offers"
    ADD CONSTRAINT "mentorship_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poll_votes"
    ADD CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poll_votes"
    ADD CONSTRAINT "poll_votes_poll_id_user_id_option_index_key" UNIQUE ("poll_id", "user_id", "option_index");



ALTER TABLE ONLY "public"."polls"
    ADD CONSTRAINT "polls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfc_comments"
    ADD CONSTRAINT "rfc_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfc_reactions"
    ADD CONSTRAINT "rfc_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfc_reactions"
    ADD CONSTRAINT "rfc_reactions_rfc_id_user_id_key" UNIQUE ("rfc_id", "user_id");



ALTER TABLE ONLY "public"."rfcs"
    ADD CONSTRAINT "rfcs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."working_group_members"
    ADD CONSTRAINT "working_group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."working_group_members"
    ADD CONSTRAINT "working_group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."working_groups"
    ADD CONSTRAINT "working_groups_pkey" PRIMARY KEY ("id");



CREATE INDEX "dm_recipient_idx" ON "public"."direct_messages" USING "btree" ("recipient_id", "created_at" DESC);



CREATE INDEX "dm_sender_idx" ON "public"."direct_messages" USING "btree" ("sender_id", "created_at" DESC);



CREATE INDEX "idx_audit_created" ON "public"."admin_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_target" ON "public"."admin_audit_log" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_membership_applications_created_at" ON "public"."membership_applications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_membership_applications_email" ON "public"."membership_applications" USING "btree" ("email");



CREATE INDEX "idx_membership_payments_user" ON "public"."membership_payments" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_crm_stage" ON "public"."profiles" USING "btree" ("crm_stage");



CREATE INDEX "idx_profiles_crm_tags" ON "public"."profiles" USING "gin" ("crm_tags");



CREATE OR REPLACE TRIGGER "booking_notify_mentor" AFTER INSERT ON "public"."mentorship_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_booking_created"();



CREATE OR REPLACE TRIGGER "booking_notify_status" AFTER UPDATE ON "public"."mentorship_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_booking_status"();



CREATE OR REPLACE TRIGGER "bookings_award_mentor" AFTER UPDATE ON "public"."mentorship_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."badge_on_booking"();



CREATE OR REPLACE TRIGGER "bookings_touch" BEFORE UPDATE ON "public"."mentorship_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "comments_count_trg" AFTER INSERT OR DELETE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."bump_comment_count"();



CREATE OR REPLACE TRIGGER "cop_roles_award_convenor" AFTER INSERT ON "public"."cop_roles" FOR EACH ROW EXECUTE FUNCTION "public"."badge_on_cop_role"();



CREATE OR REPLACE TRIGGER "engagement_comments" AFTER INSERT OR DELETE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."engagement_on_comment"();



CREATE OR REPLACE TRIGGER "engagement_likes" AFTER INSERT OR DELETE ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."engagement_on_like"();



CREATE OR REPLACE TRIGGER "engagement_posts" AFTER INSERT OR DELETE ON "public"."community_posts" FOR EACH ROW EXECUTE FUNCTION "public"."engagement_on_post"();



CREATE OR REPLACE TRIGGER "engagement_regs" AFTER INSERT OR DELETE ON "public"."event_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."engagement_on_registration"();



CREATE OR REPLACE TRIGGER "membership_applications_touch" BEFORE UPDATE ON "public"."membership_applications" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "notify_comment_on_post_trg" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_comment_on_post"();



CREATE OR REPLACE TRIGGER "notify_deal_interest_trg" AFTER INSERT ON "public"."deal_interests" FOR EACH ROW EXECUTE FUNCTION "public"."notify_deal_interest"();



CREATE OR REPLACE TRIGGER "notify_direct_message_trg" AFTER INSERT ON "public"."direct_messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_direct_message"();



CREATE OR REPLACE TRIGGER "notify_event_registration_trg" AFTER INSERT ON "public"."event_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."notify_event_registration"();



CREATE OR REPLACE TRIGGER "notify_like_on_post_trg" AFTER INSERT ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."notify_like_on_post"();



CREATE OR REPLACE TRIGGER "notify_rfc_comment_trg" AFTER INSERT ON "public"."rfc_comments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_rfc_comment"();



CREATE OR REPLACE TRIGGER "offers_touch" BEFORE UPDATE ON "public"."mentorship_offers" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "post_likes_count_trigger" AFTER INSERT OR DELETE ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."bump_like_count"();



CREATE OR REPLACE TRIGGER "posts_touch" BEFORE UPDATE ON "public"."community_posts" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "resources_award_author" AFTER INSERT ON "public"."knowledge_resources" FOR EACH ROW EXECUTE FUNCTION "public"."badge_on_resource"();



CREATE OR REPLACE TRIGGER "rfcs_status_change" AFTER UPDATE ON "public"."rfcs" FOR EACH ROW EXECUTE FUNCTION "public"."on_rfc_status_change"();



CREATE OR REPLACE TRIGGER "rfcs_touch" BEFORE UPDATE ON "public"."rfcs" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_enforce_cop_cap" BEFORE INSERT ON "public"."cop_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_cop_cap"();



CREATE OR REPLACE TRIGGER "trg_enforce_event_capacity" BEFORE INSERT ON "public"."event_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_event_capacity"();



CREATE OR REPLACE TRIGGER "trg_enforce_mentorship_cap" BEFORE INSERT ON "public"."mentorship_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_mentorship_cap"();



CREATE OR REPLACE TRIGGER "trg_notes_updated_at" BEFORE UPDATE ON "public"."member_notes" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "wg_touch" BEFORE UPDATE ON "public"."working_groups" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cop_memberships"
    ADD CONSTRAINT "cop_memberships_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deal_interests"
    ADD CONSTRAINT "deal_interests_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deal_opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deal_interests"
    ADD CONSTRAINT "deal_interests_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deal_opportunities"
    ADD CONSTRAINT "deal_opportunities_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."knowledge_resources"
    ADD CONSTRAINT "knowledge_resources_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."membership_applications"
    ADD CONSTRAINT "membership_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."membership_payments"
    ADD CONSTRAINT "membership_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poll_votes"
    ADD CONSTRAINT "poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."working_group_members"
    ADD CONSTRAINT "working_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."working_groups"("id") ON DELETE CASCADE;



CREATE POLICY "Applicants can view their own application" ON "public"."membership_applications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Members view their own payments" ON "public"."membership_payments" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "Staff can update applications" ON "public"."membership_applications" FOR UPDATE TO "authenticated" USING ("public"."is_staff"("auth"."uid"())) WITH CHECK ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "Staff can view all applications" ON "public"."membership_applications" FOR SELECT TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit staff insert" ON "public"."admin_audit_log" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_staff"("auth"."uid"()) AND ("actor_id" = "auth"."uid"())));



CREATE POLICY "audit staff read" ON "public"."admin_audit_log" FOR SELECT TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "badges read" ON "public"."member_badges" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "badges staff manage" ON "public"."member_badges" TO "authenticated" USING ("public"."is_staff"("auth"."uid"())) WITH CHECK ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "bookings delete parties" ON "public"."mentorship_bookings" FOR DELETE TO "authenticated" USING ((("mentor_id" = "auth"."uid"()) OR ("requester_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "bookings insert requester" ON "public"."mentorship_bookings" FOR INSERT TO "authenticated" WITH CHECK ((("requester_id" = "auth"."uid"()) AND "public"."is_active_member"("auth"."uid"())));



CREATE POLICY "bookings read parties" ON "public"."mentorship_bookings" FOR SELECT TO "authenticated" USING ((("mentor_id" = "auth"."uid"()) OR ("requester_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "bookings update parties" ON "public"."mentorship_bookings" FOR UPDATE TO "authenticated" USING ((("mentor_id" = "auth"."uid"()) OR ("requester_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comments delete own or staff" ON "public"."comments" FOR DELETE TO "authenticated" USING ((("author_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "comments insert own" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = "auth"."uid"()) AND "public"."is_active_member"("auth"."uid"())));



CREATE POLICY "comments read" ON "public"."comments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."community_posts" "p"
  WHERE ("p"."id" = "comments"."post_id"))));



CREATE POLICY "comments update own" ON "public"."comments" FOR UPDATE TO "authenticated" USING ((("author_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



ALTER TABLE "public"."community_posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cop delete own" ON "public"."cop_memberships" FOR DELETE TO "authenticated" USING ((("member_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "cop insert own" ON "public"."cop_memberships" FOR INSERT TO "authenticated" WITH CHECK ((("member_id" = "auth"."uid"()) AND "public"."is_active_member"("auth"."uid"())));



CREATE POLICY "cop read" ON "public"."cop_memberships" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."cop_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cop_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cop_roles read" ON "public"."cop_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "cop_roles staff manage" ON "public"."cop_roles" TO "authenticated" USING ("public"."is_staff"("auth"."uid"())) WITH CHECK ("public"."is_staff"("auth"."uid"()));



ALTER TABLE "public"."deal_interests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deal_interests delete own" ON "public"."deal_interests" FOR DELETE TO "authenticated" USING ((("investor_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "deal_interests insert own" ON "public"."deal_interests" FOR INSERT TO "authenticated" WITH CHECK ((("investor_id" = "auth"."uid"()) AND ("public"."tier_rank"("public"."current_tier"("auth"."uid"())) >= 3)));



CREATE POLICY "deal_interests read" ON "public"."deal_interests" FOR SELECT TO "authenticated" USING ((("investor_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"()) OR ("public"."tier_rank"("public"."current_tier"("auth"."uid"())) >= 4)));



ALTER TABLE "public"."deal_opportunities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deals read tier" ON "public"."deal_opportunities" FOR SELECT TO "authenticated" USING (("public"."is_staff"("auth"."uid"()) OR ("public"."tier_rank"("public"."current_tier"("auth"."uid"())) >= "public"."tier_rank"("min_tier_required"))));



CREATE POLICY "deals staff delete" ON "public"."deal_opportunities" FOR DELETE TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "deals staff update" ON "public"."deal_opportunities" FOR UPDATE TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "deals staff write" ON "public"."deal_opportunities" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff"("auth"."uid"()));



ALTER TABLE "public"."direct_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm insert as sender" ON "public"."direct_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND "public"."is_active_member"("auth"."uid"())));



CREATE POLICY "dm read own" ON "public"."direct_messages" FOR SELECT TO "authenticated" USING ((("sender_id" = "auth"."uid"()) OR ("recipient_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "dm update recipient" ON "public"."direct_messages" FOR UPDATE TO "authenticated" USING (("recipient_id" = "auth"."uid"()));



ALTER TABLE "public"."event_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events read" ON "public"."events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "events staff delete" ON "public"."events" FOR DELETE TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "events staff update" ON "public"."events" FOR UPDATE TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "events staff write" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "knowledge read tier" ON "public"."knowledge_resources" FOR SELECT TO "authenticated" USING (("public"."is_staff"("auth"."uid"()) OR ("public"."tier_rank"("public"."current_tier"("auth"."uid"())) >= "public"."tier_rank"("min_tier_required"))));



CREATE POLICY "knowledge staff delete" ON "public"."knowledge_resources" FOR DELETE TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "knowledge staff update" ON "public"."knowledge_resources" FOR UPDATE TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "knowledge staff write" ON "public"."knowledge_resources" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff"("auth"."uid"()));



ALTER TABLE "public"."knowledge_resources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "likes delete own" ON "public"."post_likes" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "likes insert own" ON "public"."post_likes" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_active_member"("auth"."uid"())));



CREATE POLICY "likes read" ON "public"."post_likes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."member_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membership_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membership_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mentorship_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mentorship_offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notes staff delete" ON "public"."member_notes" FOR DELETE TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "notes staff read" ON "public"."member_notes" FOR SELECT TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "notes staff update" ON "public"."member_notes" FOR UPDATE TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "notes staff write" ON "public"."member_notes" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_staff"("auth"."uid"()) AND ("author_id" = "auth"."uid"())));



CREATE POLICY "notif delete own" ON "public"."notifications" FOR DELETE TO "authenticated" USING ((("recipient_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "notif read own" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("recipient_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "notif staff insert" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_staff"("auth"."uid"()) OR ("recipient_id" = "auth"."uid"())));



CREATE POLICY "notif update own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("recipient_id" = "auth"."uid"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offers manage self" ON "public"."mentorship_offers" TO "authenticated" USING ((("mentor_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"()))) WITH CHECK ((("mentor_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "offers read" ON "public"."mentorship_offers" FOR SELECT TO "authenticated" USING (("public"."is_active_member"("auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



ALTER TABLE "public"."poll_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."polls" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "polls delete chair/staff" ON "public"."polls" FOR DELETE TO "authenticated" USING (("public"."is_staff"("auth"."uid"()) OR "public"."is_cop_chair"("auth"."uid"(), "cop")));



CREATE POLICY "polls insert chair/staff" ON "public"."polls" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ("public"."is_staff"("auth"."uid"()) OR "public"."is_cop_chair"("auth"."uid"(), "cop"))));



CREATE POLICY "polls read" ON "public"."polls" FOR SELECT TO "authenticated" USING (("public"."is_active_member"("auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "polls update chair/staff" ON "public"."polls" FOR UPDATE TO "authenticated" USING (("public"."is_staff"("auth"."uid"()) OR "public"."is_cop_chair"("auth"."uid"(), "cop")));



ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "posts delete own or staff" ON "public"."community_posts" FOR DELETE TO "authenticated" USING ((("author_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "posts insert own" ON "public"."community_posts" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."membership_status" = 'active'::"public"."membership_status"))))));



CREATE POLICY "posts read" ON "public"."community_posts" FOR SELECT TO "authenticated" USING (("public"."is_staff"("auth"."uid"()) OR ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."membership_status" = 'active'::"public"."membership_status")))) AND (("visibility" = 'all_members'::"public"."post_visibility") OR (("visibility" = 'contributor_plus'::"public"."post_visibility") AND ("public"."tier_rank"("public"."current_tier"("auth"."uid"())) >= 2)) OR (("visibility" = 'growth_partner_plus'::"public"."post_visibility") AND ("public"."tier_rank"("public"."current_tier"("auth"."uid"())) >= 3)) OR (("visibility" = 'anchor_plus'::"public"."post_visibility") AND ("public"."tier_rank"("public"."current_tier"("auth"."uid"())) >= 4))))));



CREATE POLICY "posts update own or staff" ON "public"."community_posts" FOR UPDATE TO "authenticated" USING ((("author_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles self read" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"()) OR (("membership_status" = 'active'::"public"."membership_status") AND "public"."is_active_member"("auth"."uid"()))));



CREATE POLICY "profiles self update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "profiles staff delete" ON "public"."profiles" FOR DELETE TO "authenticated" USING ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "profiles staff insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff"("auth"."uid"()));



CREATE POLICY "regs delete own" ON "public"."event_registrations" FOR DELETE TO "authenticated" USING ((("member_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "regs insert own" ON "public"."event_registrations" FOR INSERT TO "authenticated" WITH CHECK (("member_id" = "auth"."uid"()));



CREATE POLICY "regs read" ON "public"."event_registrations" FOR SELECT TO "authenticated" USING ((("member_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."membership_status" = 'active'::"public"."membership_status"))))));



CREATE POLICY "regs update own" ON "public"."event_registrations" FOR UPDATE TO "authenticated" USING ((("member_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



ALTER TABLE "public"."rfc_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfc_reactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rfcc delete own/staff" ON "public"."rfc_comments" FOR DELETE TO "authenticated" USING ((("author_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "rfcc insert self" ON "public"."rfc_comments" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = "auth"."uid"()) AND "public"."is_active_member"("auth"."uid"())));



CREATE POLICY "rfcc read" ON "public"."rfc_comments" FOR SELECT TO "authenticated" USING (("public"."is_active_member"("auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "rfcr delete self" ON "public"."rfc_reactions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "rfcr insert self" ON "public"."rfc_reactions" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_active_member"("auth"."uid"())));



CREATE POLICY "rfcr read" ON "public"."rfc_reactions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rfcr update self" ON "public"."rfc_reactions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."rfcs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rfcs delete author/staff" ON "public"."rfcs" FOR DELETE TO "authenticated" USING ((("author_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "rfcs insert active" ON "public"."rfcs" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = "auth"."uid"()) AND "public"."is_active_member"("auth"."uid"())));



CREATE POLICY "rfcs read" ON "public"."rfcs" FOR SELECT TO "authenticated" USING (("public"."is_active_member"("auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "rfcs update author/chair/staff" ON "public"."rfcs" FOR UPDATE TO "authenticated" USING ((("author_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"()) OR "public"."is_cop_chair"("auth"."uid"(), "cop")));



CREATE POLICY "roles self read" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "roles super admin manage" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "votes delete self" ON "public"."poll_votes" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "votes insert self" ON "public"."poll_votes" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_active_member"("auth"."uid"())));



CREATE POLICY "votes read" ON "public"."poll_votes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "wg delete chair/staff" ON "public"."working_groups" FOR DELETE TO "authenticated" USING (("public"."is_staff"("auth"."uid"()) OR "public"."is_cop_chair"("auth"."uid"(), "cop")));



CREATE POLICY "wg insert chair/staff" ON "public"."working_groups" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ("public"."is_staff"("auth"."uid"()) OR "public"."is_cop_chair"("auth"."uid"(), "cop"))));



CREATE POLICY "wg read" ON "public"."working_groups" FOR SELECT TO "authenticated" USING (("public"."is_active_member"("auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "wg update chair/staff/lead" ON "public"."working_groups" FOR UPDATE TO "authenticated" USING (("public"."is_staff"("auth"."uid"()) OR "public"."is_cop_chair"("auth"."uid"(), "cop") OR ("lead_id" = "auth"."uid"())));



CREATE POLICY "wgm join self" ON "public"."working_group_members" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_active_member"("auth"."uid"())));



CREATE POLICY "wgm leave self or staff" ON "public"."working_group_members" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_staff"("auth"."uid"())));



CREATE POLICY "wgm read" ON "public"."working_group_members" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."working_group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."working_groups" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."community_posts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."direct_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."post_likes";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."admin_broadcast_notification"("_recipient_ids" "uuid"[], "_title" "text", "_message" "text", "_link" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_broadcast_notification"("_recipient_ids" "uuid"[], "_title" "text", "_message" "text", "_link" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_broadcast_notification"("_recipient_ids" "uuid"[], "_title" "text", "_message" "text", "_link" "text") TO "authenticated";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("full_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("organisation_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("organisation_type") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("role_title") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("membership_tier") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("membership_status") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("bio") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("location") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("sdg_focus") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("sectors") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("linkedin_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("website_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("joined_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("approved_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("last_active_at") ON TABLE "public"."profiles" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_get_profiles"("_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_get_profiles"("_ids" "uuid"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_get_profiles"("_ids" "uuid"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_list_profiles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_profiles"() TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_list_profiles"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."award_badge"("_user_id" "uuid", "_key" "text", "_label" "text", "_cop" "public"."cop_type") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."award_badge"("_user_id" "uuid", "_key" "text", "_label" "text", "_cop" "public"."cop_type") TO "service_role";



REVOKE ALL ON FUNCTION "public"."badge_on_booking"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."badge_on_booking"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."badge_on_cop_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."badge_on_cop_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."badge_on_resource"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."badge_on_resource"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bump_comment_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."bump_comment_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_comment_count"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bump_engagement"("_user_id" "uuid", "_delta" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bump_engagement"("_user_id" "uuid", "_delta" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."bump_like_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."bump_like_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_like_count"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_tier"("_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_tier"("_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_tier"("_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."enforce_cop_cap"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_cop_cap"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_event_capacity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_event_capacity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_mentorship_cap"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_mentorship_cap"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."engagement_on_comment"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."engagement_on_comment"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."engagement_on_like"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."engagement_on_like"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."engagement_on_post"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."engagement_on_post"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."engagement_on_registration"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."engagement_on_registration"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_event_virtual_link"("_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_event_virtual_link"("_event_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_event_virtual_link"("_event_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_my_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_tier_usage"("_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_tier_usage"("_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_tier_usage"("_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."increment_resource_download"("_resource_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_resource_download"("_resource_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."increment_resource_download"("_resource_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_active_member"("_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_member"("_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_active_member"("_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_cop_chair"("_user_id" "uuid", "_cop" "public"."cop_type") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_cop_chair"("_user_id" "uuid", "_cop" "public"."cop_type") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_cop_chair"("_user_id" "uuid", "_cop" "public"."cop_type") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_staff"("_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_staff"("_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_staff"("_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."notify_booking_created"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_booking_created"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_booking_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_booking_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_comment_on_post"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_comment_on_post"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_deal_interest"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_deal_interest"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_direct_message"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_direct_message"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_event_registration"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_event_registration"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_like_on_post"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_like_on_post"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_rfc_comment"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_rfc_comment"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."on_rfc_status_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."on_rfc_status_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_tier_upgrade"("_requested" "public"."membership_tier", "_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_tier_upgrade"("_requested" "public"."membership_tier", "_note" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."request_tier_upgrade"("_requested" "public"."membership_tier", "_note" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."submit_application"("_user_id" "uuid", "_full_name" "text", "_organisation_name" "text", "_organisation_type" "public"."org_type", "_role_title" "text", "_location" "text", "_website_url" "text", "_linkedin_url" "text", "_phone" "text", "_sdg_focus" "text"[], "_sectors" "text"[], "_bio" "text", "_application_data" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_application"("_user_id" "uuid", "_full_name" "text", "_organisation_name" "text", "_organisation_type" "public"."org_type", "_role_title" "text", "_location" "text", "_website_url" "text", "_linkedin_url" "text", "_phone" "text", "_sdg_focus" "text"[], "_sectors" "text"[], "_bio" "text", "_application_data" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."submit_application"("_user_id" "uuid", "_full_name" "text", "_organisation_name" "text", "_organisation_type" "public"."org_type", "_role_title" "text", "_location" "text", "_website_url" "text", "_linkedin_url" "text", "_phone" "text", "_sdg_focus" "text"[], "_sectors" "text"[], "_bio" "text", "_application_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_application"("_user_id" "uuid", "_full_name" "text", "_organisation_name" "text", "_organisation_type" "public"."org_type", "_role_title" "text", "_location" "text", "_website_url" "text", "_linkedin_url" "text", "_phone" "text", "_sdg_focus" "text"[], "_sectors" "text"[], "_bio" "text", "_application_data" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."tier_meets"("_user_id" "uuid", "_required" "public"."membership_tier") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tier_meets"("_user_id" "uuid", "_required" "public"."membership_tier") TO "service_role";
GRANT ALL ON FUNCTION "public"."tier_meets"("_user_id" "uuid", "_required" "public"."membership_tier") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."tier_rank"("_tier" "public"."membership_tier") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tier_rank"("_tier" "public"."membership_tier") TO "service_role";
GRANT ALL ON FUNCTION "public"."tier_rank"("_tier" "public"."membership_tier") TO "anon";
GRANT ALL ON FUNCTION "public"."tier_rank"("_tier" "public"."membership_tier") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."touch_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."community_posts" TO "anon";
GRANT ALL ON TABLE "public"."community_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."community_posts" TO "service_role";



GRANT ALL ON TABLE "public"."cop_memberships" TO "anon";
GRANT ALL ON TABLE "public"."cop_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."cop_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."cop_leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."cop_leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."cop_leaderboard" TO "service_role";



GRANT ALL ON TABLE "public"."cop_roles" TO "anon";
GRANT ALL ON TABLE "public"."cop_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."cop_roles" TO "service_role";



GRANT ALL ON TABLE "public"."deal_interests" TO "anon";
GRANT ALL ON TABLE "public"."deal_interests" TO "authenticated";
GRANT ALL ON TABLE "public"."deal_interests" TO "service_role";



GRANT ALL ON TABLE "public"."deal_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."deal_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."deal_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."direct_messages" TO "anon";
GRANT ALL ON TABLE "public"."direct_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."direct_messages" TO "service_role";



GRANT ALL ON TABLE "public"."event_registrations" TO "anon";
GRANT ALL ON TABLE "public"."event_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_registrations" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."events" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("id") ON TABLE "public"."events" TO "anon";



GRANT SELECT("title") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("title") ON TABLE "public"."events" TO "anon";



GRANT SELECT("description") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("description") ON TABLE "public"."events" TO "anon";



GRANT SELECT("event_type") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("event_type") ON TABLE "public"."events" TO "anon";



GRANT SELECT("start_date") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("start_date") ON TABLE "public"."events" TO "anon";



GRANT SELECT("end_date") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("end_date") ON TABLE "public"."events" TO "anon";



GRANT SELECT("location") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("location") ON TABLE "public"."events" TO "anon";



GRANT SELECT("is_virtual") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("is_virtual") ON TABLE "public"."events" TO "anon";



GRANT SELECT("max_attendees") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("max_attendees") ON TABLE "public"."events" TO "anon";



GRANT SELECT("min_tier_required") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("min_tier_required") ON TABLE "public"."events" TO "anon";



GRANT SELECT("created_by") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("created_by") ON TABLE "public"."events" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."events" TO "authenticated";
GRANT SELECT("created_at") ON TABLE "public"."events" TO "anon";



GRANT ALL ON TABLE "public"."knowledge_resources" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_resources" TO "service_role";



GRANT ALL ON TABLE "public"."member_badges" TO "anon";
GRANT ALL ON TABLE "public"."member_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."member_badges" TO "service_role";



GRANT ALL ON TABLE "public"."member_notes" TO "anon";
GRANT ALL ON TABLE "public"."member_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."member_notes" TO "service_role";



GRANT ALL ON TABLE "public"."membership_applications" TO "anon";
GRANT ALL ON TABLE "public"."membership_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_applications" TO "service_role";



GRANT ALL ON TABLE "public"."membership_payments" TO "anon";
GRANT ALL ON TABLE "public"."membership_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_payments" TO "service_role";



GRANT ALL ON TABLE "public"."mentorship_bookings" TO "anon";
GRANT ALL ON TABLE "public"."mentorship_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."mentorship_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."mentorship_offers" TO "anon";
GRANT ALL ON TABLE "public"."mentorship_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."mentorship_offers" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."poll_votes" TO "anon";
GRANT ALL ON TABLE "public"."poll_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."poll_votes" TO "service_role";



GRANT ALL ON TABLE "public"."polls" TO "anon";
GRANT ALL ON TABLE "public"."polls" TO "authenticated";
GRANT ALL ON TABLE "public"."polls" TO "service_role";



GRANT ALL ON TABLE "public"."post_likes" TO "anon";
GRANT ALL ON TABLE "public"."post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_likes" TO "service_role";



GRANT ALL ON TABLE "public"."rfc_comments" TO "anon";
GRANT ALL ON TABLE "public"."rfc_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."rfc_comments" TO "service_role";



GRANT ALL ON TABLE "public"."rfc_reactions" TO "anon";
GRANT ALL ON TABLE "public"."rfc_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."rfc_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."rfcs" TO "anon";
GRANT ALL ON TABLE "public"."rfcs" TO "authenticated";
GRANT ALL ON TABLE "public"."rfcs" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."working_group_members" TO "anon";
GRANT ALL ON TABLE "public"."working_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."working_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."working_groups" TO "anon";
GRANT ALL ON TABLE "public"."working_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."working_groups" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































