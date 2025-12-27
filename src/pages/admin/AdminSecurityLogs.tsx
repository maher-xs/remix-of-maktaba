import { AdminLayout } from '@/components/admin/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Shield, AlertTriangle, Ban, UserX, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const getActionIcon = (action: string) => {
  switch (action) {
    case 'unauthorized_admin_access':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'banned_user_access_attempt':
      return <Ban className="w-4 h-4 text-destructive" />;
    case 'failed_login':
      return <LogIn className="w-4 h-4 text-orange-500" />;
    default:
      return <Shield className="w-4 h-4 text-muted-foreground" />;
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'unauthorized_admin_access':
      return 'محاولة وصول غير مصرح';
    case 'banned_user_access_attempt':
      return 'محاولة دخول مستخدم محظور';
    case 'failed_login':
      return 'فشل تسجيل الدخول';
    default:
      return action;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'unauthorized_admin_access':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'banned_user_access_attempt':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'failed_login':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const AdminSecurityLogs = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['securityLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  const unauthorizedCount = logs?.filter(l => l.action === 'unauthorized_admin_access').length || 0;
  const bannedAttemptCount = logs?.filter(l => l.action === 'banned_user_access_attempt').length || 0;
  const failedLoginCount = logs?.filter(l => l.action === 'failed_login').length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">سجلات الأمان</h1>
            <p className="text-muted-foreground mt-1">مراقبة محاولات الوصول غير المصرح</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 px-4 py-2 rounded-lg">
              <LogIn className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-700 dark:text-orange-400">{failedLoginCount} فشل تسجيل دخول</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 px-4 py-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-amber-700 dark:text-amber-400">{unauthorizedCount} محاولة غير مصرح</span>
            </div>
            <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-lg">
              <Ban className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-700 dark:text-red-400">{bannedAttemptCount} محاولة محظور</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              سجلات الأمان الأخيرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : logs?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد سجلات أمان</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نوع الحدث</TableHead>
                    <TableHead>المسار</TableHead>
                    <TableHead>التفاصيل</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <Badge className={getActionColor(log.action)}>
                            {getActionLabel(log.action)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.path || '-'}
                      </TableCell>
                      <TableCell>
                        {log.details ? (
                          <pre className="text-xs bg-muted p-2 rounded max-w-xs overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: ar })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSecurityLogs;
