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
 * Construct canonical share URL with UTM parameters for conversion rate attribution
 */
export function buildTrackedShareUrl(options: ShareProductOptions): string {
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : '';

  const isConstruction = (options.category || '').toLowerCase().includes('construction');
  const basePath = isConstruction
    ? `/construction`
    : `/electrical/product/${encodeURIComponent(String(options.id))}`;

  const baseFullUrl = options.url || `${origin}${basePath}`;

  try {
    const urlObj = new URL(baseFullUrl, origin || 'https://www.smartrun.in');
    urlObj.searchParams.set('utm_source', 'native_share');
    urlObj.searchParams.set('utm_medium', 'referral_share');
    urlObj.searchParams.set('utm_campaign', 'product_share');
    urlObj.searchParams.set('ref', 'shared_link');
    urlObj.searchParams.set('item_id', String(options.id));
    return urlObj.toString();
  } catch {
    const delimiter = baseFullUrl.includes('?') ? '&' : '?';
    return `${baseFullUrl}${delimiter}utm_source=native_share&utm_medium=referral_share&utm_campaign=product_share&ref=shared_link&item_id=${encodeURIComponent(String(options.id))}`;
  }
}

/**
 * Universal cross-platform product share function.
 * Supports:
 * - Native Mobile App / PWA share sheet (WhatsApp, Telegram, Messages, Gmail, Instagram, etc.) via Web Share API
 * - Desktop OS share sheet (Windows, macOS Safari/Edge)
 * - Automatic clipboard fallback with toast confirmation on desktop browsers without Web Share support
 * - Event tracking for share dialog opened, completed, and conversion rate attribution
 */
export async function shareProductDetails(options: ShareProductOptions): Promise<ShareResult> {
  hapticLight();

  const fullShareUrl = buildTrackedShareUrl(options);

  const shareTitle = `${options.name}${options.brand ? ` (${options.brand})` : ''} - Giriraj Power`;
  const shareText = options.price
    ? `Check out ${options.name} on Giriraj Power for ₹${options.price.toLocaleString('en-IN')}:`
    : `Check out ${options.name} on Giriraj Power:`;

  const shareData = {
    title: shareTitle,
    text: shareText,
    url: fullShareUrl
  };

  // 1. Try Native Web Share API (Mobile phones, Android Webview/PWA, iOS Safari, Windows/macOS native share dialogs)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    // Trigger tracking event: Native Share Dialog Opened
    trackShareDialogOpen({
      product: options,
      method: 'native',
      shareUrl: fullShareUrl,
      shareTitle
    });

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
      // If user simply closed/cancelled the share pop-up, record cancelled event and don't trigger clipboard fallback
      if (err && (err.name === 'AbortError' || err.message?.includes('abort') || err.message?.includes('cancel') || err.message?.includes('Dismissed'))) {
        trackShareCancelled({
          product: options,
          method: 'native'
        });
        return { success: false, method: 'native', cancelled: true };
      }
      console.warn('Native share failed, falling back to clipboard copy:', err);
    }
  }

  // 2. Desktop & Fallback: Copy direct product URL to clipboard
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

