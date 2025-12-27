import { BookOpen, FileText, BookMarked, StickyNote, Award, Clock, TrendingUp, Target, BarChart3, PieChart } from 'lucide-react';
import { useReadingStats } from '@/hooks/useReadingStats';
import { useMonthlyReadingStats } from '@/hooks/useMonthlyReadingStats';
import { useReadingGoal } from '@/hooks/useReadingGoal';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
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
  Cell,
  Legend
} from 'recharts';

interface AdvancedReadingStatsProps {
  showCharts?: boolean;
}

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
};

const slideVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
};

const AdvancedReadingStats = ({ showCharts = true }: AdvancedReadingStatsProps) => {
  const { data: stats, isLoading } = useReadingStats();
  const { data: monthlyStats, isLoading: isLoadingMonthly } = useMonthlyReadingStats();
  const { goal: monthlyGoal, isLoading: isLoadingGoal } = useReadingGoal();
  
  const monthlyData = monthlyStats?.monthlyData || [];
  const categoryData = monthlyStats?.categoryData || [];
  const booksThisMonth = monthlyStats?.booksThisMonth || 0;


  if (isLoading || isLoadingMonthly || isLoadingGoal) {
    return (
      <div className="space-y-6">
        {/* Goal Skeleton */}
        <Skeleton className="h-32 rounded-2xl" />
        
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        
        {/* Additional Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        
        {showCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        )}
      </div>
    );
  }

  if (!stats) return null;

  const goalProgress = Math.min((booksThisMonth / monthlyGoal) * 100, 100);

  const statItems = [
    {
      icon: BookOpen,
      label: 'كتب قرأتها',
      value: stats.total_books_read,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20'
    },
    {
      icon: FileText,
      label: 'صفحات قرأتها',
      value: stats.total_pages_read.toLocaleString('ar-SA'),
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      icon: BookMarked,
      label: 'كتب أكملتها',
      value: stats.books_completed,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    },
    {
      icon: StickyNote,
      label: 'ملاحظاتي',
      value: stats.total_annotations,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20'
    },
  ];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-sm text-primary">
            {payload[0].name}: <span className="font-bold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Monthly Goal - Hero Card */}
      <motion.div variants={scaleVariants}>
        <Card className="border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden relative">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <CardContent className="p-5 sm:p-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Progress Circle */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${goalProgress * 3.02} 302`}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{Math.round(goalProgress)}%</span>
                  <span className="text-[10px] text-muted-foreground">مكتمل</span>
                </div>
              </div>
            </div>
            
            {/* Goal Info */}
            <div className="flex-1 text-center sm:text-right">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">هدف الشهر</h3>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">
                {booksThisMonth} <span className="text-lg text-muted-foreground font-normal">من</span> {monthlyGoal}
              </p>
              <p className="text-sm text-muted-foreground mb-3">كتب هذا الشهر</p>
              
              <Progress value={goalProgress} className="h-2 max-w-xs mx-auto sm:mx-0" />
              
              {goalProgress >= 100 && (
                <div className="mt-3 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-sm font-medium">
                  <Award className="w-4 h-4" />
                  أحسنت! حققت هدفك
                </div>
              )}
            </div>
          </div>
        </CardContent>
        </Card>
      </motion.div>

      {/* Main Stats Grid */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statItems.map((item, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card 
              className={`border ${item.borderColor} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 h-full`}
            >
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center mb-3`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{item.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-purple-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Award className="w-7 h-7 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold text-foreground truncate">
                {stats.favorite_category || 'غير محدد'}
              </p>
              <p className="text-sm text-muted-foreground">التصنيف المفضل</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-7 h-7 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold text-foreground">
                {stats.reading_streak} <span className="text-base font-normal text-muted-foreground">يوم</span>
              </p>
              <p className="text-sm text-muted-foreground">سلسلة القراءة المتتالية</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Reading Chart */}
          <Card className="border-muted-foreground/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                القراءة الشهرية
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-2 sm:px-6">
              <div className="h-56 sm:h-72">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBooks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="books" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#colorBooks)"
                        name="الكتب"
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">لا توجد بيانات بعد</p>
                    <p className="text-xs">ابدأ بالقراءة لتظهر الإحصائيات</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution - Pie Chart */}
          <Card className="border-muted-foreground/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                توزيع التصنيفات
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-2 sm:px-6">
              <div className="h-64 sm:h-72">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="35%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        label={false}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Legend 
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        wrapperStyle={{ paddingTop: '20px', direction: 'rtl' }}
                        formatter={(value: string, entry: any) => (
                          <span className="text-sm text-foreground mx-1">
                            {value} ({entry.payload.value})
                          </span>
                        )}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          direction: 'rtl'
                        }}
                        formatter={(value: number, name: string) => [`${value} كتاب`, name]}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">لا توجد بيانات بعد</p>
                    <p className="text-xs">اقرأ كتباً من تصنيفات مختلفة</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bar Chart for Category Comparison */}
      {showCharts && categoryData.length > 0 && (
        <Card className="border-muted-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              مقارنة التصنيفات
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-2 sm:px-6">
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={categoryData} 
                  layout="vertical" 
                  margin={{ top: 10, right: 20, left: 5, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted) / 0.5)" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 500 }}
                    width={70}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={false}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      direction: 'rtl'
                    }}
                    formatter={(value: number, name: string) => [`${value} كتاب`, name]}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 6, 6, 0]}
                    name="عدد الكتب"
                    barSize={20}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default AdvancedReadingStats;
