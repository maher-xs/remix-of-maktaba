import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import BookCard from '@/components/books/BookCard';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import { useCachedBooks } from '@/hooks/useCachedBooks';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';
import { BookCardSkeleton } from '@/components/ui/loading-skeleton';
import { BookOpen, WifiOff, Library, User, Search as SearchIcon } from 'lucide-react';
import AdBanner from '@/components/ads/AdBanner';
import { useOnlineStatus } from '@/hooks/useOfflineStorage';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(searchQuery);
  const isOnline = useOnlineStatus();
  
  const [activeTab, setActiveTab] = useState<'books' | 'lists'>('books');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() });
    }
  };

  const { data: books, isLoading: booksLoading } = useCachedBooks();
  
  // Advanced full-text search (only when online)
  const { data: advancedResults, isLoading: advancedLoading } = useAdvancedSearch(
    searchQuery,
    isOnline && searchQuery.length >= 2
  );

  // Search reading lists
  const { data: readingLists, isLoading: listsLoading } = useQuery({
    queryKey: ['search-reading-lists', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      // Get reading lists matching the search
      const { data: lists, error } = await supabase
        .from('reading_lists')
        .select('*')
        .eq('is_public', true)
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      if (!lists || lists.length === 0) return [];

      // Fetch profile and book count for each list
      const listsWithDetails = await Promise.all(
        lists.map(async (list) => {
          const { count } = await supabase
            .from('reading_list_books')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);

          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('id', list.user_id)
            .single();

          return {
            ...list,
            book_count: count || 0,
            profile,
          };
        })
      );

      return listsWithDetails;
    },
    enabled: isOnline && searchQuery.length >= 2,
  });

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!books) return [];
    
    return books.filter(book => {
      const matchesSearch = !searchQuery || 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.description && book.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
  }, [books, searchQuery]);

  // Decide which results to show
  const displayBooks = useMemo(() => {
    if (advancedResults && advancedResults.length > 0) {
      return advancedResults;
    }
    return filteredBooks;
  }, [advancedResults, filteredBooks]);

  const isLoading = isOnline && searchQuery.length >= 2 ? advancedLoading : booksLoading;

  const booksCount = displayBooks.length;
  const listsCount = readingLists?.length || 0;

  return (
    <Layout>
      <>
        <div className="section-container py-6 sm:py-8 lg:py-12">
          <Breadcrumb items={[{ label: 'البحث' }]} />

          {/* Offline Notice - Compact on mobile */}
          {!isOnline && (
            <div className="flex items-center justify-center gap-2 bg-muted/50 text-muted-foreground p-3 sm:p-4 rounded-xl mb-4 sm:mb-6 text-sm">
              <WifiOff className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>غير متصل - البحث في البيانات المخزنة</span>
            </div>
          )}

          {/* Mobile Search Input */}
          <form onSubmit={handleSearch} className="lg:hidden mb-6">
            <div className="relative">
              <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ابحث عن كتاب أو مؤلف..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pr-10 h-12 text-base rounded-xl bg-muted/50 border-border/50 focus:bg-background"
              />
            </div>
          </form>

          {/* Header with Title and Tabs on same line */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {searchQuery ? `نتائج البحث عن "${searchQuery}"` : 'البحث في المكتبة'}
            </h1>

            {/* Tabs for Books and Lists */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'books' | 'lists')}>
              <TabsList className="grid grid-cols-2">
              <TabsTrigger value="books" className="gap-2">
                <BookOpen className="w-4 h-4" />
                الكتب
                {searchQuery.length >= 2 && (
                  <Badge variant="secondary" className="text-xs mr-1">
                    {booksCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="lists" className="gap-2">
                <Library className="w-4 h-4" />
                القوائم
                {searchQuery.length >= 2 && (
                  <Badge variant="secondary" className="text-xs mr-1">
                    {listsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          </div>

          {/* Books Tab Content */}
          {activeTab === 'books' && (
            <>
              {/* Results Count */}
              <div className="mb-6">
                <p className="text-muted-foreground">
                  {isLoading ? (
                    'جاري البحث...'
                  ) : searchQuery.length < 2 ? (
                    'اكتب كلمة بحث للبدء'
                  ) : (
                    <>
                      تم العثور على <span className="font-bold text-foreground">{displayBooks.length}</span> كتاب
                    </>
                  )}
                </p>
              </div>

              {/* Results Grid */}
              <div className="grid gap-4 lg:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <BookCardSkeleton key={i} />
                  ))
                ) : displayBooks.length === 0 ? (
                  <div className="col-span-full text-center py-16">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      لا توجد نتائج
                    </h3>
                    <p className="text-muted-foreground">
                      جرب البحث بكلمات مختلفة
                    </p>
                  </div>
                ) : (
                  <>
                    {displayBooks.map((book, index) => (
                      <React.Fragment key={book.id}>
                        <div
                          className="animate-fade-up"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <BookCard book={book as any} />
                        </div>
                        {/* Ad Banner - Every 10 books */}
                        {(index + 1) % 10 === 0 && index < displayBooks.length - 1 && (
                          <div className="col-span-full">
                            <AdBanner variant="inline" page="search" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </>
                )}
              </div>

              {/* Results Count Footer */}
              {!isLoading && displayBooks.length > 0 && (
                <div className="mt-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    عرض {displayBooks.length} كتاب
                  </p>
                </div>
              )}
            </>
          )}

          {/* Lists Tab Content */}
          {activeTab === 'lists' && (
            <>
              {/* Results Count */}
              <div className="mb-6">
                <p className="text-muted-foreground">
                  {listsLoading ? (
                    'جاري البحث...'
                  ) : searchQuery.length < 2 ? (
                    'اكتب كلمة بحث للبدء'
                  ) : (
                    <>
                      تم العثور على <span className="font-bold text-foreground">{listsCount}</span> قائمة
                    </>
                  )}
                </p>
              </div>

              {/* Lists Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))
                ) : !readingLists || readingLists.length === 0 ? (
                  <div className="col-span-full text-center py-16">
                    <Library className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      لا توجد قوائم
                    </h3>
                    <p className="text-muted-foreground">
                      جرب البحث بكلمات مختلفة
                    </p>
                  </div>
                ) : (
                  readingLists.map((list: any, index: number) => (
                    <Card 
                      key={list.id}
                      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 animate-fade-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => navigate(`/reading-list/${list.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Library className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{list.name}</h3>
                            {list.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{list.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={list.profile?.avatar_url} />
                                <AvatarFallback className="text-[10px]">
                                  {list.profile?.full_name?.[0] || list.profile?.username?.[0] || <User className="w-3 h-3" />}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {list.profile?.full_name || list.profile?.username || 'مستخدم'}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {list.book_count || 0} كتاب
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Results Count Footer */}
              {!listsLoading && readingLists && readingLists.length > 0 && (
                <div className="mt-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    عرض {readingLists.length} قائمة
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </>
    </Layout>
  );
};

export default Search;
