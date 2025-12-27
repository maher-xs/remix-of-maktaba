import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Search,
  Moon,
  Sun,
  User,
  LogOut,
  Library,
  ChevronDown,
  Upload,
  Monitor,
  Download,
  Settings,
  List,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { usePrefetch } from "@/hooks/usePrefetch";
import { useHeaderSettings, useSearchSettings, useThemeSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const { prefetchOnHover } = usePrefetch();
  
  // جلب الإعدادات من قاعدة البيانات
  const { data: headerSettings } = useHeaderSettings();
  const { data: searchSettings } = useSearchSettings();
  const { data: themeSettings } = useThemeSettings();

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getThemeIcon = () => {
    if (theme === "system") return <Monitor className="w-5 h-5" />;
    if (isDark) return <Moon className="w-5 h-5" />;
    return <Sun className="w-5 h-5" />;
  };

  const getThemeLabel = () => {
    if (theme === "system") return "وضع النظام";
    if (theme === "dark") return "الوضع الليلي";
    return "الوضع النهاري";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= searchSettings.minSearchLength) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("تم تسجيل الخروج بنجاح");
    setIsMenuOpen(false);
  };

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/categories", label: "التصنيفات" },
    { href: "/about", label: "عن المكتبة" },
  ];

  const isActive = (path: string) => location.pathname === path;

  // التحقق من السماح بتغيير المظهر
  const canChangeTheme = themeSettings.allowUserChoice;

  return (
    <header className={`${headerSettings.stickyHeader ? 'sticky top-0' : ''} z-50 bg-background/95 backdrop-blur-lg border-b border-border/40 shadow-sm`}>
      <div className="section-container">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link to="/" className="group flex-shrink-0">
            <Logo size="md" showText={true} className="transition-transform duration-200 group-hover:scale-[1.02]" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                {...prefetchOnHover(link.href)}
                className={`text-base font-medium transition-colors hover:text-primary ${
                  isActive(link.href) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search Bar - Desktop */}
          {headerSettings.showSearch && searchSettings.enableSearch && (
            <form onSubmit={handleSearch} className="hidden lg:flex items-center gap-4 flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchSettings.searchPlaceholder}
                  className="w-full h-11 pr-10 pl-4 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </form>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Theme Toggle */}
            {headerSettings.showThemeToggle && canChangeTheme && (
              <button
                onClick={cycleTheme}
                className="w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 touch-manipulation"
                aria-label={getThemeLabel()}
                title={getThemeLabel()}
              >
                {getThemeIcon()}
              </button>
            )}

            {/* Auth Buttons - Desktop */}
            {!loading && headerSettings.showAuthButtons && (
              <>
                {user ? (
                  <div className="hidden lg:flex items-center gap-2">
                    <SyncStatusIndicator />
                    <NotificationDropdown />
                    <Button
                      asChild
                      variant="outline"
                      size="default"
                      className="gap-2 rounded-xl border-primary/20 hover:bg-primary hover:text-primary-foreground"
                    >
                      <Link to="/upload">
                        <Upload className="w-4 h-4" />
                        <span>رفع كتاب</span>
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="gap-2 rounded-xl hover:bg-primary/10 px-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {user.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                          <Link to="/my-library" className="flex items-center gap-2">
                            <Library className="w-4 h-4" />
                            <span>مكتبتي</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                          <Link to="/saved-books" className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            <span>الكتب المحفوظة</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                          <Link to="/reading-lists" className="flex items-center gap-2">
                            <List className="w-4 h-4" />
                            <span>قوائم القراءة</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                          <Link to="/stats" className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            <span>الإحصائيات</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                          <Link to="/discussions" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            <span>النقاشات</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                          <Link to="/settings" className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            <span>الإعدادات</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleSignOut}
                          className="rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <LogOut className="w-4 h-4 ml-2" />
                          <span>تسجيل الخروج</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="hidden lg:flex items-center gap-2">
                    {/* Saved Books - Always visible */}
                    <Button
                      asChild
                      variant="ghost"
                      size="default"
                      className="gap-2 rounded-xl hover:bg-muted"
                    >
                      <Link to="/saved-books">
                        <Download className="w-4 h-4" />
                        <span>المحفوظة</span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="default"
                      className="gap-2 rounded-xl border-primary/20 hover:bg-primary hover:text-primary-foreground"
                    >
                      <Link to="/auth">
                        <User className="w-4 h-4" />
                        <span>تسجيل الدخول</span>
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all duration-200 touch-manipulation"
              aria-label={isMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 border-t border-border/30">
            {/* Mobile Search - Improved design */}
            {headerSettings.showSearch && searchSettings.enableSearch && (
              <form onSubmit={handleSearch} className="relative mb-4 px-1">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchSettings.searchPlaceholder}
                    className="w-full h-12 pr-12 pl-4 bg-muted/40 border border-border/50 rounded-xl text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  />
                </div>
              </form>
            )}

            {/* Mobile Auth Section - Only show items NOT in bottom nav */}
            {!loading && headerSettings.showAuthButtons &&
              (user ? (
                <div className="space-y-3 px-1">
                  {/* Primary Actions - Items not in bottom nav */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/upload"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary text-primary-foreground active:scale-[0.97] transition-transform touch-manipulation"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-sm font-medium">رفع كتاب</span>
                    </Link>
                    <Link
                      to="/my-library"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-muted/60 text-foreground active:scale-[0.97] transition-transform touch-manipulation"
                    >
                      <Library className="w-5 h-5" />
                      <span className="text-sm font-medium">مكتبتي</span>
                    </Link>
                  </div>

                  {/* Secondary Links Row */}
                  <div className="grid grid-cols-3 gap-2">
                    <Link
                      to="/saved-books"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/40 text-muted-foreground text-sm active:scale-[0.97] transition-transform touch-manipulation"
                    >
                      <Download className="w-4 h-4" />
                      <span>المحفوظة</span>
                    </Link>
                    <Link
                      to="/reading-lists"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/40 text-muted-foreground text-sm active:scale-[0.97] transition-transform touch-manipulation"
                    >
                      <List className="w-4 h-4" />
                      <span>القوائم</span>
                    </Link>
                    <Link
                      to="/stats"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/40 text-muted-foreground text-sm active:scale-[0.97] transition-transform touch-manipulation"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>إحصائيات</span>
                    </Link>
                  </div>

                  {/* Logout */}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-destructive text-sm font-medium bg-destructive/5 active:scale-[0.98] transition-transform touch-manipulation"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              ) : (
                <div className="px-1">
                  {/* Login Button - Only for non-logged users */}
                  <Link
                    to="/auth"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-[0.98] transition-transform touch-manipulation"
                  >
                    <User className="w-5 h-5" />
                    <span>تسجيل الدخول</span>
                  </Link>
                </div>
              ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Header;
