import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, FileText, AlertTriangle, CheckCircle, MessageSquare, RefreshCw } from 'lucide-react';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Textarea } from '@/components/ui/textarea';
import {
  AdminDialog,
  AdminDialogContent,
  AdminDialogHeader,
  AdminDialogTitle,
  AdminDialogFooter,
} from '@/components/admin/AdminDialog';

// تعريف جميع صفحات التطبيق الفعلية
const APP_PAGES = [
  // الصفحات العامة
  { path: '/', title: 'الصفحة الرئيسية' },
  { path: '/categories', title: 'التصنيفات' },
  { path: '/about', title: 'من نحن' },
  { path: '/search', title: 'البحث' },
  { path: '/contact', title: 'اتصل بنا' },
  { path: '/sitemap', title: 'خريطة الموقع' },
  
  // صفحات المصادقة
  { path: '/auth', title: 'تسجيل الدخول' },
  { path: '/reset-password', title: 'استعادة كلمة المرور' },
  
  // صفحات المستخدم
  { path: '/settings', title: 'الإعدادات الشخصية' },
  { path: '/my-library', title: 'مكتبتي' },
  { path: '/saved-books', title: 'الكتب المحفوظة' },
  { path: '/reading-lists', title: 'قوائم القراءة' },
  { path: '/explore-lists', title: 'استكشاف القوائم' },
  { path: '/stats', title: 'إحصائياتي' },
  { path: '/upload', title: 'رفع كتاب' },
  
  // صفحات الكتب
  { path: '/book/:id', title: 'تفاصيل الكتاب' },
  { path: '/book/:id/read', title: 'قراءة الكتاب' },
  { path: '/book/:id/edit', title: 'تعديل الكتاب' },
  { path: '/categories/:slug', title: 'كتب التصنيف' },
  
  // صفحات عامة
  { path: '/user/:username', title: 'الملف العام' },
  { path: '/reading-list/:listId', title: 'قائمة القراءة العامة' },
  { path: '/install', title: 'تثبيت التطبيق' },
  { path: '/privacy', title: 'سياسة الخصوصية' },
  { path: '/terms', title: 'شروط الاستخدام' },
  
  // صفحات الإدارة
  { path: '/admin', title: 'لوحة التحكم' },
  { path: '/admin/books', title: 'إدارة الكتب' },
  { path: '/admin/users', title: 'إدارة المستخدمين' },
  { path: '/admin/categories', title: 'إدارة التصنيفات' },
  { path: '/admin/messages', title: 'الرسائل' },
  { path: '/admin/reviews', title: 'المراجعات' },
  { path: '/admin/roles', title: 'الصلاحيات' },
  { path: '/admin/pages', title: 'إدارة الصفحات' },
  { path: '/admin/appearance', title: 'المظهر' },
  { path: '/admin/settings', title: 'إعدادات النظام' },
  { path: '/admin/security', title: 'سجلات الأمان' },
  { path: '/admin/blocked-ips', title: 'عناوين IP المحظورة' },
  { path: '/admin/security-dashboard', title: 'لوحة الأمان' },
  { path: '/admin/reports', title: 'البلاغات' },
  { path: '/admin/activity', title: 'سجل النشاط' },
  { path: '/admin/ads', title: 'الإعلانات' },
];

export const AdminPages = () => {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [editingPage, setEditingPage] = useState<any>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: pages, isLoading, refetch } = useQuery({
    queryKey: ['pageSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_settings')
        .select('*')
        .order('path');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: maintenanceSettings } = useQuery({
    queryKey: ['maintenanceSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'maintenance')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.value as { enabled: boolean; message: string; pages: string[] } | null;
    },
  });

  // مزامنة الصفحات - إضافة الجديدة وحذف القديمة
  const syncPages = async () => {
    setIsSyncing(true);
    try {
      const existingPaths = pages?.map(p => p.path) || [];
      const appPaths = APP_PAGES.map(p => p.path);
      
      // الصفحات الجديدة التي يجب إضافتها
      const newPages = APP_PAGES.filter(p => !existingPaths.includes(p.path));
      
      // الصفحات القديمة التي يجب حذفها (موجودة في قاعدة البيانات لكن ليست في التطبيق)
      const oldPages = pages?.filter(p => !appPaths.includes(p.path)) || [];
      
      let addedCount = 0;
      let deletedCount = 0;
      
      // حذف الصفحات القديمة
      if (oldPages.length > 0) {
        const oldIds = oldPages.map(p => p.id);
        const { error: deleteError } = await supabase
          .from('page_settings')
          .delete()
          .in('id', oldIds);
        
        if (deleteError) {
          console.error('Error deleting old pages:', deleteError);
        } else {
          deletedCount = oldPages.length;
        }
      }
      
      // إضافة الصفحات الجديدة
      if (newPages.length > 0) {
        const { error: insertError } = await supabase
          .from('page_settings')
          .insert(newPages.map(p => ({
            path: p.path,
            title: p.title,
            is_enabled: true,
            is_maintenance: false,
          })));
        
        if (insertError) {
          console.error('Error adding new pages:', insertError);
        } else {
          addedCount = newPages.length;
        }
      }
      
      // عرض النتيجة
      if (addedCount > 0 || deletedCount > 0) {
        let message = '';
        if (addedCount > 0) message += `تمت إضافة ${addedCount} صفحة جديدة`;
        if (deletedCount > 0) {
          if (message) message += ' و';
          message += `حذف ${deletedCount} صفحة قديمة`;
        }
        toast.success(message);
        refetch();
      } else {
        toast.info('جميع الصفحات محدثة');
      }
    } catch (error) {
      console.error('Error syncing pages:', error);
      toast.error('حدث خطأ أثناء مزامنة الصفحات');
    } finally {
      setIsSyncing(false);
    }
  };

  // مزامنة تلقائية عند أول تحميل
  useEffect(() => {
    if (!isLoading && pages !== undefined) {
      const appPaths = APP_PAGES.map(p => p.path);
      const existingPaths = pages?.map(p => p.path) || [];
      
      // تحقق من وجود صفحات جديدة أو قديمة
      const hasNewPages = APP_PAGES.some(p => !existingPaths.includes(p.path));
      const hasOldPages = pages?.some(p => !appPaths.includes(p.path));
      
      if (pages.length === 0 || hasNewPages || hasOldPages) {
        syncPages();
      }
    }
  }, [isLoading, pages]);

  const updatePageMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('page_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageSettings'] });
      toast.success('تم تحديث إعدادات الصفحة');
    },
  });

  const updateMaintenanceMutation = useMutation({
    mutationFn: async (value: any) => {
      // Check if maintenance setting exists
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', 'maintenance')
        .single();
      
      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', 'maintenance');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert({ key: 'maintenance', value, description: 'إعدادات وضع الصيانة' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSettings'] });
    },
  });

  const handleToggleEnabled = (page: any) => {
    updatePageMutation.mutate({
      id: page.id,
      updates: { is_enabled: !page.is_enabled }
    });
    logActivity({
      actionType: 'update',
      entityType: 'setting',
      entityName: `صفحة ${page.title}`,
      details: { action: page.is_enabled ? 'disable' : 'enable' }
    });
  };

  const handleToggleMaintenance = (page: any) => {
    updatePageMutation.mutate({
      id: page.id,
      updates: { is_maintenance: !page.is_maintenance }
    });
    logActivity({
      actionType: 'update',
      entityType: 'setting',
      entityName: `صفحة ${page.title}`,
      details: { action: page.is_maintenance ? 'remove_maintenance' : 'set_maintenance' }
    });
  };

  const handleGlobalMaintenance = (enabled: boolean) => {
    const currentSettings = maintenanceSettings || { enabled: false, message: '', pages: [] };
    updateMaintenanceMutation.mutate({
      ...currentSettings,
      enabled
    });
    logActivity({
      actionType: 'update',
      entityType: 'setting',
      entityName: 'وضع الصيانة العام',
      details: { enabled }
    });
    toast.success(enabled ? 'تم تفعيل وضع الصيانة' : 'تم إلغاء وضع الصيانة');
  };

  const handleOpenMessageEditor = (page: any) => {
    setEditingPage(page);
    setMaintenanceMessage(page.maintenance_message || '');
  };

  const handleSaveMessage = () => {
    if (!editingPage) return;
    
    updatePageMutation.mutate({
      id: editingPage.id,
      updates: { maintenance_message: maintenanceMessage }
    });
    logActivity({
      actionType: 'update',
      entityType: 'setting',
      entityName: `رسالة صيانة صفحة ${editingPage.title}`,
      details: { message: maintenanceMessage }
    });
    setEditingPage(null);
    setMaintenanceMessage('');
  };

  const enabledCount = pages?.filter(p => p.is_enabled).length || 0;
  const maintenanceCount = pages?.filter(p => p.is_maintenance).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة الصفحات</h1>
            <p className="text-muted-foreground mt-1">التحكم في صفحات الموقع ووضع الصيانة</p>
          </div>
          <Button
            variant="outline"
            onClick={syncPages}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            مزامنة الصفحات
          </Button>
        </div>

        {/* Global Maintenance Toggle */}
        <Card className={maintenanceSettings?.enabled ? 'border-destructive' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${maintenanceSettings?.enabled ? 'text-destructive' : 'text-muted-foreground'}`} />
              وضع الصيانة الشامل
            </CardTitle>
            <CardDescription>
              تفعيل هذا الخيار سيظهر رسالة صيانة لجميع صفحات الموقع
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Switch
                  checked={maintenanceSettings?.enabled || false}
                  onCheckedChange={handleGlobalMaintenance}
                />
                <span className={maintenanceSettings?.enabled ? 'text-destructive font-medium' : ''}>
                  {maintenanceSettings?.enabled ? 'الموقع تحت الصيانة' : 'الموقع يعمل بشكل طبيعي'}
                </span>
              </div>
              {maintenanceSettings?.enabled && (
                <Badge variant="destructive">الصيانة مفعلة</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pages?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي الصفحات</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{enabledCount}</p>
                <p className="text-sm text-muted-foreground">صفحات مفعلة</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{maintenanceCount}</p>
                <p className="text-sm text-muted-foreground">تحت الصيانة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pages Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الصفحات</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pages && pages.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الصفحة</TableHead>
                    <TableHead>المسار</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>رسالة الصيانة</TableHead>
                    <TableHead>الصيانة</TableHead>
                    <TableHead>مفعلة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages?.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.title}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{page.path}</TableCell>
                      <TableCell>
                        {page.is_maintenance ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            تحت الصيانة
                          </Badge>
                        ) : page.is_enabled ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            تعمل
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            معطلة
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenMessageEditor(page)}
                          className="gap-1"
                        >
                          <MessageSquare className="w-4 h-4" />
                          {page.maintenance_message ? (
                            <span className="max-w-[100px] truncate text-xs">
                              {page.maintenance_message}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">تخصيص</span>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={page.is_maintenance}
                          onCheckedChange={() => handleToggleMaintenance(page)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={page.is_enabled}
                          onCheckedChange={() => handleToggleEnabled(page)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">لا توجد صفحات مسجلة</p>
                <Button onClick={syncPages} disabled={isSyncing}>
                  <RefreshCw className={`w-4 h-4 ml-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  مزامنة الصفحات الآن
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Message Editor Dialog */}
        <AdminDialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
          <AdminDialogContent className="sm:max-w-md">
            <AdminDialogHeader>
              <AdminDialogTitle>تخصيص رسالة الصيانة</AdminDialogTitle>
            </AdminDialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  صفحة: <span className="font-medium text-foreground">{editingPage?.title}</span>
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  هذه الرسالة ستظهر للزوار عند وضع الصفحة تحت الصيانة
                </p>
              </div>
              <Textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="نعمل على تحسين هذه الصفحة. يرجى المحاولة لاحقاً."
                className="min-h-[100px]"
              />
            </div>
            <AdminDialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditingPage(null)}>
                إلغاء
              </Button>
              <Button onClick={handleSaveMessage}>
                حفظ الرسالة
              </Button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPages;