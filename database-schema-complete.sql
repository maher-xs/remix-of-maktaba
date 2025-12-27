-- ============================================
-- COMPLETE DATABASE SCHEMA FOR MAKTABA PROJECT
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'support');

-- ============================================
-- 2. TABLES
-- ============================================

-- Profiles Table
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    full_name TEXT,
    username TEXT,
    avatar_url TEXT,
    bio TEXT,
    country TEXT,
    is_public BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    is_banned BOOLEAN DEFAULT false,
    banned_at TIMESTAMP WITH TIME ZONE,
    banned_reason TEXT,
    banned_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Roles Table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Categories Table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'book',
    color TEXT NOT NULL DEFAULT 'bg-primary',
    book_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Books Table
CREATE TABLE public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    file_url TEXT,
    file_size TEXT,
    pages INTEGER,
    isbn TEXT,
    publisher TEXT,
    publish_year INTEGER,
    language TEXT DEFAULT 'ar',
    category_id UUID REFERENCES public.categories(id),
    uploaded_by UUID,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Favorites Table
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    book_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

-- Reading Progress Table
CREATE TABLE public.reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    book_id UUID NOT NULL,
    current_page INTEGER NOT NULL DEFAULT 0,
    total_pages INTEGER,
    is_completed BOOLEAN DEFAULT false,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

-- Book Annotations Table
CREATE TABLE public.book_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    book_id UUID NOT NULL,
    page_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    annotation_type TEXT DEFAULT 'highlight',
    color TEXT DEFAULT 'yellow',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Book Reviews Table
CREATE TABLE public.book_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    book_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

-- Contact Messages Table
CREATE TABLE public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    admin_notes TEXT,
    replied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activity Logs Table
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    entity_name TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Security Logs Table
CREATE TABLE public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    path TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blocked IPs Table
CREATE TABLE public.blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL UNIQUE,
    reason TEXT,
    failed_attempts INTEGER DEFAULT 0,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Site Settings Table
CREATE TABLE public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Page Settings Table
CREATE TABLE public.page_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_maintenance BOOLEAN NOT NULL DEFAULT false,
    maintenance_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 3. VIEWS
-- ============================================

-- Public Books View
CREATE VIEW public.public_books AS
SELECT 
    id, title, author, cover_url, file_url, file_size,
    description, pages, publisher, isbn, language,
    publish_year, category_id, view_count, download_count,
    is_featured, created_at, updated_at
FROM public.books;

-- Public Profiles View
CREATE VIEW public.public_profiles AS
SELECT 
    id, full_name, username, avatar_url, bio, country,
    is_verified, verified_at, created_at
FROM public.profiles
WHERE is_public = true;

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Has Role Function (Security Definer)
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

-- Handle New User Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);
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
      UPDATE public.categories SET book_count = book_count + 1 WHERE id = NEW.category_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.category_id IS NOT NULL THEN
      UPDATE public.categories SET book_count = book_count - 1 WHERE id = OLD.category_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
      IF OLD.category_id IS NOT NULL THEN
        UPDATE public.categories SET book_count = book_count - 1 WHERE id = OLD.category_id;
      END IF;
      IF NEW.category_id IS NOT NULL THEN
        UPDATE public.categories SET book_count = book_count + 1 WHERE id = NEW.category_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Get Reading Stats Function
CREATE OR REPLACE FUNCTION public.get_reading_stats(p_user_id uuid)
RETURNS TABLE(
    total_books_read bigint, 
    total_pages_read bigint, 
    books_completed bigint, 
    total_annotations bigint, 
    favorite_category text, 
    reading_streak integer, 
    last_read_at timestamp with time zone
)
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
RETURNS TABLE(
    id uuid, title text, author text, cover_url text, 
    description text, category_id uuid, view_count integer, 
    download_count integer, score bigint
)
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

-- Get Admin Users Function
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
    id uuid, email text, full_name text, username text, 
    avatar_url text, bio text, country text, is_public boolean, 
    is_verified boolean, verified_at timestamp with time zone, 
    verified_by uuid, is_banned boolean, banned_at timestamp with time zone, 
    banned_reason text, created_at timestamp with time zone, 
    updated_at timestamp with time zone
)
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

-- Get Admin Stats Function
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE(
    total_users bigint, total_books bigint, total_categories bigint, 
    total_favorites bigint, active_readers_today bigint, new_books_week bigint
)
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
CREATE OR REPLACE FUNCTION public.log_failed_login(
    p_email text, 
    p_error_message text DEFAULT NULL, 
    p_ip_address text DEFAULT NULL, 
    p_user_agent text DEFAULT NULL
)
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
    jsonb_build_object(
      'email', p_email,
      'error', p_error_message,
      'attempted_at', now()
    ),
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
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_action text, 
    p_path text DEFAULT NULL, 
    p_details jsonb DEFAULT NULL
)
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
CREATE OR REPLACE FUNCTION public.add_security_log(
    p_action text, 
    p_path text DEFAULT NULL, 
    p_details jsonb DEFAULT NULL
)
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
CREATE OR REPLACE FUNCTION public.insert_security_log_safe(
    p_action text, 
    p_path text DEFAULT NULL, 
    p_details jsonb DEFAULT NULL
)
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

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for category book count
CREATE TRIGGER update_books_category_count
  AFTER INSERT OR UPDATE OR DELETE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_category_book_count();

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (is_public = true);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- User Roles Policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Categories Policies
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Books Policies
CREATE POLICY "Anyone can view all books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Users can view their own books" ON public.books FOR SELECT USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can view all books" ON public.books FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own books" ON public.books FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Admins can insert books" ON public.books FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update their own books" ON public.books FOR UPDATE USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can update all books" ON public.books FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete their own books" ON public.books FOR DELETE USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can delete all books" ON public.books FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Favorites Policies
CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Reading Progress Policies
CREATE POLICY "Users can view their own reading progress" ON public.reading_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their reading progress" ON public.reading_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their reading progress" ON public.reading_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their reading progress" ON public.reading_progress FOR DELETE USING (auth.uid() = user_id);

-- Book Annotations Policies
CREATE POLICY "Users can view their own annotations" ON public.book_annotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their annotations" ON public.book_annotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their annotations" ON public.book_annotations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their annotations" ON public.book_annotations FOR DELETE USING (auth.uid() = user_id);

-- Book Reviews Policies
CREATE POLICY "Anyone can view reviews" ON public.book_reviews FOR SELECT USING (true);
CREATE POLICY "Admins can view all reviews" ON public.book_reviews FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can add reviews" ON public.book_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.book_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.book_reviews FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any review" ON public.book_reviews FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Contact Messages Policies
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view contact messages" ON public.contact_messages FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update contact messages" ON public.contact_messages FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete contact messages" ON public.contact_messages FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Activity Logs Policies
CREATE POLICY "Admins can view all activity logs" ON public.activity_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- Security Logs Policies
CREATE POLICY "Admins can view security logs" ON public.security_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Blocked IPs Policies
CREATE POLICY "Admins can view blocked IPs" ON public.blocked_ips FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage blocked IPs" ON public.blocked_ips FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Site Settings Policies
CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert site settings" ON public.site_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site settings" ON public.site_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Page Settings Policies
CREATE POLICY "Anyone can read page settings" ON public.page_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage page settings" ON public.page_settings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================
-- 8. STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('maktaba', 'maktaba', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage Policies for maktaba bucket
CREATE POLICY "Anyone can view maktaba files" ON storage.objects FOR SELECT USING (bucket_id = 'maktaba');
CREATE POLICY "Authenticated users can upload to maktaba" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'maktaba' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own maktaba files" ON storage.objects FOR UPDATE USING (bucket_id = 'maktaba' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own maktaba files" ON storage.objects FOR DELETE USING (bucket_id = 'maktaba' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage Policies for avatars bucket
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- END OF SCHEMA
-- ============================================
