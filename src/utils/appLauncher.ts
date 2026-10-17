import { Capacitor } from '@capacitor/core';

export const OFFICIAL_ANDROID_PACKAGE = 'in.smartrun.app';
export const OFFICIAL_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${OFFICIAL_ANDROID_PACKAGE}`;
export const OFFICIAL_WEB_ORIGIN = 'https://www.smartrun.in';

export interface AppLaunchUrls {
  directUrl: string;
  intentUrl: string;
  playStoreUrl: string;
  marketUrl: string;
  fallbackWebUrl: string;
}

/**
 * Builds standard deep links and Android Intent URIs for a given route.
 * Compatible with Android Chrome, Samsung Internet, Firefox, Safari, and other modern browsers.
 */
export function buildAppLaunchUrls(customPath?: string): AppLaunchUrls {
  let relativePath = '';
  let fullWebUrl = OFFICIAL_WEB_ORIGIN;

  if (typeof window !== 'undefined') {
    const rawPath = customPath || (window.location.pathname + window.location.search);
    relativePath = rawPath.replace(/^\/+/, '');
    fullWebUrl = `${OFFICIAL_WEB_ORIGIN}/${relativePath}`;
  } else if (customPath) {
    relativePath = customPath.replace(/^\/+/, '');
    fullWebUrl = `${OFFICIAL_WEB_ORIGIN}/${relativePath}`;
  }

  // Direct custom scheme: smartrun://electrical/product/... or smartrun://home
  const directUrl = relativePath ? `smartrun://${relativePath}` : 'smartrun://home';

  // Android Intent URI syntax:
  // intent://<path>#Intent;scheme=smartrun;package=in.smartrun.app;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=<url>;end;
  const intentPath = relativePath || 'home';
  const intentUrl = `intent://${intentPath}#Intent;scheme=smartrun;package=${OFFICIAL_ANDROID_PACKAGE};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(fullWebUrl)};end;`;

  const playStoreUrl = OFFICIAL_PLAY_STORE_URL;
  const marketUrl = `market://details?id=${OFFICIAL_ANDROID_PACKAGE}`;

  return {
    directUrl,
    intentUrl,
    playStoreUrl,
    marketUrl,
    fallbackWebUrl: fullWebUrl
  };
}

/**
 * Attempts to open the currently viewed link or a custom route directly in the native SmartRun phone app.
 * Follows the proven hand-off architecture used by Flipkart, Amazon, and Swiggy:
 * 1. Checks if already inside native app (returns immediately).
 * 2. On Android: attempts custom scheme (smartrun://) and intent URI fallback.
 * 3. On iOS: attempts custom scheme with web/app store fallback.
 * 4. On Desktop: opens the Play Store listing or app discovery modal.
 */
export function launchSmartRunApp(options?: {
  customPath?: string;
  fallbackToPlayStore?: boolean;
  onFallback?: () => void;
}) {
  if (typeof window === 'undefined') return;

  // If already inside the native Capacitor app, there is nothing to open
  if (Capacitor.isNativePlatform()) return;

  const { directUrl, intentUrl, playStoreUrl, marketUrl } = buildAppLaunchUrls(options?.customPath);
  const userAgent = (navigator.userAgent || '').toLowerCase();
  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);

  const shouldFallbackToStore = options?.fallbackToPlayStore ?? true;

  if (isAndroid) {
    // Attempt 1: Custom URL scheme (smartrun://...)
    // If user has the app, this instantly switches to the native app
    const launchTime = Date.now();
    let appOpened = false;

    const handleVisibility = () => {
      // If document becomes hidden, the native app was launched!
      if (document.hidden || (document as any).webkitHidden) {
        appOpened = true;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility, { once: true });

    try {
      window.location.href = directUrl;
    } catch {
      // Direct assignment blocked or unsupported
    }

    // Attempt 2: After a brief interval, try Android Intent syntax if still in browser
    setTimeout(() => {
      const elapsed = Date.now() - launchTime;
      // If user is still in browser and elapsed time indicates app did not take foreground
      if (!appOpened && elapsed < 2000 && !document.hidden) {
        try {
          window.location.href = intentUrl;
        } catch {
          // Intent navigation fallback
        }

        // Attempt 3: If intent failed and user requested store fallback
        if (shouldFallbackToStore) {
          setTimeout(() => {
            if (!document.hidden && !appOpened) {
              if (options?.onFallback) {
                options.onFallback();
              } else {
                try {
                  window.location.href = marketUrl;
                } catch {
                  window.location.href = playStoreUrl;
                }
              }
            }
          }, 1000);
        }
      }
    }, 350);
  } else if (isIOS) {
    // iOS Safari custom scheme
    window.location.href = directUrl;
    if (shouldFallbackToStore) {
      setTimeout(() => {
        if (!document.hidden) {
          if (options?.onFallback) {
            options.onFallback();
          } else {
            window.location.href = playStoreUrl;
          }
        }
      }, 1000);
    }
  } else {
    // Desktop: open Play Store or trigger fallback callback
    if (options?.onFallback) {
      options.onFallback();
    } else {
      window.open(playStoreUrl, '_blank', 'noopener,noreferrer');
    }
  }
}
