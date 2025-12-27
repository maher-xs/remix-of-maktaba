import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Plus, 
  TrendingUp, 
  Clock, 
  ThumbsUp, 
  MessageCircle, 
  Pin, 
  BookOpen, 
  Search,
  Eye,
  Flame,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  User,
  Users
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import { useDiscussions } from '@/hooks/useDiscussions';
import { useAuth } from '@/hooks/useAuth';
import { useSEO } from '@/hooks/useSEO';
import { Skeleton } from '@/components/ui/skeleton';
import CreateDiscussionDialog from '@/components/discussions/CreateDiscussionDialog';
import { DiscussionFeedCard } from '@/components/discussions/DiscussionFeedCard';
import AdBanner from '@/components/ads/AdBanner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const ITEMS_PER_PAGE = 10;

const Discussions = () => {
  const { user } = useAuth();
  const { data: discussions, isLoading } = useDiscussions();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useSEO({
    title: 'مجتمع النقاشات - مكتبتي',
    description: 'شارك في المناقشات حول الكتب والمواضيع المختلفة مع مجتمع القراء',
  });

  // Filter discussions based on search and tab
  const filteredDiscussions = useMemo(() => {
    if (!discussions) return [];
    
    return discussions.filter(d => {
      const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === 'books') return matchesSearch && d.book_id;
      if (activeTab === 'general') return matchesSearch && !d.book_id;
      if (activeTab === 'hot') return matchesSearch && ((d.votes_count || 0) > 0 || (d.replies_count || 0) > 2);
      if (activeTab === 'mine') return matchesSearch && user && d.user_id === user.id;
      return matchesSearch;
    });
  }, [discussions, searchQuery, activeTab, user]);

  // Separate pinned and regular discussions
  const pinnedDiscussions = filteredDiscussions.filter(d => d.is_pinned);
  const regularDiscussions = filteredDiscussions.filter(d => !d.is_pinned);

  // Pagination
  const totalPages = Math.ceil(regularDiscussions.length / ITEMS_PER_PAGE);
  const paginatedDiscussions = regularDiscussions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Stats
  const totalDiscussions = discussions?.length || 0;
  const totalReplies = discussions?.reduce((sum, d) => sum + (d.replies_count || 0), 0) || 0;

  return (
    <Layout>
      <div className="section-container py-4 lg:py-6">
        <Breadcrumb items={[{ label: 'المناقشات' }]} />

        {/* Compact Header with Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="content-card-icon w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">مجتمع النقاشات</h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-primary" />
                  <span className="font-semibold text-foreground">{totalDiscussions}</span> مناقشة
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-primary" />
                  <span className="font-semibold text-foreground">{totalReplies}</span> رد
                </span>
              </div>
            </div>
          </div>
          {user && (
            <Button 
              onClick={() => setIsCreateOpen(true)} 
              size="sm"
              className="gap-1.5 h-9 px-4 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              مناقشة جديدة
            </Button>
          )}
        </div>

        {/* Main Layout - 3 columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-6">
          {/* Left Sidebar - Stats & Top Contributors */}
          <aside className="hidden lg:block space-y-4 overflow-hidden">
            {/* Community Info */}
            <div className="content-card p-5">
              <h3 className="font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                عن المجتمع
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                شارك أفكارك، ناقش الكتب، وتواصل مع القراء.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">المناقشات</span>
                  <span className="font-bold text-foreground text-base">{totalDiscussions}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">الردود</span>
                  <span className="font-bold text-foreground text-base">{totalReplies}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">المشاركون</span>
                  <span className="font-bold text-foreground text-base">
                    {new Set(discussions?.map(d => d.user_id)).size || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Contributors */}
            <div className="content-card p-5">
              <h3 className="font-semibold text-base text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                أنشط المناقشين
              </h3>
              <div className="space-y-3">
                {(() => {
                  // Get top contributors
                  const contributorCounts = discussions?.reduce((acc, d) => {
                    const id = d.user_id;
                    if (!acc[id]) {
                      acc[id] = { 
                        count: 0, 
                        author: d.author,
                        replies: 0
                      };
                    }
                    acc[id].count++;
                    acc[id].replies += d.replies_count || 0;
                    return acc;
                  }, {} as Record<string, { count: number; author: any; replies: number }>);

                  const topContributors = Object.entries(contributorCounts || {})
                    .sort((a, b) => (b[1].count + b[1].replies) - (a[1].count + a[1].replies))
                    .slice(0, 5);

                  return topContributors.map(([id, data], i) => (
                    <Link 
                      key={id} 
                      to={data.author?.username ? `/user/${data.author.username}` : '#'}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={data.author?.avatar_url || ''} />
                        <AvatarFallback className="text-sm bg-primary/20 text-primary">
                          {data.author?.full_name?.charAt(0) || 'م'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-foreground truncate flex items-center gap-1">
                          {data.author?.full_name || data.author?.username || 'مستخدم'}
                          {data.author?.is_verified && (
                            <BadgeCheck className="w-4 h-4 text-sky-500 fill-sky-500/20" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.count} مناقشة · {data.replies} رد
                        </p>
                      </div>
                    </Link>
                  ));
                })()}
              </div>
            </div>

            {/* Most Discussed Books */}
            <div className="content-card p-5">
              <h3 className="font-semibold text-base text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                الكتب الأكثر نقاشاً
              </h3>
              <div className="space-y-3">
                {(() => {
                  // Get books with most discussions
                  const bookCounts = discussions?.filter(d => d.book).reduce((acc, d) => {
                    const bookId = d.book_id!;
                    if (!acc[bookId]) {
                      acc[bookId] = { 
                        count: 0, 
                        book: d.book!,
                        replies: 0
                      };
                    }
                    acc[bookId].count++;
                    acc[bookId].replies += d.replies_count || 0;
                    return acc;
                  }, {} as Record<string, { count: number; book: any; replies: number }>);

                  const topBooks = Object.entries(bookCounts || {})
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5);

                  if (topBooks.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        لا توجد مناقشات حول كتب بعد
                      </p>
                    );
                  }

                  return topBooks.map(([id, data]) => (
                    <Link 
                      key={id} 
                      to={`/books/${id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {data.book.cover_url ? (
                        <img 
                          src={data.book.cover_url} 
                          alt={data.book.title}
                          className="w-10 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-12 bg-muted rounded flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-foreground truncate">
                          {data.book.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.count} مناقشة
                        </p>
                      </div>
                    </Link>
                  ));
                })()}
              </div>
            </div>

            {/* Sidebar Ad - Below Most Discussed Books */}
            <AdBanner variant="sidebar" page="discussions" />
          </aside>

          {/* Center - Main Content */}
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ابحث في المناقشات..."
                className="pr-9 h-9 bg-background text-sm"
              />
            </div>

            {/* Filter Chips - Cleaner Design */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <Button
                variant={activeTab === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTabChange('all')}
                className="gap-1.5 h-8 px-3 text-xs shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                الكل
                {discussions && discussions.length > 0 && (
                  <Badge variant={activeTab === 'all' ? 'secondary' : 'outline'} className="mr-1 text-[10px] px-1.5 h-4 bg-background/20">
                    {discussions.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeTab === 'hot' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTabChange('hot')}
                className="gap-1.5 h-8 px-3 text-xs shrink-0"
              >
                <Flame className="w-3.5 h-3.5" />
                الأكثر تفاعلاً
              </Button>
              <Button
                variant={activeTab === 'books' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTabChange('books')}
                className="gap-1.5 h-8 px-3 text-xs shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5" />
                حول الكتب
              </Button>
              {user && (
                <Button
                  variant={activeTab === 'mine' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('mine')}
                  className="gap-1.5 h-8 px-3 text-xs shrink-0"
                >
                  <User className="w-3.5 h-3.5" />
                  نقاشاتي
                </Button>
              )}
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="content-card p-3">
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredDiscussions.length === 0 ? (
              <div className="text-center py-12">
                <div className="content-card-icon w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">لا توجد مناقشات</h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">
                  {searchQuery 
                    ? 'لم نجد مناقشات تطابق بحثك.'
                    : 'كن أول من يبدأ مناقشة!'
                  }
                </p>
                {user && !searchQuery && (
                  <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    ابدأ مناقشة
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pinned Discussions */}
                {pinnedDiscussions.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold text-primary flex items-center gap-1.5 px-1">
                      <Pin className="w-3 h-3" />
                      مثبتة
                    </h2>
                    {pinnedDiscussions.map((discussion, index) => (
                      <div
                        key={discussion.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <DiscussionFeedCard discussion={discussion} isPinned />
                      </div>
                    ))}
                  </div>
                )}

                {/* Regular Discussions */}
                {paginatedDiscussions.length > 0 && (
                  <div className="space-y-2">
                    {pinnedDiscussions.length > 0 && (
                      <h2 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 px-1 mt-4">
                        <MessageSquare className="w-3 h-3" />
                        المناقشات
                      </h2>
                    )}
                    {paginatedDiscussions.map((discussion, index) => (
                      <div key={discussion.id}>
                        <div
                          className="animate-fade-in"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <DiscussionFeedCard discussion={discussion} />
                        </div>
                        {/* Show ad after every 5 discussions */}
                        {(index + 1) % 5 === 0 && index < paginatedDiscussions.length - 1 && (
                          <div className="my-3">
                            <AdBanner variant="inline" page="discussions" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="gap-1 h-8 text-xs"
                    >
                      <ChevronRight className="w-3 h-3" />
                      السابق
                    </Button>
                    
                    <span className="text-xs text-muted-foreground">
                      {currentPage} / {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="gap-1 h-8 text-xs"
                    >
                      التالي
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Trending & Recent */}
          <aside className="hidden lg:block space-y-4 overflow-hidden">
            {/* Most Interactive This Week */}
            <div className="content-card p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                الأكثر تفاعلاً هذا الأسبوع
              </h3>
              <div className="space-y-2">
                {(() => {
                  const oneWeekAgo = new Date();
                  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                  
                  const weeklyDiscussions = [...(discussions || [])]
                    .filter(d => new Date(d.created_at) >= oneWeekAgo)
                    .sort((a, b) => ((b.replies_count || 0) + (b.votes_count || 0)) - ((a.replies_count || 0) + (a.votes_count || 0)))
                    .slice(0, 3);

                  if (weeklyDiscussions.length === 0) {
                    return <p className="text-xs text-muted-foreground text-center py-2">لا توجد مناقشات هذا الأسبوع</p>;
                  }

                  return weeklyDiscussions.map((d) => (
                    <Link 
                      key={d.id} 
                      to={`/discussions/${d.id}`}
                      className="block p-2 rounded-lg hover:bg-muted/50 transition-colors overflow-hidden"
                    >
                      <p className="text-xs font-medium text-foreground truncate">{d.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <MessageCircle className="w-2.5 h-2.5" />
                          {d.replies_count || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <ThumbsUp className="w-2.5 h-2.5" />
                          {d.votes_count || 0}
                        </span>
                      </div>
                    </Link>
                  ));
                })()}
              </div>
            </div>

            {/* Most Interactive This Month */}
            <div className="content-card p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                الأكثر تفاعلاً هذا الشهر
              </h3>
              <div className="space-y-2">
                {(() => {
                  const oneMonthAgo = new Date();
                  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                  
                  const monthlyDiscussions = [...(discussions || [])]
                    .filter(d => new Date(d.created_at) >= oneMonthAgo)
                    .sort((a, b) => ((b.replies_count || 0) + (b.votes_count || 0)) - ((a.replies_count || 0) + (a.votes_count || 0)))
                    .slice(0, 3);

                  if (monthlyDiscussions.length === 0) {
                    return <p className="text-xs text-muted-foreground text-center py-2">لا توجد مناقشات هذا الشهر</p>;
                  }

                  return monthlyDiscussions.map((d) => (
                    <Link 
                      key={d.id} 
                      to={`/discussions/${d.id}`}
                      className="block p-2 rounded-lg hover:bg-muted/50 transition-colors overflow-hidden"
                    >
                      <p className="text-xs font-medium text-foreground truncate">{d.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <MessageCircle className="w-2.5 h-2.5" />
                          {d.replies_count || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <ThumbsUp className="w-2.5 h-2.5" />
                          {d.votes_count || 0}
                        </span>
                      </div>
                    </Link>
                  ));
                })()}
              </div>
            </div>


            {/* Latest Discussions */}
            <div className="content-card p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                أحدث المناقشات
              </h3>
              <div className="space-y-2">
                {[...(discussions || [])]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 5)
                  .map((d) => (
                  <Link 
                    key={d.id} 
                    to={`/discussions/${d.id}`}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={d.author?.avatar_url || ''} />
                      <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                        {d.author?.full_name?.charAt(0) || 'م'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-xs font-medium text-foreground truncate">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.author?.full_name || d.author?.username || 'مستخدم'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Stats Today */}
            <div className="content-card p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                إحصائيات اليوم
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-primary">
                    {discussions?.filter(d => {
                      const today = new Date();
                      const created = new Date(d.created_at);
                      return created.toDateString() === today.toDateString();
                    }).length || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">مناقشة جديدة</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-primary">
                    {discussions?.filter(d => {
                      const today = new Date();
                      const created = new Date(d.created_at);
                      return created.toDateString() === today.toDateString();
                    }).reduce((sum, d) => sum + (d.replies_count || 0), 0) || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">رد جديد</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <CreateDiscussionDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </Layout>
  );
};

// Discussion Card Component
interface DiscussionCardProps {
  discussion: ReturnType<typeof useDiscussions>['data'][0];
  isPinned?: boolean;
}

const DiscussionCard = ({ discussion, isPinned }: DiscussionCardProps) => {
  return (
    <Link to={`/discussions/${discussion.id}`}>
      <article 
        className={`group content-card p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 ${
          isPinned ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/10' : ''
        }`}
      >
        <div className="flex gap-3 sm:gap-4">
          {/* Author Avatar */}
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 ring-2 ring-background shadow-md">
            <AvatarImage src={discussion.author?.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold">
              {discussion.author?.full_name?.charAt(0) || 'م'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Author Info & Time */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap text-sm">
                {discussion.author?.username ? (
                  <Link 
                    to={`/user/${discussion.author.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {discussion.author?.full_name || discussion.author?.username || 'مستخدم'}
                  </Link>
                ) : (
                  <span className="font-semibold text-foreground">
                    {discussion.author?.full_name || 'مستخدم'}
                  </span>
                )}
                {discussion.author?.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-sky-500 fill-sky-500/20" />
                )}
              </div>
              <span className="flex items-center gap-1 text-muted-foreground text-xs flex-shrink-0">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true, locale: ar })}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-2 line-clamp-2 break-words leading-relaxed group-hover:text-primary transition-colors">
              {isPinned && <Pin className="w-4 h-4 inline-block ml-2 text-primary" />}
              {discussion.title}
            </h3>

            {/* Content Preview */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 break-words leading-relaxed">
              {discussion.content}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Book Badge */}
              {discussion.book && (
                <Badge variant="outline" className="gap-1.5 text-xs bg-secondary/10 border-secondary/30 text-secondary-foreground">
                  <BookOpen className="w-3 h-3" />
                  <span className="max-w-[120px] sm:max-w-[200px] truncate">{discussion.book.title}</span>
                </Badge>
              )}

              {/* Stats */}
              <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground mr-auto">
                <span className="flex items-center gap-1 hover:text-primary transition-colors">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="font-medium">{discussion.votes_count || 0}</span>
                </span>
                <span className="flex items-center gap-1 hover:text-primary transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="font-medium">{discussion.replies_count || 0}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="font-medium">{discussion.views_count || 0}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default Discussions;
