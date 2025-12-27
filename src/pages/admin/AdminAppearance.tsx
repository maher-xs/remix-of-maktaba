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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Loader2, Palette, Globe, Moon, Sun, Settings2, Save, 
  Image, Search, Layout, BookOpen, Mail, Phone, 
  MapPin, Facebook, Twitter, Instagram, Youtube, Link2,
  Menu, Home, FileText, AlertCircle, Eye
} from 'lucide-react';
import { useActivityLog } from '@/hooks/useActivityLog';

export const AdminAppearance = () => {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

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

  // الإعدادات العامة
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'المكتبة السورية',
    siteDescription: 'مكتبة عربية رقمية شاملة',
    siteKeywords: 'كتب، مكتبة، قراءة، كتب عربية، تحميل كتب',
    contactEmail: '',
    contactPhone: '',
    address: '',
  });

  // إعدادات المظهر - الألوان الفعلية للموقع
  const [themeSettings, setThemeSettings] = useState({
    defaultTheme: 'system',
    allowUserChoice: true,
    primaryColor: '#306B4D', // الأخضر السوري (152 32% 28%)
    accentColor: '#D9A21B', // الذهبي (40 70% 50%)
  });

  // إعدادات اللوجو والهوية
  const [brandingSettings, setBrandingSettings] = useState({
    logoUrl: '',
    faviconUrl: '',
    showLogoText: true,
    logoText: 'المكتبة السورية',
  });

  // إعدادات الهيدر
  const [headerSettings, setHeaderSettings] = useState({
    showSearch: true,
    showThemeToggle: true,
    showAuthButtons: true,
    showNotifications: false,
    stickyHeader: true,
    transparentHeader: false,
  });

  // إعدادات الفوتر
  const [footerSettings, setFooterSettings] = useState({
    showFooter: true,
    footerText: 'جميع الحقوق محفوظة © 2024',
    showSocialLinks: true,
    showQuickLinks: true,
    showContactInfo: true,
  });

  // روابط التواصل الاجتماعي
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    twitter: '',
    instagram: '',
    youtube: '',
    telegram: '',
  });

  // إعدادات البحث
  const [searchSettings, setSearchSettings] = useState({
    enableSearch: true,
    showSearchSuggestions: true,
    searchPlaceholder: 'ابحث عن كتاب...',
    minSearchLength: 2,
    maxResults: 20,
  });

  // إعدادات الصفحة الرئيسية
  const [homeSettings, setHomeSettings] = useState({
    showHeroBanner: true,
    heroTitle: 'مرحباً بك في المكتبة السورية',
    heroSubtitle: 'اكتشف آلاف الكتب العربية',
    showFeaturedBooks: true,
    showCategories: true,
    showLatestBooks: true,
    showPopularBooks: true,
    booksPerRow: 4,
  });

  // إعدادات الكتب
  const [bookSettings, setBookSettings] = useState({
    showBookRating: true,
    showBookReviews: true,
    showRelatedBooks: true,
    showDownloadButton: true,
    showReadOnlineButton: true,
    allowBookmarks: true,
    allowAnnotations: true,
  });

  // إعدادات SEO
  const [seoSettings, setSeoSettings] = useState({
    metaTitle: 'المكتبة السورية - مكتبة عربية رقمية',
    metaDescription: 'مكتبة عربية رقمية شاملة تضم آلاف الكتب في مختلف المجالات',
    ogImage: '',
    enableSitemap: true,
    enableRobots: true,
    googleAnalyticsId: '',
  });

  // تحميل الإعدادات من قاعدة البيانات
  useEffect(() => {
    if (settings) {
      if (settings.general) setGeneralSettings(prev => ({ ...prev, ...settings.general }));
      if (settings.theme) setThemeSettings(prev => ({ ...prev, ...settings.theme }));
      if (settings.branding) setBrandingSettings(prev => ({ ...prev, ...settings.branding }));
      if (settings.header) setHeaderSettings(prev => ({ ...prev, ...settings.header }));
      if (settings.footer) setFooterSettings(prev => ({ ...prev, ...settings.footer }));
      if (settings.social) setSocialLinks(prev => ({ ...prev, ...settings.social }));
      if (settings.search) setSearchSettings(prev => ({ ...prev, ...settings.search }));
      if (settings.home) setHomeSettings(prev => ({ ...prev, ...settings.home }));
      if (settings.books) setBookSettings(prev => ({ ...prev, ...settings.books }));
      if (settings.seo) setSeoSettings(prev => ({ ...prev, ...settings.seo }));
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

  const handleSave = async (key: string, value: any, label: string) => {
    setIsSaving(true);
    try {
      await updateSettingMutation.mutateAsync({ key, value });
      logActivity({
        actionType: 'update',
        entityType: 'setting',
        entityName: label,
      });
      toast.success(`تم حفظ ${label}`);
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
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
        <div>
          <h1 className="text-3xl font-bold">إعدادات الموقع الشاملة</h1>
          <p className="text-muted-foreground mt-1">تحكم كامل في مظهر وإعدادات الموقع</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="general" className="gap-2">
              <Globe className="w-4 h-4" />
              عام
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Image className="w-4 h-4" />
              الهوية
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-2">
              <Palette className="w-4 h-4" />
              المظهر
            </TabsTrigger>
            <TabsTrigger value="header" className="gap-2">
              <Menu className="w-4 h-4" />
              الهيدر
            </TabsTrigger>
            <TabsTrigger value="footer" className="gap-2">
              <Layout className="w-4 h-4" />
              الفوتر
            </TabsTrigger>
            <TabsTrigger value="home" className="gap-2">
              <Home className="w-4 h-4" />
              الرئيسية
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              البحث
            </TabsTrigger>
            <TabsTrigger value="books" className="gap-2">
              <BookOpen className="w-4 h-4" />
              الكتب
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <Link2 className="w-4 h-4" />
              التواصل
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-2">
              <FileText className="w-4 h-4" />
              SEO
            </TabsTrigger>
          </TabsList>

          {/* الإعدادات العامة */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  الإعدادات العامة
                </CardTitle>
                <CardDescription>
                  معلومات الموقع الأساسية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label htmlFor="siteName">اسم الموقع</Label>
                    <Input
                      id="siteName"
                      value={generalSettings.siteName}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                      placeholder="المكتبة السورية"
                    />
                    <p className="text-sm text-muted-foreground mt-1">سيظهر في عنوان الصفحة والهيدر</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="siteDescription">وصف الموقع</Label>
                    <Textarea
                      id="siteDescription"
                      value={generalSettings.siteDescription}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
                      placeholder="مكتبة عربية رقمية شاملة"
                      rows={3}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="siteKeywords">الكلمات المفتاحية</Label>
                    <Input
                      id="siteKeywords"
                      value={generalSettings.siteKeywords}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, siteKeywords: e.target.value })}
                      placeholder="كتب، مكتبة، قراءة"
                    />
                    <p className="text-sm text-muted-foreground mt-1">افصل بين الكلمات بفاصلة</p>
                  </div>

                  <div>
                    <Label htmlFor="contactEmail" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      البريد الإلكتروني
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={generalSettings.contactEmail}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
                      placeholder="info@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactPhone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      رقم الهاتف
                    </Label>
                    <Input
                      id="contactPhone"
                      value={generalSettings.contactPhone}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, contactPhone: e.target.value })}
                      placeholder="+963 123 456 789"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      العنوان
                    </Label>
                    <Input
                      id="address"
                      value={generalSettings.address}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                      placeholder="دمشق، سوريا"
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('general', generalSettings, 'الإعدادات العامة')} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إعدادات الهوية */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  الهوية البصرية
                </CardTitle>
                <CardDescription>
                  اللوجو والأيقونات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* معاينة اللوجو الحالي */}
                <div className="p-6 bg-muted/30 rounded-xl border border-border">
                  <Label className="mb-3 block">معاينة اللوجو</Label>
                  <div className="flex items-center gap-4 p-4 bg-background rounded-lg border">
                    {brandingSettings.logoUrl ? (
                      <img 
                        src={brandingSettings.logoUrl} 
                        alt="اللوجو" 
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-primary-foreground" />
                      </div>
                    )}
                    {brandingSettings.showLogoText && (
                      <span className="text-xl font-bold">{brandingSettings.logoText || 'مكتبة'}</span>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label htmlFor="logoUrl">رابط اللوجو</Label>
                    <Input
                      id="logoUrl"
                      value={brandingSettings.logoUrl}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, logoUrl: e.target.value })}
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      أدخل رابط صورة اللوجو (PNG أو SVG يفضل)
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="faviconUrl">رابط الأيقونة (Favicon)</Label>
                    <Input
                      id="faviconUrl"
                      value={brandingSettings.faviconUrl}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, faviconUrl: e.target.value })}
                      placeholder="https://example.com/favicon.ico"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      الأيقونة التي تظهر في تبويب المتصفح (32x32 أو 16x16)
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>عرض نص اللوجو</Label>
                      <p className="text-sm text-muted-foreground">عرض اسم الموقع بجانب اللوجو</p>
                    </div>
                    <Switch
                      checked={brandingSettings.showLogoText}
                      onCheckedChange={(checked) => setBrandingSettings({ ...brandingSettings, showLogoText: checked })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="logoText">نص اللوجو</Label>
                    <Input
                      id="logoText"
                      value={brandingSettings.logoText}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, logoText: e.target.value })}
                      placeholder="المكتبة السورية"
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('branding', brandingSettings, 'إعدادات الهوية')} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إعدادات المظهر */}
          <TabsContent value="theme">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  إعدادات المظهر
                </CardTitle>
                <CardDescription>
                  الألوان والوضع الليلي
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="mb-3 block">المظهر الافتراضي</Label>
                  <div className="flex gap-4">
                    <Button
                      variant={themeSettings.defaultTheme === 'light' ? 'default' : 'outline'}
                      onClick={() => setThemeSettings({ ...themeSettings, defaultTheme: 'light' })}
                      className="flex-1"
                    >
                      <Sun className="w-4 h-4 ml-2" />
                      فاتح
                    </Button>
                    <Button
                      variant={themeSettings.defaultTheme === 'dark' ? 'default' : 'outline'}
                      onClick={() => setThemeSettings({ ...themeSettings, defaultTheme: 'dark' })}
                      className="flex-1"
                    >
                      <Moon className="w-4 h-4 ml-2" />
                      داكن
                    </Button>
                    <Button
                      variant={themeSettings.defaultTheme === 'system' ? 'default' : 'outline'}
                      onClick={() => setThemeSettings({ ...themeSettings, defaultTheme: 'system' })}
                      className="flex-1"
                    >
                      <Settings2 className="w-4 h-4 ml-2" />
                      تلقائي
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>السماح للمستخدمين بتغيير المظهر</Label>
                    <p className="text-sm text-muted-foreground">السماح للزوار باختيار المظهر</p>
                  </div>
                  <Switch
                    checked={themeSettings.allowUserChoice}
                    onCheckedChange={(checked) => setThemeSettings({ ...themeSettings, allowUserChoice: checked })}
                  />
                </div>

                <Separator />

                {/* معاينة الألوان */}
                <div className="p-6 bg-muted/30 rounded-xl border border-border">
                  <Label className="mb-3 block">معاينة الألوان</Label>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex flex-col items-center gap-2">
                      <div 
                        className="w-16 h-16 rounded-xl shadow-md flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: themeSettings.primaryColor }}
                      >
                        رئيسي
                      </div>
                      <span className="text-xs text-muted-foreground">{themeSettings.primaryColor}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div 
                        className="w-16 h-16 rounded-xl shadow-md flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: themeSettings.accentColor }}
                      >
                        ثانوي
                      </div>
                      <span className="text-xs text-muted-foreground">{themeSettings.accentColor}</span>
                    </div>
                    <div className="flex-1 p-4 rounded-xl border" style={{ borderColor: themeSettings.primaryColor }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeSettings.primaryColor }}></div>
                        <span className="font-medium">نص عينة</span>
                      </div>
                      <button 
                        className="px-4 py-2 rounded-lg text-white text-sm"
                        style={{ backgroundColor: themeSettings.primaryColor }}
                      >
                        زر عينة
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="primaryColor">اللون الرئيسي</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={themeSettings.primaryColor}
                        onChange={(e) => setThemeSettings({ ...themeSettings, primaryColor: e.target.value })}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={themeSettings.primaryColor}
                        onChange={(e) => setThemeSettings({ ...themeSettings, primaryColor: e.target.value })}
                        className="flex-1"
                        dir="ltr"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">لون الأزرار والروابط الرئيسية</p>
                  </div>

                  <div>
                    <Label htmlFor="accentColor">اللون الثانوي</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accentColor"
                        type="color"
                        value={themeSettings.accentColor}
                        onChange={(e) => setThemeSettings({ ...themeSettings, accentColor: e.target.value })}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={themeSettings.accentColor}
                        onChange={(e) => setThemeSettings({ ...themeSettings, accentColor: e.target.value })}
                        className="flex-1"
                        dir="ltr"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">لون العناصر الثانوية والتمييز</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-600 dark:text-amber-400">ملاحظة</p>
                      <p className="text-sm text-muted-foreground">
                        تغيير الألوان يتطلب تحديث ملف الأنماط (CSS). الألوان المحفوظة هنا للتوثيق والمرجعية.
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={() => handleSave('theme', themeSettings, 'إعدادات المظهر')} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إعدادات الهيدر */}
          <TabsContent value="header">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Menu className="w-5 h-5" />
                  إعدادات الهيدر
                </CardTitle>
                <CardDescription>
                  تخصيص شريط التنقل العلوي
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>عرض البحث</Label>
                      <p className="text-sm text-muted-foreground">إظهار حقل البحث في الهيدر</p>
                    </div>
                    <Switch
                      checked={headerSettings.showSearch}
                      onCheckedChange={(checked) => setHeaderSettings({ ...headerSettings, showSearch: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>زر تغيير المظهر</Label>
                      <p className="text-sm text-muted-foreground">إظهار زر الوضع الليلي</p>
                    </div>
                    <Switch
                      checked={headerSettings.showThemeToggle}
                      onCheckedChange={(checked) => setHeaderSettings({ ...headerSettings, showThemeToggle: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>أزرار تسجيل الدخول</Label>
                      <p className="text-sm text-muted-foreground">إظهار أزرار الحساب</p>
                    </div>
                    <Switch
                      checked={headerSettings.showAuthButtons}
                      onCheckedChange={(checked) => setHeaderSettings({ ...headerSettings, showAuthButtons: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>الهيدر الثابت</Label>
                      <p className="text-sm text-muted-foreground">يبقى الهيدر ظاهراً عند التمرير</p>
                    </div>
                    <Switch
                      checked={headerSettings.stickyHeader}
                      onCheckedChange={(checked) => setHeaderSettings({ ...headerSettings, stickyHeader: checked })}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('header', headerSettings, 'إعدادات الهيدر')} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إعدادات الفوتر */}
          <TabsContent value="footer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="w-5 h-5" />
                  إعدادات الفوتر
                </CardTitle>
                <CardDescription>
                  تخصيص التذييل
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>عرض الفوتر</Label>
                    <p className="text-sm text-muted-foreground">إظهار التذييل في الموقع</p>
                  </div>
                  <Switch
                    checked={footerSettings.showFooter}
                    onCheckedChange={(checked) => setFooterSettings({ ...footerSettings, showFooter: checked })}
                  />
                </div>

                <div>
                  <Label htmlFor="footerText">نص حقوق النشر</Label>
                  <Input
                    id="footerText"
                    value={footerSettings.footerText}
                    onChange={(e) => setFooterSettings({ ...footerSettings, footerText: e.target.value })}
                    placeholder="جميع الحقوق محفوظة © 2024"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>روابط التواصل</Label>
                    </div>
                    <Switch
                      checked={footerSettings.showSocialLinks}
                      onCheckedChange={(checked) => setFooterSettings({ ...footerSettings, showSocialLinks: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>روابط سريعة</Label>
                    </div>
                    <Switch
                      checked={footerSettings.showQuickLinks}
                      onCheckedChange={(checked) => setFooterSettings({ ...footerSettings, showQuickLinks: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>معلومات التواصل</Label>
                    </div>
                    <Switch
                      checked={footerSettings.showContactInfo}
                      onCheckedChange={(checked) => setFooterSettings({ ...footerSettings, showContactInfo: checked })}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('footer', footerSettings, 'إعدادات الفوتر')} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إعدادات الصفحة الرئيسية */}
          <TabsContent value="home">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  إعدادات الصفحة الرئيسية
                </CardTitle>
                <CardDescription>
                  تخصيص محتوى الصفحة الرئيسية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>عرض البانر الترحيبي</Label>
                    <p className="text-sm text-muted-foreground">عرض القسم الترحيبي في أعلى الصفحة</p>
                  </div>
                  <Switch
                    checked={homeSettings.showHeroBanner}
                    onCheckedChange={(checked) => setHomeSettings({ ...homeSettings, showHeroBanner: checked })}
                  />
                </div>

                {homeSettings.showHeroBanner && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="heroTitle">عنوان البانر</Label>
                      <Input
                        id="heroTitle"
                        value={homeSettings.heroTitle}
                        onChange={(e) => setHomeSettings({ ...homeSettings, heroTitle: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="heroSubtitle">العنوان الفرعي</Label>
                      <Input
                        id="heroSubtitle"
                        value={homeSettings.heroSubtitle}
                        onChange={(e) => setHomeSettings({ ...homeSettings, heroSubtitle: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>الكتب المميزة</Label>
                    </div>
                    <Switch
                      checked={homeSettings.showFeaturedBooks}
                      onCheckedChange={(checked) => setHomeSettings({ ...homeSettings, showFeaturedBooks: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>الأقسام</Label>
                    </div>
                    <Switch
                      checked={homeSettings.showCategories}
                      onCheckedChange={(checked) => setHomeSettings({ ...homeSettings, showCategories: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>أحدث الكتب</Label>
                    </div>
                    <Switch
                      checked={homeSettings.showLatestBooks}
                      onCheckedChange={(checked) => setHomeSettings({ ...homeSettings, showLatestBooks: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>الكتب الأكثر شعبية</Label>
                    </div>
                    <Switch
                      checked={homeSettings.showPopularBooks}
                      onCheckedChange={(checked) => setHomeSettings({ ...homeSettings, showPopularBooks: checked })}
                    />
                  </div>
                </div>

                <div>
                  <Label>عدد الكتب في الصف</Label>
                  <Select
                    value={homeSettings.booksPerRow.toString()}
                    onValueChange={(value) => setHomeSettings({ ...homeSettings, booksPerRow: parseInt(value) })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 كتب</SelectItem>
                      <SelectItem value="4">4 كتب</SelectItem>
                      <SelectItem value="5">5 كتب</SelectItem>
                      <SelectItem value="6">6 كتب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => handleSave('home', homeSettings, 'إعدادات الصفحة الرئيسية')} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إعدادات البحث */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  إعدادات البحث
                </CardTitle>
                <CardDescription>
                  تخصيص وظيفة البحث
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>تفعيل البحث</Label>
                    <p className="text-sm text-muted-foreground">السماح للمستخدمين بالبحث</p>
                  </div>
                  <Switch
                    checked={searchSettings.enableSearch}
                    onCheckedChange={(checked) => setSearchSettings({ ...searchSettings, enableSearch: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>اقتراحات البحث</Label>
                    <p className="text-sm text-muted-foreground">عرض اقتراحات أثناء الكتابة</p>
                  </div>
                  <Switch
                    checked={searchSettings.showSearchSuggestions}
                    onCheckedChange={(checked) => setSearchSettings({ ...searchSettings, showSearchSuggestions: checked })}
                  />
                </div>

                <div>
                  <Label htmlFor="searchPlaceholder">نص حقل البحث</Label>
                  <Input
                    id="searchPlaceholder"
                    value={searchSettings.searchPlaceholder}
                    onChange={(e) => setSearchSettings({ ...searchSettings, searchPlaceholder: e.target.value })}
                    placeholder="ابحث عن كتاب..."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="minSearchLength">الحد الأدنى للبحث</Label>
                    <Input
                      id="minSearchLength"
                      type="number"
                      min="1"
                      max="5"
                      value={searchSettings.minSearchLength}
                      onChange={(e) => setSearchSettings({ ...searchSettings, minSearchLength: parseInt(e.target.value) })}
                    />
                    <p className="text-sm text-muted-foreground mt-1">عدد الأحرف المطلوبة للبحث</p>
                  </div>

                  <div>
                    <Label htmlFor="maxResults">الحد الأقصى للنتائج</Label>
                    <Input
                      id="maxResults"
                      type="number"
                      min="5"
                      max="100"
                      value={searchSettings.maxResults}
                      onChange={(e) => setSearchSettings({ ...searchSettings, maxResults: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('search', searchSettings, 'إعدادات البحث')} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إعدادات الكتب */}
          <TabsContent value="books">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  إعدادات الكتب
                </CardTitle>
                <CardDescription>
                  تخصيص عرض الكتب وميزاتها
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>عرض التقييمات</Label>
                      <p className="text-sm text-muted-foreground">إظهار تقييم الكتاب</p>
                    </div>
                    <Switch
                      checked={bookSettings.showBookRating}
                      onCheckedChange={(checked) => setBookSettings({ ...bookSettings, showBookRating: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>عرض المراجعات</Label>
                      <p className="text-sm text-muted-foreground">إظهار مراجعات القراء</p>
                    </div>
                    <Switch
                      checked={bookSettings.showBookReviews}
                      onCheckedChange={(checked) => setBookSettings({ ...bookSettings, showBookReviews: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>الكتب ذات الصلة</Label>
                      <p className="text-sm text-muted-foreground">عرض كتب مشابهة</p>
                    </div>
                    <Switch
                      checked={bookSettings.showRelatedBooks}
                      onCheckedChange={(checked) => setBookSettings({ ...bookSettings, showRelatedBooks: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>زر التحميل</Label>
                      <p className="text-sm text-muted-foreground">السماح بتحميل الكتب</p>
                    </div>
                    <Switch
                      checked={bookSettings.showDownloadButton}
                      onCheckedChange={(checked) => setBookSettings({ ...bookSettings, showDownloadButton: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>القراءة أونلاين</Label>
                      <p className="text-sm text-muted-foreground">السماح بالقراءة المباشرة</p>
                    </div>
                    <Switch
                      checked={bookSettings.showReadOnlineButton}
                      onCheckedChange={(checked) => setBookSettings({ ...bookSettings, showReadOnlineButton: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>الإشارات المرجعية</Label>
                      <p className="text-sm text-muted-foreground">حفظ موضع القراءة</p>
                    </div>
                    <Switch
                      checked={bookSettings.allowBookmarks}
                      onCheckedChange={(checked) => setBookSettings({ ...bookSettings, allowBookmarks: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>التعليقات التوضيحية</Label>
                      <p className="text-sm text-muted-foreground">إضافة ملاحظات على الكتب</p>
                    </div>
                    <Switch
                      checked={bookSettings.allowAnnotations}
                      onCheckedChange={(checked) => setBookSettings({ ...bookSettings, allowAnnotations: checked })}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('books', bookSettings, 'إعدادات الكتب')} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* روابط التواصل */}
          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  روابط التواصل الاجتماعي
                </CardTitle>
                <CardDescription>
                  أضف روابط صفحاتك على مواقع التواصل
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <Input
                      value={socialLinks.facebook}
                      onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Twitter className="w-5 h-5 text-sky-500" />
                    <Input
                      value={socialLinks.twitter}
                      onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                      placeholder="https://twitter.com/yourpage"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Instagram className="w-5 h-5 text-pink-600" />
                    <Input
                      value={socialLinks.instagram}
                      onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                      placeholder="https://instagram.com/yourpage"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Youtube className="w-5 h-5 text-red-600" />
                    <Input
                      value={socialLinks.youtube}
                      onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                      placeholder="https://youtube.com/yourchannel"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                    <Input
                      value={socialLinks.telegram}
                      onChange={(e) => setSocialLinks({ ...socialLinks, telegram: e.target.value })}
                      placeholder="https://t.me/yourchannel"
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('social', socialLinks, 'روابط التواصل')} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إعدادات SEO */}
          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  إعدادات SEO
                </CardTitle>
                <CardDescription>
                  تحسين ظهور الموقع في محركات البحث
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-500">نصيحة SEO</p>
                      <p className="text-sm text-muted-foreground">
                        احرص على أن يكون العنوان والوصف واضحين ويحتويان على الكلمات المفتاحية المهمة
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="metaTitle">عنوان الموقع (Meta Title)</Label>
                  <Input
                    id="metaTitle"
                    value={seoSettings.metaTitle}
                    onChange={(e) => setSeoSettings({ ...seoSettings, metaTitle: e.target.value })}
                    placeholder="المكتبة السورية - مكتبة عربية رقمية"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {seoSettings.metaTitle.length}/60 حرف
                  </p>
                </div>

                <div>
                  <Label htmlFor="metaDescription">وصف الموقع (Meta Description)</Label>
                  <Textarea
                    id="metaDescription"
                    value={seoSettings.metaDescription}
                    onChange={(e) => setSeoSettings({ ...seoSettings, metaDescription: e.target.value })}
                    placeholder="مكتبة عربية رقمية شاملة..."
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {seoSettings.metaDescription.length}/160 حرف
                  </p>
                </div>

                <div>
                  <Label htmlFor="ogImage">صورة المشاركة (OG Image)</Label>
                  <Input
                    id="ogImage"
                    value={seoSettings.ogImage}
                    onChange={(e) => setSeoSettings({ ...seoSettings, ogImage: e.target.value })}
                    placeholder="https://example.com/og-image.jpg"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    الصورة التي تظهر عند مشاركة الموقع على مواقع التواصل
                  </p>
                </div>

                <div>
                  <Label htmlFor="googleAnalyticsId">معرف Google Analytics</Label>
                  <Input
                    id="googleAnalyticsId"
                    value={seoSettings.googleAnalyticsId || ''}
                    onChange={(e) => setSeoSettings({ ...seoSettings, googleAnalyticsId: e.target.value })}
                    placeholder="G-XXXXXXXXXX"
                    dir="ltr"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    معرف Google Analytics 4 (يبدأ بـ G-)
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>خريطة الموقع (Sitemap)</Label>
                      <p className="text-sm text-muted-foreground">تفعيل ملف sitemap.xml</p>
                    </div>
                    <Switch
                      checked={seoSettings.enableSitemap}
                      onCheckedChange={(checked) => setSeoSettings({ ...seoSettings, enableSitemap: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>ملف Robots.txt</Label>
                      <p className="text-sm text-muted-foreground">تفعيل ملف robots.txt</p>
                    </div>
                    <Switch
                      checked={seoSettings.enableRobots}
                      onCheckedChange={(checked) => setSeoSettings({ ...seoSettings, enableRobots: checked })}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('seo', seoSettings, 'إعدادات SEO')} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAppearance;
