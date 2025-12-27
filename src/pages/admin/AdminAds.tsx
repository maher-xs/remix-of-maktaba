import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Megaphone, Save, RefreshCw, Layout, Settings, MapPin, Eye, EyeOff, Home, Book, Grid, Search, BookOpen, MessageSquare, Code, Copy, Check, ExternalLink, FileCode, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

interface AdSetting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  is_enabled: boolean;
  updated_at: string;
}

type SettingsCategory = 'credentials' | 'placements' | 'pages' | 'advanced';

const AdminAds = () => {
  const queryClient = useQueryClient();
  const [editedSettings, setEditedSettings] = useState<Record<string, { value: string; is_enabled: boolean }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScript(id);
      toast.success('تم نسخ الكود');
      setTimeout(() => setCopiedScript(null), 2000);
    } catch (err) {
      toast.error('فشل النسخ');
    }
  };

  // Fetch ad settings
  const { data: adSettings, isLoading, refetch } = useQuery({
    queryKey: ['admin-ad-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_settings')
        .select('*')
        .order('key');
      
      if (error) throw error;
      return data as AdSetting[];
    },
  });

  // Update ad setting mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, value, is_enabled }: { id: string; value: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('ad_settings')
        .update({ value, is_enabled, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ad-settings'] });
      queryClient.invalidateQueries({ queryKey: ['adSettings'] });
    },
    onError: (error) => {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
      console.error(error);
    },
  });

  const handleToggle = async (setting: AdSetting) => {
    await updateMutation.mutateAsync({
      id: setting.id,
      value: setting.value || '',
      is_enabled: !setting.is_enabled,
    });
    toast.success('تم تحديث الإعداد');
  };

  const handleValueChange = (setting: AdSetting, value: string) => {
    setEditedSettings({
      ...editedSettings,
      [setting.id]: { value, is_enabled: setting.is_enabled },
    });
  };

  const handleSave = async (setting: AdSetting) => {
    const edited = editedSettings[setting.id];
    if (edited) {
      await updateMutation.mutateAsync({
        id: setting.id,
        value: edited.value,
        is_enabled: setting.is_enabled,
      });
      const newEdited = { ...editedSettings };
      delete newEdited[setting.id];
      setEditedSettings(newEdited);
      toast.success('تم حفظ الإعدادات');
    }
  };

  const saveAllChanges = async () => {
    setIsSaving(true);
    try {
      const promises = Object.entries(editedSettings).map(([id, { value, is_enabled }]) =>
        updateMutation.mutateAsync({ id, value, is_enabled })
      );
      await Promise.all(promises);
      setEditedSettings({});
      toast.success('تم حفظ جميع التغييرات');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = (setting: AdSetting) => {
    const edited = editedSettings[setting.id];
    if (!edited) return false;
    return edited.value !== (setting.value || '');
  };

  const getDisplayValue = (setting: AdSetting) => {
    return editedSettings[setting.id]?.value ?? setting.value ?? '';
  };

  const getSetting = (key: string) => adSettings?.find(s => s.key === key);

  const getSettingsByCategory = (category: SettingsCategory): string[] => {
    switch (category) {
      case 'credentials':
        return ['publisher_id', 'banner_slot', 'display_slot', 'infeed_slot', 'inarticle_slot', 'multiplex_slot'];
      case 'placements':
        return ['show_banner_ads', 'show_inline_ads'];
      case 'pages':
        return ['show_on_home', 'show_on_book_details', 'show_on_categories', 'show_on_search', 'show_on_reading', 'show_on_discussions'];
      case 'advanced':
        return ['global_ads_enabled', 'ads_frequency', 'max_ads_per_page'];
      default:
        return [];
    }
  };

  const getKeyLabel = (key: string) => {
    const labels: Record<string, { label: string; description: string; icon: any }> = {
      'publisher_id': { label: 'معرف الناشر (Publisher ID)', description: 'معرف Google AdSense الخاص بك - مثال: ca-pub-1234567890', icon: Settings },
      'banner_slot': { label: 'إعلان البانر الأفقي', description: 'للإعلانات الأفقية في أعلى/أسفل الصفحة', icon: Layout },
      'display_slot': { label: 'إعلان العرض (Display)', description: 'للإعلانات في الشريط الجانبي والأماكن العامة', icon: Layout },
      'infeed_slot': { label: 'إعلان In-Feed', description: 'للإعلانات بين عناصر القوائم', icon: Layout },
      'inarticle_slot': { label: 'إعلان In-Article', description: 'للإعلانات داخل المحتوى والمقالات', icon: Layout },
      'multiplex_slot': { label: 'إعلان Multiplex', description: 'لعرض شبكة من الإعلانات المتعددة', icon: Grid },
      'global_ads_enabled': { label: 'تفعيل الإعلانات', description: 'تفعيل/تعطيل جميع الإعلانات', icon: Megaphone },
      'show_on_home': { label: 'الصفحة الرئيسية', description: 'عرض الإعلانات في الصفحة الرئيسية', icon: Home },
      'show_on_book_details': { label: 'صفحة الكتاب', description: 'عرض الإعلانات في صفحة تفاصيل الكتاب', icon: Book },
      'show_on_categories': { label: 'صفحة الأقسام', description: 'عرض الإعلانات في صفحة الأقسام', icon: Grid },
      'show_on_search': { label: 'صفحة البحث', description: 'عرض الإعلانات في نتائج البحث', icon: Search },
      'show_on_reading': { label: 'صفحة القراءة', description: 'عرض الإعلانات أثناء قراءة الكتاب', icon: BookOpen },
      'show_on_discussions': { label: 'صفحة المناقشات', description: 'عرض الإعلانات في صفحة المناقشات', icon: MessageSquare },
      'show_banner_ads': { label: 'إعلانات البانر', description: 'عرض إعلانات البانر الأفقية', icon: Layout },
      'show_inline_ads': { label: 'إعلانات داخل المحتوى', description: 'عرض إعلانات بين عناصر المحتوى', icon: Layout },
      'ads_frequency': { label: 'تكرار الإعلانات', description: 'عدد العناصر بين كل إعلان', icon: Settings },
      'max_ads_per_page': { label: 'الحد الأقصى للإعلانات', description: 'أقصى عدد إعلانات في الصفحة الواحدة', icon: Settings },
    };
    return labels[key] || { label: key, description: '', icon: Settings };
  };

  const renderCredentialSetting = (setting: AdSetting) => {
    const info = getKeyLabel(setting.key);
    const Icon = info.icon;
    
    return (
      <Card key={setting.id} className={hasChanges(setting) ? 'ring-2 ring-primary' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{info.label}</CardTitle>
                <CardDescription className="text-sm">{info.description}</CardDescription>
              </div>
            </div>
            <Badge variant={setting.is_enabled ? "default" : "secondary"}>
              {setting.is_enabled ? 'مفعّل' : 'معطّل'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={getDisplayValue(setting)}
              onChange={(e) => handleValueChange(setting, e.target.value)}
              placeholder="أدخل القيمة..."
              className="flex-1 font-mono text-sm"
              dir="ltr"
            />
            <Button
              onClick={() => handleSave(setting)}
              disabled={!hasChanges(setting) || updateMutation.isPending}
              size="sm"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderToggleSetting = (setting: AdSetting) => {
    const info = getKeyLabel(setting.key);
    const Icon = info.icon;
    
    return (
      <div 
        key={setting.id} 
        className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${setting.is_enabled ? 'bg-primary/10' : 'bg-muted'}`}>
            <Icon className={`w-5 h-5 ${setting.is_enabled ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="font-medium">{info.label}</p>
            <p className="text-sm text-muted-foreground">{info.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {setting.is_enabled ? (
            <Eye className="w-4 h-4 text-primary" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
          <Switch
            checked={setting.is_enabled}
            onCheckedChange={() => handleToggle(setting)}
            disabled={updateMutation.isPending}
          />
        </div>
      </div>
    );
  };

  const renderSliderSetting = (setting: AdSetting) => {
    const info = getKeyLabel(setting.key);
    const value = parseInt(getDisplayValue(setting) || '0', 10);
    const max = setting.key === 'ads_frequency' ? 10 : 20;
    
    return (
      <Card key={setting.id}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{info.label}</CardTitle>
          <CardDescription>{info.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-primary">{value}</span>
              <Badge variant="outline">{setting.key === 'ads_frequency' ? 'عناصر' : 'إعلانات'}</Badge>
            </div>
            <Slider
              value={[value]}
              onValueChange={([newValue]) => {
                handleValueChange(setting, newValue.toString());
              }}
              max={max}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>{max}</span>
            </div>
            {hasChanges(setting) && (
              <Button 
                onClick={() => handleSave(setting)} 
                size="sm" 
                className="w-full"
                disabled={updateMutation.isPending}
              >
                <Save className="w-4 h-4 ml-2" />
                حفظ التغييرات
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const globalEnabled = getSetting('global_ads_enabled');
  const enabledCount = adSettings?.filter(s => 
    s.key.startsWith('show_') && s.is_enabled
  ).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-primary" />
              إدارة الإعلانات
            </h1>
            <p className="text-muted-foreground mt-2">
              تحكم كامل في إعدادات الإعلانات ومواقع ظهورها
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            {Object.keys(editedSettings).length > 0 && (
              <Button onClick={saveAllChanges} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 ml-2" />
                )}
                حفظ الكل ({Object.keys(editedSettings).length})
              </Button>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className={globalEnabled?.is_enabled ? 'border-primary/50 bg-primary/5' : 'border-destructive/50 bg-destructive/5'}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">حالة الإعلانات</p>
                  <p className="text-2xl font-bold">
                    {globalEnabled?.is_enabled ? 'مفعّلة' : 'معطّلة'}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${globalEnabled?.is_enabled ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                  <Megaphone className={`w-6 h-6 ${globalEnabled?.is_enabled ? 'text-primary' : 'text-destructive'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مواقع مفعّلة</p>
                  <p className="text-2xl font-bold">{enabledCount}</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">تكرار الإعلانات</p>
                  <p className="text-2xl font-bold">كل {getSetting('ads_frequency')?.value || '3'} عناصر</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Layout className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الحد الأقصى</p>
                  <p className="text-2xl font-bold">{getSetting('max_ads_per_page')?.value || '5'} إعلانات</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="setup" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="setup" className="gap-2">
                <Code className="w-4 h-4" />
                <span className="hidden sm:inline">دليل الإعداد</span>
              </TabsTrigger>
              <TabsTrigger value="credentials" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">بيانات AdSense</span>
              </TabsTrigger>
              <TabsTrigger value="pages" className="gap-2">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">الصفحات</span>
              </TabsTrigger>
              <TabsTrigger value="placements" className="gap-2">
                <Layout className="w-4 h-4" />
                <span className="hidden sm:inline">أنواع الإعلانات</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">متقدم</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">معاينة</span>
              </TabsTrigger>
            </TabsList>

            {/* Setup Guide Tab */}
            <TabsContent value="setup" className="space-y-6">
              {/* Important Notice */}
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 h-fit">
                      <AlertCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">معلومة مهمة</h3>
                      <p className="text-muted-foreground">
                        سكريبت Google AdSense الرئيسي <span className="font-bold text-foreground">مُضاف مسبقاً</span> في الموقع. 
                        ما تحتاجه فقط هو:
                      </p>
                      <ol className="list-decimal list-inside mt-3 space-y-2 text-muted-foreground">
                        <li>الحصول على موافقة Google AdSense على موقعك</li>
                        <li>إنشاء وحدات إعلانية (Ad Units) في لوحة AdSense</li>
                        <li>نسخ معرف الإعلان (Slot ID) وإضافته هنا</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 1: Verify AdSense Script */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                    <div>
                      <CardTitle className="text-lg">التحقق من سكريبت AdSense</CardTitle>
                      <CardDescription>هذا السكريبت مُضاف مسبقاً في الموقع</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <pre className="bg-muted/50 p-4 rounded-lg text-sm overflow-x-auto font-mono" dir="ltr">
{`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7814175243563481"
     crossorigin="anonymous"></script>`}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 left-2"
                      onClick={() => copyToClipboard(`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7814175243563481"
     crossorigin="anonymous"></script>`, 'main-script')}
                    >
                      {copiedScript === 'main-script' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <Check className="w-5 h-5 text-green-500" />
                    <p className="text-sm text-green-700 dark:text-green-400">هذا السكريبت مُفعّل في الموقع</p>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Create Ad Units */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                    <div>
                      <CardTitle className="text-lg">إنشاء وحدات إعلانية في Google AdSense</CardTitle>
                      <CardDescription>اتبع هذه الخطوات في لوحة تحكم AdSense</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 rounded-xl border bg-card space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-xs font-bold">أ</div>
                        <h4 className="font-medium">إعلانات العرض (Display)</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">مناسبة للبانر والإعلانات الجانبية</p>
                      <Badge variant="outline">الأكثر استخداماً</Badge>
                    </div>
                    <div className="p-4 rounded-xl border bg-card space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-xs font-bold">ب</div>
                        <h4 className="font-medium">إعلانات In-feed</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">تظهر بين عناصر القوائم</p>
                      <Badge variant="outline">مناسبة للقوائم</Badge>
                    </div>
                    <div className="p-4 rounded-xl border bg-card space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 text-xs font-bold">ج</div>
                        <h4 className="font-medium">إعلانات In-article</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">تظهر داخل محتوى المقالات</p>
                      <Badge variant="outline">مناسبة للمحتوى</Badge>
                    </div>
                    <div className="p-4 rounded-xl border bg-card space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 text-xs font-bold">د</div>
                        <h4 className="font-medium">إعلانات Multiplex</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">شبكة من الإعلانات المتعددة</p>
                      <Badge variant="outline">توصيات محتوى</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="https://www.google.com/adsense/new/u/0/pub-7814175243563481/onboarding" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 ml-2" />
                      فتح Google AdSense
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Step 3: Get Ad Code */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                    <div>
                      <CardTitle className="text-lg">كيفية الحصول على كود الإعلان</CardTitle>
                      <CardDescription>بعد إنشاء وحدة إعلانية، ستحصل على كود مثل هذا</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <pre className="bg-muted/50 p-4 rounded-lg text-sm overflow-x-auto font-mono" dir="ltr">
{`<!-- كود الإعلان من Google AdSense -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-7814175243563481"
     data-ad-slot="1234567890"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>`}
                    </pre>
                  </div>
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-start gap-3">
                      <FileCode className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-700 dark:text-yellow-400">ما تحتاج نسخه فقط:</p>
                        <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                          قيمة <code className="bg-yellow-500/20 px-1 rounded">data-ad-slot</code> فقط (مثال: <code className="bg-yellow-500/20 px-1 rounded">1234567890</code>)
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 4: Add Slot ID */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">4</div>
                    <div>
                      <CardTitle className="text-lg">إضافة معرف الإعلان هنا</CardTitle>
                      <CardDescription>انسخ معرف الإعلان (Slot ID) وألصقه في تبويب "بيانات AdSense"</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 rounded-xl border bg-card">
                      <Label className="text-muted-foreground text-sm">معرف الناشر (Publisher ID)</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="flex-1 bg-muted p-2 rounded text-sm font-mono" dir="ltr">
                          {getSetting('publisher_id')?.value || 'ca-pub-7814175243563481'}
                        </code>
                        {getSetting('publisher_id')?.value ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <Label className="text-muted-foreground text-sm">معرف إعلان البانر (Banner Slot)</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="flex-1 bg-muted p-2 rounded text-sm font-mono" dir="ltr">
                          {getSetting('banner_slot')?.value || 'غير محدد بعد'}
                        </code>
                        {getSetting('banner_slot')?.value ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      const tabsList = document.querySelector('[role="tablist"]');
                      const credentialsTab = tabsList?.querySelector('[value="credentials"]') as HTMLButtonElement;
                      credentialsTab?.click();
                    }}
                  >
                    <Settings className="w-4 h-4 ml-2" />
                    الانتقال لإعداد البيانات
                  </Button>
                </CardContent>
              </Card>

              {/* Ad Sizes Reference */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layout className="w-5 h-5" />
                    أحجام الإعلانات الموصى بها
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-3 rounded-lg border text-center">
                      <p className="font-bold text-lg">728 × 90</p>
                      <p className="text-sm text-muted-foreground">Leaderboard</p>
                      <Badge variant="secondary" className="mt-2">بانر أفقي</Badge>
                    </div>
                    <div className="p-3 rounded-lg border text-center">
                      <p className="font-bold text-lg">300 × 250</p>
                      <p className="text-sm text-muted-foreground">Medium Rectangle</p>
                      <Badge variant="secondary" className="mt-2">جانبي</Badge>
                    </div>
                    <div className="p-3 rounded-lg border text-center">
                      <p className="font-bold text-lg">336 × 280</p>
                      <p className="text-sm text-muted-foreground">Large Rectangle</p>
                      <Badge variant="secondary" className="mt-2">داخل المحتوى</Badge>
                    </div>
                    <div className="p-3 rounded-lg border text-center">
                      <p className="font-bold text-lg">Responsive</p>
                      <p className="text-sm text-muted-foreground">Auto-sizing</p>
                      <Badge variant="secondary" className="mt-2">متجاوب</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Credentials Tab */}
            <TabsContent value="credentials" className="space-y-4">
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg">معلومات Google AdSense</CardTitle>
                  <CardDescription>
                    أدخل بيانات حسابك في Google AdSense لعرض الإعلانات
                  </CardDescription>
                </CardHeader>
              </Card>
              {getSettingsByCategory('credentials').map(key => {
                const setting = getSetting(key);
                return setting ? renderCredentialSetting(setting) : null;
              })}
            </TabsContent>

            {/* Pages Tab */}
            <TabsContent value="pages" className="space-y-4">
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg">أين تظهر الإعلانات؟</CardTitle>
                  <CardDescription>
                    اختر الصفحات التي تريد عرض الإعلانات فيها
                  </CardDescription>
                </CardHeader>
              </Card>
              <div className="space-y-3">
                {getSettingsByCategory('pages').map(key => {
                  const setting = getSetting(key);
                  return setting ? renderToggleSetting(setting) : null;
                })}
              </div>
            </TabsContent>

            {/* Placements Tab */}
            <TabsContent value="placements" className="space-y-4">
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg">أنواع الإعلانات</CardTitle>
                  <CardDescription>
                    تحكم في أنواع الإعلانات المعروضة
                  </CardDescription>
                </CardHeader>
              </Card>
              <div className="space-y-3">
                {getSettingsByCategory('placements').map(key => {
                  const setting = getSetting(key);
                  return setting ? renderToggleSetting(setting) : null;
                })}
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg">إعدادات متقدمة</CardTitle>
                  <CardDescription>
                    تحكم في سلوك الإعلانات وتكرارها
                  </CardDescription>
                </CardHeader>
              </Card>
              
              {/* Global Toggle */}
              {globalEnabled && (
                <Card className={globalEnabled.is_enabled ? 'border-primary' : 'border-destructive'}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${globalEnabled.is_enabled ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                          <Megaphone className={`w-6 h-6 ${globalEnabled.is_enabled ? 'text-primary' : 'text-destructive'}`} />
                        </div>
                        <div>
                          <p className="font-bold text-lg">تفعيل جميع الإعلانات</p>
                          <p className="text-sm text-muted-foreground">
                            {globalEnabled.is_enabled 
                              ? 'الإعلانات مفعّلة في جميع أنحاء الموقع' 
                              : 'جميع الإعلانات معطّلة حالياً'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={globalEnabled.is_enabled}
                        onCheckedChange={() => handleToggle(globalEnabled)}
                        disabled={updateMutation.isPending}
                        className="scale-125"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {['ads_frequency', 'max_ads_per_page'].map(key => {
                  const setting = getSetting(key);
                  return setting ? renderSliderSetting(setting) : null;
                })}
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-6">
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg">معاينة الإعلانات</CardTitle>
                  <CardDescription>
                    شاهد كيف ستظهر الإعلانات في موقعك بناءً على الإعدادات الحالية
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Preview Status */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className={globalEnabled?.is_enabled ? 'border-primary/50' : 'border-destructive/50'}>
                  <CardContent className="pt-4 text-center">
                    <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                      globalEnabled?.is_enabled ? 'bg-primary/10' : 'bg-destructive/10'
                    }`}>
                      {globalEnabled?.is_enabled ? (
                        <Eye className="w-6 h-6 text-primary" />
                      ) : (
                        <EyeOff className="w-6 h-6 text-destructive" />
                      )}
                    </div>
                    <p className="font-medium">{globalEnabled?.is_enabled ? 'الإعلانات مفعّلة' : 'الإعلانات معطّلة'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-primary/10">
                      <Settings className="w-6 h-6 text-primary" />
                    </div>
                    <p className="font-medium">Publisher ID</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono" dir="ltr">
                      {getSetting('publisher_id')?.value || 'غير محدد'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-primary/10">
                      <Layout className="w-6 h-6 text-primary" />
                    </div>
                    <p className="font-medium">Banner Slot</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono" dir="ltr">
                      {getSetting('banner_slot')?.value || 'غير محدد'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Horizontal Banner Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layout className="w-5 h-5" />
                    إعلان البانر الأفقي
                  </CardTitle>
                  <CardDescription>يظهر في أسفل الأقسام الرئيسية</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative overflow-hidden bg-muted/30 rounded-2xl border border-border/50 p-6">
                    <div className="flex flex-col lg:flex-row items-center gap-6">
                      <div className="flex-1 w-full">
                        <div className="min-h-[90px] flex items-center justify-center bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl border-2 border-dashed border-primary/30">
                          <div className="text-center">
                            <Megaphone className="w-8 h-8 text-primary/50 mx-auto mb-2" />
                            <p className="text-sm font-medium text-primary/70">إعلان أفقي - 728x90</p>
                            <p className="text-xs text-muted-foreground">Google AdSense Banner</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-center lg:text-right lg:max-w-xs">
                        <div className="hidden lg:flex relative bg-gradient-to-br from-primary to-primary/80 w-10 h-10 lg:w-12 lg:h-12 rounded-xl items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25">
                          <Megaphone className="w-5 h-5 lg:w-6 lg:h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            نعرض إعلانات بسيطة لتغطية تكاليف الخوادم
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar Ad Preview */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layout className="w-5 h-5" />
                      إعلان الشريط الجانبي
                    </CardTitle>
                    <CardDescription>يظهر في جانب صفحات الكتب</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-card rounded-xl border p-5">
                      <div className="min-h-[250px] flex items-center justify-center bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5 rounded-xl border-2 border-dashed border-primary/30">
                        <div className="text-center">
                          <Megaphone className="w-10 h-10 text-primary/50 mx-auto mb-3" />
                          <p className="text-sm font-medium text-primary/70">إعلان جانبي</p>
                          <p className="text-xs text-muted-foreground">300x250</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-3">
                        <Megaphone className="w-3 h-3" />
                        لدعم استمرار المكتبة
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Inline Ad Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layout className="w-5 h-5" />
                      إعلان داخل المحتوى
                    </CardTitle>
                    <CardDescription>يظهر بين عناصر القوائم</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Fake content items */}
                      <div className="h-16 bg-muted rounded-lg flex items-center px-4 gap-3">
                        <div className="w-10 h-10 bg-muted-foreground/20 rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
                          <div className="h-2 bg-muted-foreground/10 rounded w-1/2" />
                        </div>
                      </div>
                      
                      {/* Inline Ad */}
                      <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                        <div className="min-h-[80px] flex items-center justify-center bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 rounded-lg border-2 border-dashed border-secondary/30">
                          <div className="text-center">
                            <Megaphone className="w-6 h-6 text-secondary/50 mx-auto mb-1" />
                            <p className="text-xs font-medium text-secondary/70">إعلان داخلي</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* More fake content */}
                      <div className="h-16 bg-muted rounded-lg flex items-center px-4 gap-3">
                        <div className="w-10 h-10 bg-muted-foreground/20 rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-muted-foreground/20 rounded w-2/3" />
                          <div className="h-2 bg-muted-foreground/10 rounded w-1/3" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Pages Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">الصفحات المفعّلة للإعلانات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'show_on_home', label: 'الرئيسية', icon: Home },
                      { key: 'show_on_book_details', label: 'تفاصيل الكتاب', icon: Book },
                      { key: 'show_on_categories', label: 'الأقسام', icon: Grid },
                      { key: 'show_on_search', label: 'البحث', icon: Search },
                      { key: 'show_on_reading', label: 'القراءة', icon: BookOpen },
                    ].map(({ key, label, icon: Icon }) => {
                      const isEnabled = getSetting(key)?.is_enabled && getSetting(key)?.value === 'true';
                      return (
                        <div 
                          key={key}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                            isEnabled 
                              ? 'bg-primary/10 border-primary/30 text-primary' 
                              : 'bg-muted border-border text-muted-foreground'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{label}</span>
                          {isEnabled ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Help Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              دليل إعداد الإعلانات
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-background/50">
                <p className="font-medium text-foreground mb-1">1. معرف الناشر</p>
                <p>يبدأ بـ ca-pub- ويمكنك الحصول عليه من Google AdSense</p>
              </div>
              <div className="p-3 rounded-lg bg-background/50">
                <p className="font-medium text-foreground mb-1">2. معرفات الإعلانات</p>
                <p>أنشئ وحدات إعلانية في AdSense وانسخ معرفاتها</p>
              </div>
              <div className="p-3 rounded-lg bg-background/50">
                <p className="font-medium text-foreground mb-1">3. اختر الصفحات</p>
                <p>حدد أين تريد عرض الإعلانات في موقعك</p>
              </div>
              <div className="p-3 rounded-lg bg-background/50">
                <p className="font-medium text-foreground mb-1">4. ضبط التكرار</p>
                <p>تحكم في عدد الإعلانات والمسافة بينها</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAds;
