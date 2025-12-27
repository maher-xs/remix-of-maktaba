import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, AlertTriangle, Ban, Search, RefreshCw, 
  FileText, MessageSquare, User, BookOpen, Image, Clock,
  TrendingUp, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';

interface ModerationLog {
  id: string;
  user_id: string | null;
  content_type: string;
  content_field: string | null;
  original_content: string | null;
  flagged_words: string[] | null;
  severity: string;
  action_taken: string;
  ip_address: string | null;
  created_at: string;
}

interface SecurityLog {
  id: string;
  user_id: string | null;
  action: string;
  path: string | null;
  details: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface ModerationStats {
  total_blocked: number;
  blocked_today: number;
  blocked_week: number;
  high_severity: number;
  by_content_type: Json;
}

const AdminSecurityDashboard = () => {
  const { isAdmin, isCheckingAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');

  // Fetch moderation stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['moderation-stats'],
    queryFn: async (): Promise<ModerationStats> => {
      const { data, error } = await supabase.rpc('get_moderation_stats');
      if (error) throw error;
      return data?.[0] || { total_blocked: 0, blocked_today: 0, blocked_week: 0, high_severity: 0, by_content_type: null };
    },
    enabled: isAdmin,
  });

  // Fetch moderation logs
  const { data: moderationLogs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['moderation-logs'],
    queryFn: async (): Promise<ModerationLog[]> => {
      const { data, error } = await supabase
        .from('content_moderation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch security logs (failed logins, suspicious activity)
  const { data: securityLogs = [], isLoading: securityLogsLoading, refetch: refetchSecurityLogs } = useQuery({
    queryKey: ['security-logs-dashboard'],
    queryFn: async (): Promise<SecurityLog[]> => {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const refreshAll = () => {
    refetchStats();
    refetchLogs();
    refetchSecurityLogs();
  };

  // Filter moderation logs
  const filteredModerationLogs = moderationLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.original_content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.flagged_words?.some(w => w.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchesType = contentTypeFilter === 'all' || log.content_type === contentTypeFilter;
    return matchesSearch && matchesSeverity && matchesType;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">خطير</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-orange-500">متوسط</Badge>;
      default:
        return <Badge variant="secondary">منخفض</Badge>;
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'book':
        return <BookOpen className="w-4 h-4" />;
      case 'review':
        return <MessageSquare className="w-4 h-4" />;
      case 'profile':
        return <User className="w-4 h-4" />;
      case 'image':
        return <Image className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'book': return 'كتاب';
      case 'review': return 'تقييم';
      case 'profile': return 'ملف شخصي';
      case 'reading_list': return 'قائمة قراءة';
      case 'image': return 'صورة';
      default: return type;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'blocked': return 'تم الحظر';
      case 'warning': return 'تحذير';
      case 'auto_censored': return 'تم الحذف تلقائياً';
      default: return action;
    }
  };

  if (isCheckingAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Shield className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold">غير مصرح</h2>
          <p className="text-muted-foreground">ليس لديك صلاحية للوصول لهذه الصفحة</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              لوحة الأمان
            </h1>
            <p className="text-muted-foreground">مراقبة المحتوى والأنشطة المشبوهة</p>
          </div>
          <Button onClick={refreshAll} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            تحديث
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المحظور</CardTitle>
              <Ban className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats?.total_blocked || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">اليوم</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-orange-500">{stats?.blocked_today || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">هذا الأسبوع</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats?.blocked_week || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">تهديدات خطيرة</CardTitle>
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-destructive">{stats?.high_severity || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="moderation" className="space-y-4">
          <TabsList>
            <TabsTrigger value="moderation" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              فلترة المحتوى
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              سجلات الأمان
            </TabsTrigger>
          </TabsList>

          {/* Moderation Logs Tab */}
          <TabsContent value="moderation" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث في المحتوى أو الكلمات المحظورة..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="الخطورة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="high">خطير</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="low">منخفض</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="book">كتاب</SelectItem>
                      <SelectItem value="review">تقييم</SelectItem>
                      <SelectItem value="profile">ملف شخصي</SelectItem>
                      <SelectItem value="image">صورة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
              <CardHeader>
                <CardTitle>سجلات فلترة المحتوى</CardTitle>
                <CardDescription>
                  عرض جميع محاولات نشر محتوى غير لائق
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredModerationLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد سجلات</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>النوع</TableHead>
                          <TableHead>الحقل</TableHead>
                          <TableHead>المحتوى</TableHead>
                          <TableHead>الكلمات المحظورة</TableHead>
                          <TableHead>الخطورة</TableHead>
                          <TableHead>الإجراء</TableHead>
                          <TableHead>التاريخ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredModerationLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getContentTypeIcon(log.content_type)}
                                <span>{getContentTypeLabel(log.content_type)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {log.content_field || '-'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate" title={log.original_content || ''}>
                              {log.original_content || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {log.flagged_words?.map((word, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {word}
                                  </Badge>
                                )) || '-'}
                              </div>
                            </TableCell>
                            <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{getActionLabel(log.action_taken)}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Logs Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>سجلات الأمان</CardTitle>
                <CardDescription>
                  محاولات تسجيل الدخول الفاشلة والأنشطة المشبوهة
                </CardDescription>
              </CardHeader>
              <CardContent>
                {securityLogsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : securityLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد سجلات أمان</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الإجراء</TableHead>
                          <TableHead>المسار</TableHead>
                          <TableHead>التفاصيل</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>التاريخ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {securityLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge 
                                variant={log.action === 'failed_login' ? 'destructive' : 'secondary'}
                              >
                                {log.action === 'failed_login' ? 'فشل تسجيل الدخول' : log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {log.path || '-'}
                            </TableCell>
                            <TableCell className="max-w-[250px]">
                              {log.details ? (
                                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-20">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.ip_address || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSecurityDashboard;
