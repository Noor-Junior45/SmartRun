import { Capacitor } from '@capacitor/core';

/**
 * Accurately detects whether the current environment is running inside the
 * SmartRun Android App (Capacitor native APK, Android Studio WebView packaging,
 * or standalone app wrapper), as opposed to a standard web browser.
 */
export function isAndroidAppEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Capacitor Native Platform (Android APK)
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      return true;
    }
  } catch {}

  // 2. Capacitor custom scheme origin (inside native wrapper only)
  try {
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') {
      return true;
    }
  } catch {}

  // 3. Native Android JavaScript Interface Bridge (injected by Android WebView)
  if (typeof (window as any).Android !== 'undefined') {
    return true;
  }

  // 4. Custom marker set by Android wrapper/MainActivity
  if ((window as any).isAndroidApp === true) {
    return true;
  }

  // 5. User-Agent containing explicit SmartRun app tokens
  const ua = (typeof window.navigator !== 'undefined' && window.navigator.userAgent) ? window.navigator.userAgent : '';
  if (
    ua.includes('SmartRunApp') ||
    ua.includes('in.smartrun.app') ||
    ua.includes('SmartRun/Android') ||
    ua.includes('BuildNowApp')
  ) {
    return true;
  }

  // 6. Explicit URL query marker for active OAuth / deep link callbacks
  try {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get('platform') === 'android' ||
      params.get('is_app') === 'true' ||
      params.get('app') === 'android' ||
      params.get('target') === 'app' ||
      params.get('source') === 'android_app'
    ) {
      return true;
    }
  } catch {}

  // 7. Strict Android WebView token (only '; wv' which is Google's official WebView token)
  // We do NOT use generic Android regex to avoid misclassifying mobile Chrome as an app
  if (/Android/i.test(ua) && /;\s*wv\b/i.test(ua)) {
    return true;
  }

  return false;
}

/**
 * Returns true if running in a standard public web browser (desktop or mobile Chrome/Safari/Firefox).
 */
export function isWebsiteEnvironment(): boolean {
  return !isAndroidAppEnvironment();
}
