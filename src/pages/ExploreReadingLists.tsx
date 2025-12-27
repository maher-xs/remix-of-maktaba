import { Globe, BookOpen, User, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSEO } from '@/hooks/useSEO';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdBanner from '@/components/ads/AdBanner';

interface PublicReadingList {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
  user_id: string;
  book_count: number;
  profile: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
  books: Array<{
    book: {
      cover_url: string | null;
      title: string;
    } | null;
  }>;
}

// Card component for a single list
const ListCard = ({ list, onClick }: { list: PublicReadingList; onClick: () => void }) => (
  <Card 
    className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-muted-foreground/10 hover:border-primary/30 animate-fade-in"
    onClick={onClick}
  >
    <CardContent className="p-0">
      {/* Cover */}
      <div className="h-40 sm:h-48 bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden flex items-center justify-center">
        {list.cover_url ? (
          <img
            src={list.cover_url}
            alt={list.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain"
          />
        ) : list.books.length > 0 ? (
          <div className="w-full h-full grid grid-cols-4 gap-0.5 p-1">
            {list.books.slice(0, 4).map((item, idx) => (
              <div key={idx} className="bg-background overflow-hidden rounded-sm">
                {item.book?.cover_url ? (
                  <img
                    src={item.book.cover_url}
                    alt={item.book.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {[...Array(Math.max(0, 4 - list.books.length))].map((_, i) => (
              <div key={`empty-${i}`} className="bg-muted/50 rounded-sm" />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-end justify-start bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="m-3 inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm border border-muted-foreground/10">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-primary/60" />
              </div>
              <span>قائمة فارغة</span>
            </div>
          </div>
        )}
        {/* Badge */}
        <Badge className="absolute top-2 left-2 bg-background/95 text-foreground border-0 shadow-sm backdrop-blur-sm text-xs px-2 py-0.5">
          <Globe className="w-3 h-3 ml-1 text-green-500" />
          عامة
        </Badge>
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4">
        <h3 className="font-bold text-foreground text-sm sm:text-base mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {list.name}
        </h3>
        {list.description ? (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {list.description}
          </p>
        ) : null}
        
        {/* User & Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-muted-foreground/10">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="w-6 h-6 flex-shrink-0">
              <AvatarImage src={list.profile?.avatar_url || ''} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {list.profile?.full_name?.[0] || list.profile?.username?.[0] || <User className="w-3 h-3" />}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {list.profile?.full_name || list.profile?.username || 'مستخدم'}
            </span>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
            <BookOpen className="w-3 h-3" />
            {list.book_count} كتاب
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ExploreReadingLists = () => {
  const navigate = useNavigate();

  useSEO({
    title: 'استكشاف القوائم العامة - مكتبة',
    description: 'تصفح قوائم القراءة العامة من المستخدمين الآخرين واكتشف كتباً جديدة',
  });

  const { data: lists, isLoading } = useQuery({
    queryKey: ['public-reading-lists'],
    queryFn: async () => {
      const { data: readingLists, error } = await supabase
        .from('reading_lists')
        .select(`
          id,
          name,
          description,
          cover_url,
          created_at,
          user_id
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const listsWithDetails = await Promise.all(
        (readingLists || []).map(async (list) => {
          const { count } = await supabase
            .from('reading_list_books')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);

          const { data: books } = await supabase
            .from('reading_list_books')
            .select('book:books(cover_url, title)')
            .eq('list_id', list.id)
            .order('position', { ascending: true })
            .limit(4);

          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url, is_verified')
            .eq('id', list.user_id)
            .single();

          return {
            ...list,
            book_count: count || 0,
            books: books || [],
            profile,
          };
        })
      );

      return listsWithDetails as PublicReadingList[];
    },
  });

  // Use lists directly without filtering
  const filteredLists = lists;

  // Split lists into chunks for inserting ads
  const LISTS_PER_ROW = 3; // On large screens
  const AD_AFTER_ROWS = 2; // Show ad after every 2 rows (6 items)
  const ITEMS_BEFORE_AD = LISTS_PER_ROW * AD_AFTER_ROWS;

  const renderListsWithAds = () => {
    if (!filteredLists) return null;
    
    const elements: React.ReactNode[] = [];
    
    for (let i = 0; i < filteredLists.length; i++) {
      elements.push(
        <ListCard 
          key={filteredLists[i].id}
          list={filteredLists[i]}
          onClick={() => navigate(`/reading-list/${filteredLists[i].id}`)}
        />
      );
      
      // Insert ad after every ITEMS_BEFORE_AD items (but not at the very end)
      if ((i + 1) % ITEMS_BEFORE_AD === 0 && i < filteredLists.length - 1) {
        elements.push(
          <div key={`ad-${i}`} className="col-span-1 sm:col-span-2 lg:col-span-3">
            <AdBanner slot={`explore-lists-inline-${i}`} variant="inline" />
          </div>
        );
      }
    }
    
    return elements;
  };

  return (
    <Layout>
      <div className="section-container py-6 sm:py-12 px-4 sm:px-6">
        {/* Header - Same style as other pages */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">استكشف القوائم العامة</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">اكتشف قوائم القراءة المميزة من القراء الآخرين</p>
            </div>
          </div>
          
          {/* Stats Badge */}
          {!isLoading && lists && lists.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm self-start sm:self-center">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">{lists.length}</span>
              <span className="text-muted-foreground">قائمة</span>
            </div>
          )}
        </div>

        {/* Lists Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-36 sm:h-40 bg-muted rounded-t-xl" />
                <div className="p-4 space-y-3 bg-card rounded-b-xl border border-t-0 border-muted-foreground/10">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="flex items-center justify-between pt-3 border-t border-muted-foreground/10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted" />
                      <div className="h-3 bg-muted rounded w-16" />
                    </div>
                    <div className="h-3 bg-muted rounded w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !filteredLists || filteredLists.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              لا توجد قوائم عامة بعد
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              كن أول من ينشئ قائمة عامة ويشاركها مع الآخرين!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {renderListsWithAds()}
          </div>
        )}

        {/* Bottom Ad */}
        {filteredLists && filteredLists.length > 0 && (
          <div className="mt-8 sm:mt-10">
            <AdBanner slot="explore-lists-bottom" />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ExploreReadingLists;
