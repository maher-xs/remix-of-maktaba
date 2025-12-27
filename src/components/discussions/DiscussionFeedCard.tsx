import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageCircle, 
  ThumbsUp, 
  ThumbsDown,
  Share2, 
  BookOpen, 
  Eye,
  ChevronDown,
  ChevronUp,
  Send,
  BadgeCheck,
  MoreHorizontal,
  Pencil,
  Trash2,
  Flag,
  X,
  Check
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Discussion, DiscussionReply, useDiscussionReplies, useCreateReply, useVote, useUpdateReply, useDeleteReply } from '@/hooks/useDiscussions';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { MentionInput, renderTextWithMentions } from './MentionInput';
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
import { ReportContentDialog } from '@/components/reports/ReportContentDialog';

interface DiscussionFeedCardProps {
  discussion: Discussion;
  isPinned?: boolean;
}

export const DiscussionFeedCard = ({ discussion, isPinned }: DiscussionFeedCardProps) => {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  
  const { data: replies, isLoading: repliesLoading } = useDiscussionReplies(showReplies ? discussion.id : '');
  const createReply = useCreateReply();
  const vote = useVote();

  const handleVote = (e: React.MouseEvent, voteType: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('يجب تسجيل الدخول للتصويت');
      return;
    }
    vote.mutate({ discussionId: discussion.id, voteType });
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    
    try {
      await createReply.mutateAsync({
        discussionId: discussion.id,
        content: replyContent
      });
      setReplyContent('');
      setShowReplyInput(false);
      setShowReplies(true);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/discussions/${discussion.id}`);
    toast.success('تم نسخ الرابط');
  };

  const handleToggleReplies = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowReplies(!showReplies);
  };

  const handleToggleReplyInput = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('يجب تسجيل الدخول للرد');
      return;
    }
    setShowReplyInput(!showReplyInput);
  };

  return (
    <article 
      className={`content-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/40 group ${
        isPinned ? 'ring-2 ring-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20' : ''
      }`}
    >
      <Link to={`/discussions/${discussion.id}`} className="block p-5 overflow-hidden">
        {/* Header Row - Improved Layout */}
        <div className="flex items-start gap-4">
          {/* Avatar with ring effect */}
          <div className="relative shrink-0">
            <Avatar className="w-12 h-12 ring-2 ring-background shadow-md group-hover:ring-primary/20 transition-all duration-300">
              <AvatarImage 
                src={discussion.author?.avatar_url || ''} 
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-base">
                {discussion.author?.full_name?.charAt(0) || 'م'}
              </AvatarFallback>
            </Avatar>
            {discussion.author?.is_verified && (
              <BadgeCheck className="absolute -bottom-1 -right-1 w-5 h-5 text-sky-500 fill-sky-500/20 bg-background rounded-full p-0.5" />
            )}
          </div>

          {/* Author Info & Content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* Author Name & Time */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {discussion.author?.full_name || discussion.author?.username || 'مستخدم'}
                </span>
                {discussion.author?.username && (
                  <span className="text-muted-foreground text-xs hidden sm:inline">@{discussion.author.username}</span>
                )}
              </div>
              <span className="text-muted-foreground text-xs shrink-0 bg-muted/50 px-2.5 py-1 rounded-full">
                {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true, locale: ar })}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-bold text-lg text-foreground line-clamp-2 leading-snug group-hover:text-primary/90 transition-colors">
              {discussion.title}
            </h3>
            
            {/* Content Preview */}
            <p className="text-muted-foreground text-sm mt-2 line-clamp-2 leading-relaxed">
              {renderTextWithMentions(discussion.content)}
            </p>

            {/* Book Badge - Enhanced */}
            {discussion.book && (
              <div className="mt-3 flex items-center gap-3">
                {discussion.book.cover_url && (
                  <img 
                    src={discussion.book.cover_url} 
                    alt={discussion.book.title}
                    className="w-10 h-12 object-cover rounded shadow-sm"
                  />
                )}
                <Badge variant="secondary" className="gap-1.5 text-sm h-7 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[180px]">{discussion.book.title}</span>
                </Badge>
              </div>
            )}

            {/* Stats Row - Enhanced */}
            <div className="flex items-center gap-5 mt-4 pt-3 border-t border-border/50">
              <span className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <ThumbsUp className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="font-medium">{discussion.votes_count || 0}</span>
              </span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                  <MessageCircle className="w-3.5 h-3.5 text-secondary-foreground" />
                </div>
                <span className="font-medium">{discussion.replies_count || 0}</span>
              </span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium">{discussion.views_count || 0}</span>
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleVote(e, 1)}
            className={`h-8 px-3 ${discussion.user_vote === 1 ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
          >
            <ThumbsUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleVote(e, -1)}
            className={`h-8 px-3 ${discussion.user_vote === -1 ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
          >
            <ThumbsDown className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleReplyInput}
          className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-primary"
        >
          <MessageCircle className="w-4 h-4" />
          رد
        </Button>

        {(discussion.replies_count || 0) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleReplies}
            className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-primary"
          >
            {showReplies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            الردود ({discussion.replies_count})
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="h-8 px-3 text-muted-foreground hover:text-primary"
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Reply Input */}
      {showReplyInput && user && (
        <div className="border-t border-border/50 p-3 bg-muted/20">
          <div className="flex gap-2">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {user.email?.charAt(0).toUpperCase() || 'أ'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <MentionInput
                value={replyContent}
                onChange={setReplyContent}
                placeholder="اكتب ردك... استخدم @ للإشارة إلى مستخدم"
                minHeight="60px"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyContent('');
                  }}
                  className="h-7 text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={!replyContent.trim() || createReply.isPending}
                  className="h-7 text-xs gap-1"
                >
                  <Send className="w-3 h-3" />
                  إرسال
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replies Section */}
      {showReplies && (
        <div className="border-t border-border/50 bg-muted/10">
          {repliesLoading ? (
            <div className="p-3 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="w-7 h-7 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : replies && replies.length > 0 ? (
            <div className="divide-y divide-border/30">
              {replies.slice(0, 3).map((reply) => (
                <ReplyCard key={reply.id} reply={reply} />
              ))}
              {replies.length > 3 && (
                <Link 
                  to={`/discussions/${discussion.id}`}
                  className="block p-2 text-center text-xs text-primary hover:bg-primary/5 transition-colors font-medium"
                >
                  عرض جميع الردود ({replies.length})
                </Link>
              )}
            </div>
          ) : (
            <div className="p-3 text-center text-muted-foreground text-xs">
              لا توجد ردود بعد
            </div>
          )}
        </div>
      )}
    </article>
  );
};

// Reply Card Component
const ReplyCard = ({ reply }: { reply: DiscussionReply }) => {
  const { user } = useAuth();
  const vote = useVote();
  const updateReply = useUpdateReply();
  const deleteReply = useDeleteReply();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const isOwner = user?.id === reply.user_id;

  const handleVote = (voteType: 1 | -1) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول للتصويت');
      return;
    }
    vote.mutate({ replyId: reply.id, voteType });
  };

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

  return (
    <>
      <div className="p-4 hover:bg-muted/30 transition-all duration-200 group/reply">
        <div className="flex gap-3">
          {/* Reply Avatar */}
          <div className="shrink-0">
            <Avatar className="w-10 h-10 ring-2 ring-background shadow-sm">
              <AvatarImage src={reply.author?.avatar_url || ''} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-secondary to-muted text-secondary-foreground font-semibold text-sm">
                {reply.author?.full_name?.charAt(0) || 'م'}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
            {/* Reply Header */}
            <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground group-hover/reply:text-primary transition-colors flex items-center gap-1">
                  {reply.author?.full_name || reply.author?.username || 'مستخدم'}
                  {reply.author?.is_verified && (
                    <BadgeCheck className="w-4 h-4 text-sky-500 fill-sky-500/20 inline-block" />
                  )}
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ar })}
                </span>
                {reply.updated_at !== reply.created_at && (
                  <span className="text-muted-foreground/50 text-xs">(معدّل)</span>
                )}
              </div>

              {/* Actions Menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {isOwner && (
                      <>
                        <DropdownMenuItem onClick={handleEdit} className="gap-2">
                          <Pencil className="w-4 h-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setShowDeleteDialog(true)} 
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {!isOwner && (
                      <DropdownMenuItem 
                        onClick={() => setShowReportDialog(true)} 
                        className="gap-2 text-amber-600 focus:text-amber-600"
                      >
                        <Flag className="w-4 h-4" />
                        إبلاغ
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Reply Content */}
            {isEditing ? (
              <div className="space-y-2">
                <MentionInput
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="تعديل الرد..."
                  minHeight="60px"
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-7 text-xs gap-1"
                  >
                    <X className="w-3 h-3" />
                    إلغاء
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim() || updateReply.isPending}
                    className="h-7 text-xs gap-1"
                  >
                    <Check className="w-3 h-3" />
                    حفظ
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                <p className="text-foreground text-sm leading-relaxed break-words">
                  {renderTextWithMentions(reply.content)}
                </p>
              </div>
            )}

            {/* Reply Actions */}
            {!isEditing && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote(1)}
                  className={`h-8 px-3 text-xs gap-1.5 ${reply.user_vote === 1 ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  {(reply.votes_count || 0) > 0 && <span>{reply.votes_count}</span>}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote(-1)}
                  className={`h-8 px-3 text-xs ${reply.user_vote === -1 ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                >
                  <ThumbsDown className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

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

export default DiscussionFeedCard;
