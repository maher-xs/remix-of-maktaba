import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { User, BookOpen, MapPin, Calendar, BadgeCheck } from 'lucide-react';
import BookCard from '@/components/books/BookCard';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      // Use the secure public_profiles view that excludes sensitive data
      // Use the secure public_profiles view - only select fields that exist in the view
      const { data, error } = await supabase
        .from('public_profiles')
        .select('id, username, full_name, bio, avatar_url, country, is_verified, created_at')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });

  const { data: uploadedBooks } = useQuery({
    queryKey: ['user-books', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select(`
          id, title, author, description, cover_url, category_id, pages, language,
          publish_year, publisher, isbn, download_count, view_count, file_url,
          file_size, is_featured, created_at, updated_at, uploaded_by,
          category:categories(id, name, slug, icon, color)
        `)
        .eq('uploaded_by', profile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  if (profileLoading) {
    return (
      <Layout>
        <div className="section-container py-8 lg:py-12">
          <div className="flex flex-col items-center gap-4 mb-8">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="section-container py-16 text-center">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">المستخدم غير موجود</h1>
          <p className="text-muted-foreground mb-6">
            هذا الملف الشخصي غير موجود أو غير عام
          </p>
          <Link to="/">
            <Button>العودة للرئيسية</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <Layout>
      <div className="section-container py-8 lg:py-12">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <Avatar className="h-24 w-24 border-4 border-primary mb-4">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || profile.username || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-3xl">
              {profile.full_name?.charAt(0) || profile.username?.charAt(0) || <User className="h-10 w-10" />}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {profile.full_name || profile.username}
            </h1>
            
            {profile.is_verified && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="focus:outline-none transition-transform hover:scale-110">
                    <BadgeCheck className="w-6 h-6 text-primary fill-primary/20" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="center">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <BadgeCheck className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">حساب موثق</h4>
                      <p className="text-sm text-muted-foreground">
                        هذا الحساب موثق ويمكنك الوثوق بالمحتوى المنشور منه. الناشرون الموثقون يقدمون كتباً ذات جودة عالية.
                      </p>
                    </div>
                    {/* verified_at is not exposed in public view for security */}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          
          {profile.username && (
            <p className="text-muted-foreground mb-4">@{profile.username}</p>
          )}

          {profile.bio && (
            <p className="text-foreground max-w-lg mb-4">{profile.bio}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {profile.country && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{profile.country}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>انضم في {joinDate}</span>
            </div>
            {uploadedBooks && (
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{uploadedBooks.length} كتاب</span>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Books */}
        {uploadedBooks && uploadedBooks.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-6">
              الكتب المرفوعة ({uploadedBooks.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
              {uploadedBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        )}

        {(!uploadedBooks || uploadedBooks.length === 0) && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لم يرفع أي كتب بعد</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PublicProfile;
