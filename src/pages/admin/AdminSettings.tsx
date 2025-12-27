import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Loader2, Shield, Database, Bell, Palette, Settings2, Save, 
  Globe, Mail, Server, RefreshCw, AlertTriangle, CheckCircle,
  FileText, Search, Lock, Eye, Zap, HardDrive, Download,
  Upload, Trash2, Clock, Users, BookOpen, Activity
} from 'lucide-react';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const AdminSettings = () => {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Fetch site settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');
      
      if (error) throw error;
      
      const settingsObj: Record<string, any> = {};
      data?.forEach(s => {
        settingsObj[s.key] = s.value;
      });
      return settingsObj;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_stats');
      if (error) throw error;
      return data?.[0];
    },
  });

  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'مكتبة',
    siteDescription: 'مكتبة رقمية عربية',
    contactEmail: '',
    supportEmail: '',
    fromEmail: 'مكتبة <noreply@maktaba.cc>',
    maintenanceMode: false,
    maintenanceMessage: 'الموقع تحت الصيانة، سنعود قريباً',
  });

  const [seoSettings, setSeoSettings] = useState({
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    ogImage: '',
    googleAnalyticsId: '',
    enableIndexing: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    enableRateLimiting: true,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    enableTwoFactor: false,
    sessionTimeout: 60,
  });

  const [performanceSettings, setPerformanceSettings] = useState({
    enableCaching: true,
    cacheTimeout: 5,
    enableCompression: true,
    lazyLoadImages: true,
    maxUploadSize: 50,
  });

  // تحميل الإعدادات من قاعدة البيانات عند تغييرها
  useEffect(() => {
    if (settings) {
      if (settings.general) {
        setGeneralSettings(prev => ({ ...prev, ...settings.general }));
      }
      if (settings.seo) {
        setSeoSettings(prev => ({ ...prev, ...settings.seo }));
      }
      if (settings.security) {
        setSecuritySettings(prev => ({ ...prev, ...settings.security }));
      }
      if (settings.performance) {
        setPerformanceSettings(prev => ({ ...prev, ...settings.performance }));
      }
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', key)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
    },
  });

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      await updateSettingMutation.mutateAsync({ key: 'general', value: generalSettings });
      logActivity({
        actionType: 'update',
        entityType: 'setting',
        entityName: 'الإعدادات العامة',
      });
      toast.success('تم حفظ الإعدادات العامة');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSEO = async () => {
    setIsSaving(true);
    try {
      await updateSettingMutation.mutateAsync({ key: 'seo', value: seoSettings });
      logActivity({
        actionType: 'update',
        entityType: 'setting',
        entityName: 'إعدادات SEO',
      });
      toast.success('تم حفظ إعدادات SEO');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    setIsSaving(true);
    try {
      await updateSettingMutation.mutateAsync({ key: 'security', value: securitySettings });
      logActivity({
        actionType: 'update',
        entityType: 'setting',
        entityName: 'إعدادات الأمان',
      });
      toast.success('تم حفظ إعدادات الأمان');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePerformance = async () => {
    setIsSaving(true);
    try {
      await updateSettingMutation.mutateAsync({ key: 'performance', value: performanceSettings });
      logActivity({
        actionType: 'update',
        entityType: 'setting',
        entityName: 'إعدادات الأداء',
      });
      toast.success('تم حفظ إعدادات الأداء');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = async () => {
    try {
      queryClient.clear();
      logActivity({
        actionType: 'update',
        entityType: 'setting',
        entityName: 'مسح ذاكرة التخزين المؤقت',
      });
      toast.success('تم مسح ذاكرة التخزين المؤقت');
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings2 className="w-8 h-8 text-primary" />
              إعدادات النظام
            </h1>
            <p className="text-muted-foreground mt-1">إدارة إعدادات الموقع والتكوينات</p>
          </div>
          <Badge variant="outline" className="gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            النظام يعمل بشكل طبيعي
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
                  <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <BookOpen className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total_books || 0}</p>
                  <p className="text-sm text-muted-foreground">إجمالي الكتب</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Activity className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.active_readers_today || 0}</p>
                  <p className="text-sm text-muted-foreground">نشطون اليوم</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <HardDrive className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">v1.0.0</p>
                  <p className="text-sm text-muted-foreground">إصدار النظام</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="general" className="gap-2">
              <Globe className="w-4 h-4" />
              عام
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-2">
              <Search className="w-4 h-4" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              الأمان
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <Zap className="w-4 h-4" />
              الأداء
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Server className="w-4 h-4" />
              النظام
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  الإعدادات العامة
                </CardTitle>
                <CardDescription>معلومات الموقع الأساسية وإعدادات الصيانة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="siteName">اسم الموقع</Label>
                    <Input
                      id="siteName"
                      value={generalSettings.siteName}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                      placeholder="اسم الموقع"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">البريد الإلكتروني للتواصل</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={generalSettings.contactEmail}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="siteDescription">وصف الموقع</Label>
                  <Textarea
                    id="siteDescription"
                    value={generalSettings.siteDescription}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
                    placeholder="وصف مختصر للموقع"
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    إعدادات البريد الإلكتروني
                  </h3>
                  
                  <div>
                    <Label htmlFor="fromEmail">بريد الإرسال (From Email)</Label>
                    <Input
                      id="fromEmail"
                      value={generalSettings.fromEmail}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, fromEmail: e.target.value })}
                      placeholder="مكتبة <noreply@maktaba.cc>"
                      dir="ltr"
                      className="text-left"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      هذا البريد يُستخدم عند الرد على رسائل التواصل. يجب أن يكون من دومين موثّق في Resend.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    وضع الصيانة
                  </h3>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>تفعيل وضع الصيانة</Label>
                      <p className="text-sm text-muted-foreground">
                        عند التفعيل، سيظهر للزوار رسالة صيانة
                      </p>
                    </div>
                    <Switch
                      checked={generalSettings.maintenanceMode}
                      onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, maintenanceMode: checked })}
                    />
                  </div>

                  {generalSettings.maintenanceMode && (
                    <div>
                      <Label htmlFor="maintenanceMessage">رسالة الصيانة</Label>
                      <Textarea
                        id="maintenanceMessage"
                        value={generalSettings.maintenanceMessage}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, maintenanceMessage: e.target.value })}
                        placeholder="رسالة تظهر للزوار أثناء الصيانة"
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveGeneral} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات العامة
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Settings */}
          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  إعدادات SEO
                </CardTitle>
                <CardDescription>تحسين ظهور الموقع في محركات البحث</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="metaTitle">عنوان الميتا (Meta Title)</Label>
                    <Input
                      id="metaTitle"
                      value={seoSettings.metaTitle}
                      onChange={(e) => setSeoSettings({ ...seoSettings, metaTitle: e.target.value })}
                      placeholder="عنوان الموقع في محركات البحث"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{seoSettings.metaTitle?.length || 0}/60 حرف</p>
                  </div>
                  <div>
                    <Label htmlFor="googleAnalyticsId">معرف Google Analytics</Label>
                    <Input
                      id="googleAnalyticsId"
                      value={seoSettings.googleAnalyticsId}
                      onChange={(e) => setSeoSettings({ ...seoSettings, googleAnalyticsId: e.target.value })}
                      placeholder="G-XXXXXXXXXX"
                      dir="ltr"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="metaDescription">وصف الميتا (Meta Description)</Label>
                  <Textarea
                    id="metaDescription"
                    value={seoSettings.metaDescription}
                    onChange={(e) => setSeoSettings({ ...seoSettings, metaDescription: e.target.value })}
                    placeholder="وصف الموقع في نتائج البحث"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{seoSettings.metaDescription?.length || 0}/160 حرف</p>
                </div>

                <div>
                  <Label htmlFor="metaKeywords">الكلمات المفتاحية</Label>
                  <Input
                    id="metaKeywords"
                    value={seoSettings.metaKeywords}
                    onChange={(e) => setSeoSettings({ ...seoSettings, metaKeywords: e.target.value })}
                    placeholder="كتب, قراءة, مكتبة, عربي"
                  />
                </div>

                <div>
                  <Label htmlFor="ogImage">صورة المشاركة (OG Image)</Label>
                  <Input
                    id="ogImage"
                    value={seoSettings.ogImage}
                    onChange={(e) => setSeoSettings({ ...seoSettings, ogImage: e.target.value })}
                    placeholder="https://example.com/og-image.jpg"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>السماح بالفهرسة</Label>
                    <p className="text-sm text-muted-foreground">
                      السماح لمحركات البحث بفهرسة الموقع
                    </p>
                  </div>
                  <Switch
                    checked={seoSettings.enableIndexing}
                    onCheckedChange={(checked) => setSeoSettings({ ...seoSettings, enableIndexing: checked })}
                  />
                </div>

                <Button onClick={handleSaveSEO} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ إعدادات SEO
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  إعدادات الأمان
                </CardTitle>
                <CardDescription>إعدادات الحماية والتحكم في الوصول</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="maxLoginAttempts">محاولات تسجيل الدخول القصوى</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={securitySettings.maxLoginAttempts}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                      min={1}
                      max={10}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lockoutDuration">مدة الحظر (دقائق)</Label>
                    <Input
                      id="lockoutDuration"
                      type="number"
                      value={securitySettings.lockoutDuration}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, lockoutDuration: parseInt(e.target.value) })}
                      min={5}
                      max={120}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="sessionTimeout">مهلة الجلسة (دقائق)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                    min={15}
                    max={480}
                  />
                  <p className="text-xs text-muted-foreground mt-1">تسجيل خروج المستخدم تلقائياً بعد فترة عدم نشاط</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>تحديد معدل الطلبات</Label>
                      <p className="text-sm text-muted-foreground">
                        حماية من هجمات DDoS
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.enableRateLimiting}
                      onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, enableRateLimiting: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>المصادقة الثنائية (قريباً)</Label>
                      <p className="text-sm text-muted-foreground">
                        طبقة حماية إضافية للحسابات
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.enableTwoFactor}
                      onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, enableTwoFactor: checked })}
                      disabled
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <Button variant="outline" asChild>
                    <Link to="/admin/security">
                      <Eye className="w-4 h-4 ml-2" />
                      عرض سجلات الأمان
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/admin/blocked-ips">
                      <Lock className="w-4 h-4 ml-2" />
                      إدارة IPs المحظورة
                    </Link>
                  </Button>
                </div>

                <Button onClick={handleSaveSecurity} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ إعدادات الأمان
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Settings */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  إعدادات الأداء
                </CardTitle>
                <CardDescription>تحسين سرعة وأداء الموقع</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="cacheTimeout">مهلة ذاكرة التخزين المؤقت (دقائق)</Label>
                    <Input
                      id="cacheTimeout"
                      type="number"
                      value={performanceSettings.cacheTimeout}
                      onChange={(e) => setPerformanceSettings({ ...performanceSettings, cacheTimeout: parseInt(e.target.value) })}
                      min={1}
                      max={60}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxUploadSize">الحد الأقصى لحجم الملفات (MB)</Label>
                    <Input
                      id="maxUploadSize"
                      type="number"
                      value={performanceSettings.maxUploadSize}
                      onChange={(e) => setPerformanceSettings({ ...performanceSettings, maxUploadSize: parseInt(e.target.value) })}
                      min={1}
                      max={100}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>تفعيل التخزين المؤقت</Label>
                      <p className="text-sm text-muted-foreground">
                        تسريع تحميل الصفحات
                      </p>
                    </div>
                    <Switch
                      checked={performanceSettings.enableCaching}
                      onCheckedChange={(checked) => setPerformanceSettings({ ...performanceSettings, enableCaching: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>ضغط البيانات</Label>
                      <p className="text-sm text-muted-foreground">
                        تقليل حجم البيانات المنقولة
                      </p>
                    </div>
                    <Switch
                      checked={performanceSettings.enableCompression}
                      onCheckedChange={(checked) => setPerformanceSettings({ ...performanceSettings, enableCompression: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>التحميل الكسول للصور</Label>
                      <p className="text-sm text-muted-foreground">
                        تحميل الصور عند الحاجة فقط
                      </p>
                    </div>
                    <Switch
                      checked={performanceSettings.lazyLoadImages}
                      onCheckedChange={(checked) => setPerformanceSettings({ ...performanceSettings, lazyLoadImages: checked })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <RefreshCw className="w-4 h-4 ml-2" />
                        مسح ذاكرة التخزين المؤقت
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>مسح ذاكرة التخزين المؤقت؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم مسح جميع البيانات المخزنة مؤقتاً. قد يستغرق تحميل الصفحات وقتاً أطول مؤقتاً.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearCache}>
                          مسح
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <Button onClick={handleSavePerformance} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ إعدادات الأداء
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Info */}
          <TabsContent value="system">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    معلومات النظام
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">إصدار النظام</span>
                      <Badge>v1.0.0</Badge>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">آخر تحديث</span>
                      <span className="font-medium">{new Date().toLocaleDateString('ar')}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">الحالة</span>
                      <Badge variant="outline" className="text-green-500 border-green-500">
                        <CheckCircle className="w-3 h-3 ml-1" />
                        يعمل
                      </Badge>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">قاعدة البيانات</span>
                      <Badge variant="outline" className="text-green-500 border-green-500">
                        متصل
                      </Badge>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">التخزين</span>
                      <Badge variant="outline" className="text-green-500 border-green-500">
                        متصل
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    استخدام الموارد
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>المستخدمين</span>
                      <span>{stats?.total_users || 0}</span>
                    </div>
                    <Progress value={30} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>الكتب</span>
                      <span>{stats?.total_books || 0}</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>التصنيفات</span>
                      <span>{stats?.total_categories || 0}</span>
                    </div>
                    <Progress value={20} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    روابط سريعة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Button variant="outline" asChild className="justify-start">
                      <Link to="/admin/users">
                        <Users className="w-4 h-4 ml-2" />
                        إدارة المستخدمين
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="justify-start">
                      <Link to="/admin/books">
                        <BookOpen className="w-4 h-4 ml-2" />
                        إدارة الكتب
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="justify-start">
                      <Link to="/admin/activity">
                        <Activity className="w-4 h-4 ml-2" />
                        سجل النشاطات
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="justify-start">
                      <Link to="/admin/appearance">
                        <Palette className="w-4 h-4 ml-2" />
                        المظهر
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
