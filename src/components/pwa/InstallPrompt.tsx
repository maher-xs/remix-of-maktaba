import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'sonner';

const InstallPrompt = () => {
  const { canInstall, promptInstall, isIOS, isInstalled } = usePWA();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner before
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = wasDismissed ? parseInt(wasDismissed) : 0;
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    // Show banner after 30 seconds if not dismissed recently
    const timer = setTimeout(() => {
      if (!isInstalled && (canInstall || isIOS) && dismissedTime < oneDayAgo) {
        setShowBanner(true);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [canInstall, isIOS, isInstalled]);

  const handleInstall = async () => {
    if (isIOS) {
      // Show iOS instructions
      toast.info(
        'لتثبيت التطبيق: اضغط على زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"',
        { duration: 6000 }
      );
      setShowBanner(false);
      return;
    }

    const installed = await promptInstall();
    if (installed) {
      toast.success('تم تثبيت التطبيق بنجاح! 🎉');
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showBanner || dismissed || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 animate-fade-in">
      <div className="max-w-md mx-auto bg-card border border-border rounded-2xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">ثبّت التطبيق</h3>
            <p className="text-sm text-muted-foreground mb-3">
              احصل على تجربة أفضل مع التطبيق المثبت
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="gap-1.5 rounded-lg"
              >
                <Download className="w-4 h-4" />
                تثبيت
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="rounded-lg"
              >
                لاحقاً
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
