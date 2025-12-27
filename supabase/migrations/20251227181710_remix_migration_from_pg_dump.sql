CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user',
    'support'
);


--
-- Name: add_security_log(text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_security_log(p_action text, p_path text DEFAULT NULL::text, p_details jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- التحقق من أن المستخدم مسجل الدخول
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  -- إضافة السجل
  INSERT INTO public.security_logs (user_id, action, path, details)
  VALUES (auth.uid(), p_action, p_path, p_details);
END;
$$;


--
-- Name: assign_admin_to_first_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_admin_to_first_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing profiles (excluding the new one being created)
  SELECT COUNT(*) INTO user_count FROM public.profiles WHERE id != NEW.id;
  
  -- If this is the first user, assign admin role
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
    
    -- Also verify the user
    UPDATE public.profiles 
    SET is_verified = true, verified_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: auto_ban_on_warnings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_ban_on_warnings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_warnings_count integer;
BEGIN
  -- Count total warnings for this user
  SELECT COUNT(*) INTO v_warnings_count
  FROM public.user_warnings
  WHERE user_id = NEW.user_id;

  -- If user has 3 or more warnings, ban them
  IF v_warnings_count >= 3 THEN
    UPDATE public.profiles
    SET 
      is_banned = true,
      banned_at = now(),
      banned_reason = 'حظر تلقائي: تجاوز 3 تحذيرات',
      banned_by = NEW.issued_by
    WHERE id = NEW.user_id;

    -- Send notification to the user
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'ban',
      'تم حظر حسابك',
      'تم حظر حسابك تلقائياً بسبب تجاوز 3 تحذيرات. يرجى التواصل مع الإدارة.',
      jsonb_build_object('warnings_count', v_warnings_count)
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: ban_user(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ban_user(target_user_id uuid, reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only allow admins to ban users
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Cannot ban yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;
  
  UPDATE public.profiles
  SET 
    is_banned = true,
    banned_at = now(),
    banned_reason = reason,
    banned_by = auth.uid()
  WHERE id = target_user_id;
END;
$$;


--
-- Name: check_username_available(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_username_available(check_username text, user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE username = check_username AND id != user_id
  );
END;
$$;


SET default_table_access_method = heap;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text,
    full_name text,
    avatar_url text,
    bio text,
    country text,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    verified_by uuid,
    is_banned boolean DEFAULT false,
    banned_at timestamp with time zone,
    banned_reason text,
    banned_by uuid,
    CONSTRAINT username_length CHECK (((char_length(username) >= 3) AND (char_length(username) <= 30)))
);


--
-- Name: ensure_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_profile() RETURNS public.profiles
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_full_name text := (auth.jwt() -> 'user_metadata' ->> 'full_name');
  base_username text;
  final_username text;
  counter int := 0;
  v_profile public.profiles%rowtype;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If profile already exists, backfill missing fields
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF FOUND THEN
    IF v_profile.full_name IS NULL THEN
      UPDATE public.profiles
      SET full_name = COALESCE(v_full_name, split_part(COALESCE(v_email, ''), '@', 1)),
          updated_at = now()
      WHERE id = v_user_id;
    END IF;

    IF v_profile.username IS NULL THEN
      base_username := regexp_replace(split_part(COALESCE(v_email, ''), '@', 1), '[^a-zA-Z0-9_]', '', 'g');
      IF base_username = '' OR base_username IS NULL THEN
        base_username := 'user';
      END IF;

      final_username := base_username;
      WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id <> v_user_id) LOOP
        counter := counter + 1;
        final_username := base_username || '_' || counter::text;
      END LOOP;

      UPDATE public.profiles
      SET username = final_username,
          updated_at = now()
      WHERE id = v_user_id;
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    RETURN v_profile;
  END IF;

  -- Create new profile
  base_username := regexp_replace(split_part(COALESCE(v_email, ''), '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  IF base_username = '' OR base_username IS NULL THEN
    base_username := 'user';
  END IF;

  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter::text;
  END LOOP;

  INSERT INTO public.profiles (id, full_name, username, created_at, updated_at)
  VALUES (
    v_user_id,
    COALESCE(v_full_name, split_part(COALESCE(v_email, ''), '@', 1)),
    final_username,
    now(),
    now()
  )
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;


--
-- Name: get_admin_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_stats() RETURNS TABLE(total_users bigint, total_books bigint, total_categories bigint, total_favorites bigint, active_readers_today bigint, new_books_week bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- التحقق من صلاحية المسؤول
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM profiles)::bigint,
    (SELECT COUNT(*) FROM books)::bigint,
    (SELECT COUNT(*) FROM categories)::bigint,
    (SELECT COUNT(*) FROM favorites)::bigint,
    (SELECT COUNT(*) FROM reading_progress WHERE last_read_at > now() - interval '1 day')::bigint,
    (SELECT COUNT(*) FROM books WHERE created_at > now() - interval '7 days')::bigint;
END;
$$;


--
-- Name: get_admin_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_users() RETURNS TABLE(id uuid, email text, full_name text, username text, avatar_url text, bio text, country text, is_public boolean, is_verified boolean, verified_at timestamp with time zone, verified_by uuid, is_banned boolean, banned_at timestamp with time zone, banned_reason text, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    au.email::text,
    p.full_name,
    p.username,
    p.avatar_url,
    p.bio,
    p.country,
    p.is_public,
    p.is_verified,
    p.verified_at,
    p.verified_by,
    p.is_banned,
    p.banned_at,
    p.banned_reason,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;


--
-- Name: get_book_rating(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_book_rating(p_book_id uuid) RETURNS TABLE(average_rating numeric, total_reviews bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 1) as average_rating,
    COUNT(*)::BIGINT as total_reviews
  FROM public.book_reviews
  WHERE book_id = p_book_id;
END;
$$;


--
-- Name: get_book_recommendations(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_book_recommendations(p_user_id uuid, p_limit integer DEFAULT 10) RETURNS TABLE(id uuid, title text, author text, cover_url text, description text, category_id uuid, view_count integer, download_count integer, score bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id, b.title, b.author, b.cover_url, b.description, b.category_id, 
    b.view_count, b.download_count,
    (b.download_count + b.view_count)::BIGINT as score
  FROM public.books b
  WHERE b.id NOT IN (SELECT book_id FROM public.reading_progress WHERE user_id = p_user_id)
    AND b.id NOT IN (SELECT book_id FROM public.favorites WHERE user_id = p_user_id)
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_moderation_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_moderation_stats() RETURNS TABLE(total_blocked bigint, blocked_today bigint, blocked_week bigint, high_severity bigint, by_content_type jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM content_moderation_logs)::BIGINT,
    (SELECT COUNT(*) FROM content_moderation_logs WHERE created_at > now() - interval '1 day')::BIGINT,
    (SELECT COUNT(*) FROM content_moderation_logs WHERE created_at > now() - interval '7 days')::BIGINT,
    (SELECT COUNT(*) FROM content_moderation_logs WHERE severity = 'high')::BIGINT,
    (SELECT jsonb_object_agg(content_type, cnt) FROM (
      SELECT content_type, COUNT(*) as cnt 
      FROM content_moderation_logs 
      GROUP BY content_type
    ) sub)::JSONB;
END;
$$;


--
-- Name: get_reading_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_reading_stats(p_user_id uuid) RETURNS TABLE(total_books_read bigint, total_pages_read bigint, books_completed bigint, total_annotations bigint, favorite_category text, reading_streak integer, last_read_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_last_read_at timestamp with time zone;
BEGIN
  -- Get the last read timestamp first
  SELECT MAX(rp.last_read_at) INTO v_last_read_at 
  FROM public.reading_progress rp 
  WHERE rp.user_id = p_user_id;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.reading_progress rp WHERE rp.user_id = p_user_id)::BIGINT,
    (SELECT COALESCE(SUM(rp.current_page), 0) FROM public.reading_progress rp WHERE rp.user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM public.reading_progress rp WHERE rp.user_id = p_user_id AND rp.is_completed = true)::BIGINT,
    (SELECT COUNT(*) FROM public.book_annotations ba WHERE ba.user_id = p_user_id)::BIGINT,
    (SELECT c.name FROM public.categories c 
     JOIN public.books b ON b.category_id = c.id 
     JOIN public.reading_progress rp ON rp.book_id = b.id 
     WHERE rp.user_id = p_user_id 
     GROUP BY c.name ORDER BY COUNT(*) DESC LIMIT 1),
    1::INTEGER,
    v_last_read_at;
END;
$$;


--
-- Name: get_report_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_report_stats() RETURNS TABLE(total_reports bigint, pending_reports bigint, resolved_today bigint, by_reason jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM content_reports)::BIGINT,
    (SELECT COUNT(*) FROM content_reports WHERE status = 'pending')::BIGINT,
    (SELECT COUNT(*) FROM content_reports WHERE status = 'resolved' AND reviewed_at > now() - interval '1 day')::BIGINT,
    (SELECT jsonb_object_agg(reason, cnt) FROM (
      SELECT reason, COUNT(*) as cnt 
      FROM content_reports 
      WHERE status = 'pending'
      GROUP BY reason
    ) sub)::JSONB;
END;
$$;


--
-- Name: get_user_warnings_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_warnings_count(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.user_warnings
  WHERE user_id = p_user_id
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Extract username from email (part before @)
  base_username := split_part(NEW.email, '@', 1);
  -- Remove any special characters, keep only alphanumeric and underscore
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g');
  -- Ensure it's not empty
  IF base_username = '' OR base_username IS NULL THEN
    base_username := 'user';
  END IF;
  
  -- Try to use the base username, if taken, add a number suffix
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter::TEXT;
  END LOOP;
  
  INSERT INTO public.profiles (id, full_name, username, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    final_username,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    username = COALESCE(profiles.username, EXCLUDED.username),
    updated_at = NOW();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: increment_download_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_download_count(book_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.books SET download_count = download_count + 1 WHERE id = book_id;
END;
$$;


--
-- Name: increment_failed_attempts(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_failed_attempts(p_ip_address text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_attempts integer;
  v_blocked boolean := false;
BEGIN
  -- Insert or update failed attempts
  INSERT INTO public.blocked_ips (ip_address, failed_attempts, reason)
  VALUES (p_ip_address, 1, 'Failed login attempts')
  ON CONFLICT (ip_address) 
  DO UPDATE SET 
    failed_attempts = blocked_ips.failed_attempts + 1,
    blocked_at = CASE 
      WHEN blocked_ips.failed_attempts + 1 >= 5 THEN now()
      ELSE blocked_ips.blocked_at
    END,
    expires_at = CASE 
      WHEN blocked_ips.failed_attempts + 1 >= 5 THEN now() + interval '30 minutes'
      ELSE blocked_ips.expires_at
    END
  RETURNING failed_attempts INTO v_attempts;

  IF v_attempts >= 5 THEN
    v_blocked := true;
  END IF;

  RETURN jsonb_build_object('blocked', v_blocked, 'attempts', v_attempts);
END;
$$;


--
-- Name: insert_security_log_safe(text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.insert_security_log_safe(p_action text, p_path text DEFAULT NULL::text, p_details jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  INSERT INTO public.security_logs (user_id, action, path, details)
  VALUES (auth.uid(), p_action, p_path, p_details);
END;
$$;


--
-- Name: is_user_banned(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_banned(check_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT is_banned FROM public.profiles WHERE id = check_user_id),
    false
  )
$$;


--
-- Name: log_failed_login(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_failed_login(p_email text, p_error_message text DEFAULT NULL::text, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_block_result jsonb;
BEGIN
  -- Log the failed attempt
  INSERT INTO public.security_logs (user_id, action, path, details, ip_address, user_agent)
  VALUES (
    NULL,
    'failed_login',
    '/auth',
    jsonb_build_object(
      'email', p_email,
      'error', p_error_message,
      'attempted_at', now()
    ),
    p_ip_address,
    p_user_agent
  );

  -- Increment failed attempts for this IP if provided
  IF p_ip_address IS NOT NULL AND p_ip_address != '' THEN
    v_block_result := increment_failed_attempts(p_ip_address);
    RETURN v_block_result;
  END IF;

  RETURN jsonb_build_object('blocked', false);
END;
$$;


--
-- Name: log_security_event(text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_security_event(p_action text, p_path text DEFAULT NULL::text, p_details jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.security_logs (user_id, action, path, details)
  VALUES (auth.uid(), p_action, p_path, p_details);
END;
$$;


--
-- Name: notify_discussion_owner_on_reply(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_discussion_owner_on_reply() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_discussion discussions%ROWTYPE;
  v_replier_profile profiles%ROWTYPE;
BEGIN
  -- Get discussion info
  SELECT * INTO v_discussion FROM discussions WHERE id = NEW.discussion_id;
  
  -- Get replier profile info
  SELECT * INTO v_replier_profile FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if replying to your own discussion
  IF v_discussion.user_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_discussion.user_id,
      'discussion_reply',
      'رد جديد على نقاشك',
      COALESCE(v_replier_profile.full_name, v_replier_profile.username, 'شخص ما') || ' علّق على نقاشك "' || LEFT(v_discussion.title, 50) || '"',
      jsonb_build_object(
        'discussion_id', NEW.discussion_id,
        'reply_id', NEW.id,
        'replier_id', NEW.user_id,
        'replier_name', COALESCE(v_replier_profile.full_name, v_replier_profile.username),
        'discussion_title', v_discussion.title
      )
    );
  END IF;
  
  -- Also notify the parent reply owner if this is a nested reply
  IF NEW.parent_reply_id IS NOT NULL THEN
    DECLARE
      v_parent_reply discussion_replies%ROWTYPE;
    BEGIN
      SELECT * INTO v_parent_reply FROM discussion_replies WHERE id = NEW.parent_reply_id;
      
      -- Don't notify if replying to yourself
      IF v_parent_reply.user_id != NEW.user_id AND v_parent_reply.user_id != v_discussion.user_id THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
          v_parent_reply.user_id,
          'reply_mention',
          'رد على تعليقك',
          COALESCE(v_replier_profile.full_name, v_replier_profile.username, 'شخص ما') || ' رد على تعليقك في نقاش "' || LEFT(v_discussion.title, 50) || '"',
          jsonb_build_object(
            'discussion_id', NEW.discussion_id,
            'reply_id', NEW.id,
            'parent_reply_id', NEW.parent_reply_id,
            'replier_id', NEW.user_id,
            'replier_name', COALESCE(v_replier_profile.full_name, v_replier_profile.username),
            'discussion_title', v_discussion.title
          )
        );
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_list_followers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_list_followers() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_list reading_lists%ROWTYPE;
  v_book books%ROWTYPE;
  v_follower RECORD;
BEGIN
  -- Get list info
  SELECT * INTO v_list FROM reading_lists WHERE id = NEW.list_id;
  
  -- Only notify for public lists
  IF v_list.is_public = true THEN
    -- Get book info
    SELECT * INTO v_book FROM books WHERE id = NEW.book_id;
    
    -- Notify all followers
    FOR v_follower IN 
      SELECT user_id FROM reading_list_followers WHERE list_id = NEW.list_id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_follower.user_id,
        'list_update',
        'كتاب جديد في قائمة تتابعها',
        'تمت إضافة "' || v_book.title || '" إلى قائمة "' || v_list.name || '"',
        jsonb_build_object(
          'list_id', NEW.list_id,
          'book_id', NEW.book_id,
          'list_name', v_list.name,
          'book_title', v_book.title
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_list_owner_on_follow(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_list_owner_on_follow() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_list reading_lists%ROWTYPE;
  v_follower_profile profiles%ROWTYPE;
BEGIN
  -- Get list info
  SELECT * INTO v_list FROM reading_lists WHERE id = NEW.list_id;
  
  -- Get follower info
  SELECT * INTO v_follower_profile FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if following your own list
  IF v_list.user_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_list.user_id,
      'new_follower',
      'متابع جديد لقائمتك',
      COALESCE(v_follower_profile.full_name, v_follower_profile.username, 'شخص ما') || ' بدأ بمتابعة قائمتك "' || v_list.name || '"',
      jsonb_build_object(
        'list_id', NEW.list_id,
        'follower_id', NEW.user_id,
        'list_name', v_list.name,
        'follower_name', COALESCE(v_follower_profile.full_name, v_follower_profile.username)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_on_vote(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_vote() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_discussion discussions%ROWTYPE;
  v_reply discussion_replies%ROWTYPE;
  v_voter_profile profiles%ROWTYPE;
  v_vote_text text;
BEGIN
  -- Only notify on upvotes (positive votes)
  IF NEW.vote_type <= 0 THEN
    RETURN NEW;
  END IF;

  -- Get voter profile info
  SELECT * INTO v_voter_profile FROM profiles WHERE id = NEW.user_id;
  
  v_vote_text := CASE WHEN NEW.vote_type = 1 THEN 'أعجب بـ' ELSE 'صوّت على' END;

  -- If voting on a discussion
  IF NEW.discussion_id IS NOT NULL AND NEW.reply_id IS NULL THEN
    SELECT * INTO v_discussion FROM discussions WHERE id = NEW.discussion_id;
    
    -- Don't notify if voting on your own discussion
    IF v_discussion.user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_discussion.user_id,
        'discussion_vote',
        'إعجاب جديد بنقاشك',
        COALESCE(v_voter_profile.full_name, v_voter_profile.username, 'شخص ما') || ' ' || v_vote_text || ' نقاشك "' || LEFT(v_discussion.title, 40) || '"',
        jsonb_build_object(
          'discussion_id', NEW.discussion_id,
          'voter_id', NEW.user_id,
          'voter_name', COALESCE(v_voter_profile.full_name, v_voter_profile.username),
          'discussion_title', v_discussion.title
        )
      );
    END IF;
  END IF;

  -- If voting on a reply
  IF NEW.reply_id IS NOT NULL THEN
    SELECT * INTO v_reply FROM discussion_replies WHERE id = NEW.reply_id;
    SELECT * INTO v_discussion FROM discussions WHERE id = v_reply.discussion_id;
    
    -- Don't notify if voting on your own reply
    IF v_reply.user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_reply.user_id,
        'reply_vote',
        'إعجاب جديد بتعليقك',
        COALESCE(v_voter_profile.full_name, v_voter_profile.username, 'شخص ما') || ' ' || v_vote_text || ' تعليقك في نقاش "' || LEFT(v_discussion.title, 40) || '"',
        jsonb_build_object(
          'discussion_id', v_reply.discussion_id,
          'reply_id', NEW.reply_id,
          'voter_id', NEW.user_id,
          'voter_name', COALESCE(v_voter_profile.full_name, v_voter_profile.username),
          'discussion_title', v_discussion.title
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.books (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    author text NOT NULL,
    description text,
    cover_url text,
    category_id uuid,
    pages integer,
    language text DEFAULT 'ar'::text,
    publish_year integer,
    publisher text,
    isbn text,
    download_count integer DEFAULT 0 NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    file_url text,
    file_size text,
    is_featured boolean DEFAULT false,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: search_books(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_books(search_query text) RETURNS SETOF public.books
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.books
  WHERE title ILIKE '%' || search_query || '%' 
     OR author ILIKE '%' || search_query || '%'
     OR description ILIKE '%' || search_query || '%';
END;
$$;


--
-- Name: unban_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unban_user(target_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only allow admins to unban users
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  UPDATE public.profiles
  SET 
    is_banned = false,
    banned_at = null,
    banned_reason = null,
    banned_by = null
  WHERE id = target_user_id;
END;
$$;


--
-- Name: update_category_book_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_category_book_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.category_id IS NOT NULL THEN
      UPDATE public.categories 
      SET book_count = (
        SELECT COUNT(*) FROM public.books WHERE category_id = NEW.category_id
      )
      WHERE id = NEW.category_id;
    END IF;
    RETURN NEW;
  
  -- Handle DELETE
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.category_id IS NOT NULL THEN
      UPDATE public.categories 
      SET book_count = (
        SELECT COUNT(*) FROM public.books WHERE category_id = OLD.category_id
      )
      WHERE id = OLD.category_id;
    END IF;
    RETURN OLD;
  
  -- Handle UPDATE (category change)
  ELSIF TG_OP = 'UPDATE' THEN
    -- If category changed, update both old and new categories
    IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
      -- Update old category count
      IF OLD.category_id IS NOT NULL THEN
        UPDATE public.categories 
        SET book_count = (
          SELECT COUNT(*) FROM public.books WHERE category_id = OLD.category_id
        )
        WHERE id = OLD.category_id;
      END IF;
      -- Update new category count
      IF NEW.category_id IS NOT NULL THEN
        UPDATE public.categories 
        SET book_count = (
          SELECT COUNT(*) FROM public.books WHERE category_id = NEW.category_id
        )
        WHERE id = NEW.category_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;


--
-- Name: update_discussion_replies_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_discussion_replies_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE discussions SET replies_count = replies_count + 1 WHERE id = NEW.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE discussions SET replies_count = replies_count - 1 WHERE id = OLD.discussion_id;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_moderation_log(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_moderation_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- التأكد من أن الحقول المطلوبة موجودة
  IF NEW.content_type IS NULL OR NEW.severity IS NULL OR NEW.action_taken IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;
  
  -- التأكد من أن content_type صحيح
  IF NEW.content_type NOT IN ('book', 'review', 'profile', 'reading_list', 'image', 'comment') THEN
    RAISE EXCEPTION 'Invalid content type';
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    entity_name text,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ad_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    description text,
    is_enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: backup_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    tables_backed_up text[] NOT NULL,
    records_count jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: backup_server_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_server_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    host text,
    port integer,
    username text,
    password text,
    path text DEFAULT '/'::text,
    bucket_name text,
    region text,
    access_key text,
    secret_key text,
    is_active boolean DEFAULT false,
    is_default boolean DEFAULT false,
    auto_backup_enabled boolean DEFAULT false,
    auto_backup_schedule text DEFAULT 'weekly'::text,
    max_backups integer DEFAULT 10,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT backup_server_settings_type_check CHECK ((type = ANY (ARRAY['ftp'::text, 'sftp'::text, 'aws_s3'::text, 'google_cloud'::text, 'local'::text])))
);


--
-- Name: blocked_ips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_ips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address text NOT NULL,
    reason text,
    failed_attempts integer DEFAULT 0,
    blocked_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: book_annotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_annotations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    book_id uuid NOT NULL,
    page_number integer NOT NULL,
    content text NOT NULL,
    color text DEFAULT 'yellow'::text,
    annotation_type text DEFAULT 'highlight'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: book_bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_bookmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    book_id uuid NOT NULL,
    page_number integer NOT NULL,
    title text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: book_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    review_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT book_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    icon text DEFAULT 'book'::text NOT NULL,
    color text DEFAULT 'bg-primary'::text NOT NULL,
    book_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'unread'::text NOT NULL,
    admin_notes text,
    replied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_moderation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_moderation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    content_type text NOT NULL,
    content_field text,
    original_content text,
    flagged_words text[],
    severity text DEFAULT 'low'::text NOT NULL,
    action_taken text DEFAULT 'blocked'::text NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid,
    content_type text NOT NULL,
    content_id uuid NOT NULL,
    reason text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: discussion_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discussion_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_reply_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: discussion_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    discussion_id uuid,
    reply_id uuid,
    vote_type smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT discussion_votes_check CHECK ((((discussion_id IS NOT NULL) AND (reply_id IS NULL)) OR ((discussion_id IS NULL) AND (reply_id IS NOT NULL)))),
    CONSTRAINT discussion_votes_vote_type_check CHECK ((vote_type = ANY (ARRAY['-1'::integer, 1])))
);


--
-- Name: discussions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    book_id uuid,
    title text NOT NULL,
    content text NOT NULL,
    is_pinned boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    views_count integer DEFAULT 0,
    replies_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    book_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: featured_selections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.featured_selections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id uuid NOT NULL,
    selection_type text NOT NULL,
    title text,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT featured_selections_selection_type_check CHECK ((selection_type = ANY (ARRAY['weekly'::text, 'monthly'::text])))
);


--
-- Name: mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentioner_id uuid NOT NULL,
    mentioned_user_id uuid NOT NULL,
    discussion_id uuid,
    reply_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mentions_has_context CHECK (((discussion_id IS NOT NULL) OR (reply_id IS NOT NULL)))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: page_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    path text NOT NULL,
    title text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    is_maintenance boolean DEFAULT false NOT NULL,
    maintenance_message text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: public_book_reviews; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_book_reviews WITH (security_invoker='on') AS
 SELECT br.id,
    br.book_id,
    br.rating,
    br.review_text,
    br.created_at,
    br.updated_at,
    p.username,
    p.full_name,
    p.avatar_url
   FROM (public.book_reviews br
     LEFT JOIN public.profiles p ON ((br.user_id = p.id)));


--
-- Name: public_books; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_books WITH (security_invoker='true') AS
 SELECT id,
    title,
    author,
    description,
    cover_url,
    file_url,
    file_size,
    pages,
    publish_year,
    publisher,
    isbn,
    language,
    category_id,
    view_count,
    download_count,
    is_featured,
    created_at,
    updated_at
   FROM public.books;


--
-- Name: public_profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_profiles WITH (security_invoker='on') AS
 SELECT id,
    username,
    avatar_url,
    full_name,
    bio,
    country,
    is_verified,
    created_at
   FROM public.profiles
  WHERE (is_public = true);


--
-- Name: reading_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reading_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    cover_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: public_reading_lists; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_reading_lists WITH (security_invoker='on') AS
 SELECT id,
    name,
    description,
    cover_url,
    is_public,
    created_at,
    updated_at
   FROM public.reading_lists
  WHERE (is_public = true);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reading_list_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reading_list_books (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    book_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now(),
    notes text,
    "position" integer DEFAULT 0
);


--
-- Name: reading_list_followers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reading_list_followers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reading_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reading_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    book_id uuid NOT NULL,
    current_page integer DEFAULT 0 NOT NULL,
    total_pages integer,
    is_completed boolean DEFAULT false,
    last_read_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: security_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    path text,
    ip_address text,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    bio text,
    avatar_url text,
    social_links jsonb DEFAULT '{}'::jsonb,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    monthly_reading_goal integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notifications_enabled boolean DEFAULT true NOT NULL,
    athkar_enabled boolean DEFAULT true,
    athkar_interval_minutes integer DEFAULT 10,
    athkar_display_seconds integer DEFAULT 15
);


--
-- Name: user_warnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_warnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reason text NOT NULL,
    content_type text,
    content_id uuid,
    report_id uuid,
    issued_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: ad_settings ad_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_settings
    ADD CONSTRAINT ad_settings_key_key UNIQUE (key);


--
-- Name: ad_settings ad_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_settings
    ADD CONSTRAINT ad_settings_pkey PRIMARY KEY (id);


--
-- Name: backup_history backup_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_history
    ADD CONSTRAINT backup_history_pkey PRIMARY KEY (id);


--
-- Name: backup_server_settings backup_server_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_server_settings
    ADD CONSTRAINT backup_server_settings_pkey PRIMARY KEY (id);


--
-- Name: blocked_ips blocked_ips_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_ip_address_key UNIQUE (ip_address);


--
-- Name: blocked_ips blocked_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_pkey PRIMARY KEY (id);


--
-- Name: book_annotations book_annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_annotations
    ADD CONSTRAINT book_annotations_pkey PRIMARY KEY (id);


--
-- Name: book_bookmarks book_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_bookmarks
    ADD CONSTRAINT book_bookmarks_pkey PRIMARY KEY (id);


--
-- Name: book_bookmarks book_bookmarks_user_id_book_id_page_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_bookmarks
    ADD CONSTRAINT book_bookmarks_user_id_book_id_page_number_key UNIQUE (user_id, book_id, page_number);


--
-- Name: book_reviews book_reviews_book_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_reviews
    ADD CONSTRAINT book_reviews_book_id_user_id_key UNIQUE (book_id, user_id);


--
-- Name: book_reviews book_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_reviews
    ADD CONSTRAINT book_reviews_pkey PRIMARY KEY (id);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: content_moderation_logs content_moderation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_moderation_logs
    ADD CONSTRAINT content_moderation_logs_pkey PRIMARY KEY (id);


--
-- Name: content_reports content_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_pkey PRIMARY KEY (id);


--
-- Name: discussion_replies discussion_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_pkey PRIMARY KEY (id);


--
-- Name: discussion_votes discussion_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_votes
    ADD CONSTRAINT discussion_votes_pkey PRIMARY KEY (id);


--
-- Name: discussion_votes discussion_votes_user_id_discussion_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_votes
    ADD CONSTRAINT discussion_votes_user_id_discussion_id_key UNIQUE (user_id, discussion_id);


--
-- Name: discussion_votes discussion_votes_user_id_reply_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_votes
    ADD CONSTRAINT discussion_votes_user_id_reply_id_key UNIQUE (user_id, reply_id);


--
-- Name: discussions discussions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_user_id_book_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_book_id_key UNIQUE (user_id, book_id);


--
-- Name: featured_selections featured_selections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_selections
    ADD CONSTRAINT featured_selections_pkey PRIMARY KEY (id);


--
-- Name: mentions mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT mentions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: page_settings page_settings_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_settings
    ADD CONSTRAINT page_settings_path_key UNIQUE (path);


--
-- Name: page_settings page_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_settings
    ADD CONSTRAINT page_settings_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: reading_list_books reading_list_books_list_id_book_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_list_books
    ADD CONSTRAINT reading_list_books_list_id_book_id_key UNIQUE (list_id, book_id);


--
-- Name: reading_list_books reading_list_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_list_books
    ADD CONSTRAINT reading_list_books_pkey PRIMARY KEY (id);


--
-- Name: reading_list_followers reading_list_followers_list_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_list_followers
    ADD CONSTRAINT reading_list_followers_list_id_user_id_key UNIQUE (list_id, user_id);


--
-- Name: reading_list_followers reading_list_followers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_list_followers
    ADD CONSTRAINT reading_list_followers_pkey PRIMARY KEY (id);


--
-- Name: reading_lists reading_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_lists
    ADD CONSTRAINT reading_lists_pkey PRIMARY KEY (id);


--
-- Name: reading_progress reading_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_progress
    ADD CONSTRAINT reading_progress_pkey PRIMARY KEY (id);


--
-- Name: reading_progress reading_progress_user_id_book_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_progress
    ADD CONSTRAINT reading_progress_user_id_book_id_key UNIQUE (user_id, book_id);


--
-- Name: security_logs security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_key UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);


--
-- Name: user_warnings user_warnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_warnings
    ADD CONSTRAINT user_warnings_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs USING btree (entity_type);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_backup_server_settings_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_server_settings_active ON public.backup_server_settings USING btree (is_active);


--
-- Name: idx_backup_server_settings_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_server_settings_default ON public.backup_server_settings USING btree (is_default);


--
-- Name: idx_book_bookmarks_user_book; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_book_bookmarks_user_book ON public.book_bookmarks USING btree (user_id, book_id);


--
-- Name: idx_contact_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_messages_created_at ON public.contact_messages USING btree (created_at DESC);


--
-- Name: idx_contact_messages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_messages_status ON public.contact_messages USING btree (status);


--
-- Name: idx_featured_selections_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_featured_selections_dates ON public.featured_selections USING btree (start_date, end_date);


--
-- Name: idx_featured_selections_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_featured_selections_type ON public.featured_selections USING btree (selection_type);


--
-- Name: idx_mentions_discussion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentions_discussion ON public.mentions USING btree (discussion_id);


--
-- Name: idx_mentions_mentioned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentions_mentioned_user ON public.mentions USING btree (mentioned_user_id);


--
-- Name: idx_mentions_reply; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentions_reply ON public.mentions USING btree (reply_id);


--
-- Name: idx_moderation_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_logs_created_at ON public.content_moderation_logs USING btree (created_at DESC);


--
-- Name: idx_moderation_logs_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_logs_severity ON public.content_moderation_logs USING btree (severity);


--
-- Name: idx_moderation_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_logs_user_id ON public.content_moderation_logs USING btree (user_id);


--
-- Name: idx_push_subscriptions_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions USING btree (endpoint);


--
-- Name: idx_push_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_reading_list_books_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reading_list_books_position ON public.reading_list_books USING btree (list_id, "position");


--
-- Name: idx_reports_content; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_content ON public.content_reports USING btree (content_type, content_id);


--
-- Name: idx_reports_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_created_at ON public.content_reports USING btree (created_at DESC);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_status ON public.content_reports USING btree (status);


--
-- Name: reading_list_books on_book_added_to_list; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_book_added_to_list AFTER INSERT ON public.reading_list_books FOR EACH ROW EXECUTE FUNCTION public.notify_list_followers();


--
-- Name: discussion_replies on_discussion_reply_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_discussion_reply_created AFTER INSERT ON public.discussion_replies FOR EACH ROW EXECUTE FUNCTION public.notify_discussion_owner_on_reply();


--
-- Name: discussion_votes on_discussion_vote_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_discussion_vote_created AFTER INSERT ON public.discussion_votes FOR EACH ROW EXECUTE FUNCTION public.notify_on_vote();


--
-- Name: profiles on_first_user_make_admin; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_first_user_make_admin AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.assign_admin_to_first_user();


--
-- Name: reading_list_followers on_list_followed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_list_followed AFTER INSERT ON public.reading_list_followers FOR EACH ROW EXECUTE FUNCTION public.notify_list_owner_on_follow();


--
-- Name: user_warnings trigger_auto_ban_on_warnings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_ban_on_warnings AFTER INSERT ON public.user_warnings FOR EACH ROW EXECUTE FUNCTION public.auto_ban_on_warnings();


--
-- Name: books update_category_book_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_category_book_count_trigger AFTER INSERT OR DELETE OR UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.update_category_book_count();


--
-- Name: discussion_replies update_discussion_replies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discussion_replies_updated_at BEFORE UPDATE ON public.discussion_replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discussions update_discussions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: featured_selections update_featured_selections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_featured_selections_updated_at BEFORE UPDATE ON public.featured_selections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: push_subscriptions update_push_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discussion_replies update_replies_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_replies_count AFTER INSERT OR DELETE ON public.discussion_replies FOR EACH ROW EXECUTE FUNCTION public.update_discussion_replies_count();


--
-- Name: team_members update_team_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_settings update_user_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: content_moderation_logs validate_moderation_log_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_moderation_log_trigger BEFORE INSERT ON public.content_moderation_logs FOR EACH ROW EXECUTE FUNCTION public.validate_moderation_log();


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ad_settings ad_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_settings
    ADD CONSTRAINT ad_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: backup_history backup_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_history
    ADD CONSTRAINT backup_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: backup_server_settings backup_server_settings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_server_settings
    ADD CONSTRAINT backup_server_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: book_annotations book_annotations_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_annotations
    ADD CONSTRAINT book_annotations_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: book_annotations book_annotations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_annotations
    ADD CONSTRAINT book_annotations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: book_bookmarks book_bookmarks_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_bookmarks
    ADD CONSTRAINT book_bookmarks_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: book_reviews book_reviews_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_reviews
    ADD CONSTRAINT book_reviews_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: books books_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: books books_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: content_moderation_logs content_moderation_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_moderation_logs
    ADD CONSTRAINT content_moderation_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: content_reports content_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: content_reports content_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: discussion_replies discussion_replies_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;


--
-- Name: discussion_replies discussion_replies_parent_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_parent_reply_id_fkey FOREIGN KEY (parent_reply_id) REFERENCES public.discussion_replies(id) ON DELETE CASCADE;


--
-- Name: discussion_replies discussion_replies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: discussion_votes discussion_votes_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_votes
    ADD CONSTRAINT discussion_votes_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;


--
-- Name: discussion_votes discussion_votes_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_votes
    ADD CONSTRAINT discussion_votes_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.discussion_replies(id) ON DELETE CASCADE;


--
-- Name: discussion_votes discussion_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_votes
    ADD CONSTRAINT discussion_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: discussions discussions_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;


--
-- Name: discussions discussions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: featured_selections featured_selections_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_selections
    ADD CONSTRAINT featured_selections_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: featured_selections featured_selections_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_selections
    ADD CONSTRAINT featured_selections_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: mentions mentions_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT mentions_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;


--
-- Name: mentions mentions_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT mentions_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.discussion_replies(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reading_list_books reading_list_books_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_list_books
    ADD CONSTRAINT reading_list_books_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: reading_list_books reading_list_books_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_list_books
    ADD CONSTRAINT reading_list_books_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.reading_lists(id) ON DELETE CASCADE;


--
-- Name: reading_list_followers reading_list_followers_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_list_followers
    ADD CONSTRAINT reading_list_followers_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.reading_lists(id) ON DELETE CASCADE;


--
-- Name: reading_lists reading_lists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_lists
    ADD CONSTRAINT reading_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reading_progress reading_progress_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_progress
    ADD CONSTRAINT reading_progress_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: reading_progress reading_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_progress
    ADD CONSTRAINT reading_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_warnings user_warnings_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_warnings
    ADD CONSTRAINT user_warnings_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.content_reports(id) ON DELETE SET NULL;


--
-- Name: ad_settings Admins can delete ad settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete ad settings" ON public.ad_settings FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: books Admins can delete all books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete all books" ON public.books FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: discussions Admins can delete any discussion; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete any discussion" ON public.discussions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: discussion_replies Admins can delete any reply; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete any reply" ON public.discussion_replies FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: book_reviews Admins can delete any review; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete any review" ON public.book_reviews FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: backup_history Admins can delete backup history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete backup history" ON public.backup_history FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Admins can delete categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contact_messages Admins can delete contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete contact messages" ON public.contact_messages FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_warnings Admins can delete warnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete warnings" ON public.user_warnings FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activity_logs Admins can insert activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ad_settings Admins can insert ad settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert ad settings" ON public.ad_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: books Admins can insert books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert books" ON public.books FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Admins can insert categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins can insert notifications for users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert notifications for users" ON public.notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: site_settings Admins can insert site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert site settings" ON public.site_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_warnings Admins can insert warnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert warnings" ON public.user_warnings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: backup_server_settings Admins can manage backup server settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage backup server settings" ON public.backup_server_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blocked_ips Admins can manage blocked IPs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage blocked IPs" ON public.blocked_ips USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: featured_selections Admins can manage featured selections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage featured selections" ON public.featured_selections USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: content_moderation_logs Admins can manage moderation logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage moderation logs" ON public.content_moderation_logs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: page_settings Admins can manage page settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage page settings" ON public.page_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_members Admins can manage team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage team members" ON public.team_members USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: ad_settings Admins can update ad settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update ad settings" ON public.ad_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: books Admins can update all books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all books" ON public.books FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: discussions Admins can update any discussion; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any discussion" ON public.discussions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Admins can update categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contact_messages Admins can update contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update contact messages" ON public.contact_messages FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: content_reports Admins can update reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update reports" ON public.content_reports FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: site_settings Admins can update site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update site settings" ON public.site_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_warnings Admins can update warnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update warnings" ON public.user_warnings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activity_logs Admins can view all activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: books Admins can view all books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all books" ON public.books FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: content_reports Admins can view all reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all reports" ON public.content_reports FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: book_reviews Admins can view all reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all reviews" ON public.book_reviews FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_warnings Admins can view all warnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all warnings" ON public.user_warnings FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: security_logs Admins can view security logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view security logs" ON public.security_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: security_logs Allow insert via security definer function; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert via security definer function" ON public.security_logs FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (user_id IS NULL))));


--
-- Name: page_settings Anyone can read page settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read page settings" ON public.page_settings FOR SELECT USING (true);


--
-- Name: site_settings Anyone can read site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);


--
-- Name: contact_messages Anyone can submit contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);


--
-- Name: team_members Anyone can view active team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active team members" ON public.team_members FOR SELECT USING ((is_active = true));


--
-- Name: ad_settings Anyone can view ad settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view ad settings" ON public.ad_settings FOR SELECT USING (true);


--
-- Name: books Anyone can view all books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view all books" ON public.books FOR SELECT USING (true);


--
-- Name: reading_list_books Anyone can view books in public lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view books in public lists" ON public.reading_list_books FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.reading_lists rl
  WHERE ((rl.id = reading_list_books.list_id) AND (rl.is_public = true)))));


--
-- Name: categories Anyone can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);


--
-- Name: featured_selections Anyone can view featured selections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view featured selections" ON public.featured_selections FOR SELECT USING (true);


--
-- Name: reading_lists Anyone can view public lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view public lists" ON public.reading_lists FOR SELECT USING (((auth.uid() = user_id) OR (is_public = true)));


--
-- Name: book_reviews Authenticated users can add reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can add reviews" ON public.book_reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: discussions Authenticated users can create discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create discussions" ON public.discussions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: discussion_replies Authenticated users can create replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create replies" ON public.discussion_replies FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: categories Authenticated users can insert categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert categories" ON public.categories FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: discussions Authenticated users can view discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view discussions" ON public.discussions FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: mentions Authenticated users can view mentions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view mentions" ON public.mentions FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: profiles Authenticated users can view public profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view public profiles" ON public.profiles FOR SELECT USING (((auth.uid() = id) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR ((auth.uid() IS NOT NULL) AND (is_public = true))));


--
-- Name: discussion_replies Authenticated users can view replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view replies" ON public.discussion_replies FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: book_reviews Authenticated users can view reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view reviews" ON public.book_reviews FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: discussion_votes Authenticated users can view votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view votes" ON public.discussion_votes FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: discussion_votes Authenticated users can vote; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can vote" ON public.discussion_votes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reading_list_followers List owners can see followers count; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "List owners can see followers count" ON public.reading_list_followers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.reading_lists
  WHERE ((reading_lists.id = reading_list_followers.list_id) AND (reading_lists.user_id = auth.uid())))));


--
-- Name: contact_messages Only admins can view contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view contact messages" ON public.contact_messages FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: backup_history Service role or admins can insert backup history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role or admins can insert backup history" ON public.backup_history FOR INSERT WITH CHECK (((auth.uid() IS NULL) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: backup_history Service role or admins can view backup history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role or admins can view backup history" ON public.backup_history FOR SELECT USING (((auth.uid() IS NULL) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: reading_list_books Users can add books to their lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add books to their lists" ON public.reading_list_books FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.reading_lists rl
  WHERE ((rl.id = reading_list_books.list_id) AND (rl.user_id = auth.uid())))));


--
-- Name: favorites Users can add favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: mentions Users can create mentions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create mentions" ON public.mentions FOR INSERT WITH CHECK ((auth.uid() = mentioner_id));


--
-- Name: content_reports Users can create reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports" ON public.content_reports FOR INSERT TO authenticated WITH CHECK ((auth.uid() = reporter_id));


--
-- Name: reading_lists Users can create their own lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own lists" ON public.reading_lists FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: book_annotations Users can delete their annotations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their annotations" ON public.book_annotations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: mentions Users can delete their mentions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their mentions" ON public.mentions FOR DELETE USING ((auth.uid() = mentioner_id));


--
-- Name: book_bookmarks Users can delete their own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own bookmarks" ON public.book_bookmarks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: books Users can delete their own books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own books" ON public.books FOR DELETE USING ((auth.uid() = uploaded_by));


--
-- Name: discussions Users can delete their own discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own discussions" ON public.discussions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: reading_lists Users can delete their own lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own lists" ON public.reading_lists FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can delete their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING ((auth.uid() = id));


--
-- Name: discussion_replies Users can delete their own replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own replies" ON public.discussion_replies FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: book_reviews Users can delete their own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own reviews" ON public.book_reviews FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_settings Users can delete their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own settings" ON public.user_settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can delete their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: discussion_votes Users can delete their own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own votes" ON public.discussion_votes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: reading_progress Users can delete their reading progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their reading progress" ON public.reading_progress FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: reading_list_followers Users can follow public lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can follow public lists" ON public.reading_list_followers FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.reading_lists
  WHERE ((reading_lists.id = reading_list_followers.list_id) AND (reading_lists.is_public = true))))));


--
-- Name: book_annotations Users can insert their annotations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their annotations" ON public.book_annotations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: book_bookmarks Users can insert their own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own bookmarks" ON public.book_bookmarks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: books Users can insert their own books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own books" ON public.books FOR INSERT WITH CHECK ((auth.uid() = uploaded_by));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: user_settings Users can insert their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own settings" ON public.user_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can insert their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reading_progress Users can insert their reading progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their reading progress" ON public.reading_progress FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reading_list_books Users can remove books from their lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove books from their lists" ON public.reading_list_books FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.reading_lists rl
  WHERE ((rl.id = reading_list_books.list_id) AND (rl.user_id = auth.uid())))));


--
-- Name: favorites Users can remove favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: reading_list_followers Users can unfollow lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unfollow lists" ON public.reading_list_followers FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: reading_list_books Users can update books in their lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update books in their lists" ON public.reading_list_books FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.reading_lists rl
  WHERE ((rl.id = reading_list_books.list_id) AND (rl.user_id = auth.uid())))));


--
-- Name: book_annotations Users can update their annotations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their annotations" ON public.book_annotations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: book_bookmarks Users can update their own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bookmarks" ON public.book_bookmarks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: books Users can update their own books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own books" ON public.books FOR UPDATE USING ((auth.uid() = uploaded_by));


--
-- Name: discussions Users can update their own discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own discussions" ON public.discussions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: reading_lists Users can update their own lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own lists" ON public.reading_lists FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: discussion_replies Users can update their own replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own replies" ON public.discussion_replies FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: book_reviews Users can update their own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own reviews" ON public.book_reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_settings Users can update their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can update their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own subscriptions" ON public.push_subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: discussion_votes Users can update their own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own votes" ON public.discussion_votes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: reading_progress Users can update their reading progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their reading progress" ON public.reading_progress FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: reading_list_books Users can view books in their lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view books in their lists" ON public.reading_list_books FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.reading_lists rl
  WHERE ((rl.id = reading_list_books.list_id) AND (rl.user_id = auth.uid())))));


--
-- Name: content_reports Users can view own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own reports" ON public.content_reports FOR SELECT TO authenticated USING ((auth.uid() = reporter_id));


--
-- Name: reading_list_followers Users can view their followed lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their followed lists" ON public.reading_list_followers FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: book_annotations Users can view their own annotations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own annotations" ON public.book_annotations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: book_bookmarks Users can view their own bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bookmarks" ON public.book_bookmarks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: books Users can view their own books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own books" ON public.books FOR SELECT TO authenticated USING ((auth.uid() = uploaded_by));


--
-- Name: favorites Users can view their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: reading_lists Users can view their own lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own lists" ON public.reading_lists FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: reading_progress Users can view their own reading progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own reading progress" ON public.reading_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_settings Users can view their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_warnings Users can view their own warnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own warnings" ON public.user_warnings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_server_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_server_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_ips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

--
-- Name: book_annotations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_annotations ENABLE ROW LEVEL SECURITY;

--
-- Name: book_bookmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_bookmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: book_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: books; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: content_moderation_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_moderation_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: content_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: discussion_replies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;

--
-- Name: discussion_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: discussions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: featured_selections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.featured_selections ENABLE ROW LEVEL SECURITY;

--
-- Name: mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: page_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: reading_list_books; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reading_list_books ENABLE ROW LEVEL SECURITY;

--
-- Name: reading_list_followers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reading_list_followers ENABLE ROW LEVEL SECURITY;

--
-- Name: reading_lists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reading_lists ENABLE ROW LEVEL SECURITY;

--
-- Name: reading_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: security_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_warnings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;