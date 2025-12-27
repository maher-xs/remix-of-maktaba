// Google AdSense Configuration
// ================================
// فقط قم بتعديل هذه القيم لربط الإعلانات

export const ADSENSE_CONFIG = {
  // معرف الناشر - Publisher ID
  publisherId: 'ca-pub-7814175243563481',
  
  // معرفات الإعلانات - Ad Slot IDs
  slots: {
    // إعلان البانر الأفقي
    banner: '',
    
    // إعلان الشريط الجانبي الأيسر
    sidebarLeft: '',
    
    // إعلان الشريط الجانبي الأيمن
    sidebarRight: '',
  },
  
  // هل الإعلانات مفعلة؟
  enabled: true,
};

// دالة للتحقق من تفعيل AdSense
export const isAdsenseEnabled = () => {
  return ADSENSE_CONFIG.enabled && ADSENSE_CONFIG.publisherId.length > 0;
};
