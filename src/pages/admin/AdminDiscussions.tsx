import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Search, 
  Trash2, 
  Pin, 
  PinOff, 
  Lock, 
  Unlock, 
  MessageSquare, 
  Eye,
  User,
  BookOpen,
  Calendar,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Reply,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminPagination } from '@/components/admin/AdminPagination';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Discussion {
  id: string;
  user_id: string;
  book_id: string | null;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  views_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  book?: {
    title: string;
  };
}

interface DiscussionReply {
  id: string;
  discussion_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

const ITEMS_PER_PAGE = 10;

const AdminDiscussions = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReplyDialogOpen, setDeleteReplyDialogOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [selectedReply, setSelectedReply] = useState<DiscussionReply | null>(null);
  const [filter, setFilter] = useState<'all' | 'pinned' | 'locked'>('all');
  const [repliesDialogOpen, setRepliesDialogOpen] = useState(false);
  const [viewingDiscussion, setViewingDiscussion] = useState<Discussion | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Fetch discussions
  const { data: discussionsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-discussions', currentPage, searchQuery, filter],
    queryFn: async () => {
      let query = supabase
        .from('discussions')
        .select(`
          *,
          book:books(title)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      if (filter === 'pinned') {
        query = query.eq('is_pinned', true);
      } else if (filter === 'locked') {
        query = query.eq('is_locked', true);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      // Fetch authors
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(d => d.user_id))];
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        return {
          discussions: data.map(d => ({
            ...d,
            author: profilesMap.get(d.user_id) || null,
            book: Array.isArray(d.book) ? d.book[0] : d.book,
          })) as Discussion[],
          totalCount: count || 0,
        };
      }

      return { discussions: [], totalCount: 0 };
    },
  });

  // Fetch replies for a discussion
  const { data: repliesData, isLoading: repliesLoading, refetch: refetchReplies } = useQuery({
    queryKey: ['admin-discussion-replies', viewingDiscussion?.id],
    queryFn: async () => {
      if (!viewingDiscussion) return [];

      const { data: replies, error } = await supabase
        .from('discussion_replies')
        .select('*')
        .eq('discussion_id', viewingDiscussion.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (replies && replies.length > 0) {
        const userIds = [...new Set(replies.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        return replies.map(r => ({
          ...r,
          author: profilesMap.get(r.user_id) || null,
        })) as DiscussionReply[];
      }

      return [];
    },
    enabled: !!viewingDiscussion,
  });

  // Delete discussion
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete related votes
      await supabase
        .from('discussion_votes')
        .delete()
        .eq('discussion_id', id);

      // Delete replies and their votes
      const { data: replies } = await supabase
        .from('discussion_replies')
        .select('id')
        .eq('discussion_id', id);

      if (replies && replies.length > 0) {
        const replyIds = replies.map(r => r.id);
        await supabase
          .from('discussion_votes')
          .delete()
          .in('reply_id', replyIds);
        
        await supabase
          .from('discussion_replies')
          .delete()
          .eq('discussion_id', id);
      }

      // Delete the discussion
      const { error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discussions'] });
      toast.success('تم حذف المناقشة بنجاح');
      setDeleteDialogOpen(false);
      setSelectedDiscussion(null);
    },
    onError: (error) => {
      console.error('Error deleting discussion:', error);
      toast.error('حدث خطأ أثناء حذف المناقشة');
    },
  });

  // Delete reply
  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      // Delete votes for this reply
      await supabase
        .from('discussion_votes')
        .delete()
        .eq('reply_id', replyId);

      // Delete the reply
      const { error } = await supabase
        .from('discussion_replies')
        .delete()
        .eq('id', replyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discussion-replies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-discussions'] });
      toast.success('تم حذف الرد بنجاح');
      setDeleteReplyDialogOpen(false);
      setSelectedReply(null);
      refetchReplies();
    },
    onError: (error) => {
      console.error('Error deleting reply:', error);
      toast.error('حدث خطأ أثناء حذف الرد');
    },
  });

  // Toggle pin
  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('discussions')
        .update({ is_pinned: isPinned })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { isPinned }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-discussions'] });
      toast.success(isPinned ? 'تم تثبيت المناقشة' : 'تم إلغاء تثبيت المناقشة');
    },
    onError: () => {
      toast.error('حدث خطأ');
    },
  });

  // Toggle lock
  const toggleLockMutation = useMutation({
    mutationFn: async ({ id, isLocked }: { id: string; isLocked: boolean }) => {
      const { error } = await supabase
        .from('discussions')
        .update({ is_locked: isLocked })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { isLocked }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-discussions'] });
      toast.success(isLocked ? 'تم قفل المناقشة' : 'تم فتح المناقشة');
    },
    onError: () => {
      toast.error('حدث خطأ');
    },
  });

  const totalPages = Math.ceil((discussionsData?.totalCount || 0) / ITEMS_PER_PAGE);

  const handleDelete = (discussion: Discussion) => {
    setSelectedDiscussion(discussion);
    setDeleteDialogOpen(true);
  };

  const handleDeleteReply = (reply: DiscussionReply) => {
    setSelectedReply(reply);
    setDeleteReplyDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedDiscussion) {
      deleteMutation.mutate(selectedDiscussion.id);
    }
  };

  const confirmDeleteReply = () => {
    if (selectedReply) {
      deleteReplyMutation.mutate(selectedReply.id);
    }
  };

  const openRepliesDialog = (discussion: Discussion) => {
    setViewingDiscussion(discussion);
    setRepliesDialogOpen(true);
  };

  const openDetailsDialog = (discussion: Discussion) => {
    setViewingDiscussion(discussion);
    setDetailsDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة النقاشات</h1>
            <p className="text-muted-foreground mt-1">
              إدارة وتنظيم المناقشات والردود في المنتدى
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{discussionsData?.totalCount || 0}</p>
                  <p className="text-xs text-muted-foreground">إجمالي النقاشات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Pin className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {discussionsData?.discussions.filter(d => d.is_pinned).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">مثبتة</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Lock className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {discussionsData?.discussions.filter(d => d.is_locked).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">مغلقة</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Reply className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {discussionsData?.discussions.reduce((sum, d) => sum + d.replies_count, 0) || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">إجمالي الردود</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في النقاشات..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setFilter('all'); setCurrentPage(1); }}
                >
                  الكل
                </Button>
                <Button
                  variant={filter === 'pinned' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setFilter('pinned'); setCurrentPage(1); }}
                >
                  <Pin className="w-4 h-4 ml-1" />
                  مثبتة
                </Button>
                <Button
                  variant={filter === 'locked' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setFilter('locked'); setCurrentPage(1); }}
                >
                  <Lock className="w-4 h-4 ml-1" />
                  مغلقة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : discussionsData?.discussions.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد نقاشات</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">العنوان</TableHead>
                      <TableHead className="text-right">الكاتب</TableHead>
                      <TableHead className="text-right">الكتاب</TableHead>
                      <TableHead className="text-right">الإحصائيات</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discussionsData?.discussions.map((discussion) => (
                      <TableRow key={discussion.id}>
                        <TableCell>
                          <button 
                            onClick={() => openDetailsDialog(discussion)}
                            className="text-right hover:text-primary transition-colors"
                          >
                            <div className="max-w-xs">
                              <p className="font-medium truncate">{discussion.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {discussion.content.substring(0, 50)}...
                              </p>
                            </div>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {discussion.author?.full_name || discussion.author?.username || 'مستخدم محذوف'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {discussion.book ? (
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[120px]">
                                {discussion.book.title}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">عام</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {discussion.views_count}
                            </span>
                            <button 
                              onClick={() => openRepliesDialog(discussion)}
                              className="flex items-center gap-1 hover:text-primary transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" />
                              {discussion.replies_count}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {discussion.is_pinned && (
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                                مثبت
                              </Badge>
                            )}
                            {discussion.is_locked && (
                              <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                                مغلق
                              </Badge>
                            )}
                            {!discussion.is_pinned && !discussion.is_locked && (
                              <Badge variant="outline">عادي</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(discussion.created_at), 'dd MMM yyyy', { locale: ar })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openRepliesDialog(discussion)}
                              title="عرض الردود"
                            >
                              <Reply className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePinMutation.mutate({ 
                                id: discussion.id, 
                                isPinned: !discussion.is_pinned 
                              })}
                              title={discussion.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                            >
                              {discussion.is_pinned ? (
                                <PinOff className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Pin className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleLockMutation.mutate({ 
                                id: discussion.id, 
                                isLocked: !discussion.is_locked 
                              })}
                              title={discussion.is_locked ? 'فتح' : 'قفل'}
                            >
                              {discussion.is_locked ? (
                                <Unlock className="w-4 h-4 text-green-500" />
                              ) : (
                                <Lock className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(discussion)}
                              className="text-destructive hover:text-destructive"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={discussionsData?.totalCount || 0}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            showItemsPerPage={false}
          />
        )}

        {/* Delete Discussion Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                تأكيد حذف المناقشة
              </AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف المناقشة "{selectedDiscussion?.title}"؟
                <br />
                سيتم حذف جميع الردود ({selectedDiscussion?.replies_count}) والتصويتات المرتبطة بها. 
                <br />
                <strong className="text-destructive">هذا الإجراء لا يمكن التراجع عنه.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف المناقشة
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Reply Dialog */}
        <AlertDialog open={deleteReplyDialogOpen} onOpenChange={setDeleteReplyDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                تأكيد حذف الرد
              </AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا الرد؟
                <br />
                <strong className="text-destructive">هذا الإجراء لا يمكن التراجع عنه.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteReply}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف الرد
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Discussion Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                تفاصيل المناقشة
              </DialogTitle>
            </DialogHeader>
            {viewingDiscussion && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 p-1">
                  <div>
                    <h3 className="font-bold text-lg">{viewingDiscussion.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {viewingDiscussion.author?.full_name || viewingDiscussion.author?.username || 'مستخدم محذوف'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(viewingDiscussion.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {viewingDiscussion.is_pinned && (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                        <Pin className="w-3 h-3 ml-1" />
                        مثبت
                      </Badge>
                    )}
                    {viewingDiscussion.is_locked && (
                      <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                        <Lock className="w-3 h-3 ml-1" />
                        مغلق
                      </Badge>
                    )}
                    {viewingDiscussion.book && (
                      <Badge variant="outline">
                        <BookOpen className="w-3 h-3 ml-1" />
                        {viewingDiscussion.book.title}
                      </Badge>
                    )}
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {viewingDiscussion.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {viewingDiscussion.views_count} مشاهدة
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {viewingDiscussion.replies_count} رد
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDetailsDialogOpen(false);
                        openRepliesDialog(viewingDiscussion);
                      }}
                    >
                      <Reply className="w-4 h-4 ml-2" />
                      عرض الردود ({viewingDiscussion.replies_count})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePinMutation.mutate({ 
                        id: viewingDiscussion.id, 
                        isPinned: !viewingDiscussion.is_pinned 
                      })}
                    >
                      {viewingDiscussion.is_pinned ? (
                        <>
                          <PinOff className="w-4 h-4 ml-2" />
                          إلغاء التثبيت
                        </>
                      ) : (
                        <>
                          <Pin className="w-4 h-4 ml-2" />
                          تثبيت
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleLockMutation.mutate({ 
                        id: viewingDiscussion.id, 
                        isLocked: !viewingDiscussion.is_locked 
                      })}
                    >
                      {viewingDiscussion.is_locked ? (
                        <>
                          <Unlock className="w-4 h-4 ml-2" />
                          فتح
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 ml-2" />
                          قفل
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDetailsDialogOpen(false);
                        handleDelete(viewingDiscussion);
                      }}
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      حذف
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        {/* Replies Dialog */}
        <Dialog open={repliesDialogOpen} onOpenChange={setRepliesDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Reply className="w-5 h-5" />
                ردود المناقشة: {viewingDiscussion?.title}
              </DialogTitle>
              <DialogDescription>
                {repliesData?.length || 0} رد على هذه المناقشة
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {repliesLoading ? (
                <div className="space-y-4 p-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : repliesData?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Reply className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد ردود على هذه المناقشة</p>
                </div>
              ) : (
                <div className="space-y-4 p-1">
                  {repliesData?.map((reply, index) => (
                    <div 
                      key={reply.id} 
                      className="border rounded-lg p-4 bg-card"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                            <span className="text-sm font-medium">
                              {reply.author?.full_name || reply.author?.username || 'مستخدم محذوف'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(reply.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {reply.content}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteReply(reply)}
                          className="text-destructive hover:text-destructive shrink-0"
                          title="حذف الرد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminDiscussions;
