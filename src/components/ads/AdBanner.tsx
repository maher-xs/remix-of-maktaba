import { useEffect, useRef, useState, useId } from 'react';
import { Server, Heart } from 'lucide-react';
import { useAdSettings, shouldShowAdsOnPage } from '@/hooks/useAdSettings';

interface AdBannerProps {
  variant?: 'horizontal' | 'sidebar' | 'inline' | 'mobile-banner' | 'mobile-leaderboard';
  slot?: string;
  page?: 'home' | 'book_details' | 'categories' | 'search' | 'reading' | 'discussions';
}

// Placeholder component - responsive design
const PlaceholderAd = ({ variant }: { variant: string }) => {
  const heights: Record<string, string> = {
    horizontal: 'h-[90px]',
    sidebar: 'h-[250px]',
    inline: 'h-[250px]',
    'mobile-banner': 'h-[50px]',
    'mobile-leaderboard': 'h-[100px]',
  };

  return (
    <div 
      className={`w-full ${heights[variant] || 'h-[90px]'} bg-muted/50 rounded-xl flex flex-col items-center justify-center border border-dashed border-border`}
    >
      <span className="text-sm text-muted-foreground">مساحة إعلانية</span>
    </div>
  );
};

// Check if AdSense script is loaded
const isAdSenseLoaded = () => {
  return typeof window !== 'undefined' && 
         typeof (window as any).adsbygoogle !== 'undefined';
};

const AdBanner = ({ variant = 'horizontal', slot, page }: AdBannerProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const [adPushed, setAdPushed] = useState(false);
  const uniqueId = useId();
  const { data: adSettings, isLoading } = useAdSettings();
  
  // Check if ads should be shown
  const globalEnabled = adSettings?.global_ads_enabled ?? false;
  const hasPublisherId = adSettings?.publisher_id && adSettings.publisher_id.length > 0;
  const showOnPage = page ? shouldShowAdsOnPage(adSettings, page) : globalEnabled;
  const publisherId = adSettings?.publisher_id;

  // Get the appropriate slot based on variant
  const getSlotForVariant = () => {
    if (slot) return slot;
    
    switch (variant) {
      case 'sidebar':
        return adSettings?.display_slot || adSettings?.banner_slot;
      case 'inline':
        return adSettings?.inarticle_slot || adSettings?.infeed_slot || adSettings?.banner_slot;
      case 'mobile-banner':
      case 'mobile-leaderboard':
        return adSettings?.display_slot || adSettings?.banner_slot;
      default:
        return adSettings?.banner_slot || adSettings?.display_slot;
    }
  };

  const adSlot = getSlotForVariant();

  // Check ad type settings
  const showBannerAds = adSettings?.show_banner_ads ?? true;
  const showInlineAds = adSettings?.show_inline_ads ?? true;

  // Determine if this specific variant should show
  const shouldShowVariant = 
    (variant === 'horizontal' && showBannerAds) ||
    (variant === 'sidebar' && showBannerAds) ||
    (variant === 'inline' && showInlineAds) ||
    (variant === 'mobile-banner' && showBannerAds) ||
    (variant === 'mobile-leaderboard' && showBannerAds);

  // All conditions must be met
  const canShowAd = globalEnabled && hasPublisherId && showOnPage && shouldShowVariant && adSlot && publisherId;

  useEffect(() => {
    // Only push once and when all conditions are met
    if (!canShowAd || adPushed || !adRef.current) return;

    // Wait for AdSense script to be loaded
    const pushAd = () => {
      try {
        if (isAdSenseLoaded() && adRef.current) {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          setAdPushed(true);
        }
      } catch (e) {
        console.error('AdSense error:', e);
      }
    };

    // Check if script is already loaded
    if (isAdSenseLoaded()) {
      pushAd();
    } else {
      // Wait for script to load (max 10 seconds)
      const checkInterval = setInterval(() => {
        if (isAdSenseLoaded()) {
          pushAd();
          clearInterval(checkInterval);
        }
      }, 500);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
      }, 10000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [canShowAd, adPushed]);

  // Reset adPushed when key props change
  useEffect(() => {
    setAdPushed(false);
  }, [adSlot, publisherId]);

  if (isLoading || !globalEnabled || !showOnPage || !shouldShowVariant) {
    return null;
  }

  // Common ad element props
  const adProps = {
    className: "adsbygoogle",
    "data-ad-client": publisherId,
    "data-ad-slot": adSlot,
    key: `${uniqueId}-${adSlot}`,
  };

  // Sidebar - Wide Skyscraper (160x600)
  if (variant === 'sidebar') {
    return (
      <div className="sidebar-card p-5">
        <div className="min-h-[250px] flex items-center justify-center">
          {publisherId && adSlot ? (
            <ins
              ref={adRef}
              {...adProps}
              style={{ display: 'block', width: '100%', height: '250px' }}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          ) : (
            <PlaceholderAd variant="sidebar" />
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-3">
          <Server className="w-3 h-3" />
          لدعم استمرار المكتبة
        </p>
      </div>
    );
  }

  // Inline - Medium Rectangle (300x250)
  if (variant === 'inline') {
    return (
      <div className="my-4 p-4 bg-muted/30 rounded-xl border border-border/50">
        <div className="min-h-[100px] flex items-center justify-center">
          {publisherId && adSlot ? (
            <ins
              ref={adRef}
              {...adProps}
              style={{ display: 'block', textAlign: 'center', width: '100%' }}
              data-ad-layout="in-article"
              data-ad-format="fluid"
            />
          ) : (
            <PlaceholderAd variant="inline" />
          )}
        </div>
      </div>
    );
  }

  // Mobile Banner (320x50) - Mobile only
  if (variant === 'mobile-banner') {
    return (
      <div className="my-3 lg:hidden">
        <div className="flex items-center justify-center">
          {publisherId && adSlot ? (
            <ins
              ref={adRef}
              {...adProps}
              style={{ display: 'block', width: '100%', height: '50px' }}
              data-ad-format="horizontal"
              data-full-width-responsive="true"
            />
          ) : (
            <PlaceholderAd variant="mobile-banner" />
          )}
        </div>
      </div>
    );
  }

  // Mobile Leaderboard (320x100) - Mobile only
  if (variant === 'mobile-leaderboard') {
    return (
      <div className="my-3 lg:hidden">
        <div className="flex items-center justify-center">
          {publisherId && adSlot ? (
            <ins
              ref={adRef}
              {...adProps}
              style={{ display: 'block', width: '100%', height: '100px' }}
              data-ad-format="horizontal"
              data-full-width-responsive="true"
            />
          ) : (
            <PlaceholderAd variant="mobile-leaderboard" />
          )}
        </div>
      </div>
    );
  }

  // Horizontal - Leaderboard (728x90) - Desktop
  return (
    <div className="relative overflow-hidden bg-muted/30 rounded-2xl border border-border/50 p-6">
      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Ad Space */}
        <div className="flex-1 w-full">
          <div className="min-h-[90px] flex items-center justify-center">
            {publisherId && adSlot ? (
              <ins
                ref={adRef}
                {...adProps}
                style={{ display: 'block', width: '100%' }}
                data-ad-format="horizontal"
                data-full-width-responsive="true"
              />
            ) : (
              <PlaceholderAd variant="horizontal" />
            )}
          </div>
        </div>
        
        {/* Explanation (desktop only to improve mobile LCP) */}
        <div className="hidden lg:flex items-center gap-3 text-center lg:text-right lg:max-w-xs">
          <div className="relative bg-gradient-to-br from-primary to-primary/80 w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25">
            <Server className="w-5 h-5 lg:w-6 lg:h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              نعرض إعلانات بسيطة لتغطية تكاليف الخوادم وضمان استمرار المكتبة مجانية للجميع
              <Heart className="w-3 h-3 text-destructive inline-block mr-1 fill-destructive" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;
