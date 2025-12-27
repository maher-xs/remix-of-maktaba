import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdSettings {
  publisher_id: string;
  global_ads_enabled: boolean;
  // Ad slots for different ad types
  banner_slot: string;
  display_slot: string;
  infeed_slot: string;
  inarticle_slot: string;
  multiplex_slot: string;
  // Ad placement controls
  show_on_home: boolean;
  show_on_book_details: boolean;
  show_on_categories: boolean;
  show_on_search: boolean;
  show_on_reading: boolean;
  show_on_discussions: boolean;
  show_banner_ads: boolean;
  show_inline_ads: boolean;
  ads_frequency: number;
  max_ads_per_page: number;
}

export const useAdSettings = () => {
  return useQuery({
    queryKey: ['adSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_settings')
        .select('*');
      
      if (error) throw error;
      
      // Convert to settings object with defaults
      const settings: AdSettings = {
        publisher_id: '',
        global_ads_enabled: true,
        banner_slot: '',
        display_slot: '',
        infeed_slot: '',
        inarticle_slot: '',
        multiplex_slot: '',
        show_on_home: true,
        show_on_book_details: true,
        show_on_categories: true,
        show_on_search: true,
        show_on_reading: false,
        show_on_discussions: true,
        show_banner_ads: true,
        show_inline_ads: true,
        ads_frequency: 3,
        max_ads_per_page: 5,
      };
      
      data?.forEach(item => {
        // For page visibility settings, is_enabled controls whether ads show on that page
        // For other settings, is_enabled controls whether the setting is active
        switch (item.key) {
          case 'publisher_id':
            if (item.is_enabled) settings.publisher_id = item.value || '';
            break;
          case 'global_ads_enabled':
            settings.global_ads_enabled = item.is_enabled && item.value === 'true';
            break;
          case 'banner_slot':
            if (item.is_enabled) settings.banner_slot = item.value || '';
            break;
          case 'display_slot':
            if (item.is_enabled) settings.display_slot = item.value || '';
            break;
          case 'infeed_slot':
            if (item.is_enabled) settings.infeed_slot = item.value || '';
            break;
          case 'inarticle_slot':
            if (item.is_enabled) settings.inarticle_slot = item.value || '';
            break;
          case 'multiplex_slot':
            if (item.is_enabled) settings.multiplex_slot = item.value || '';
            break;
          case 'show_on_home':
            // is_enabled directly controls whether ads show on home page
            settings.show_on_home = item.is_enabled;
            break;
          case 'show_on_book_details':
            settings.show_on_book_details = item.is_enabled;
            break;
          case 'show_on_categories':
            settings.show_on_categories = item.is_enabled;
            break;
          case 'show_on_search':
            settings.show_on_search = item.is_enabled;
            break;
          case 'show_on_reading':
            settings.show_on_reading = item.is_enabled;
            break;
          case 'show_on_discussions':
            settings.show_on_discussions = item.is_enabled;
            break;
          case 'show_banner_ads':
            settings.show_banner_ads = item.is_enabled;
            break;
          case 'show_inline_ads':
            settings.show_inline_ads = item.is_enabled;
            break;
          case 'ads_frequency':
            if (item.is_enabled) settings.ads_frequency = parseInt(item.value || '3', 10);
            break;
          case 'max_ads_per_page':
            if (item.is_enabled) settings.max_ads_per_page = parseInt(item.value || '5', 10);
            break;
        }
      });
      
      return settings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const isAdsEnabled = (settings: AdSettings | undefined) => {
  if (!settings) return false;
  return settings.global_ads_enabled && settings.publisher_id.length > 0;
};

// Check if ads should show on a specific page (respects page settings even without publisher_id)
export const shouldShowAdsOnPage = (settings: AdSettings | undefined, page: string) => {
  if (!settings) return false;
  
  // First check if global ads are enabled
  if (!settings.global_ads_enabled) return false;
  
  // Then check page-specific settings
  switch (page) {
    case 'home':
      return settings.show_on_home ?? true;
    case 'book_details':
      return settings.show_on_book_details ?? true;
    case 'categories':
      return settings.show_on_categories ?? true;
    case 'search':
      return settings.show_on_search ?? true;
    case 'reading':
      return settings.show_on_reading ?? false;
    case 'discussions':
      return settings.show_on_discussions ?? true;
    default:
      return true;
  }
};
