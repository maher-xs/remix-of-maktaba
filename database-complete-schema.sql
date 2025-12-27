-- =====================================================
-- مكتبة - قاعدة البيانات الكاملة
-- Complete Database Schema for Maktaba Project
-- =====================================================

-- =====================================================
-- 1. ENUMS (أنواع البيانات المخصصة)
-- =====================================================

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLES (الجداول)
-- =====================================================

-- جدول الملفات الشخصية
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    full_name TEXT,
    username TEXT UNIQUE,
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

-- جدول أدوار المستخدمين
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- جدول التصنيفات
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'book',
    color TEXT NOT NULL DEFAULT 'bg-primary',
    book_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول الكتب
CREATE TABLE IF NOT EXISTS public.books (
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
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    uploaded_by UUID,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول المفضلة
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

-- جدول تقدم القراءة
CREATE TABLE IF NOT EXISTS public.reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    current_page INTEGER NOT NULL DEFAULT 0,
    total_pages INTEGER,
    is_completed BOOLEAN DEFAULT false,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

-- جدول التعليقات التوضيحية
CREATE TABLE IF NOT EXISTS public.book_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    annotation_type TEXT DEFAULT 'highlight',
    color TEXT DEFAULT 'yellow',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول مراجعات الكتب
CREATE TABLE IF NOT EXISTS public.book_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

-- جدول رسائل التواصل
CREATE TABLE IF NOT EXISTS public.contact_messages (
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

-- جدول سجلات النشاط
CREATE TABLE IF NOT EXISTS public.activity_logs (
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

-- جدول سجلات الأمان
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    path TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول عناوين IP المحظورة
CREATE TABLE IF NOT EXISTS public.blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL UNIQUE,
    reason TEXT,
    failed_attempts INTEGER DEFAULT 0,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول إعدادات الموقع
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول إعدادات الصفحات
CREATE TABLE IF NOT EXISTS public.page_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_maintenance BOOLEAN NOT NULL DEFAULT false,
    maintenance_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. VIEWS (العروض)
-- =====================================================

-- عرض الكتب العامة
CREATE OR REPLACE VIEW public.public_books AS
SELECT 
    id, title, author, cover_url, file_url, file_size,
    description, pages, isbn, publisher, publish_year,
    language, category_id, is_featured, view_count,
    download_count, created_at, updated_at
FROM public.books;

-- عرض الملفات الشخصية العامة
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    id, full_name, username, avatar_url, bio, country,
    is_verified, verified_at, created_at
FROM public.profiles
WHERE is_public = true;

-- =====================================================
-- 4. FUNCTIONS (الدوال)
-- =====================================================

-- دالة التحقق من الدور
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
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

-- دالة معالجة المستخدم الجديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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

-- دالة تحديث عدد الكتب في التصنيف
CREATE OR REPLACE FUNCTION public.update_category_book_count()
RETURNS TRIGGER
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

-- دالة الحصول على إحصائيات القراءة
CREATE OR REPLACE FUNCTION public.get_reading_stats(p_user_id UUID)
RETURNS TABLE(
    total_books_read BIGINT,
    total_pages_read BIGINT,
    books_completed BIGINT,
    total_annotations BIGINT,
    favorite_category TEXT,
    reading_streak INTEGER,
    last_read_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last_read_at TIMESTAMP WITH TIME ZONE;
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

-- دالة الحصول على توصيات الكتب
CREATE OR REPLACE FUNCTION public.get_book_recommendations(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    id UUID,
    title TEXT,
    author TEXT,
    cover_url TEXT,
    description TEXT,
    category_id UUID,
    view_count INTEGER,
    download_count INTEGER,
    score BIGINT
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

-- دالة البحث عن الكتب
CREATE OR REPLACE FUNCTION public.search_books(search_query TEXT)
RETURNS SETOF public.books
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

-- دالة الحصول على تقييم الكتاب
CREATE OR REPLACE FUNCTION public.get_book_rating(p_book_id UUID)
RETURNS TABLE(average_rating NUMERIC, total_reviews BIGINT)
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

-- دالة زيادة عدد التحميلات
CREATE OR REPLACE FUNCTION public.increment_download_count(book_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.books SET download_count = download_count + 1 WHERE id = book_id;
END;
$$;

-- دالة التحقق من توفر اسم المستخدم
CREATE OR REPLACE FUNCTION public.check_username_available(check_username TEXT, user_id UUID)
RETURNS BOOLEAN
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

-- دالة التحقق من حظر المستخدم
CREATE OR REPLACE FUNCTION public.is_user_banned(check_user_id UUID)
RETURNS BOOLEAN
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

-- دالة حظر المستخدم
CREATE OR REPLACE FUNCTION public.ban_user(target_user_id UUID, reason TEXT)
RETURNS VOID
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

-- دالة إلغاء حظر المستخدم
CREATE OR REPLACE FUNCTION public.unban_user(target_user_id UUID)
RETURNS VOID
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

-- دالة الحصول على المستخدمين للمسؤول
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
    id UUID,
    email TEXT,
    full_name TEXT,
    username TEXT,
    avatar_url TEXT,
    bio TEXT,
    country TEXT,
    is_public BOOLEAN,
    is_verified BOOLEAN,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    is_banned BOOLEAN,
    banned_at TIMESTAMP WITH TIME ZONE,
    banned_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
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
        au.email::TEXT,
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

-- دالة الحصول على إحصائيات المسؤول
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE(
    total_users BIGINT,
    total_books BIGINT,
    total_categories BIGINT,
    total_favorites BIGINT,
    active_readers_today BIGINT,
    new_books_week BIGINT
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
        (SELECT COUNT(*) FROM profiles)::BIGINT,
        (SELECT COUNT(*) FROM books)::BIGINT,
        (SELECT COUNT(*) FROM categories)::BIGINT,
        (SELECT COUNT(*) FROM favorites)::BIGINT,
        (SELECT COUNT(*) FROM reading_progress WHERE last_read_at > now() - interval '1 day')::BIGINT,
        (SELECT COUNT(*) FROM books WHERE created_at > now() - interval '7 days')::BIGINT;
END;
$$;

-- دالة زيادة محاولات تسجيل الدخول الفاشلة
CREATE OR REPLACE FUNCTION public.increment_failed_attempts(p_ip_address TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempts INTEGER;
    v_blocked BOOLEAN := false;
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

-- دالة تسجيل محاولة تسجيل الدخول الفاشلة
CREATE OR REPLACE FUNCTION public.log_failed_login(
    p_email TEXT,
    p_error_message TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_block_result JSONB;
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

-- دالة تسجيل حدث أمني
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_action TEXT,
    p_path TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.security_logs (user_id, action, path, details)
    VALUES (auth.uid(), p_action, p_path, p_details);
END;
$$;

-- دالة إضافة سجل أمني
CREATE OR REPLACE FUNCTION public.add_security_log(
    p_action TEXT,
    p_path TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS VOID
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

-- دالة إدراج سجل أمني آمن
CREATE OR REPLACE FUNCTION public.insert_security_log_safe(
    p_action TEXT,
    p_path TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS VOID
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

-- =====================================================
-- 5. TRIGGERS (المشغلات)
-- =====================================================

-- حذف المشغلات إذا كانت موجودة
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_books_category_count ON public.books;

-- مشغل إنشاء مستخدم جديد
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- مشغل تحديث عدد كتب التصنيف
CREATE TRIGGER update_books_category_count
    AFTER INSERT OR UPDATE OR DELETE ON public.books
    FOR EACH ROW EXECUTE FUNCTION public.update_category_book_count();

-- =====================================================
-- 6. ROW LEVEL SECURITY (أمان مستوى الصف)
-- =====================================================

-- تفعيل RLS لجميع الجداول
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

-- =====================================================
-- 7. RLS POLICIES (سياسات الأمان)
-- =====================================================

-- =============== profiles ===============
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (is_public = true);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- =============== user_roles ===============
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============== categories ===============
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;

CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============== books ===============
DROP POLICY IF EXISTS "Anyone can view all books" ON public.books;
DROP POLICY IF EXISTS "Users can view their own books" ON public.books;
DROP POLICY IF EXISTS "Users can insert their own books" ON public.books;
DROP POLICY IF EXISTS "Users can update their own books" ON public.books;
DROP POLICY IF EXISTS "Users can delete their own books" ON public.books;
DROP POLICY IF EXISTS "Admins can view all books" ON public.books;
DROP POLICY IF EXISTS "Admins can insert books" ON public.books;
DROP POLICY IF EXISTS "Admins can update all books" ON public.books;
DROP POLICY IF EXISTS "Admins can delete all books" ON public.books;

CREATE POLICY "Anyone can view all books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Users can view their own books" ON public.books FOR SELECT USING (auth.uid() = uploaded_by);
CREATE POLICY "Users can insert their own books" ON public.books FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can update their own books" ON public.books FOR UPDATE USING (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete their own books" ON public.books FOR DELETE USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can view all books" ON public.books FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert books" ON public.books FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all books" ON public.books FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete all books" ON public.books FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- =============== favorites ===============
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON public.favorites;

CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- =============== reading_progress ===============
DROP POLICY IF EXISTS "Users can view their own reading progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can insert their reading progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can update their reading progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can delete their reading progress" ON public.reading_progress;

CREATE POLICY "Users can view their own reading progress" ON public.reading_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their reading progress" ON public.reading_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their reading progress" ON public.reading_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their reading progress" ON public.reading_progress FOR DELETE USING (auth.uid() = user_id);

-- =============== book_annotations ===============
DROP POLICY IF EXISTS "Users can view their own annotations" ON public.book_annotations;
DROP POLICY IF EXISTS "Users can insert their annotations" ON public.book_annotations;
DROP POLICY IF EXISTS "Users can update their annotations" ON public.book_annotations;
DROP POLICY IF EXISTS "Users can delete their annotations" ON public.book_annotations;

CREATE POLICY "Users can view their own annotations" ON public.book_annotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their annotations" ON public.book_annotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their annotations" ON public.book_annotations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their annotations" ON public.book_annotations FOR DELETE USING (auth.uid() = user_id);

-- =============== book_reviews ===============
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.book_reviews;
DROP POLICY IF EXISTS "Authenticated users can add reviews" ON public.book_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.book_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.book_reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.book_reviews;
DROP POLICY IF EXISTS "Admins can delete any review" ON public.book_reviews;

CREATE POLICY "Anyone can view reviews" ON public.book_reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add reviews" ON public.book_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.book_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.book_reviews FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reviews" ON public.book_reviews FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any review" ON public.book_reviews FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- =============== contact_messages ===============
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can delete contact messages" ON public.contact_messages;

CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view contact messages" ON public.contact_messages FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update contact messages" ON public.contact_messages FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete contact messages" ON public.contact_messages FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- =============== activity_logs ===============
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.activity_logs;

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============== security_logs ===============
DROP POLICY IF EXISTS "Admins can view security logs" ON public.security_logs;

CREATE POLICY "Admins can view security logs" ON public.security_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =============== blocked_ips ===============
DROP POLICY IF EXISTS "Admins can view blocked IPs" ON public.blocked_ips;
DROP POLICY IF EXISTS "Admins can manage blocked IPs" ON public.blocked_ips;

CREATE POLICY "Admins can view blocked IPs" ON public.blocked_ips FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage blocked IPs" ON public.blocked_ips FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============== site_settings ===============
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can insert site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;

CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert site settings" ON public.site_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site settings" ON public.site_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- =============== page_settings ===============
DROP POLICY IF EXISTS "Anyone can read page settings" ON public.page_settings;
DROP POLICY IF EXISTS "Admins can manage page settings" ON public.page_settings;

CREATE POLICY "Anyone can read page settings" ON public.page_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage page settings" ON public.page_settings FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 8. STORAGE BUCKETS (حاويات التخزين)
-- =====================================================

-- إنشاء حاوية الكتب
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('maktaba', 'maktaba', true, 104857600, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- إنشاء حاوية الصور الشخصية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- =====================================================
-- 9. STORAGE POLICIES (سياسات التخزين)
-- =====================================================

-- سياسات حاوية maktaba
DROP POLICY IF EXISTS "Anyone can view maktaba files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to maktaba" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their maktaba files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their maktaba files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all maktaba files" ON storage.objects;

CREATE POLICY "Anyone can view maktaba files" ON storage.objects 
FOR SELECT USING (bucket_id = 'maktaba');

CREATE POLICY "Authenticated users can upload to maktaba" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'maktaba' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their maktaba files" ON storage.objects 
FOR UPDATE USING (bucket_id = 'maktaba' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their maktaba files" ON storage.objects 
FOR DELETE USING (bucket_id = 'maktaba' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can manage all maktaba files" ON storage.objects 
FOR ALL USING (bucket_id = 'maktaba' AND public.has_role(auth.uid(), 'admin'));

-- سياسات حاوية avatars
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their avatar" ON storage.objects;

CREATE POLICY "Anyone can view avatars" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their avatar" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their avatar" ON storage.objects 
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their avatar" ON storage.objects 
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- 10. INDEXES (الفهارس) - لتحسين الأداء
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_author ON public.books(author);
CREATE INDEX IF NOT EXISTS idx_books_title ON public.books(title);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_featured ON public.books(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_book ON public.favorites(book_id);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON public.reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_book ON public.reading_progress(book_id);

CREATE INDEX IF NOT EXISTS idx_book_reviews_book ON public.book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_user ON public.book_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_book_annotations_user ON public.book_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_book_annotations_book ON public.book_annotations(book_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON public.security_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON public.security_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_address ON public.blocked_ips(ip_address);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_public ON public.profiles(is_public) WHERE is_public = true;

-- =====================================================
-- تم الانتهاء من إعداد قاعدة البيانات!
-- Database setup complete!
-- =====================================================
