import { Product, CartItem, Order } from '../types';
import { ElectricalProduct } from '../types/electrical';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export type AnyProduct = Product | ElectricalProduct | Record<string, any>;

/**
 * Check if user consent is currently granted for analytics and app tracking
 */
export function isConsentGranted(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem('smartrun_consent_granted') ?? localStorage.getItem('smartrun_terms_agreed');
    if (val === 'false') return false;
    return true; // Default granted
  } catch {
    return true;
  }
}

/**
 * Update Google Analytics Consent Mode & App Consent State
 */
export function updateGAConsent(granted: boolean) {
  try {
    const status = granted ? 'granted' : 'denied';
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: status,
        ad_storage: status,
        ad_user_data: status,
        ad_personalization: status,
        functionality_storage: 'granted',
        security_storage: 'granted'
      });
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartrun_consent_granted', String(granted));
      localStorage.setItem('smartrun_terms_agreed', String(granted));
      window.dispatchEvent(new CustomEvent('smartrun_consent_change', { detail: { granted } }));
    }
  } catch (err) {
    console.debug('Consent update notice:', err);
  }
}

/**
 * Safe wrapper to invoke gtag with consent check
 */
export function sendGAEvent(eventName: string, eventParams: Record<string, any> = {}) {
  try {
    if (!isConsentGranted()) return;
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, eventParams);
    }
  } catch (err) {
    console.debug('GA Event error:', err);
  }
}

/**
 * Format any product object to standard GA4 Item schema
 */
export function formatGAProductItem(product: AnyProduct, quantity = 1, selectedVariant?: string) {
  if (!product) return {};
  
  const id = product.id || '';
  const name = product.name || 'Product';
  const brand = product.brand || 'Giriraj Power';
  const category = product.category || 'electrical';
  const subCategory = (product as Product).subCategory || (product as ElectricalProduct).subcategory || '';
  const price = typeof product.price === 'number' ? product.price : 0;
  const originalPrice = (product as Product).originalPrice || (product as ElectricalProduct).mrp || price;
  const discount = originalPrice > price ? originalPrice - price : 0;
  const variant = selectedVariant || (product as Product).selectedColor || undefined;

  return {
    item_id: String(id),
    item_name: String(name),
    item_brand: String(brand),
    item_category: String(category),
    item_category2: String(subCategory),
    item_variant: variant ? String(variant) : undefined,
    price: Number(price),
    quantity: Number(quantity),
    discount: Number(discount)
  };
}

/**
 * Track Page Views
 */
export function trackPageView(pagePath: string, pageTitle?: string) {
  sendGAEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle || (typeof document !== 'undefined' ? document.title : ''),
    send_to: 'G-7J0DXZDRWL'
  });
}

/**
 * Track Product View (view_item)
 * Triggered whenever a product card quick view or product details page is opened
 */
export function trackProductView(product: AnyProduct) {
  if (!product) return;
  const item = formatGAProductItem(product, 1);
  sendGAEvent('view_item', {
    currency: 'INR',
    value: item.price || 0,
    items: [item]
  });
}

/**
 * Track Product List / Category Browse (view_item_list)
 */
export function trackProductListView(products: AnyProduct[], listName: string) {
  if (!products || products.length === 0) return;
  sendGAEvent('view_item_list', {
    item_list_name: listName,
    items: products.slice(0, 20).map((p, idx) => ({
      ...formatGAProductItem(p, 1),
      index: idx + 1
    }))
  });
}

/**
 * Track Add to Cart (add_to_cart)
 */
export function trackAddToCart(product: AnyProduct, quantity = 1, selectedVariant?: string) {
  if (!product) return;
  const item = formatGAProductItem(product, quantity, selectedVariant);
  const refInfo = getShareReferralInfo();
  sendGAEvent('add_to_cart', {
    currency: 'INR',
    value: (item.price || 0) * quantity,
    items: [item],
    ...(refInfo.isShareReferral ? {
      is_share_referral: true,
      referral_source: refInfo.referralSource,
      referral_item_id: refInfo.sharedItemId || undefined
    } : {})
  });
}

/**
 * Track Remove From Cart (remove_from_cart)
 */
export function trackRemoveFromCart(product: AnyProduct, quantity = 1) {
  if (!product) return;
  const item = formatGAProductItem(product, quantity);
  sendGAEvent('remove_from_cart', {
    currency: 'INR',
    value: (item.price || 0) * quantity,
    items: [item]
  });
}

/**
 * Track Begin Checkout (begin_checkout)
 */
export function trackBeginCheckout(cartItems: CartItem[], totalAmount: number) {
  const refInfo = getShareReferralInfo();
  sendGAEvent('begin_checkout', {
    currency: 'INR',
    value: totalAmount,
    items: cartItems.map((item) => formatGAProductItem(item.product, item.quantity, item.selectedColor)),
    ...(refInfo.isShareReferral ? {
      is_share_referral: true,
      referral_source: refInfo.referralSource,
      referral_item_id: refInfo.sharedItemId || undefined
    } : {})
  });
}

/**
 * Track Purchase / Order Placed (purchase)
 */
export function trackPurchase(order: Order, items: CartItem[], totalAmount: number, shippingFee = 0) {
  const refInfo = getShareReferralInfo();
  sendGAEvent('purchase', {
    transaction_id: order.id,
    value: totalAmount,
    currency: 'INR',
    shipping: shippingFee,
    payment_type: order.paymentMethod || 'COD / Online',
    items: items.map((item) => formatGAProductItem(item.product, item.quantity, item.selectedColor)),
    ...(refInfo.isShareReferral ? {
      is_share_referral: true,
      referral_source: refInfo.referralSource,
      referral_item_id: refInfo.sharedItemId || undefined
    } : {})
  });
}

/**
 * Track Search Queries (search)
 */
export function trackSearch(searchTerm: string) {
  if (!searchTerm || !searchTerm.trim()) return;
  sendGAEvent('search', {
    search_term: searchTerm.trim()
  });
}

// ============================================================================
// SHARE EVENTS & SHARED LINK CONVERSION TRACKING
// ============================================================================

export interface ShareTrackingParams {
  product: AnyProduct;
  method: 'native' | 'clipboard';
  shareUrl?: string;
  shareTitle?: string;
  shareChannel?: string;
}

/**
 * Track when the native or clipboard share dialog is triggered/opened
 */
export function trackShareDialogOpen(params: ShareTrackingParams) {
  if (!params?.product) return;
  const item = formatGAProductItem(params.product, 1);
  const platform = typeof navigator !== 'undefined'
    ? (/Android/i.test(navigator.userAgent) ? 'android' : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'desktop')
    : 'web';

  const payload = {
    method: params.method,
    content_type: 'product',
    item_id: String(item.item_id || ''),
    item_name: String(item.item_name || ''),
    item_brand: String(item.item_brand || ''),
    item_category: String(item.item_category || ''),
    price: Number(item.price || 0),
    share_url: params.shareUrl || '',
    share_title: params.shareTitle || '',
    share_platform: platform,
    share_channel: params.shareChannel || (params.method === 'native' ? `${platform}_share_sheet` : 'clipboard_copy'),
    timestamp: new Date().toISOString()
  };

  // 1. Standard GA4 'share' event
  sendGAEvent('share', payload);

  // 2. Explicit 'share_dialog_open' event for funnel conversion tracking
  sendGAEvent('share_dialog_open', payload);
}

/**
 * Track successful completion of share action
 */
export function trackShareCompleted(params: ShareTrackingParams) {
  if (!params?.product) return;
  const item = formatGAProductItem(params.product, 1);
  sendGAEvent('share_completed', {
    method: params.method,
    content_type: 'product',
    item_id: String(item.item_id || ''),
    item_name: String(item.item_name || ''),
    share_url: params.shareUrl || '',
    timestamp: new Date().toISOString()
  });
}

/**
 * Track when native share dialog is dismissed/cancelled by user
 */
export function trackShareCancelled(params: { product: AnyProduct; method: 'native' }) {
  if (!params?.product) return;
  const item = formatGAProductItem(params.product, 1);
  sendGAEvent('share_cancelled', {
    method: 'native',
    content_type: 'product',
    item_id: String(item.item_id || ''),
    item_name: String(item.item_name || ''),
    timestamp: new Date().toISOString()
  });
}

const SHARE_REFERRAL_SESSION_KEY = 'buildnow_share_referral';

export interface ShareReferralInfo {
  isShareReferral: boolean;
  referralSource?: string;
  sharedItemId?: string;
  landingPath?: string;
  landedAt?: string;
}

/**
 * Check if the active session originated from a shared product link
 */
export function getShareReferralInfo(): ShareReferralInfo {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(SHARE_REFERRAL_SESSION_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {}
  return { isShareReferral: false };
}

/**
 * Initialize / Detect incoming shared link referral visits
 * Call this on route change to capture incoming traffic from shared links
 */
export function initShareReferralTracker(pathname?: string, searchParamsString?: string) {
  try {
    if (typeof window === 'undefined') return;

    const search = searchParamsString !== undefined ? searchParamsString : window.location.search;
    const path = pathname || window.location.pathname;
    const params = new URLSearchParams(search);

    const isSharedSource = 
      params.get('utm_source') === 'native_share' ||
      params.get('utm_source') === 'share' ||
      params.get('ref') === 'shared_link' ||
      params.get('ref') === 'share' ||
      params.get('utm_campaign') === 'product_share';

    if (isSharedSource) {
      // Extract product ID from URL if product page
      const idMatch = path.match(/\/product\/([^/?#]+)/i);
      const sharedItemId = idMatch ? decodeURIComponent(idMatch[1]) : params.get('item_id') || undefined;

      const referralData: ShareReferralInfo = {
        isShareReferral: true,
        referralSource: params.get('utm_source') || params.get('ref') || 'native_share',
        sharedItemId,
        landingPath: path,
        landedAt: new Date().toISOString()
      };

      try {
        window.sessionStorage.setItem(SHARE_REFERRAL_SESSION_KEY, JSON.stringify(referralData));
      } catch {}

      // Fire tracking event for shared link landing
      sendGAEvent('share_link_opened', {
        referral_source: referralData.referralSource,
        landing_path: path,
        item_id: sharedItemId || undefined,
        utm_medium: params.get('utm_medium') || 'referral',
        utm_campaign: params.get('utm_campaign') || 'product_share'
      });
    }
  } catch (err) {
    console.debug('Share referral tracker error:', err);
  }
}
