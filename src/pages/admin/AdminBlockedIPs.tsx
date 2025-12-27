import { AdminLayout } from '@/components/admin/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Shield, Ban, Unlock, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string | null;
  failed_attempts: number;
  blocked_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export const AdminBlockedIPs = () => {
  const queryClient = useQueryClient();

  const { data: blockedIPs, isLoading } = useQuery({
    queryKey: ['blockedIPs'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-get-blocked-ips');
      if (error) throw error;
      return data as BlockedIP[];
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (ipAddress: string) => {
      const { error } = await supabase.functions.invoke('admin-unblock-ip', {
        body: { ip_address: ipAddress }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedIPs'] });
      toast.success('تم إلغاء حظر عنوان IP بنجاح');
    },
    onError: (error) => {
      toast.error('فشل إلغاء حظر عنوان IP');
      console.error('Unblock error:', error);
    },
  });

  const activeBlocks = blockedIPs?.filter(ip => 
    ip.blocked_at && ip.expires_at && new Date(ip.expires_at) > new Date()
  ).length || 0;

  const totalAttempts = blockedIPs?.reduce((sum, ip) => sum + (ip.failed_attempts || 0), 0) || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">عناوين IP المحظورة</h1>
            <p className="text-muted-foreground mt-1">إدارة حظر عناوين IP التلقائي</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-lg">
              <Ban className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-700 dark:text-red-400">{activeBlocks} محظور حالياً</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 px-4 py-2 rounded-lg">
              <Shield className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-amber-700 dark:text-amber-400">{totalAttempts} محاولة فاشلة</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              قائمة عناوين IP
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !blockedIPs || blockedIPs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد عناوين IP مسجلة</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>عنوان IP</TableHead>
                    <TableHead>المحاولات الفاشلة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>تنتهي في</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIPs.map((ip) => {
                    const isCurrentlyBlocked = ip.blocked_at && ip.expires_at && new Date(ip.expires_at) > new Date();
                    
                    return (
                      <TableRow key={ip.id}>
                        <TableCell className="font-mono text-sm">
                          {ip.ip_address}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ip.failed_attempts}</Badge>
                        </TableCell>
                        <TableCell>
                          {isCurrentlyBlocked ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              محظور
                            </Badge>
                          ) : (
                            <Badge variant="outline">غير محظور</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {ip.reason || '-'}
                        </TableCell>
                        <TableCell>
                          {ip.expires_at 
                            ? format(new Date(ip.expires_at), 'dd MMM yyyy HH:mm', { locale: ar })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {isCurrentlyBlocked && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unblockMutation.mutate(ip.ip_address)}
                              disabled={unblockMutation.isPending}
                            >
                              <Unlock className="w-4 h-4 ml-1" />
                              إلغاء الحظر
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBlockedIPs;