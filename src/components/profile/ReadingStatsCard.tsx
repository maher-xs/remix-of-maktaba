import { BookOpen, FileText, BookMarked, StickyNote, Award, Clock } from 'lucide-react';
import { useReadingStats } from '@/hooks/useReadingStats';
import { Skeleton } from '@/components/ui/skeleton';

const ReadingStatsCard = () => {
  const { data: stats, isLoading } = useReadingStats();

  if (isLoading) {
    return (
      <div className="section-card p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">إحصائيات القراءة</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Show only after reading 20+ books
  if (!stats || stats.total_books_read < 20) return null;

  const statItems = [
    {
      icon: BookOpen,
      label: 'كتب قرأتها',
      value: stats.total_books_read,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      icon: FileText,
      label: 'صفحات قرأتها',
      value: stats.total_pages_read.toLocaleString('ar-SA'),
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      icon: BookMarked,
      label: 'كتب أكملتها',
      value: stats.books_completed,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    {
      icon: StickyNote,
      label: 'ملاحظاتي',
      value: stats.total_annotations,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30'
    },
    {
      icon: Award,
      label: 'تصنيف مفضل',
      value: stats.favorite_category || '-',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      icon: Clock,
      label: 'أيام نشاط',
      value: `${stats.reading_streak} يوم`,
      color: 'text-rose-600',
      bgColor: 'bg-rose-100 dark:bg-rose-900/30'
    }
  ];

  return (
    <div className="section-card p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">إحصائيات القراءة</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statItems.map((item, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center mb-3`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{item.value}</p>
            <p className="text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReadingStatsCard;
