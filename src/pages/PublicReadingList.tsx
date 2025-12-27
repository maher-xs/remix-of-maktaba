import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, Globe, User, Calendar, Check, Bell, BellOff, Users } from 'lucide-react';
import ShareButtons from '@/components/share/ShareButtons';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSEO } from '@/hooks/useSEO';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const PublicReadingList = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch the public reading list
  const { data: list, isLoading: listLoading, error } = useQuery({
    queryKey: ['public-reading-list', listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_lists')
        .select('*')
        .eq('id', listId)
        .eq('is_public', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });

  // Fetch the owner profile
  const { data: owner } = useQuery({
    queryKey: ['reading-list-owner', list?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', list!.user_id)
        .maybeSingle();

      if (error) return null;
      return data;
    },
    enabled: !!list?.user_id,
  });

  // Fetch books in the list
  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['public-reading-list-books', listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_list_books')
        .select('*, book:book_id(id, title, author, cover_url, description)')
        .eq('list_id', listId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });

  // Check if user is following this list
  const { data: isFollowing } = useQuery({
    queryKey: ['list-follow-status', listId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('reading_list_followers')
        .select('id')
        .eq('list_id', listId)
        .eq('user_id', user.id)
        .maybeSingle();

      return !!data;
    },
    enabled: !!listId && !!user,
  });

  // Get followers count
  const { data: followersCount } = useQuery({
    queryKey: ['list-followers-count', listId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reading_list_followers')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', listId);

      return count || 0;
    },
    enabled: !!listId,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !listId) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('reading_list_followers')
        .insert({ list_id: listId, user_id: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-follow-status', listId] });
      queryClient.invalidateQueries({ queryKey: ['list-followers-count', listId] });
      toast.success('تم متابعة القائمة بنجاح');
    },
    onError: () => {
      toast.error('فشل في متابعة القائمة');
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user || !listId) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('reading_list_followers')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-follow-status', listId] });
      queryClient.invalidateQueries({ queryKey: ['list-followers-count', listId] });
      toast.success('تم إلغاء المتابعة');
    },
    onError: () => {
      toast.error('فشل في إلغاء المتابعة');
    },
  });

  useSEO({
    title: list?.name ? `${list.name} - قائمة قراءة` : 'قائمة قراءة',
    description: list?.description || 'قائمة قراءة عامة',
  });

  const handleFollowToggle = () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول للمتابعة');
      navigate('/auth');
      return;
    }

    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  if (listLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !list) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <BookOpen className="w-20 h-20 mx-auto text-muted-foreground/50 mb-6" />
          <h1 className="text-2xl font-bold mb-4">قائمة غير موجودة</h1>
          <p className="text-muted-foreground mb-6">
            هذه القائمة غير موجودة أو أنها خاصة
          </p>
          <Button onClick={() => navigate('/')}>
            العودة للرئيسية
          </Button>
        </div>
      </Layout>
    );
  }

  // Check if user is the owner
  const isOwner = user?.id === list.user_id;

  return (
    <Layout>
      <div className="section-container py-6 sm:py-8 px-4 sm:px-6">
        {/* Header Card */}
        <div className="bg-card/50 rounded-2xl border border-muted-foreground/10 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-stretch">
            {/* Right Side - Cover Image or List Name */}
            <div className="flex-shrink-0 mx-auto sm:mx-0 order-1 sm:order-1 sm:self-stretch">
              <div className="w-28 h-28 sm:w-32 sm:h-full sm:min-h-[120px] rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-muted-foreground/10 shadow-md">
                {list.cover_url ? (
                  <img
                    src={list.cover_url}
                    alt={list.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold text-primary/70">
                        {(list.name || 'ق').trim().charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle - Info */}
            <div className="flex-1 text-center sm:text-right order-2 sm:order-2">
              {/* Public Badge */}
              <div className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm mb-2">
                <Globe className="w-4 h-4" />
                <span className="font-medium">قائمة عامة</span>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1">
                {list.name}
              </h1>

              {/* Description */}
              {list.description && (
                <p className="text-muted-foreground text-sm sm:text-base mb-3 max-w-2xl">
                  {list.description}
                </p>
              )}

              {/* Stats Row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {books?.length || 0} كتاب
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {followersCount || 0} متابع
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(list.created_at).toLocaleDateString('ar')}
                </span>
                {owner && (
                  <Link 
                    to={owner.username ? `/user/${owner.username}` : '#'}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    {owner.avatar_url ? (
                      <img 
                        src={owner.avatar_url} 
                        alt={owner.full_name || owner.username} 
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-3 h-3 text-primary" />
                      </div>
                    )}
                    <span>{owner.full_name || owner.username || 'مستخدم'}</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Left Side - Buttons */}
            <div className="flex flex-row sm:flex-col gap-2 justify-center order-3 sm:order-3">
              {/* Follow Button - Only show if not owner */}
              {!isOwner && (
                <Button 
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={handleFollowToggle}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                  className="gap-2"
                >
                  {isFollowing ? (
                    <>
                      <BellOff className="w-4 h-4" />
                      إلغاء المتابعة
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      متابعة
                    </>
                  )}
                </Button>
              )}

              {/* Share Button */}
              <ShareButtons 
                title={list.name}
                description={list.description || ''}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Books Section */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            كتب القائمة
          </h2>

          {booksLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[2/3] bg-muted rounded-lg mb-2" />
                  <div className="h-3 bg-muted rounded w-3/4 mb-1" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : !books || books.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/20">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">لا توجد كتب في هذه القائمة</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {books.map((item: any) => (
                <Link 
                  key={item.id} 
                  to={`/book/${item.book?.id}`}
                  className="group block"
                >
                  <div className="bg-card rounded-xl overflow-hidden border border-muted-foreground/10 hover:shadow-lg hover:border-primary/20 transition-all duration-200">
                    <div className="aspect-[2/3] bg-muted relative overflow-hidden">
                      {item.book?.cover_url ? (
                        <img
                          src={item.book.cover_url}
                          alt={item.book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <BookOpen className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 sm:p-3">
                      <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-0.5 group-hover:text-primary transition-colors">
                        {item.book?.title}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                        {item.book?.author}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
export default PublicReadingList;
