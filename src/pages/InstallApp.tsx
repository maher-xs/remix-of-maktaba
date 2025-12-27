import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Share, 
  Plus, 
  MoreVertical,
  Check,
  Wifi,
  WifiOff,
  BookOpen,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallApp = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(!isIOSDevice && !isAndroidDevice);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('تم تثبيت التطبيق بنجاح!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.info('استخدم قائمة المتصفح لتثبيت التطبيق');
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('جاري تثبيت التطبيق...');
    }
    
    setDeferredPrompt(null);
  };

  const defaultTab = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

  const features = [
    { icon: WifiOff, title: 'القراءة بدون إنترنت', description: 'احفظ كتبك للقراءة في أي وقت' },
    { icon: Wifi, title: 'مزامنة تلقائية', description: 'تقدم القراءة يتزامن عبر أجهزتك' },
    { icon: Bell, title: 'إشعارات', description: 'تنبيهات للكتب الجديدة' },
    { icon: BookOpen, title: 'تجربة كاملة', description: 'واجهة ملء الشاشة بدون عناصر المتصفح' },
  ];

  if (isInstalled) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">التطبيق مثبت بالفعل!</h1>
          <p className="text-muted-foreground mb-8">
            أنت تستخدم تطبيق مكتبة المثبت على جهازك
          </p>
          <Button onClick={() => navigate('/')}>
            العودة للرئيسية
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            ثبّت تطبيق مكتبة
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto px-2">
            احصل على تجربة أفضل مع التطبيق المثبت. القراءة بدون إنترنت، إشعارات، وأكثر!
          </p>
        </div>

        {/* Install Button for supported browsers */}
        {deferredPrompt && (
          <div className="flex justify-center mb-8">
            <Button size="lg" onClick={handleInstallClick} className="gap-2">
              <Download className="w-5 h-5" />
              تثبيت التطبيق الآن
            </Button>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardContent className="p-4 sm:pt-6">
                <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-primary" />
                <h3 className="font-semibold text-sm sm:text-base mb-1">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Installation Instructions */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>خطوات التثبيت</CardTitle>
            <CardDescription>اختر نوع جهازك واتبع الخطوات</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="ios" className="gap-2">
                  <Smartphone className="w-4 h-4" />
                  iPhone
                </TabsTrigger>
                <TabsTrigger value="android" className="gap-2">
                  <Smartphone className="w-4 h-4" />
                  Android
                </TabsTrigger>
                <TabsTrigger value="desktop" className="gap-2">
                  <Monitor className="w-4 h-4" />
                  الكمبيوتر
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ios" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">افتح Safari</h4>
                      <p className="text-muted-foreground text-sm">
                        تأكد من فتح هذا الموقع في متصفح Safari (التثبيت غير متاح في Chrome على iOS)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 flex items-center gap-2">
                        اضغط على زر المشاركة
                        <Share className="w-5 h-5 text-primary" />
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        ستجده في أسفل الشاشة (أو أعلاها في iPad)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 flex items-center gap-2">
                        اختر "إضافة إلى الشاشة الرئيسية"
                        <Plus className="w-5 h-5 text-primary" />
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        قد تحتاج للتمرير لأسفل في القائمة للعثور عليها
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">اضغط "إضافة"</h4>
                      <p className="text-muted-foreground text-sm">
                        سيظهر التطبيق على شاشتك الرئيسية
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="android" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">افتح Chrome أو Samsung Internet</h4>
                      <p className="text-muted-foreground text-sm">
                        تأكد من فتح هذا الموقع في أحد هذه المتصفحات
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 flex items-center gap-2">
                        اضغط على قائمة المتصفح
                        <MoreVertical className="w-5 h-5 text-primary" />
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        النقاط الثلاث في الزاوية العليا
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 flex items-center gap-2">
                        اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"
                        <Download className="w-5 h-5 text-primary" />
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        قد تظهر رسالة تأكيد
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">اضغط "تثبيت"</h4>
                      <p className="text-muted-foreground text-sm">
                        سيظهر التطبيق على شاشتك الرئيسية
                      </p>
                    </div>
                  </div>
                </div>

                {deferredPrompt && (
                  <Button onClick={handleInstallClick} className="w-full gap-2 mt-4">
                    <Download className="w-5 h-5" />
                    تثبيت الآن مباشرة
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="desktop" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">استخدم Chrome أو Edge أو Brave</h4>
                      <p className="text-muted-foreground text-sm">
                        هذه المتصفحات تدعم تثبيت التطبيقات
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 flex items-center gap-2">
                        ابحث عن أيقونة التثبيت في شريط العنوان
                        <Download className="w-5 h-5 text-primary" />
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        ستظهر أيقونة كمبيوتر مع سهم أو علامة +
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">اضغط عليها ثم "تثبيت"</h4>
                      <p className="text-muted-foreground text-sm">
                        سيفتح التطبيق في نافذة منفصلة
                      </p>
                    </div>
                  </div>
                </div>

                {deferredPrompt && (
                  <Button onClick={handleInstallClick} className="w-full gap-2 mt-4">
                    <Download className="w-5 h-5" />
                    تثبيت الآن
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default InstallApp;
