import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminStats, useAdminChartData } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  BookOpen, 
  FolderTree, 
  Heart, 
  Activity,
  TrendingUp,
  Loader2,
  Eye,
  Download,
  BookMarked,
  UserPlus,
  Clock,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  PieChart,
  MessageSquare,
  Star,
  ShieldCheck,
  ShieldX,
  Ban,
  Settings
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  gradient,
  subtitle,
  trend,
  href
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType; 
  gradient: string;
  subtitle?: string;
  trend?: { value: number; isUp: boolean };
  href?: string;
}) => {
  const content = (
    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 cursor-pointer">
      {/* Background Gradient */}
      <div className={`absolute inset-0 ${gradient} opacity-10 group-hover:opacity-15 transition-opacity`} />
      
      {/* Decorative Circle */}
      <div className={`absolute -top-8 -right-8 w-32 h-32 ${gradient} rounded-full opacity-20 group-hover:scale-110 transition-transform duration-500`} />
      
      <CardContent className="relative pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{typeof value === 'number' ? value.toLocaleString('ar-SA') : value}</span>
              {trend && (
                <span className={`flex items-center text-xs font-medium ${trend.isUp ? 'text-green-500' : 'text-red-500'}`}>
                  <TrendingUp className={`w-3 h-3 mr-0.5 ${!trend.isUp ? 'rotate-180' : ''}`} />
                  {trend.value}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          
          <div className={`p-3 rounded-2xl ${gradient} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
};

const QuickActionCard = ({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  gradient,
  count
}: { 
  title: string; 
  description: string; 
  icon: React.ElementType; 
  href: string; 
  gradient: string;
  count?: number;
}) => (
  <Link 
    to={href}
    className="group flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
  >
    <div className={`p-3 rounded-xl ${gradient} shadow-md group-hover:scale-110 transition-transform`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold group-hover:text-primary transition-colors">{title}</h3>
        {count !== undefined && count > 0 && (
          <Badge variant="destructive" className="text-xs">{count}</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
  </Link>
);

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-1">{label}</p>
        {payload.map((item: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: item.color }}>
            {item.name}: {item.value.toLocaleString('ar-SA')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const AdminDashboard = () => {
  const { data: stats, isLoading } = useAdminStats();
  const { data: chartData, isLoading: isChartLoading } = useAdminChartData();

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar-SA');
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header with Welcome Message */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 border border-primary/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">لوحة التحكم</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">مرحباً بك في لوحة الإدارة</h1>
            <p className="text-muted-foreground max-w-lg">
              إدارة شاملة للمكتبة الرقمية - راقب الإحصائيات وأدر المحتوى بسهولة
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Main Stats Grid - First Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="إجمالي المستخدمين"
                value={stats?.total_users ?? 0}
                icon={Users}
                gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                subtitle="مستخدم مسجل"
                href="/admin/users"
              />
              <StatCard
                title="إجمالي الكتب"
                value={stats?.total_books ?? 0}
                icon={BookOpen}
                gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
                subtitle="كتاب في المكتبة"
                href="/admin/books"
              />
              <StatCard
                title="التصنيفات"
                value={stats?.total_categories ?? 0}
                icon={FolderTree}
                gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                subtitle="تصنيف نشط"
                href="/admin/categories"
              />
              <StatCard
                title="المفضلات"
                value={stats?.total_favorites ?? 0}
                icon={Heart}
                gradient="bg-gradient-to-br from-rose-500 to-rose-600"
                subtitle="إضافة للمفضلة"
              />
            </div>

            {/* Stats Grid - Second Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="إجمالي المشاهدات"
                value={stats?.total_views ?? 0}
                icon={Eye}
                gradient="bg-gradient-to-br from-cyan-500 to-cyan-600"
                subtitle="مشاهدة"
              />
              <StatCard
                title="إجمالي التحميلات"
                value={stats?.total_downloads ?? 0}
                icon={Download}
                gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
                subtitle="تحميل"
              />
              <StatCard
                title="التقييمات"
                value={stats?.total_reviews ?? 0}
                icon={Star}
                gradient="bg-gradient-to-br from-amber-500 to-amber-600"
                subtitle="تقييم للكتب"
                href="/admin/reviews"
              />
              <StatCard
                title="الرسائل الجديدة"
                value={stats?.unread_messages ?? 0}
                icon={MessageSquare}
                gradient="bg-gradient-to-br from-pink-500 to-pink-600"
                subtitle="رسالة غير مقروءة"
                href="/admin/messages"
              />
            </div>

            {/* Stats Grid - Third Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="القراء النشطين اليوم"
                value={stats?.active_readers_today ?? 0}
                icon={Activity}
                gradient="bg-gradient-to-br from-orange-500 to-orange-600"
                subtitle="قارئ نشط"
              />
              <StatCard
                title="كتب جديدة هذا الأسبوع"
                value={stats?.new_books_week ?? 0}
                icon={TrendingUp}
                gradient="bg-gradient-to-br from-teal-500 to-teal-600"
                subtitle="كتاب مضاف"
              />
              <StatCard
                title="المستخدمين الموثقين"
                value={stats?.verified_users ?? 0}
                icon={ShieldCheck}
                gradient="bg-gradient-to-br from-green-500 to-green-600"
                subtitle="مستخدم موثق"
              />
              <StatCard
                title="المستخدمين المحظورين"
                value={stats?.banned_users ?? 0}
                icon={Ban}
                gradient="bg-gradient-to-br from-red-500 to-red-600"
                subtitle="مستخدم محظور"
              />
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Views & Downloads Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    المشاهدات والتحميلات (آخر 30 يوم)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isChartLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData?.dailyStats?.slice(-14) || []}>
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="views" 
                          name="المشاهدات"
                          stroke="#3b82f6" 
                          fillOpacity={1} 
                          fill="url(#colorViews)" 
                          strokeWidth={2}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="downloads" 
                          name="التحميلات"
                          stroke="#10b981" 
                          fillOpacity={1} 
                          fill="url(#colorDownloads)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Category Distribution Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-500" />
                    توزيع الكتب حسب التصنيف
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isChartLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : chartData?.categoryDistribution && chartData.categoryDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={chartData.categoryDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="book_count"
                          nameKey="name"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {chartData.categoryDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      لا توجد بيانات كافية
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Activity Bar Chart */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  نشاط القراء اليومي (آخر 14 يوم)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isChartLoading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData?.dailyStats?.slice(-14) || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDate}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="views" 
                        name="المشاهدات"
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="downloads" 
                        name="التحميلات"
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Books */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-500" />
                      آخر الكتب المضافة
                    </CardTitle>
                    <Link to="/admin/books" className="text-sm text-primary hover:underline flex items-center gap-1">
                      عرض الكل
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats?.recent_books && stats.recent_books.length > 0 ? (
                    stats.recent_books.slice(0, 5).map((book: any) => (
                      <Link 
                        key={book.id} 
                        to={`/admin/books/${book.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-primary/10 hover:border-primary/20 border border-transparent transition-all duration-200 group"
                      >
                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 shadow-sm">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-primary transition-colors">{book.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatRelativeDate(book.created_at)}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>لا توجد كتب بعد</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Users */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-blue-500" />
                      آخر المستخدمين المسجلين
                    </CardTitle>
                    <Link to="/admin/users" className="text-sm text-primary hover:underline flex items-center gap-1">
                      عرض الكل
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats?.recent_users && stats.recent_users.length > 0 ? (
                    stats.recent_users.slice(0, 5).map((user: any) => (
                      <Link 
                        key={user.id} 
                        to={`/admin/users?search=${user.username || user.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-primary/10 hover:border-primary/20 border border-transparent transition-all duration-200 group"
                      >
                        <Avatar className="w-11 h-11 border-2 border-background shadow-sm">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-primary transition-colors">
                            {user.full_name || user.username || 'مستخدم'}
                          </p>
                          {user.username && (
                            <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{formatRelativeDate(user.created_at)}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>لا يوجد مستخدمين بعد</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                الإجراءات السريعة
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <QuickActionCard
                  title="إدارة الكتب"
                  description="إضافة وتعديل وحذف الكتب"
                  icon={BookOpen}
                  href="/admin/books"
                  gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
                  count={stats?.total_books}
                />
                <QuickActionCard
                  title="إدارة المستخدمين"
                  description="مراقبة وإدارة المستخدمين"
                  icon={Users}
                  href="/admin/users"
                  gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                  count={stats?.total_users}
                />
                <QuickActionCard
                  title="إدارة التصنيفات"
                  description="تنظيم تصنيفات الكتب"
                  icon={FolderTree}
                  href="/admin/categories"
                  gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                  count={stats?.total_categories}
                />
                <QuickActionCard
                  title="الرسائل"
                  description="رسائل التواصل من الزوار"
                  icon={MessageSquare}
                  href="/admin/messages"
                  gradient="bg-gradient-to-br from-amber-500 to-amber-600"
                  count={stats?.unread_messages}
                />
                <QuickActionCard
                  title="التقييمات"
                  description="إدارة تقييمات الكتب"
                  icon={Star}
                  href="/admin/reviews"
                  gradient="bg-gradient-to-br from-pink-500 to-pink-600"
                  count={stats?.total_reviews}
                />
                <QuickActionCard
                  title="الإعلانات"
                  description="إدارة إعدادات الإعلانات"
                  icon={TrendingUp}
                  href="/admin/ads"
                  gradient="bg-gradient-to-br from-cyan-500 to-cyan-600"
                />
                <QuickActionCard
                  title="سجل النشاط"
                  description="متابعة جميع الأنشطة"
                  icon={Activity}
                  href="/admin/activity"
                  gradient="bg-gradient-to-br from-slate-500 to-slate-600"
                />
                <QuickActionCard
                  title="الإعدادات"
                  description="إعدادات الموقع العامة"
                  icon={Settings}
                  href="/admin/settings"
                  gradient="bg-gradient-to-br from-rose-500 to-rose-600"
                />
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-0 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" />
                    نصائح سريعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                    <p>يمكنك إضافة كتب جديدة مع صور الغلاف وملفات PDF</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    <p>راقب نشاط المستخدمين وأدر صلاحياتهم</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                    <p>أضف تصنيفات جديدة لتنظيم المحتوى</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-orange-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-500" />
                    ملخص النشاط
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <span className="text-sm">إجمالي المشاهدات</span>
                    <span className="font-bold text-blue-500">{(stats?.total_views ?? 0).toLocaleString('ar-SA')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <span className="text-sm">إجمالي التحميلات</span>
                    <span className="font-bold text-emerald-500">{(stats?.total_downloads ?? 0).toLocaleString('ar-SA')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <span className="text-sm">نشاط اليوم</span>
                    <span className="font-bold text-orange-500">{stats?.active_readers_today ?? 0} قارئ</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
