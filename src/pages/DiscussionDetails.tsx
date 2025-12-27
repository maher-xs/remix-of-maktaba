import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  Clock, 
  Pin, 
  Trash2, 
  Flag, 
  BookOpen, 
  Send, 
  MoreVertical,
  Eye,
  Share2,
  User,
  BadgeCheck,
  Pencil,
  X,
  Check,
  MoreHorizontal,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useDiscussion, useDiscussionReplies, useCreateReply, useVote, useDeleteDiscussion, usePinDiscussion, useUpdateReply, useDeleteReply, DiscussionReply } from '@/hooks/useDiscussions';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useSEO } from '@/hooks/useSEO';
import { ReportContentDialog } from '@/components/reports/ReportContentDialog';
import { MentionInput, renderTextWithMentions } from '@/components/discussions/MentionInput';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

const DiscussionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { data: discussion, isLoading } = useDiscussion(id || '');
  const { data: replies, isLoading: repliesLoading } = useDiscussionReplies(id || '');
  const createReply = useCreateReply();
  const vote = useVote();
  const deleteDiscussion = useDeleteDiscussion();
  const pinDiscussion = usePinDiscussion();
  
  const [replyContent, setReplyContent] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useSEO({
    title: discussion?.title ? `${discussion.title} - المناقشات` : 'تحميل...',
    description: discussion?.content?.substring(0, 160) || '',
  });

  const handleVote = (voteType: 1 | -1) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول للتصويت');
      return;
    }
    vote.mutate({ discussionId: id, voteType });
  };

  const handleReplyVote = (replyId: string, voteType: 1 | -1) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول للتصويت');
      return;
    }
    vote.mutate({ replyId, voteType });
  };

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    if (!user) {
      toast.error('يجب تسجيل الدخول للرد');
      return;
    }
    createReply.mutate(
      { discussionId: id!, content: replyContent },
      { onSuccess: () => setReplyContent('') }
    );
  };

  const handleDelete = () => {
    deleteDiscussion.mutate(id!, {
      onSuccess: () => navigate('/discussions')
    });
  };

  const handlePin = () => {
    if (!discussion) return;
    pinDiscussion.mutate({ id: id!, isPinned: !discussion.is_pinned });
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: discussion?.title,
        text: discussion?.content?.substring(0, 100),
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('تم نسخ الرابط');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="section-container py-8 lg:py-12">
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="content-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!discussion) {
    return (
      <Layout>
        <div className="section-container py-16 text-center">
          <div className="content-card-icon w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">المناقشة غير موجودة</h2>
          <p className="text-muted-foreground mb-4">قد تكون المناقشة محذوفة أو الرابط غير صحيح</p>
          <Button asChild variant="outline">
            <Link to="/discussions">العودة للمناقشات</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const isOwner = user?.id === discussion.user_id;
  const canModify = isOwner || isAdmin;

  return (
    <Layout>
      <div className="section-container py-6 sm:py-8 lg:py-12">
        <Breadcrumb 
          items={[
            { label: 'المناقشات', href: '/discussions' },
            { label: discussion.title.length > 25 ? discussion.title.substring(0, 25) + '...' : discussion.title }
          ]} 
        />

        {/* Main Discussion Card */}
        <article className={`content-card overflow-hidden mb-8 ${discussion.is_pinned ? 'border-primary/30' : ''}`}>
          {/* Pinned Banner */}
          {discussion.is_pinned && (
            <div className="bg-primary/10 border-b border-primary/20 px-4 sm:px-5 py-2">
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <Pin className="w-4 h-4" />
                مناقشة مثبتة
              </div>
            </div>
          )}

          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                  <AvatarImage src={discussion.author?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {discussion.author?.full_name?.charAt(0) || 'م'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {discussion.author?.username ? (
                      <Link 
                        to={`/user/${discussion.author.username}`}
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
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true, locale: ar })}
                    </span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {discussion.views_count || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={handleShare} className="gap-2">
                    <Share2 className="w-4 h-4" />
                    مشاركة
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsReportOpen(true)} className="gap-2">
                    <Flag className="w-4 h-4" />
                    إبلاغ
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={handlePin} className="gap-2">
                      <Pin className="w-4 h-4" />
                      {discussion.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                    </DropdownMenuItem>
                  )}
                  {canModify && (
                    <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="gap-2 text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4" />
                      حذف
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Book Badge */}
            {discussion.book && (
              <div className="mb-4 overflow-hidden">
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3 max-w-full">
                  <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{discussion.book.title}</span>
                </Badge>
              </div>
            )}

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4 leading-relaxed break-words">
              {discussion.title}
            </h1>

            {/* Content - يدعم النصوص الطويلة */}
            <div className="mb-6">
              <p className="text-foreground/90 whitespace-pre-wrap leading-loose text-base break-words">
                {discussion.content}
              </p>
            </div>

            {/* Vote Actions */}
            <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Button
                  variant={discussion.user_vote === 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleVote(1)}
                  className="gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{Math.max(0, discussion.votes_count || 0)}</span>
                </Button>
                <Button
                  variant={discussion.user_vote === -1 ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => handleVote(-1)}
                >
                  <ThumbsDown className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                <span>{discussion.replies_count || 0} رد</span>
              </div>
            </div>
          </div>
        </article>

        {/* Replies Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            الردود ({discussion.replies_count || 0})
          </h2>

          {/* Reply Form */}
          {user ? (
            <div className="content-card p-4 sm:p-5">
              <div className="flex gap-3 sm:gap-4">
                <Avatar className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <MentionInput
                    value={replyContent}
                    onChange={setReplyContent}
                    placeholder="شارك رأيك في هذه المناقشة... استخدم @ للإشارة إلى مستخدم"
                    minHeight="100px"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSubmitReply} 
                      disabled={!replyContent.trim() || createReply.isPending}
                      className="gap-2"
                    >
                      {createReply.isPending ? (
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      إرسال الرد
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="content-card p-6 sm:p-8 text-center">
              <div className="content-card-icon w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6" />
              </div>
              <p className="text-muted-foreground mb-4">سجل الدخول للمشاركة في النقاش</p>
              <Button asChild>
                <Link to="/auth">تسجيل الدخول</Link>
              </Button>
            </div>
          )}

          {/* Replies List */}
          {repliesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="content-card p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : replies && replies.length > 0 ? (
            <div className="space-y-4">
              {/* Only show top-level replies (no parent_reply_id) */}
              {replies.filter(r => !r.parent_reply_id).map((reply, index) => (
                <ReplyItem 
                  key={reply.id} 
                  reply={reply} 
                  index={index}
                  onVote={handleReplyVote}
                  allReplies={replies}
                  discussionId={id || ''}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="content-card-icon w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">لا توجد ردود بعد. كن أول من يرد!</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المناقشة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه المناقشة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <ReportContentDialog
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
        contentType="discussion"
        contentId={id || ''}
      />
    </Layout>
  );
};

// Reply Item Component with Edit/Delete/Report and Nested Replies functionality
const ReplyItem = ({ 
  reply, 
  index, 
  onVote,
  allReplies,
  discussionId,
  depth = 0
}: { 
  reply: DiscussionReply; 
  index: number;
  onVote: (replyId: string, voteType: 1 | -1) => void;
  allReplies: DiscussionReply[];
  discussionId: string;
  depth?: number;
}) => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const updateReply = useUpdateReply();
  const deleteReply = useDeleteReply();
  const createReply = useCreateReply();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [nestedReplyContent, setNestedReplyContent] = useState('');
  const [showNestedReplies, setShowNestedReplies] = useState(true);

  const isOwner = user?.id === reply.user_id;
  const canModify = isOwner || isAdmin;
  
  // Get nested replies for this reply
  const nestedReplies = allReplies.filter(r => r.parent_reply_id === reply.id);
  const maxDepth = 3; // الحد الأقصى لعمق الردود المتداخلة
  
  // Get parent reply author name for nested replies
  const parentReply = reply.parent_reply_id 
    ? allReplies.find(r => r.id === reply.parent_reply_id) 
    : null;
  const parentAuthorName = parentReply?.author?.full_name || parentReply?.author?.username || 'مستخدم';

  const handleEdit = () => {
    setEditContent(reply.content);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await updateReply.mutateAsync({ replyId: reply.id, content: editContent });
      setIsEditing(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(reply.content);
  };

  const handleDelete = async () => {
    try {
      await deleteReply.mutateAsync(reply.id);
      setShowDeleteDialog(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleNestedReply = async () => {
    if (!nestedReplyContent.trim()) return;
    try {
      await createReply.mutateAsync({
        discussionId,
        content: nestedReplyContent,
        parentReplyId: reply.id
      });
      setNestedReplyContent('');
      setShowReplyInput(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const toggleReplyInput = () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول للرد');
      return;
    }
    setShowReplyInput(!showReplyInput);
    setNestedReplyContent('');
  };

  const scrollToParentReply = () => {
    if (reply.parent_reply_id) {
      const parentElement = document.getElementById(`reply-${reply.parent_reply_id}`);
      if (parentElement) {
        parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        parentElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          parentElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }
    }
  };

  return (
    <>
      <article 
        id={`reply-${reply.id}`}
        className={`content-card p-4 sm:p-5 animate-fade-up group transition-all duration-300 ${depth > 0 ? 'mr-4 sm:mr-8 border-r-2 border-primary/20' : ''}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex gap-3 sm:gap-4">
          <Avatar className={`flex-shrink-0 ${depth > 0 ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-8 h-8 sm:w-9 sm:h-9'}`}>
            <AvatarImage src={reply.author?.avatar_url || ''} />
            <AvatarFallback className="text-xs bg-muted font-semibold">
              {reply.author?.full_name?.charAt(0) || 'م'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm text-foreground">
                  {reply.author?.full_name || reply.author?.username || 'مستخدم'}
                </span>
                {reply.author?.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-sky-500 fill-sky-500/20" />
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ar })}
                </span>
                {reply.updated_at !== reply.created_at && (
                  <span className="text-muted-foreground/50 text-xs">(معدّل)</span>
                )}
                {reply.parent_reply_id && parentReply && (
                  <button 
                    onClick={scrollToParentReply}
                    className="text-xs text-primary/80 flex items-center gap-1 hover:text-primary hover:underline transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3 rotate-180" />
                    رداً على <span className="font-medium">{parentAuthorName}</span>
                  </button>
                )}
              </div>

              {/* Actions Menu */}
              {user && (canModify || !isOwner) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {isOwner && (
                      <DropdownMenuItem onClick={handleEdit} className="gap-2">
                        <Pencil className="w-4 h-4" />
                        تعديل
                      </DropdownMenuItem>
                    )}
                    {canModify && (
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)} 
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </DropdownMenuItem>
                    )}
                    {!isOwner && (
                      <>
                        {canModify && <DropdownMenuSeparator />}
                        <DropdownMenuItem 
                          onClick={() => setShowReportDialog(true)} 
                          className="gap-2 text-amber-600 focus:text-amber-600"
                        >
                          <Flag className="w-4 h-4" />
                          إبلاغ
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {/* Reply Content */}
            {isEditing ? (
              <div className="space-y-3">
                <MentionInput
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="تعديل الرد..."
                  minHeight="80px"
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-8 text-xs gap-1"
                  >
                    <X className="w-3 h-3" />
                    إلغاء
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim() || updateReply.isPending}
                    className="h-8 text-xs gap-1"
                  >
                    <Check className="w-3 h-3" />
                    حفظ
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed mb-3 break-words">
                {renderTextWithMentions(reply.content)}
              </p>
            )}

            {/* Action Buttons */}
            {!isEditing && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Button
                    variant={reply.user_vote === 1 ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onVote(reply.id, 1)}
                    className="h-7 px-2 gap-1 text-xs"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>{Math.max(0, reply.votes_count || 0)}</span>
                  </Button>
                  <Button
                    variant={reply.user_vote === -1 ? 'destructive' : 'ghost'}
                    size="sm"
                    onClick={() => onVote(reply.id, -1)}
                    className="h-7 px-2"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* Reply Button - only show if not at max depth */}
                {depth < maxDepth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleReplyInput}
                    className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    <MessageCircle className="w-3 h-3" />
                    رد
                  </Button>
                )}

                {/* Toggle Nested Replies */}
                {nestedReplies.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNestedReplies(!showNestedReplies)}
                    className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    {showNestedReplies ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        إخفاء الردود ({nestedReplies.length})
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        عرض الردود ({nestedReplies.length})
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Nested Reply Input */}
            {showReplyInput && user && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex gap-3">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {user.email?.charAt(0).toUpperCase() || 'أ'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <MentionInput
                      value={nestedReplyContent}
                      onChange={setNestedReplyContent}
                      placeholder={`الرد على ${reply.author?.full_name || 'المستخدم'}... استخدم @ للإشارة`}
                      minHeight="60px"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowReplyInput(false);
                          setNestedReplyContent('');
                        }}
                        className="h-7 text-xs"
                      >
                        إلغاء
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleNestedReply}
                        disabled={!nestedReplyContent.trim() || createReply.isPending}
                        className="h-7 text-xs gap-1"
                      >
                        {createReply.isPending ? (
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        إرسال
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Nested Replies */}
      {showNestedReplies && nestedReplies.length > 0 && (
        <div className="space-y-3 mt-3">
          {nestedReplies.map((nestedReply, nestedIndex) => (
            <ReplyItem
              key={nestedReply.id}
              reply={nestedReply}
              index={nestedIndex}
              onVote={onVote}
              allReplies={allReplies}
              discussionId={discussionId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا الرد؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف الرد نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <ReportContentDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        contentType="reply"
        contentId={reply.id}
      />
    </>
  );
};

export default DiscussionDetails;
