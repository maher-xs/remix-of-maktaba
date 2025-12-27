-- =============================================
-- مكتبة - Complete Database Export for Self-Hosted Supabase
-- Generated: 2025-12-27
-- Version: 2.0 - Full Schema with ALL Features
-- =============================================

-- =============================================
-- 1. EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 2. CUSTOM TYPES (ENUMS)
-- =============================================
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 3. TABLES
-- =============================================

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    country TEXT,
    is_public BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    is_banned BOOLEAN DEFAULT false,
    banned_at TIMESTAMPTZ,
    banned_reason TEXT,
    banned_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'book',
    color TEXT NOT NULL DEFAULT 'bg-primary',
    book_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Books Table
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    file_url TEXT,
    file_size TEXT,
    pages INTEGER,
    publish_year INTEGER,
    publisher TEXT,
    isbn TEXT,
    language TEXT DEFAULT 'ar',
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

-- Reading Progress Table
CREATE TABLE IF NOT EXISTS public.reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    current_page INTEGER NOT NULL DEFAULT 0,
    total_pages INTEGER,
    is_completed BOOLEAN DEFAULT false,
    last_read_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

-- Book Annotations Table
CREATE TABLE IF NOT EXISTS public.book_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    color TEXT DEFAULT 'yellow',
    annotation_type TEXT DEFAULT 'highlight',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Book Bookmarks Table
CREATE TABLE IF NOT EXISTS public.book_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    title TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Book Reviews Table
CREATE TABLE IF NOT EXISTS public.book_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

-- Reading Lists Table
CREATE TABLE IF NOT EXISTS public.reading_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reading List Books Table
CREATE TABLE IF NOT EXISTS public.reading_list_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.reading_lists(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    notes TEXT,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (list_id, book_id)
);

-- Reading List Followers Table
CREATE TABLE IF NOT EXISTS public.reading_list_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.reading_lists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (list_id, user_id)
);

-- Discussions Table
CREATE TABLE IF NOT EXISTS public.discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    views_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Discussion Replies Table
CREATE TABLE IF NOT EXISTS public.discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES public.discussion_replies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Discussion Votes Table
CREATE TABLE IF NOT EXISTS public.discussion_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    discussion_id UUID REFERENCES public.discussions(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES public.discussion_replies(id) ON DELETE CASCADE,
    vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, discussion_id),
    UNIQUE (user_id, reply_id)
);

-- Mentions Table
CREATE TABLE IF NOT EXISTS public.mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    discussion_id UUID REFERENCES public.discussions(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES public.discussion_replies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contact Messages Table
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    admin_notes TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content Reports Table
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content_id UUID NOT NULL,
    content_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Warnings Table
CREATE TABLE IF NOT EXISTS public.user_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    issued_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    notes TEXT,
    content_type TEXT,
    content_id UUID,
    report_id UUID REFERENCES public.content_reports(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_reading_goal INTEGER NOT NULL DEFAULT 5,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    athkar_enabled BOOLEAN DEFAULT true,
    athkar_interval_minutes INTEGER DEFAULT 30,
    athkar_display_seconds INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Site Settings Table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ad Settings Table
CREATE TABLE IF NOT EXISTS public.ad_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Page Settings Table
CREATE TABLE IF NOT EXISTS public.page_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_maintenance BOOLEAN NOT NULL DEFAULT false,
    maintenance_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Featured Selections Table
CREATE TABLE IF NOT EXISTS public.featured_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    selection_type TEXT NOT NULL,
    title TEXT,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    entity_name TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security Logs Table
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    path TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blocked IPs Table
CREATE TABLE IF NOT EXISTS public.blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL UNIQUE,
    reason TEXT,
    failed_attempts INTEGER DEFAULT 0,
    blocked_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Content Moderation Logs Table
CREATE TABLE IF NOT EXISTS public.content_moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    content_type TEXT NOT NULL,
    content_field TEXT,
    original_content TEXT,
    flagged_words TEXT[],
    severity TEXT NOT NULL DEFAULT 'low',
    action_taken TEXT NOT NULL DEFAULT 'blocked',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backup History Table
CREATE TABLE IF NOT EXISTS public.backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    tables_backed_up TEXT[] NOT NULL,
    records_count JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'completed',
    error_message TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backup Server Settings Table
CREATE TABLE IF NOT EXISTS public.backup_server_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    host TEXT,
    port INTEGER,
    username TEXT,
    password TEXT,
    path TEXT DEFAULT '/',
    access_key TEXT,
    secret_key TEXT,
    bucket_name TEXT,
    region TEXT,
    is_active BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    auto_backup_enabled BOOLEAN DEFAULT false,
    auto_backup_schedule TEXT DEFAULT 'weekly',
    max_backups INTEGER DEFAULT 10,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 4. VIEWS
-- =============================================

-- Public Books View
CREATE OR REPLACE VIEW public.public_books WITH (security_invoker='true') AS
SELECT 
    id, title, author, description, cover_url, file_url, file_size,
    pages, publish_year, publisher, isbn, language, category_id,
    is_featured, view_count, download_count, created_at, updated_at
FROM public.books;

-- Public Profiles View
CREATE OR REPLACE VIEW public.public_profiles WITH (security_invoker='on') AS
SELECT 
    id, full_name, username, avatar_url, bio, country,
    is_verified, created_at
FROM public.profiles
WHERE is_public = true AND is_banned = false;

-- Public Reading Lists View
CREATE OR REPLACE VIEW public.public_reading_lists WITH (security_invoker='on') AS
SELECT 
    id, name, description, cover_url, is_public, created_at, updated_at
FROM public.reading_lists
WHERE is_public = true;

-- Public Book Reviews View
CREATE OR REPLACE VIEW public.public_book_reviews WITH (security_invoker='on') AS
SELECT 
    br.id, br.book_id, br.rating, br.review_text, br.created_at, br.updated_at,
    p.full_name, p.username, p.avatar_url
FROM public.book_reviews br
JOIN public.profiles p ON br.user_id = p.id;

-- =============================================
-- 5. FUNCTIONS
-- =============================================

-- Has Role Function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Ensure Profile Function
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      SET username = final_username, updated_at = now()
      WHERE id = v_user_id;
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    RETURN v_profile;
  END IF;

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

-- Handle New User Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  base_username := split_part(NEW.email, '@', 1);
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g');
  IF base_username = '' OR base_username IS NULL THEN
    base_username := 'user';
  END IF;
  
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

-- Assign Admin to First User Function
CREATE OR REPLACE FUNCTION public.assign_admin_to_first_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles WHERE id != NEW.id;
  
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
    
    UPDATE public.profiles 
    SET is_verified = true, verified_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Get Admin Stats Function
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE(total_users bigint, total_books bigint, total_categories bigint, total_favorites bigint, active_readers_today bigint, new_books_week bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Get Admin Users Function
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(id uuid, email text, full_name text, username text, avatar_url text, bio text, country text, is_public boolean, is_verified boolean, verified_at timestamptz, verified_by uuid, is_banned boolean, banned_at timestamptz, banned_reason text, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Get Book Rating Function
CREATE OR REPLACE FUNCTION public.get_book_rating(p_book_id uuid)
RETURNS TABLE(average_rating numeric, total_reviews bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Get Reading Stats Function
CREATE OR REPLACE FUNCTION public.get_reading_stats(p_user_id uuid)
RETURNS TABLE(total_books_read bigint, total_pages_read bigint, books_completed bigint, total_annotations bigint, favorite_category text, reading_streak integer, last_read_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_read_at timestamp with time zone;
BEGIN
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

-- Get Book Recommendations Function
CREATE OR REPLACE FUNCTION public.get_book_recommendations(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid, title text, author text, cover_url text, description text, category_id uuid, view_count integer, download_count integer, score bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Search Books Function
CREATE OR REPLACE FUNCTION public.search_books(search_query text)
RETURNS SETOF books
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.books
  WHERE title ILIKE '%' || search_query || '%' 
     OR author ILIKE '%' || search_query || '%'
     OR description ILIKE '%' || search_query || '%';
END;
$$;

-- Ban User Function
CREATE OR REPLACE FUNCTION public.ban_user(target_user_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
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

-- Unban User Function
CREATE OR REPLACE FUNCTION public.unban_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Is User Banned Function
CREATE OR REPLACE FUNCTION public.is_user_banned(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_banned FROM public.profiles WHERE id = check_user_id),
    false
  )
$$;

-- Check Username Available Function
CREATE OR REPLACE FUNCTION public.check_username_available(check_username text, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE username = check_username AND id != user_id
  );
END;
$$;

-- Increment Download Count Function
CREATE OR REPLACE FUNCTION public.increment_download_count(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.books SET download_count = download_count + 1 WHERE id = book_id;
END;
$$;

-- Get User Warnings Count Function
CREATE OR REPLACE FUNCTION public.get_user_warnings_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.user_warnings
  WHERE user_id = p_user_id
$$;

-- Update Updated At Column Function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update Category Book Count Function
CREATE OR REPLACE FUNCTION public.update_category_book_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.category_id IS NOT NULL THEN
      UPDATE public.categories 
      SET book_count = (SELECT COUNT(*) FROM public.books WHERE category_id = NEW.category_id)
      WHERE id = NEW.category_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.category_id IS NOT NULL THEN
      UPDATE public.categories 
      SET book_count = (SELECT COUNT(*) FROM public.books WHERE category_id = OLD.category_id)
      WHERE id = OLD.category_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
      IF OLD.category_id IS NOT NULL THEN
        UPDATE public.categories 
        SET book_count = (SELECT COUNT(*) FROM public.books WHERE category_id = OLD.category_id)
        WHERE id = OLD.category_id;
      END IF;
      IF NEW.category_id IS NOT NULL THEN
        UPDATE public.categories 
        SET book_count = (SELECT COUNT(*) FROM public.books WHERE category_id = NEW.category_id)
        WHERE id = NEW.category_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Update Discussion Replies Count Function
CREATE OR REPLACE FUNCTION public.update_discussion_replies_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Increment Failed Attempts Function
CREATE OR REPLACE FUNCTION public.increment_failed_attempts(p_ip_address text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts integer;
  v_blocked boolean := false;
BEGIN
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

-- Log Failed Login Function
CREATE OR REPLACE FUNCTION public.log_failed_login(p_email text, p_error_message text DEFAULT NULL, p_ip_address text DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block_result jsonb;
BEGIN
  INSERT INTO public.security_logs (user_id, action, path, details, ip_address, user_agent)
  VALUES (
    NULL,
    'failed_login',
    '/auth',
    jsonb_build_object('email', p_email, 'error', p_error_message, 'attempted_at', now()),
    p_ip_address,
    p_user_agent
  );

  IF p_ip_address IS NOT NULL AND p_ip_address != '' THEN
    v_block_result := increment_failed_attempts(p_ip_address);
    RETURN v_block_result;
  END IF;

  RETURN jsonb_build_object('blocked', false);
END;
$$;

-- Log Security Event Function
CREATE OR REPLACE FUNCTION public.log_security_event(p_action text, p_path text DEFAULT NULL, p_details jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_logs (user_id, action, path, details)
  VALUES (auth.uid(), p_action, p_path, p_details);
END;
$$;

-- Add Security Log Function
CREATE OR REPLACE FUNCTION public.add_security_log(p_action text, p_path text DEFAULT NULL, p_details jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  INSERT INTO public.security_logs (user_id, action, path, details)
  VALUES (auth.uid(), p_action, p_path, p_details);
END;
$$;

-- Insert Security Log Safe Function
CREATE OR REPLACE FUNCTION public.insert_security_log_safe(p_action text, p_path text DEFAULT NULL, p_details jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  INSERT INTO public.security_logs (user_id, action, path, details)
  VALUES (auth.uid(), p_action, p_path, p_details);
END;
$$;

-- Get Moderation Stats Function
CREATE OR REPLACE FUNCTION public.get_moderation_stats()
RETURNS TABLE(total_blocked bigint, blocked_today bigint, blocked_week bigint, high_severity bigint, by_content_type jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Get Report Stats Function
CREATE OR REPLACE FUNCTION public.get_report_stats()
RETURNS TABLE(total_reports bigint, pending_reports bigint, resolved_today bigint, by_reason jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Validate Moderation Log Function
CREATE OR REPLACE FUNCTION public.validate_moderation_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.content_type IS NULL OR NEW.severity IS NULL OR NEW.action_taken IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;
  
  IF NEW.content_type NOT IN ('book', 'review', 'profile', 'reading_list', 'image', 'comment') THEN
    RAISE EXCEPTION 'Invalid content type';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Auto Ban on Warnings Function
CREATE OR REPLACE FUNCTION public.auto_ban_on_warnings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_warnings_count integer;
BEGIN
  SELECT COUNT(*) INTO v_warnings_count
  FROM public.user_warnings
  WHERE user_id = NEW.user_id;

  IF v_warnings_count >= 3 THEN
    UPDATE public.profiles
    SET 
      is_banned = true,
      banned_at = now(),
      banned_reason = 'حظر تلقائي: تجاوز 3 تحذيرات',
      banned_by = NEW.issued_by
    WHERE id = NEW.user_id;

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

-- Notify Discussion Owner on Reply Function
CREATE OR REPLACE FUNCTION public.notify_discussion_owner_on_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discussion discussions%ROWTYPE;
  v_replier_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_discussion FROM discussions WHERE id = NEW.discussion_id;
  SELECT * INTO v_replier_profile FROM profiles WHERE id = NEW.user_id;
  
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
  
  IF NEW.parent_reply_id IS NOT NULL THEN
    DECLARE
      v_parent_reply discussion_replies%ROWTYPE;
    BEGIN
      SELECT * INTO v_parent_reply FROM discussion_replies WHERE id = NEW.parent_reply_id;
      
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

-- Notify on Vote Function
CREATE OR REPLACE FUNCTION public.notify_on_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discussion discussions%ROWTYPE;
  v_reply discussion_replies%ROWTYPE;
  v_voter_profile profiles%ROWTYPE;
  v_vote_text text;
BEGIN
  IF NEW.vote_type <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_voter_profile FROM profiles WHERE id = NEW.user_id;
  v_vote_text := CASE WHEN NEW.vote_type = 1 THEN 'أعجب بـ' ELSE 'صوّت على' END;

  IF NEW.discussion_id IS NOT NULL AND NEW.reply_id IS NULL THEN
    SELECT * INTO v_discussion FROM discussions WHERE id = NEW.discussion_id;
    
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

  IF NEW.reply_id IS NOT NULL THEN
    SELECT * INTO v_reply FROM discussion_replies WHERE id = NEW.reply_id;
    SELECT * INTO v_discussion FROM discussions WHERE id = v_reply.discussion_id;
    
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

-- Notify List Followers Function
CREATE OR REPLACE FUNCTION public.notify_list_followers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list reading_lists%ROWTYPE;
  v_book books%ROWTYPE;
  v_follower RECORD;
BEGIN
  SELECT * INTO v_list FROM reading_lists WHERE id = NEW.list_id;
  
  IF v_list.is_public = true THEN
    SELECT * INTO v_book FROM books WHERE id = NEW.book_id;
    
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

-- Notify List Owner on Follow Function
CREATE OR REPLACE FUNCTION public.notify_list_owner_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list reading_lists%ROWTYPE;
  v_follower_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_list FROM reading_lists WHERE id = NEW.list_id;
  SELECT * INTO v_follower_profile FROM profiles WHERE id = NEW.user_id;
  
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

-- =============================================
-- 6. TRIGGERS
-- =============================================

-- Create Profile on User Signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Assign Admin to First User
DROP TRIGGER IF EXISTS assign_admin_on_first_profile ON public.profiles;
CREATE TRIGGER assign_admin_on_first_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_to_first_user();

-- Update Category Book Count
DROP TRIGGER IF EXISTS update_book_count_trigger ON public.books;
CREATE TRIGGER update_book_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_category_book_count();

-- Update Discussion Replies Count
DROP TRIGGER IF EXISTS update_replies_count_trigger ON public.discussion_replies;
CREATE TRIGGER update_replies_count_trigger
  AFTER INSERT OR DELETE ON public.discussion_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_discussion_replies_count();

-- Auto Ban on Multiple Warnings
DROP TRIGGER IF EXISTS auto_ban_on_warnings_trigger ON public.user_warnings;
CREATE TRIGGER auto_ban_on_warnings_trigger
  AFTER INSERT ON public.user_warnings
  FOR EACH ROW EXECUTE FUNCTION public.auto_ban_on_warnings();

-- Notify Discussion Owner on Reply
DROP TRIGGER IF EXISTS notify_on_reply_trigger ON public.discussion_replies;
CREATE TRIGGER notify_on_reply_trigger
  AFTER INSERT ON public.discussion_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_discussion_owner_on_reply();

-- Notify on Vote
DROP TRIGGER IF EXISTS notify_on_vote_trigger ON public.discussion_votes;
CREATE TRIGGER notify_on_vote_trigger
  AFTER INSERT ON public.discussion_votes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_vote();

-- Notify List Followers
DROP TRIGGER IF EXISTS notify_list_followers_trigger ON public.reading_list_books;
CREATE TRIGGER notify_list_followers_trigger
  AFTER INSERT ON public.reading_list_books
  FOR EACH ROW EXECUTE FUNCTION public.notify_list_followers();

-- Notify List Owner on Follow
DROP TRIGGER IF EXISTS notify_on_follow_trigger ON public.reading_list_followers;
CREATE TRIGGER notify_on_follow_trigger
  AFTER INSERT ON public.reading_list_followers
  FOR EACH ROW EXECUTE FUNCTION public.notify_list_owner_on_follow();

-- Validate Moderation Log
DROP TRIGGER IF EXISTS validate_moderation_log_trigger ON public.content_moderation_logs;
CREATE TRIGGER validate_moderation_log_trigger
  BEFORE INSERT ON public.content_moderation_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_moderation_log();

-- Auto-update updated_at timestamps
DROP TRIGGER IF EXISTS update_discussion_replies_updated_at ON public.discussion_replies;
CREATE TRIGGER update_discussion_replies_updated_at
  BEFORE UPDATE ON public.discussion_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_discussions_updated_at ON public.discussions;
CREATE TRIGGER update_discussions_updated_at
  BEFORE UPDATE ON public.discussions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_featured_selections_updated_at ON public.featured_selections;
CREATE TRIGGER update_featured_selections_updated_at
  BEFORE UPDATE ON public.featured_selections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_members_updated_at ON public.team_members;
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_list_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_list_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_server_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =============================================

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view public profiles" ON public.profiles FOR SELECT USING ((auth.uid() = id) OR has_role(auth.uid(), 'admin') OR ((auth.uid() IS NOT NULL) AND (is_public = true)));

-- USER ROLES POLICIES
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- CATEGORIES POLICIES
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- BOOKS POLICIES
CREATE POLICY "Anyone can view all books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Users can view their own books" ON public.books FOR SELECT USING (auth.uid() = uploaded_by);
CREATE POLICY "Users can insert their own books" ON public.books FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can update their own books" ON public.books FOR UPDATE USING (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete their own books" ON public.books FOR DELETE USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can view all books" ON public.books FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert books" ON public.books FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all books" ON public.books FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete all books" ON public.books FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- FAVORITES POLICIES
CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- READING PROGRESS POLICIES
CREATE POLICY "Users can view their own reading progress" ON public.reading_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their reading progress" ON public.reading_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their reading progress" ON public.reading_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their reading progress" ON public.reading_progress FOR DELETE USING (auth.uid() = user_id);

-- BOOK ANNOTATIONS POLICIES
CREATE POLICY "Users can view their own annotations" ON public.book_annotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their annotations" ON public.book_annotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their annotations" ON public.book_annotations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their annotations" ON public.book_annotations FOR DELETE USING (auth.uid() = user_id);

-- BOOK BOOKMARKS POLICIES
CREATE POLICY "Users can view their own bookmarks" ON public.book_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bookmarks" ON public.book_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bookmarks" ON public.book_bookmarks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bookmarks" ON public.book_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- BOOK REVIEWS POLICIES
CREATE POLICY "Authenticated users can view reviews" ON public.book_reviews FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can add reviews" ON public.book_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.book_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.book_reviews FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reviews" ON public.book_reviews FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any review" ON public.book_reviews FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- READING LISTS POLICIES
CREATE POLICY "Users can view their own lists" ON public.reading_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view public lists" ON public.reading_lists FOR SELECT USING ((auth.uid() = user_id) OR (is_public = true));
CREATE POLICY "Users can create their own lists" ON public.reading_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lists" ON public.reading_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lists" ON public.reading_lists FOR DELETE USING (auth.uid() = user_id);

-- READING LIST BOOKS POLICIES
CREATE POLICY "Users can view books in their lists" ON public.reading_list_books FOR SELECT USING (EXISTS (SELECT 1 FROM reading_lists rl WHERE rl.id = reading_list_books.list_id AND rl.user_id = auth.uid()));
CREATE POLICY "Anyone can view books in public lists" ON public.reading_list_books FOR SELECT USING (EXISTS (SELECT 1 FROM reading_lists rl WHERE rl.id = reading_list_books.list_id AND rl.is_public = true));
CREATE POLICY "Users can add books to their lists" ON public.reading_list_books FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM reading_lists rl WHERE rl.id = reading_list_books.list_id AND rl.user_id = auth.uid()));
CREATE POLICY "Users can update books in their lists" ON public.reading_list_books FOR UPDATE USING (EXISTS (SELECT 1 FROM reading_lists rl WHERE rl.id = reading_list_books.list_id AND rl.user_id = auth.uid()));
CREATE POLICY "Users can remove books from their lists" ON public.reading_list_books FOR DELETE USING (EXISTS (SELECT 1 FROM reading_lists rl WHERE rl.id = reading_list_books.list_id AND rl.user_id = auth.uid()));

-- READING LIST FOLLOWERS POLICIES
CREATE POLICY "Users can view their followed lists" ON public.reading_list_followers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "List owners can see followers count" ON public.reading_list_followers FOR SELECT USING (EXISTS (SELECT 1 FROM reading_lists WHERE reading_lists.id = reading_list_followers.list_id AND reading_lists.user_id = auth.uid()));
CREATE POLICY "Users can follow public lists" ON public.reading_list_followers FOR INSERT WITH CHECK ((auth.uid() = user_id) AND (EXISTS (SELECT 1 FROM reading_lists WHERE reading_lists.id = reading_list_followers.list_id AND reading_lists.is_public = true)));
CREATE POLICY "Users can unfollow lists" ON public.reading_list_followers FOR DELETE USING (auth.uid() = user_id);

-- DISCUSSIONS POLICIES
CREATE POLICY "Authenticated users can view discussions" ON public.discussions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create discussions" ON public.discussions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own discussions" ON public.discussions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own discussions" ON public.discussions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any discussion" ON public.discussions FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any discussion" ON public.discussions FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- DISCUSSION REPLIES POLICIES
CREATE POLICY "Authenticated users can view replies" ON public.discussion_replies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create replies" ON public.discussion_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own replies" ON public.discussion_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own replies" ON public.discussion_replies FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any reply" ON public.discussion_replies FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- DISCUSSION VOTES POLICIES
CREATE POLICY "Authenticated users can view votes" ON public.discussion_votes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can vote" ON public.discussion_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own votes" ON public.discussion_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own votes" ON public.discussion_votes FOR DELETE USING (auth.uid() = user_id);

-- MENTIONS POLICIES
CREATE POLICY "Authenticated users can view mentions" ON public.mentions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create mentions" ON public.mentions FOR INSERT WITH CHECK (auth.uid() = mentioner_id);
CREATE POLICY "Users can delete their mentions" ON public.mentions FOR DELETE USING (auth.uid() = mentioner_id);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications for users" ON public.notifications FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- PUSH SUBSCRIPTIONS POLICIES
CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions" ON public.push_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- CONTACT MESSAGES POLICIES
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can view contact messages" ON public.contact_messages FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update contact messages" ON public.contact_messages FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete contact messages" ON public.contact_messages FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- CONTENT REPORTS POLICIES
CREATE POLICY "Users can create reports" ON public.content_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.content_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Admins can view all reports" ON public.content_reports FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reports" ON public.content_reports FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- USER WARNINGS POLICIES
CREATE POLICY "Admins can manage user warnings" ON public.user_warnings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own warnings" ON public.user_warnings FOR SELECT USING (auth.uid() = user_id);

-- USER SETTINGS POLICIES
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own settings" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);


-- SITE SETTINGS POLICIES
CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert site settings" ON public.site_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site settings" ON public.site_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- AD SETTINGS POLICIES
CREATE POLICY "Anyone can view ad settings" ON public.ad_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert ad settings" ON public.ad_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update ad settings" ON public.ad_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete ad settings" ON public.ad_settings FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- PAGE SETTINGS POLICIES
CREATE POLICY "Anyone can read page settings" ON public.page_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage page settings" ON public.page_settings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- TEAM MEMBERS POLICIES
CREATE POLICY "Anyone can view active team members" ON public.team_members FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage team members" ON public.team_members FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- FEATURED SELECTIONS POLICIES
CREATE POLICY "Anyone can view featured selections" ON public.featured_selections FOR SELECT USING (true);
CREATE POLICY "Admins can manage featured selections" ON public.featured_selections FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ACTIVITY LOGS POLICIES
CREATE POLICY "Admins can view all activity logs" ON public.activity_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- SECURITY LOGS POLICIES
CREATE POLICY "Admins can view security logs" ON public.security_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Allow insert via security definer function" ON public.security_logs FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (user_id IS NULL)));

-- BLOCKED IPS POLICIES
CREATE POLICY "Admins can manage blocked IPs" ON public.blocked_ips FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- CONTENT MODERATION LOGS POLICIES
CREATE POLICY "Admins can manage moderation logs" ON public.content_moderation_logs FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- BACKUP HISTORY POLICIES
CREATE POLICY "Service role or admins can view backup history" ON public.backup_history FOR SELECT USING ((auth.uid() IS NULL) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role or admins can insert backup history" ON public.backup_history FOR INSERT WITH CHECK ((auth.uid() IS NULL) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete backup history" ON public.backup_history FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- BACKUP SERVER SETTINGS POLICIES
CREATE POLICY "Admins can manage backup server settings" ON public.backup_server_settings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- =============================================
-- 9. STORAGE BUCKETS
-- =============================================

-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('maktaba', 'maktaba', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('reading-list-covers', 'reading-list-covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('backups', 'backups', false, 524288000, ARRAY['application/json', 'application/zip'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- 10. STORAGE POLICIES
-- =============================================

-- MAKTABA BUCKET POLICIES
CREATE POLICY "Anyone can view maktaba files" ON storage.objects FOR SELECT USING (bucket_id = 'maktaba');
CREATE POLICY "Authenticated users can upload to maktaba" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'maktaba' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own files in maktaba" ON storage.objects FOR UPDATE USING (bucket_id = 'maktaba' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own files in maktaba" ON storage.objects FOR DELETE USING (bucket_id = 'maktaba' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can manage all maktaba files" ON storage.objects FOR ALL USING (bucket_id = 'maktaba' AND has_role(auth.uid(), 'admin'));

-- AVATARS BUCKET POLICIES
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- READING LIST COVERS BUCKET POLICIES
CREATE POLICY "Anyone can view reading list covers" ON storage.objects FOR SELECT USING (bucket_id = 'reading-list-covers');
CREATE POLICY "Users can upload reading list covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reading-list-covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their reading list covers" ON storage.objects FOR UPDATE USING (bucket_id = 'reading-list-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their reading list covers" ON storage.objects FOR DELETE USING (bucket_id = 'reading-list-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- BACKUPS BUCKET POLICIES
CREATE POLICY "Admins can view backups" ON storage.objects FOR SELECT USING (bucket_id = 'backups' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upload backups" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'backups' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete backups" ON storage.objects FOR DELETE USING (bucket_id = 'backups' AND has_role(auth.uid(), 'admin'));

-- =============================================
-- 11. INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_title ON public.books USING gin(to_tsvector('arabic', title));
CREATE INDEX IF NOT EXISTS idx_books_author ON public.books USING gin(to_tsvector('arabic', author));
CREATE INDEX IF NOT EXISTS idx_books_featured ON public.books(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_download_count ON public.books(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_books_view_count ON public.books(view_count DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_book ON public.favorites(book_id);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON public.reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_book ON public.reading_progress(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read ON public.reading_progress(last_read_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_reviews_book ON public.book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_user ON public.book_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_rating ON public.book_reviews(rating);

CREATE INDEX IF NOT EXISTS idx_discussions_user ON public.discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_book ON public.discussions(book_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON public.discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_pinned ON public.discussions(is_pinned) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion ON public.discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_user ON public.discussion_replies(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_lists_user ON public.reading_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_lists_public ON public.reading_lists(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_reading_list_books_list ON public.reading_list_books(list_id);
CREATE INDEX IF NOT EXISTS idx_reading_list_books_book ON public.reading_list_books(book_id);

CREATE INDEX IF NOT EXISTS idx_reading_list_followers_list ON public.reading_list_followers(list_id);
CREATE INDEX IF NOT EXISTS idx_reading_list_followers_user ON public.reading_list_followers(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_public ON public.profiles(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON public.profiles(is_banned) WHERE is_banned = true;

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON public.security_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at ON public.content_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON public.user_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_warnings_created_at ON public.user_warnings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_address ON public.blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires ON public.blocked_ips(expires_at);

CREATE INDEX IF NOT EXISTS idx_book_annotations_user ON public.book_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_book_annotations_book ON public.book_annotations(book_id);

CREATE INDEX IF NOT EXISTS idx_book_bookmarks_user ON public.book_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_book_bookmarks_book ON public.book_bookmarks(book_id);

CREATE INDEX IF NOT EXISTS idx_mentions_mentioned ON public.mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_discussion ON public.mentions(discussion_id);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- =============================================
-- 12. GRANT PERMISSIONS
-- =============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant all on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- =============================================
-- END OF DATABASE EXPORT
-- =============================================
