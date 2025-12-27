import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import AdvancedReadingStats from '@/components/stats/AdvancedReadingStats';
import { useAuth } from '@/hooks/useAuth';
import { useSEO } from '@/hooks/useSEO';
import { Button } from '@/components/ui/button';
import { BarChart2, ArrowRight } from 'lucide-react';

const Stats = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useSEO({
    title: 'إحصائياتي - مكتبة',
    description: 'تتبع إحصائيات القراءة الخاصة بك ورسوم بيانية للتقدم',
  });

  if (loading) {
    return (
      <Layout>
        <div className="section-container py-8 lg:py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="section-container py-16 text-center">
          <BarChart2 className="w-20 h-20 mx-auto text-muted-foreground/50 mb-6" />
          <h1 className="text-2xl font-bold mb-4">إحصائيات القراءة</h1>
          <p className="text-muted-foreground mb-6">
            يجب تسجيل الدخول لعرض إحصائياتك
          </p>
          <Button onClick={() => navigate('/auth')}>
            تسجيل الدخول
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="section-container py-8 lg:py-12">
        <Breadcrumb items={[{ label: 'إحصائياتي' }]} />

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              إحصائياتي
            </h1>
            <p className="text-muted-foreground text-sm">
              تتبع تقدمك في القراءة
            </p>
          </div>
        </div>

        {/* Stats Component */}
        <AdvancedReadingStats showCharts={true} />
      </div>
    </Layout>
  );
};

export default Stats;
