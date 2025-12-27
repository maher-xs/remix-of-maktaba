import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Trash2, Star, BookOpen, User, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AdminPageHeader,
  AdminSearchBar,
  AdminEmptyState,
  AdminMiniStat,
  AdminStatsGrid,
  AdminLoadingState,
  AdminTableWrapper,
} from '@/components/admin/AdminComponents';
import { AdminPagination } from '@/components/admin/AdminPagination';

interface ReviewWithDetails {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_id: string;
  book_id: string;
  book_title?: string;
  book_author?: string;
  user_name?: string;
}

const AdminReviews = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch all reviews with book and user details
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('book_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      const bookIds = [...new Set(reviewsData.map(r => r.book_id))];
      const { data: booksData } = await supabase
        .from('books')
        .select('id, title, author')
        .in('id', bookIds);

      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);

      const reviewsWithDetails: ReviewWithDetails[] = reviewsData.map(review => {
        const book = booksData?.find(b => b.id === review.book_id);
        const profile = profilesData?.find(p => p.id === review.user_id);
        return {
          ...review,
          book_title: book?.title || 'كتاب محذوف',
          book_author: book?.author || '',
          user_name: profile?.full_name || profile?.username || 'مستخدم مجهول',
        };
      });

      return reviewsWithDetails;
    },
  });

  // Delete review mutation
  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('book_reviews')
        .delete()
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('تم حذف التعليق بنجاح');
      setDeleteReviewId(null);
    },
    onError: (error: any) => {
      toast.error('فشل حذف التعليق: ' + error.message);
    },
  });

  const filteredReviews = reviews.filter(review =>
    review.book_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.review_text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalItems = filteredReviews.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );

  // Stats calculations
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
    : '0';
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const todayCount = reviews.filter(r => 
    new Date(r.created_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="إدارة التعليقات"
          description="عرض وإدارة تعليقات الكتب"
          icon={MessageSquare}
        />

        <AdminStatsGrid columns={4}>
          <AdminMiniStat
            label="إجمالي التعليقات"
            value={reviews.length}
            icon={MessageSquare}
            color="text-primary"
          />
          <AdminMiniStat
            label="متوسط التقييم"
            value={avgRating}
            icon={Star}
            color="text-yellow-500"
          />
          <AdminMiniStat
            label="تقييمات 5 نجوم"
            value={fiveStarCount}
            icon={Star}
            color="text-green-500"
          />
          <AdminMiniStat
            label="تعليقات اليوم"
            value={todayCount}
            icon={MessageSquare}
            color="text-blue-500"
          />
        </AdminStatsGrid>

        <AdminSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="ابحث في التعليقات..."
        />

        <AdminTableWrapper>
          {isLoading ? (
            <AdminLoadingState />
          ) : filteredReviews.length === 0 ? (
            <AdminEmptyState
              icon={MessageSquare}
              title="لا توجد تعليقات"
              description="لم يتم العثور على أي تعليقات مطابقة للبحث"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الكتاب</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">التقييم</TableHead>
                  <TableHead className="text-right">التعليق</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <Link 
                        to={`/book/${review.book_id}`}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground line-clamp-1 hover:underline">{review.book_title}</p>
                          <p className="text-xs text-muted-foreground">{review.book_author}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{review.user_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{renderStars(review.rating)}</TableCell>
                    <TableCell>
                      <p className="text-foreground line-clamp-2 max-w-xs">
                        {review.review_text || <span className="text-muted-foreground italic">بدون نص</span>}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(review.created_at), 'dd MMM yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteReviewId(review.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination */}
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
          />
        </AdminTableWrapper>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteReviewId} onOpenChange={() => setDeleteReviewId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف التعليق</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReviewId && deleteReview.mutate(deleteReviewId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteReview.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'حذف'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminReviews;
