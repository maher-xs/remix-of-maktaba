import { useTheme } from "@/hooks/useTheme";
import { Toaster as Sonner, toast } from "sonner";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info, 
  Download, 
  Upload, 
  Loader2,
  Heart,
  BookOpen,
  Share2,
  Trash2,
  Save,
  Plus,
  Edit,
  Eye,
  Bell,
  Link,
  Copy,
  Send,
  Star,
  Bookmark
} from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      dir="rtl"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-primary/20 group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:min-h-[64px] group-[.toaster]:text-base",
          title: "group-[.toast]:font-semibold group-[.toast]:text-base group-[.toast]:text-foreground",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:font-semibold",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl",
          closeButton: "group-[.toast]:bg-card group-[.toast]:text-foreground group-[.toast]:border-primary/20 group-[.toast]:hover:bg-muted",
          success: "group-[.toaster]:!bg-card group-[.toaster]:!border-primary/40 group-[.toaster]:!text-foreground [&_svg]:!text-primary",
          error: "group-[.toaster]:!bg-card group-[.toaster]:!border-destructive/40 group-[.toaster]:!text-foreground [&_svg]:!text-destructive",
          warning: "group-[.toaster]:!bg-card group-[.toaster]:!border-secondary/50 group-[.toaster]:!text-foreground [&_svg]:!text-secondary",
          info: "group-[.toaster]:!bg-card group-[.toaster]:!border-primary/30 group-[.toaster]:!text-foreground [&_svg]:!text-primary",
        },
      }}
      icons={{
        success: <CheckCircle2 className="w-5 h-5 text-primary" />,
        error: <XCircle className="w-5 h-5 text-destructive" />,
        warning: <AlertCircle className="w-5 h-5 text-secondary" />,
        info: <Info className="w-5 h-5 text-primary" />,
        loading: <Loader2 className="w-5 h-5 animate-spin text-primary" />,
      }}
      {...props}
    />
  );
};

// Custom toast functions with specific icons matching site theme
const customToast = {
  // Success - General
  success: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <CheckCircle2 className="w-5 h-5 text-primary" />,
    });
  },
  
  // Error
  error: (message: string, description?: string) => {
    return toast.error(message, {
      description,
      icon: <XCircle className="w-5 h-5 text-destructive" />,
    });
  },

  // Download notifications
  download: (message: string, description?: string) => {
    return toast(message, {
      description,
      icon: <Download className="w-5 h-5 text-primary" />,
    });
  },
  downloadSuccess: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Download className="w-5 h-5 text-primary" />,
    });
  },
  
  // Upload/Publish notifications
  upload: (message: string, description?: string) => {
    return toast(message, {
      description,
      icon: <Upload className="w-5 h-5 text-primary" />,
    });
  },
  uploadSuccess: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Upload className="w-5 h-5 text-primary" />,
    });
  },
  
  // Create/Add notifications
  create: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Plus className="w-5 h-5 text-primary" />,
    });
  },
  
  // Edit notifications
  edit: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Edit className="w-5 h-5 text-primary" />,
    });
  },
  
  // Favorite notifications
  favorite: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />,
    });
  },
  unfavorite: (message: string, description?: string) => {
    return toast(message, {
      description,
      icon: <Heart className="w-5 h-5 text-muted-foreground" />,
    });
  },
  
  // Book notifications
  book: (message: string, description?: string) => {
    return toast(message, {
      description,
      icon: <BookOpen className="w-5 h-5 text-primary" />,
    });
  },
  bookSuccess: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <BookOpen className="w-5 h-5 text-primary" />,
    });
  },
  
  // View notifications
  view: (message: string, description?: string) => {
    return toast(message, {
      description,
      icon: <Eye className="w-5 h-5 text-primary" />,
    });
  },
  
  // Share notifications
  share: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Share2 className="w-5 h-5 text-primary" />,
    });
  },
  
  // Copy/Link notifications
  copy: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Copy className="w-5 h-5 text-primary" />,
    });
  },
  link: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Link className="w-5 h-5 text-primary" />,
    });
  },
  
  // Delete notifications
  delete: (message: string, description?: string) => {
    return toast(message, {
      description,
      icon: <Trash2 className="w-5 h-5 text-destructive" />,
    });
  },
  deleteSuccess: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Trash2 className="w-5 h-5 text-destructive" />,
    });
  },
  
  // Save notifications
  save: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Save className="w-5 h-5 text-primary" />,
    });
  },
  
  // Bookmark notifications
  bookmark: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Bookmark className="w-5 h-5 text-primary fill-primary" />,
    });
  },
  unbookmark: (message: string, description?: string) => {
    return toast(message, {
      description,
      icon: <Bookmark className="w-5 h-5 text-muted-foreground" />,
    });
  },
  
  // Rating/Star notifications
  rate: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Star className="w-5 h-5 text-secondary fill-secondary" />,
    });
  },
  
  // Notification alerts
  notify: (message: string, description?: string) => {
    return toast(message, {
      description,
      icon: <Bell className="w-5 h-5 text-primary" />,
    });
  },
  
  // Send notifications
  send: (message: string, description?: string) => {
    return toast.success(message, {
      description,
      icon: <Send className="w-5 h-5 text-primary" />,
    });
  },
};

export { Toaster, toast, customToast };
