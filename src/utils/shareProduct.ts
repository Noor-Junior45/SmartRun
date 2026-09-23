import { Capacitor } from '@capacitor/core';
import { Share as CapShare } from '@capacitor/share';
import { hapticLight } from './haptics';
import {
  trackShareDialogOpen,
  trackShareCompleted,
  trackShareCancelled
} from './analytics';

export interface ShareProductOptions {
  id: string | number;
  name: string;
  brand?: string;
  price?: number;
  category?: string;
  url?: string;
}

export interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'none';
  cancelled?: boolean;
}

/**
 * Universal canonical web domain for publicly shareable links.
 * In native Android builds (Capacitor/WebView), window.location.origin is "https://localhost"
 * which cannot be opened outside the app by external apps (WhatsApp, Instagram, browsers).
 * We guarantee share URLs always resolve to the public production domain (https://www.smartrun.in).
 */
export const PRODUCTION_WEB_DOMAIN = 'https://www.smartrun.in';

/**
 * Returns the proper public base origin for share links.
 * Never returns 'https://localhost', 'http://localhost', 'capacitor://', or 'ionic://'.
 */
export function getPublicShareOrigin(): string {
  if (typeof window === 'undefined') return PRODUCTION_WEB_DOMAIN;

  const origin = window.location.origin || '';
  const hostname = window.location.hostname || '';

  // Inside Capacitor native Android app, origin is https://localhost
  if (
    Capacitor.isNativePlatform() ||
    origin.startsWith('https://localhost') ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('capacitor://') ||
    origin.startsWith('ionic://') ||
    origin.startsWith('file://') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '10.0.2.2'
  ) {
    return PRODUCTION_WEB_DOMAIN;
  }

  // On production web or staging web, use the valid public origin
  if (origin.startsWith('http://') || origin.startsWith('https://')) {
    return origin;
  }

  return PRODUCTION_WEB_DOMAIN;
}

/**
 * Construct canonical share URL with UTM parameters for conversion rate attribution.
 * Guarantees a fully valid, publicly accessible web link.
 */
export function buildTrackedShareUrl(options: ShareProductOptions): string {
  const publicOrigin = getPublicShareOrigin();

  const isConstruction = (options.category || '').toLowerCase().includes('construction');
  const basePath = isConstruction
    ? `/construction`
    : `/electrical/product/${encodeURIComponent(String(options.id))}`;

  // If options.url is provided, sanitize it so it doesn't contain localhost
  let targetUrl = options.url;
  if (targetUrl) {
    if (
      targetUrl.includes('localhost') ||
      targetUrl.startsWith('capacitor://') ||
      targetUrl.startsWith('ionic://') ||
      targetUrl.startsWith('file://')
    ) {
      try {
        const parsed = new URL(targetUrl, publicOrigin);
        targetUrl = `${publicOrigin}${parsed.pathname}${parsed.search}`;
      } catch {
        targetUrl = `${publicOrigin}${basePath}`;
      }
    }
  } else {
    targetUrl = `${publicOrigin}${basePath}`;
  }

  try {
    const urlObj = new URL(targetUrl, publicOrigin);
    urlObj.searchParams.set('utm_source', 'native_share');
    urlObj.searchParams.set('utm_medium', 'referral_share');
    urlObj.searchParams.set('utm_campaign', 'product_share');
    urlObj.searchParams.set('ref', 'shared_link');
    urlObj.searchParams.set('item_id', String(options.id));
    return urlObj.toString();
  } catch {
    const delimiter = targetUrl.includes('?') ? '&' : '?';
    return `${targetUrl}${delimiter}utm_source=native_share&utm_medium=referral_share&utm_campaign=product_share&ref=shared_link&item_id=${encodeURIComponent(String(options.id))}`;
  }
}

/**
 * Universal cross-platform product share function.
 * Supports:
 * - Native Android/iOS system share sheet (Instagram, WhatsApp, Messages, Gmail, Drive, etc.) via @capacitor/share
 * - Web Share API on mobile Chrome/Safari browsers
 * - Automatic clipboard fallback with toast confirmation on desktop browsers without native share dialogs
 * - Event tracking for share dialog opened, completed, and conversion rate attribution
 */
export async function shareProductDetails(options: ShareProductOptions): Promise<ShareResult> {
  hapticLight();

  const fullShareUrl = buildTrackedShareUrl(options);

  const shareTitle = `${options.name}${options.brand ? ` (${options.brand})` : ''} - SmartRun`;
  const shareText = options.price
    ? `Check out ${options.name} on SmartRun for ₹${options.price.toLocaleString('en-IN')}:`
    : `Check out ${options.name} on SmartRun:`;

  // 1. Prioritize Capacitor Native Share Plugin (Reliable Android/iOS system share sheet)
  // This opens the exact native bottom sheet showing Instagram, WhatsApp, Gmail, etc.
  try {
    if (Capacitor.isNativePlatform()) {
      trackShareDialogOpen({
        product: options,
        method: 'native',
        shareUrl: fullShareUrl,
        shareTitle
      });

      const capResult = await CapShare.share({
        title: shareTitle,
        text: `${shareText} ${fullShareUrl}`,
        url: fullShareUrl,
        dialogTitle: 'Share with'
      });

      trackShareCompleted({
        product: options,
        method: 'native',
        shareUrl: fullShareUrl,
        shareTitle
      });
      return { success: true, method: 'native' };
    }
  } catch (capErr: any) {
    // If user dismissed/cancelled the native share sheet
    if (
      capErr &&
      (capErr.name === 'AbortError' ||
        String(capErr.message || '').toLowerCase().includes('abort') ||
        String(capErr.message || '').toLowerCase().includes('cancel') ||
        String(capErr.message || '').toLowerCase().includes('dismiss'))
    ) {
      trackShareCancelled({
        product: options,
        method: 'native'
      });
      return { success: false, method: 'native', cancelled: true };
    }
    console.warn('Capacitor Share plugin failed or cancelled, trying fallback:', capErr);
  }

  // 2. Try Standard Browser Web Share API (Mobile Chrome, Safari, Edge)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    trackShareDialogOpen({
      product: options,
      method: 'native',
      shareUrl: fullShareUrl,
      shareTitle
    });

    const shareData = {
      title: shareTitle,
      text: shareText,
      url: fullShareUrl
    };

    try {
      if (typeof navigator.canShare === 'function') {
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          trackShareCompleted({
            product: options,
            method: 'native',
            shareUrl: fullShareUrl,
            shareTitle
          });
          return { success: true, method: 'native' };
        }
      } else {
        await navigator.share(shareData);
        trackShareCompleted({
          product: options,
          method: 'native',
          shareUrl: fullShareUrl,
          shareTitle
        });
        return { success: true, method: 'native' };
      }
    } catch (err: any) {
      if (
        err &&
        (err.name === 'AbortError' ||
          String(err.message || '').toLowerCase().includes('abort') ||
          String(err.message || '').toLowerCase().includes('cancel') ||
          String(err.message || '').toLowerCase().includes('dismiss'))
      ) {
        trackShareCancelled({
          product: options,
          method: 'native'
        });
        return { success: false, method: 'native', cancelled: true };
      }
      console.warn('Navigator Web Share failed, falling back to clipboard copy:', err);
    }
  }

  // 3. Desktop & Fallback: Copy direct public product URL to clipboard
  trackShareDialogOpen({
    product: options,
    method: 'clipboard',
    shareUrl: fullShareUrl,
    shareTitle
  });

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(fullShareUrl);
      trackShareCompleted({
        product: options,
        method: 'clipboard',
        shareUrl: fullShareUrl,
        shareTitle
      });
      return { success: true, method: 'clipboard' };
    } else {
      // Legacy document.execCommand fallback
      const textArea = document.createElement('textarea');
      textArea.value = fullShareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (copied) {
        trackShareCompleted({
          product: options,
          method: 'clipboard',
          shareUrl: fullShareUrl,
          shareTitle
        });
        return { success: true, method: 'clipboard' };
      }
    }
  } catch (copyErr) {
    console.error('Failed to copy product URL to clipboard:', copyErr);
  }

  return { success: false, method: 'none' };
}
