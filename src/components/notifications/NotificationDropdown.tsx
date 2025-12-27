import { 
  Bell, Check, Trash2, BookOpen, Star, MessageCircle, Users, 
  CheckCircle, XCircle, ShieldCheck, Ban, PartyPopper, Info, ThumbsUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const getNotificationLink = (notification: Notification): string | null => {
  const data = notification.data as Record<string, unknown>;
  
  switch (notification.type) {
    case 'discussion_reply':
    case 'reply_mention':
    case 'discussion_vote':
    case 'reply_vote':
      if (data?.discussion_id) {
        return `/discussions/${data.discussion_id}`;
      }
      break;
    case 'list_update':
      if (data?.list_id) {
        return `/reading-lists/${data.list_id}`;
      }
      break;
    case 'new_follower':
      if (data?.list_id) {
        return `/reading-lists/${data.list_id}`;
      }
      break;
    case 'new_book':
      if (data?.book_id) {
        return `/book/${data.book_id}`;
      }
      break;
    case 'review':
      if (data?.book_id) {
        return `/book/${data.book_id}`;
      }
      break;
    default:
      return null;
  }
  return null;
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_book':
      return <BookOpen className="w-4 h-4 text-primary" />;
    case 'review':
      return <Star className="w-4 h-4 text-yellow-500" />;
    case 'comment':
      return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case 'follow':
      return <Users className="w-4 h-4 text-green-500" />;
    case 'report_resolved':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'report_dismissed':
      return <XCircle className="w-4 h-4 text-orange-500" />;
    case 'account_verified':
      return <ShieldCheck className="w-4 h-4 text-blue-500" />;
    case 'account_banned':
      return <Ban className="w-4 h-4 text-destructive" />;
    case 'account_unbanned':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'welcome':
      return <PartyPopper className="w-4 h-4 text-primary" />;
    case 'system':
      return <Info className="w-4 h-4 text-blue-500" />;
    case 'discussion_reply':
      return <MessageCircle className="w-4 h-4 text-primary" />;
    case 'reply_mention':
      return <MessageCircle className="w-4 h-4 text-green-500" />;
    case 'list_update':
      return <BookOpen className="w-4 h-4 text-blue-500" />;
    case 'new_follower':
      return <Users className="w-4 h-4 text-primary" />;
    case 'discussion_vote':
    case 'reply_vote':
      return <ThumbsUp className="w-4 h-4 text-blue-500" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
};

const NotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  onNavigate
}: { 
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (link: string | null) => void;
}) => {
  const link = getNotificationLink(notification);
  
  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    onNavigate(link);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer rounded-lg",
        !notification.is_read && "bg-primary/5",
        link && "hover:bg-primary/10"
      )}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mt-1">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm",
          !notification.is_read ? "font-medium text-foreground" : "text-muted-foreground"
        )}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { 
            addSuffix: true,
            locale: ar 
          })}
        </p>
      </div>
      <div className="flex-shrink-0 flex gap-1">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
          >
            <Check className="w-3 h-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    isLoading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();

  const handleNavigate = (link: string | null) => {
    if (link) {
      navigate(link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-background border border-border shadow-lg">
        <DropdownMenuLabel className="flex items-center justify-between py-3 px-3">
          <span className="font-semibold">الإشعارات</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs hover:bg-primary/10 text-primary"
              onClick={() => markAllAsRead()}
            >
              قراءة الكل
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm">جاري التحميل...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
