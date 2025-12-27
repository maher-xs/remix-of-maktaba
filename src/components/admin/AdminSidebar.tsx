import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  FolderTree, 
  Settings,
  ArrowRight,
  LogOut,
  Activity,
  MessageSquare,
  Palette,
  FileText,
  Shield,
  ShieldAlert,
  Ban,
  Megaphone,
  Flag,
  Star,
  ChevronDown,
  Menu,
  X,
  AlertTriangle,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles, menuPermissions, AppRole } from '@/hooks/useUserRoles';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ElementType;
  permission: AppRole[];
  badge?: number;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: 'الرئيسية',
    items: [
      { title: 'لوحة التحكم', href: '/admin', icon: LayoutDashboard, permission: menuPermissions.dashboard },
    ],
  },
  {
    title: 'إدارة المحتوى',
    items: [
      { title: 'الكتب', href: '/admin/books', icon: BookOpen, permission: menuPermissions.books },
      { title: 'التصنيفات', href: '/admin/categories', icon: FolderTree, permission: menuPermissions.categories },
      { title: 'التعليقات', href: '/admin/reviews', icon: Star, permission: menuPermissions.reviews },
      { title: 'النقاشات', href: '/admin/discussions', icon: MessageSquare, permission: menuPermissions.discussions },
    ],
  },
  {
    title: 'المستخدمين والتواصل',
    items: [
      { title: 'المستخدمين', href: '/admin/users', icon: Users, permission: menuPermissions.users },
      { title: 'التحذيرات', href: '/admin/warnings', icon: AlertTriangle, permission: menuPermissions.users },
      { title: 'الرسائل', href: '/admin/messages', icon: MessageSquare, permission: menuPermissions.messages },
      { title: 'البلاغات', href: '/admin/reports', icon: Flag, permission: menuPermissions.reports },
    ],
  },
  {
    title: 'الأمان والحماية',
    items: [
      { title: 'الأدوار والصلاحيات', href: '/admin/roles', icon: Shield, permission: menuPermissions.roles },
      { title: 'سجلات الأمان', href: '/admin/security', icon: ShieldAlert, permission: menuPermissions.security },
      { title: 'فلترة المحتوى', href: '/admin/security-dashboard', icon: Shield, permission: menuPermissions.securityDashboard },
      { title: 'IPs المحظورة', href: '/admin/blocked-ips', icon: Ban, permission: menuPermissions.blockedIps },
      { title: 'سجل النشاطات', href: '/admin/activity', icon: Activity, permission: menuPermissions.activity },
    ],
  },
  {
    title: 'الإعدادات والمظهر',
    items: [
      { title: 'الفريق', href: '/admin/team', icon: Users, permission: menuPermissions.settings },
      { title: 'الإعلانات', href: '/admin/ads', icon: Megaphone, permission: menuPermissions.ads },
      { title: 'الصفحات', href: '/admin/pages', icon: FileText, permission: menuPermissions.pages },
      { title: 'المظهر', href: '/admin/appearance', icon: Palette, permission: menuPermissions.appearance },
      { title: 'النسخ الاحتياطي', href: '/admin/backups', icon: Database, permission: menuPermissions.settings },
      { title: 'الإعدادات', href: '/admin/settings', icon: Settings, permission: menuPermissions.settings },
    ],
  },
];

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const AdminSidebar = ({ isCollapsed = false, onToggle }: AdminSidebarProps) => {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { roles, hasAnyRole, isAdmin, isModerator, isSupport } = useUserRoles();
  const [openGroups, setOpenGroups] = useState<string[]>(['الرئيسية', 'إدارة المحتوى']);

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const getRoleBadge = () => {
    if (isAdmin) return { label: 'مدير', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    if (isModerator) return { label: 'مشرف', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    if (isSupport) return { label: 'دعم', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    return { label: 'مستخدم', color: 'bg-muted text-muted-foreground' };
  };

  const roleBadge = getRoleBadge();

  // فلترة العناصر حسب الصلاحيات
  const filteredGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => hasAnyRole(item.permission))
    }))
    .filter(group => group.items.length > 0);

  return (
    <aside 
      className={cn(
        "min-h-screen bg-card/50 backdrop-blur-sm border-l border-border/50 flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-foreground">لوحة الإدارة</h1>
              <p className="text-xs text-muted-foreground mt-0.5">مكتبة الكتب</p>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {profile?.full_name?.charAt(0) || 'م'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name || 'مستخدم'}
              </p>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 text-xs rounded-full border",
                roleBadge.color
              )}>
                {roleBadge.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-1">
          {filteredGroups.map((group) => (
            <Collapsible
              key={group.title}
              open={openGroups.includes(group.title)}
              onOpenChange={() => toggleGroup(group.title)}
            >
              {!isCollapsed && (
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <span>{group.title}</span>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    openGroups.includes(group.title) && "rotate-180"
                  )} />
                </CollapsibleTrigger>
              )}
              <CollapsibleContent className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      title={isCollapsed ? item.title : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                        isActive 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )}
                    >
                      <item.icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isActive ? "" : "group-hover:scale-110 transition-transform"
                      )} />
                      {!isCollapsed && (
                        <span className="text-sm">{item.title}</span>
                      )}
                      {item.badge && item.badge > 0 && (
                        <span className="mr-auto bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-border/50 space-y-1">
        <NavLink
          to="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "العودة للموقع" : undefined}
        >
          <ArrowRight className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm">العودة للموقع</span>}
        </NavLink>
        <button
          onClick={signOut}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors w-full",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "تسجيل الخروج" : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm">تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  );
};
