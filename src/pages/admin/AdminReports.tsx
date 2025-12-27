import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { notifyReportResolved, notifyReportDismissed } from '@/hooks/useSendNotification';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Flag, AlertTriangle, Search, RefreshCw, 
  CheckCircle, XCircle, Eye, MessageSquare,
  BookOpen, User, Clock, FileText, ExternalLink,
  Trash2, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface ContentReport {
  id: string;
  reporter_id: string | null;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface ReportStats {
  total_reports: number;
  pending_reports: number;
  resolved_today: number;
  by_reason: Json;
}

const reasonLabels: Record<string, string> = {
  inappropriate: 'محتوى غير لائق',
  spam: 'سبام',
  copyright: 'انتهاك حقوق النشر',
  harassment: 'تحرش',
  other: 'سبب آخر',
};

const statusLabels: Record<string, string> = {
  pending: 'قيد المراجعة',
  reviewed: 'تمت المراجعة',
  resolved: 'تم الحل',
  dismissed: 'مرفوض',
};

const contentTypeLabels: Record<string, string> = {
  book: 'كتاب',
  review: 'تقييم',
  profile: 'ملف شخصي',
  reading_list: 'قائمة قراءة',
  comment: 'تعليق',
};

// دالة للحصول على رابط المحتوى
const getContentUrl = (contentType: string, contentId: string): string | null => {
  switch (contentType) {
    case 'book':
      return `/book/${contentId}`;
    case 'review':
      return `/book/${contentId}`; // التقييم مرتبط بالكتاب
    case 'profile':
      return `/user/${contentId}`;
    case 'reading_list':
      return `/reading-list/${contentId}`;
    default:
      return null;
  }
};

const AdminReportsPage = () => {
  const { isAdmin, isCheckingAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contentOwner, setContentOwner] = useState<{ id: string; name: string; warningsCount: number } | null>(null);
  const [isLoadingOwner, setIsLoadingOwner] = useState(false);

  // Fetch report stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['report-stats'],
    queryFn: async (): Promise<ReportStats> => {
      const { data, error } = await supabase.rpc('get_report_stats');
      if (error) throw error;
      return data?.[0] || { total_reports: 0, pending_reports: 0, resolved_today: 0, by_reason: null };
    },
    enabled: isAdmin,
  });

  // Fetch reports
  const { data: reports = [], isLoading: reportsLoading, refetch } = useQuery({
    queryKey: ['content-reports', statusFilter],
    queryFn: async (): Promise<ContentReport[]> => {
      let query = supabase
        .from('content_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Update report mutation
  const updateReportMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      notes, 
      reporterId, 
      contentType 
    }: { 
      id: string; 
      status: string; 
      notes?: string;
      reporterId?: string | null;
      contentType?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('content_reports')
        .update({
          status,
          admin_notes: notes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Send notification to the reporter
      if (reporterId) {
        if (status === 'resolved') {
          await notifyReportResolved(reporterId, contentType || 'content');
        } else if (status === 'dismissed') {
          await notifyReportDismissed(reporterId, contentType || 'content');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-reports'] });
      queryClient.invalidateQueries({ queryKey: ['report-stats'] });
      toast.success('تم تحديث البلاغ وإرسال إشعار للمستخدم');
      setSelectedReport(null);
      setAdminNotes('');
    },
    onError: () => {
      toast.error('فشل في تحديث البلاغ');
    },
  });

  const handleResolve = (status: 'resolved' | 'dismissed') => {
    if (!selectedReport) return;
    updateReportMutation.mutate({
      id: selectedReport.id,
      status,
      notes: adminNotes,
      reporterId: selectedReport.reporter_id,
      contentType: selectedReport.content_type,
    });
  };

  // Fetch content owner info for books
  const fetchContentOwner = async (contentType: string, contentId: string) => {
    if (contentType !== 'book') {
      setContentOwner(null);
      return;
    }
    
    setIsLoadingOwner(true);
    try {
      // Get book's uploaded_by
      const { data: book } = await supabase
        .from('books')
        .select('uploaded_by, title')
        .eq('id', contentId)
        .single();

      if (book?.uploaded_by) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .eq('id', book.uploaded_by)
          .single();

        // Get warnings count
        const { data: warningsData } = await supabase
          .from('user_warnings')
          .select('id')
          .eq('user_id', book.uploaded_by);

        setContentOwner({
          id: book.uploaded_by,
          name: profile?.full_name || profile?.username || 'مستخدم',
          warningsCount: warningsData?.length || 0,
        });
      } else {
        setContentOwner(null);
      }
    } catch (error) {
      console.error('Error fetching content owner:', error);
      setContentOwner(null);
    } finally {
      setIsLoadingOwner(false);
    }
  };

  // Send warning mutation
  const sendWarningMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport || !contentOwner) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert warning
      const { error: warningError } = await supabase
        .from('user_warnings')
        .insert({
          user_id: contentOwner.id,
          reason: selectedReport.reason,
          content_type: selectedReport.content_type,
          content_id: selectedReport.content_id,
          report_id: selectedReport.id,
          issued_by: user?.id,
          notes: adminNotes,
        });

      if (warningError) throw warningError;

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: contentOwner.id,
        title: 'تحذير من الإدارة',
        message: `تم إرسال تحذير بخصوص المحتوى الخاص بك بسبب: ${reasonLabels[selectedReport.reason] || selectedReport.reason}`,
        type: 'warning',
        data: { report_id: selectedReport.id },
      });

      // Update report status
      await supabase
        .from('content_reports')
        .update({
          status: 'resolved',
          admin_notes: adminNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedReport.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-reports'] });
      queryClient.invalidateQueries({ queryKey: ['report-stats'] });
      toast.success('تم إرسال التحذير بنجاح');
      setShowActionDialog(false);
      setSelectedReport(null);
      setAdminNotes('');
      setContentOwner(null);
    },
    onError: () => {
      toast.error('فشل في إرسال التحذير');
    },
  });

  // Delete book mutation
  const deleteBookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Delete the book
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', selectedReport.content_id);

      if (error) throw error;

      // Send notification to owner if exists
      if (contentOwner) {
        await supabase.from('notifications').insert({
          user_id: contentOwner.id,
          title: 'تم حذف كتابك',
          message: `تم حذف كتابك بسبب مخالفة: ${reasonLabels[selectedReport.reason] || selectedReport.reason}`,
          type: 'warning',
          data: { report_id: selectedReport.id },
        });
      }

      // Update report status
      await supabase
        .from('content_reports')
        .update({
          status: 'resolved',
          admin_notes: `تم حذف الكتاب. ${adminNotes}`,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedReport.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-reports'] });
      queryClient.invalidateQueries({ queryKey: ['report-stats'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success('تم حذف الكتاب بنجاح');
      setShowDeleteConfirm(false);
      setShowActionDialog(false);
      setSelectedReport(null);
      setAdminNotes('');
      setContentOwner(null);
    },
    onError: () => {
      toast.error('فشل في حذف الكتاب');
    },
  });

  // Handle opening action dialog
  const handleOpenActionDialog = async () => {
    if (!selectedReport) return;
    await fetchContentOwner(selectedReport.content_type, selectedReport.content_id);
    setShowActionDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="default" className="bg-orange-500">قيد المراجعة</Badge>;
      case 'reviewed':
        return <Badge variant="secondary">تمت المراجعة</Badge>;
      case 'resolved':
        return <Badge variant="default" className="bg-green-500">تم الحل</Badge>;
      case 'dismissed':
        return <Badge variant="outline">مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const filteredReports = reports.filter(report => {
    if (!searchTerm) return true;
    return (
      report.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

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
          <Flag className="w-16 h-16 text-muted-foreground mb-4" />
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
              <Flag className="w-6 h-6 text-primary" />
              إدارة البلاغات
            </h1>
            <p className="text-muted-foreground">مراجعة بلاغات المستخدمين عن المحتوى المخالف</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            تحديث
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي البلاغات</CardTitle>
              <Flag className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats?.total_reports || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
              <Clock className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-orange-500">{stats?.pending_reports || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">تم حلها اليوم</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-green-500">{stats?.resolved_today || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">تحتاج انتباه</CardTitle>
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-destructive">
                  {(stats?.by_reason as Record<string, number>)?.harassment || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث في البلاغات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="pending">قيد المراجعة</SelectItem>
                  <SelectItem value="reviewed">تمت المراجعة</SelectItem>
                  <SelectItem value="resolved">تم الحل</SelectItem>
                  <SelectItem value="dismissed">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>البلاغات</CardTitle>
            <CardDescription>قائمة بجميع البلاغات المقدمة من المستخدمين</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Flag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد بلاغات</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>النوع</TableHead>
                      <TableHead>السبب</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getContentTypeIcon(report.content_type)}
                            <span>{contentTypeLabels[report.content_type] || report.content_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {reasonLabels[report.reason] || report.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {report.description || '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setAdminNotes(report.admin_notes || '');
                              }}
                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="text-sm">عرض</span>
                            </button>
                            {getContentUrl(report.content_type, report.content_id) && (
                              <Link 
                                to={getContentUrl(report.content_type, report.content_id)!} 
                                target="_blank"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Report Details Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                تفاصيل البلاغ
              </DialogTitle>
              <DialogDescription>
                مراجعة البلاغ واتخاذ الإجراء المناسب
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">نوع المحتوى</p>
                    <p className="font-medium flex items-center gap-2">
                      {getContentTypeIcon(selectedReport.content_type)}
                      {contentTypeLabels[selectedReport.content_type]}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">السبب</p>
                    <Badge variant="outline">
                      {reasonLabels[selectedReport.reason]}
                    </Badge>
                  </div>
                </div>

                {/* زر الانتقال للمحتوى */}
                {getContentUrl(selectedReport.content_type, selectedReport.content_id) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    asChild
                  >
                    <Link to={getContentUrl(selectedReport.content_type, selectedReport.content_id)!} target="_blank">
                      <ExternalLink className="w-4 h-4" />
                      عرض المحتوى المُبلَغ عنه
                    </Link>
                  </Button>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">وصف المشكلة</p>
                  <p className="text-foreground bg-muted p-3 rounded-lg">
                    {selectedReport.description || 'لم يتم تقديم وصف'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">الحالة الحالية</p>
                  {getStatusBadge(selectedReport.status)}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">ملاحظات الإدارة</p>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="أضف ملاحظات حول هذا البلاغ..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setSelectedReport(null)}>
                إلغاء
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolve('dismissed')}
                disabled={updateReportMutation.isPending}
              >
                <XCircle className="w-4 h-4 ml-1" />
                رفض
              </Button>
              {selectedReport?.content_type === 'book' && (
                <Button
                  variant="destructive"
                  onClick={handleOpenActionDialog}
                  disabled={updateReportMutation.isPending}
                >
                  <AlertTriangle className="w-4 h-4 ml-1" />
                  اتخاذ إجراء
                </Button>
              )}
              <Button
                onClick={() => handleResolve('resolved')}
                disabled={updateReportMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 ml-1" />
                تم الحل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Action Dialog */}
        <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                اتخاذ إجراء
              </DialogTitle>
              <DialogDescription>
                اختر الإجراء المناسب للبلاغ
              </DialogDescription>
            </DialogHeader>

            {isLoadingOwner ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {contentOwner && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">صاحب الكتاب:</span>
                      <span className="font-medium">{contentOwner.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">عدد التحذيرات:</span>
                      <Badge variant={contentOwner.warningsCount >= 3 ? "destructive" : "secondary"}>
                        {contentOwner.warningsCount}
                      </Badge>
                      {contentOwner.warningsCount >= 3 && (
                        <span className="text-xs text-destructive">تجاوز الحد!</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => sendWarningMutation.mutate()}
                    disabled={sendWarningMutation.isPending || !contentOwner}
                  >
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    إرسال تحذير للمستخدم
                    {sendWarningMutation.isPending && (
                      <span className="mr-auto text-xs text-muted-foreground">جاري الإرسال...</span>
                    )}
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full justify-start gap-2"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteBookMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف الكتاب
                  </Button>
                </div>

                {!contentOwner && (
                  <p className="text-sm text-muted-foreground text-center">
                    لا يمكن تحديد صاحب الكتاب
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowActionDialog(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف الكتاب؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف الكتاب نهائياً ولا يمكن التراجع عن هذا الإجراء.
                سيتم إشعار صاحب الكتاب بالحذف.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteBookMutation.mutate()}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteBookMutation.isPending ? 'جاري الحذف...' : 'نعم، احذف الكتاب'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminReportsPage;
