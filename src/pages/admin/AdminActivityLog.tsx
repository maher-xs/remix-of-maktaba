import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminActivityLogs, useCleanupOldActivityLogs } from '@/hooks/useActivityLog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Activity, BookOpen, FolderTree, Users, Settings, Plus, Pencil, Trash2, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useEffect } from 'react';

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'create':
      return <Plus className="w-4 h-4 text-green-500" />;
    case 'update':
      return <Pencil className="w-4 h-4 text-blue-500" />;
    case 'delete':
      return <Trash2 className="w-4 h-4 text-red-500" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
};

const getEntityIcon = (entityType: string) => {
  switch (entityType) {
    case 'book':
      return <BookOpen className="w-4 h-4" />;
    case 'category':
      return <FolderTree className="w-4 h-4" />;
    case 'user':
      return <Users className="w-4 h-4" />;
    case 'setting':
      return <Settings className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
};

const getActionLabel = (actionType: string) => {
  switch (actionType) {
    case 'create':
      return 'إضافة';
    case 'update':
      return 'تعديل';
    case 'delete':
      return 'حذف';
    default:
      return actionType;
  }
};

const getEntityLabel = (entityType: string) => {
  switch (entityType) {
    case 'book':
      return 'كتاب';
    case 'category':
      return 'تصنيف';
    case 'user':
      return 'مستخدم';
    case 'setting':
      return 'إعداد';
    default:
      return entityType;
  }
};

const getActionColor = (actionType: string) => {
  switch (actionType) {
    case 'create':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'update':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'delete':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const AdminActivityLog = () => {
  const { data: logs, isLoading, refetch } = useAdminActivityLogs(100);
  const cleanupMutation = useCleanupOldActivityLogs();

  // Auto cleanup on page load
  useEffect(() => {
    cleanupMutation.mutate();
  }, []);

  const handleManualCleanup = () => {
    cleanupMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('تم حذف السجلات القديمة');
        refetch();
      },
      onError: () => {
        toast.error('فشل في حذف السجلات القديمة');
      }
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">سجل النشاطات</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              يعرض فقط نشاطات آخر 24 ساعة
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualCleanup}
              disabled={cleanupMutation.isPending}
            >
              {cleanupMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <RefreshCw className="w-4 h-4 ml-2" />
              )}
              تنظيف السجلات
            </Button>
            <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-medium">{logs?.length || 0} نشاط</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-medium">آخر النشاطات</span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background flex items-center justify-center border">
                      {getActionIcon(log.action_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {log.profiles?.full_name || 'مستخدم غير معروف'}
                        </span>
                        <span className="text-muted-foreground">قام بـ</span>
                        <Badge variant="secondary" className={getActionColor(log.action_type)}>
                          {getActionLabel(log.action_type)}
                        </Badge>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          {getEntityIcon(log.entity_type)}
                          <span>{getEntityLabel(log.entity_type)}</span>
                        </div>
                        {log.entity_name && (
                          <span className="font-medium text-primary">"{log.entity_name}"</span>
                        )}
                      </div>
                      
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(log.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد نشاطات مسجلة بعد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminActivityLog;
