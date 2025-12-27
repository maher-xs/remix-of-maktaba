import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// أنواع الإعدادات
export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  siteKeywords: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

export interface ThemeSettings {
  defaultTheme: 'light' | 'dark' | 'system';
  allowUserChoice: boolean;
  primaryColor: string;
  accentColor: string;
}

export interface BrandingSettings {
  logoUrl: string;
  faviconUrl: string;
  showLogoText: boolean;
  logoText: string;
}

export interface HeaderSettings {
  showSearch: boolean;
  showThemeToggle: boolean;
  showAuthButtons: boolean;
  showNotifications: boolean;
  stickyHeader: boolean;
  transparentHeader: boolean;
}

export interface FooterSettings {
  showFooter: boolean;
  footerText: string;
  showSocialLinks: boolean;
  showQuickLinks: boolean;
  showContactInfo: boolean;
}

export interface SocialLinks {
  facebook: string;
  twitter: string;
  instagram: string;
  youtube: string;
  telegram: string;
}

export interface SearchSettings {
  enableSearch: boolean;
  showSearchSuggestions: boolean;
  searchPlaceholder: string;
  minSearchLength: number;
  maxResults: number;
}

export interface HomeSettings {
  showHeroBanner: boolean;
  heroTitle: string;
  heroSubtitle: string;
  showFeaturedBooks: boolean;
  showCategories: boolean;
  showLatestBooks: boolean;
  showPopularBooks: boolean;
  booksPerRow: number;
}

export interface BookSettings {
  showBookRating: boolean;
  showBookReviews: boolean;
  showRelatedBooks: boolean;
  showDownloadButton: boolean;
  showReadOnlineButton: boolean;
  allowBookmarks: boolean;
  allowAnnotations: boolean;
}

export interface SeoSettings {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  enableSitemap: boolean;
  enableRobots: boolean;
  googleAnalyticsId: string;
}

export interface SiteSettings {
  general: GeneralSettings;
  theme: ThemeSettings;
  branding: BrandingSettings;
  header: HeaderSettings;
  footer: FooterSettings;
  social: SocialLinks;
  search: SearchSettings;
  home: HomeSettings;
  books: BookSettings;
  seo: SeoSettings;
}

// القيم الافتراضية
const defaultSettings: SiteSettings = {
  general: {
    siteName: 'مكتبة',
    siteDescription: 'مكتبة عربية رقمية شاملة',
    siteKeywords: 'كتب، مكتبة، قراءة، كتب عربية، تحميل كتب',
    contactEmail: 'info@maktaba.cc',
    contactPhone: '',
    address: 'سوريا - دمشق',
  },
  theme: {
    defaultTheme: 'system',
    allowUserChoice: true,
    primaryColor: '#306B4D', // الأخضر السوري
    accentColor: '#D9A21B', // الذهبي
  },
  branding: {
    logoUrl: '',
    faviconUrl: '',
    showLogoText: true,
    logoText: 'مكتبة',
  },
  header: {
    showSearch: true,
    showThemeToggle: true,
    showAuthButtons: true,
    showNotifications: false,
    stickyHeader: true,
    transparentHeader: false,
  },
  footer: {
    showFooter: true,
    footerText: '© 2025 مكتبة (maktaba.cc) - جميع الحقوق محفوظة',
    showSocialLinks: true,
    showQuickLinks: true,
    showContactInfo: true,
  },
  social: {
    facebook: '',
    twitter: '',
    instagram: '',
    youtube: '',
    telegram: '',
  },
  search: {
    enableSearch: true,
    showSearchSuggestions: true,
    searchPlaceholder: 'ابحث عن كتاب...',
    minSearchLength: 2,
    maxResults: 20,
  },
  home: {
    showHeroBanner: true,
    heroTitle: 'مكتبة',
    heroSubtitle: 'بوابتك إلى عالم المعرفة العربية',
    showFeaturedBooks: true,
    showCategories: true,
    showLatestBooks: true,
    showPopularBooks: true,
    booksPerRow: 5,
  },
  books: {
    showBookRating: true,
    showBookReviews: true,
    showRelatedBooks: true,
    showDownloadButton: true,
    showReadOnlineButton: true,
    allowBookmarks: true,
    allowAnnotations: true,
  },
  seo: {
    metaTitle: 'مكتبة - مكتبتك الرقمية العربية المجانية',
    metaDescription: 'اكتشف آلاف الكتب العربية المجانية للقراءة والتحميل',
    ogImage: '',
    enableSitemap: true,
    enableRobots: true,
    googleAnalyticsId: '',
  },
};

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ['siteSettings'],
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');

      if (error) {
        console.error('Error fetching site settings:', error);
        return defaultSettings;
      }

      // دمج الإعدادات من قاعدة البيانات مع القيم الافتراضية
      const settings = { ...defaultSettings };
      
      data?.forEach((item) => {
        const key = item.key as keyof SiteSettings;
        if (key && key in settings && item.value) {
          (settings as Record<string, unknown>)[key] = { 
            ...(settings[key] as object), 
            ...(item.value as object) 
          };
        }
      });

      return settings;
    },
    staleTime: 1000 * 60 * 5, // 5 دقائق
    gcTime: 1000 * 60 * 30, // 30 دقيقة
  });
};

// Hooks فرعية للوصول السريع لأقسام معينة
export const useGeneralSettings = () => {
  const { data, ...rest } = useSiteSettings();
  return { data: data?.general ?? defaultSettings.general, ...rest };
};

export const useThemeSettings = () => {
  const { data, ...rest } = useSiteSettings();
  return { data: data?.theme ?? defaultSettings.theme, ...rest };
};

export const useBrandingSettings = () => {
  const { data, ...rest } = useSiteSettings();
  return { data: data?.branding ?? defaultSettings.branding, ...rest };
};

export const useHeaderSettings = () => {
  const { data, ...rest } = useSiteSettings();
  return { data: data?.header ?? defaultSettings.header, ...rest };
};

export const useFooterSettings = () => {
  const { data, ...rest } = useSiteSettings();
  return { data: data?.footer ?? defaultSettings.footer, ...rest };
};

export const useSocialLinks = () => {
  const { data, ...rest } = useSiteSettings();
  return { data: data?.social ?? defaultSettings.social, ...rest };
};

export const useSearchSettings = () => {
  const { data, ...rest } = useSiteSettings();
  return { data: data?.search ?? defaultSettings.search, ...rest };
};

export const useHomeSettings = () => {
  const { data, ...rest } = useSiteSettings();
  return { data: data?.home ?? defaultSettings.home, ...rest };
};

export const useBookSettings = () => {
  const { data, ...rest } = useSiteSettings();
  return { data: data?.books ?? defaultSettings.books, ...rest };
};

export const useSeoSettings = () => {
  const { data, ...rest } = useSiteSettings();
  return { data: data?.seo ?? defaultSettings.seo, ...rest };
};

export default useSiteSettings;
