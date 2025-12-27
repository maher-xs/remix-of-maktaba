import { useEffect } from 'react';
import { useSeoSettings } from '@/hooks/useSiteSettings';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GoogleAnalytics = () => {
  const { data: seoSettings } = useSeoSettings();
  
  useEffect(() => {
    const gaId = seoSettings?.googleAnalyticsId;
    
    // إذا لم يكن هناك معرف GA، لا نفعل شيء
    if (!gaId || !gaId.startsWith('G-')) return;
    
    // تحقق من عدم تحميل السكربت مسبقاً
    if (document.querySelector(`script[src*="${gaId}"]`)) return;
    
    // تحميل سكربت Google Analytics
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script.async = true;
    document.head.appendChild(script);
    
    // تهيئة gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId, {
      page_title: document.title,
      page_location: window.location.href,
    });
    
    return () => {
      // لا نزيل السكربت عند unmount لتجنب إعادة التحميل
    };
  }, [seoSettings?.googleAnalyticsId]);
  
  return null;
};

export default GoogleAnalytics;
