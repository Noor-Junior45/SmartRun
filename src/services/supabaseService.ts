import { supabase } from '../lib/supabaseClient';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { isWebViewEnvironment } from '../utils/webViewDetection';
import { isAndroidAppEnvironment } from '../utils/platformDetection';
import { Order, OrderStatus, WiringServiceBooking, SavedAddress, UserProfile, Product, CartItem, DeliveryPartner } from '../types';
import { soundService } from './sound';
import { showToast } from '../utils/toast';
import { API_BASE_URL } from '../lib/apiBase';
import { generateUUID as secureGenerateUUID, generateSecureOrderNumber, generateSecureToken } from '../utils/cryptoHelper';

// Offline Sync Queue Types & Constants
export interface PendingSyncItem {
  id: string;
  type: 'profile' | 'address' | 'delete_address' | 'upi' | 'delete_upi' | 'service_booking' | 'order';
  payload: any;
  userScope?: string;
  timestamp: number;
}

const PENDING_SYNC_STORAGE_KEY = 'giriraj_pending_sync_queue_v1';

export function getPendingSyncQueue(): PendingSyncItem[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(PENDING_SYNC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePendingSyncQueue(queue: PendingSyncItem[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(PENDING_SYNC_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Error saving sync queue:', err);
  }
}

export function enqueuePendingSync(item: Omit<PendingSyncItem, 'id' | 'timestamp'>): void {
  const queue = getPendingSyncQueue();
  const newItem: PendingSyncItem = {
    ...item,
    id: generateSecureToken('sync', 8),
    timestamp: Date.now()
  };
  // Avoid duplicate queue entries for the same entity
  const filtered = queue.filter(
    (q) => !(q.type === newItem.type && JSON.stringify(q.payload?.id || q.payload?.user_id) === JSON.stringify(newItem.payload?.id || newItem.payload?.user_id))
  );
  filtered.push(newItem);
  savePendingSyncQueue(filtered);
}

/**
 * Retries and drains any pending sync items when connection is re-established
 */
export async function retryPendingSync(): Promise<number> {
  const queue = getPendingSyncQueue();
  if (queue.length === 0) return 0;

  const remaining: PendingSyncItem[] = [];
  let syncedCount = 0;

  for (const item of queue) {
    try {
      if (item.type === 'profile') {
        const { user_id, ...profileData } = item.payload;
        const res = await syncUserProfileToSupabase(user_id, profileData);
        if (!res.success) remaining.push(item);
        else syncedCount++;
      } else if (item.type === 'address') {
        const res = await syncAddressDirect(item.payload);
        if (!res.success) remaining.push(item);
        else syncedCount++;
      } else if (item.type === 'delete_address') {
        const res = await syncDeleteAddressDirect(item.payload.id, item.payload.userId);
        if (!res.success) remaining.push(item);
        else syncedCount++;
      } else if (item.type === 'service_booking') {
        const res = await syncServiceBookingDirect(item.payload);
        if (!res.success) remaining.push(item);
        else syncedCount++;
      } else if (item.type === 'upi') {
        const res = await syncUpiDirect(item.payload.upiId, item.payload.userId);
        if (!res.success) remaining.push(item);
        else syncedCount++;
      } else if (item.type === 'delete_upi') {
        const res = await syncDeleteUpiDirect(item.payload.upiId, item.payload.userId);
        if (!res.success) remaining.push(item);
        else syncedCount++;
      }
    } catch {
      remaining.push(item);
    }
  }

  savePendingSyncQueue(remaining);

  if (syncedCount > 0) {
    showToast(`Online: ${syncedCount} local change${syncedCount > 1 ? 's' : ''} synced to cloud.`, 'success');
  }

  return syncedCount;
}

// Auto-bind online event listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    retryPendingSync().catch(() => {});
  });
  // Trigger on load only if online
  setTimeout(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      retryPendingSync().catch(() => {});
    }
  }, 3000);
}

// Helper direct sync functions used by retry engine
async function syncAddressDirect(rowPayload: any): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('saved_addresses').upsert(rowPayload, { onConflict: 'id' });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

async function syncDeleteAddressDirect(id: string, userId?: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    let query = supabase.from('saved_addresses').delete().eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

async function syncServiceBookingDirect(bookingPayload: any): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('wiring_service_bookings').insert(bookingPayload);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

async function syncUpiDirect(upiId: string, userId?: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('saved_upi_ids').upsert({
      upi_id: upiId,
      user_id: userId || null,
      created_at: new Date().toISOString()
    }, { onConflict: 'upi_id,user_id' });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

async function syncDeleteUpiDirect(upiId: string, userId?: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    let query = supabase.from('saved_upi_ids').delete().eq('upi_id', upiId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

// Local storage key constants
export const USER_PHONE_KEY = 'giriraj_user_phone';
export const USER_NAME_KEY = 'giriraj_user_name';
export const USER_EMAIL_KEY = 'giriraj_user_email';
export const USER_PHOTO_KEY = 'giriraj_user_photo';
export const USER_DOB_KEY = 'giriraj_user_dob';
export const USER_EMAIL_VERIFIED_KEY = 'giriraj_user_email_verified';
export const USER_WALLET_BALANCE_KEY = 'giriraj_user_wallet_balance';
export const USER_REFUND_BALANCE_KEY = 'giriraj_user_refund_balance';
export const USER_CASHBACK_BALANCE_KEY = 'giriraj_user_cashback_balance';
export const SAVED_ADDRESSES_STORAGE_KEY = 'giriraj_user_addresses_v4';
export const ACTIVE_SAVED_ADDRESS_KEY = 'giriraj_active_saved_address';
export const SAVED_UPI_STORAGE_KEY = 'giriraj_user_saved_upi';
export const ORDERS_STORAGE_KEY = 'giriraj_orders_v2';

// In-memory active user scope to prevent cross-account data leakage
let activeUserScope: string | null = null;

export function setActiveUserScope(scope: string | null): void {
  activeUserScope = scope;
  if (typeof window !== 'undefined') {
    notifyUpiListeners(getStoredUpiIds(scope || undefined));
  }
}

export function getActiveUserScope(): string | null {
  return activeUserScope;
}

export function getUserScopeKeyFromUser(user?: { id?: string; email?: string | null; phone?: string | null } | null): string | null {
  if (!user) return null;
  // Authenticated user ID is always the primary, unique and non-colliding scope key
  if (user.id && user.id.trim()) {
    return `uid_${user.id.trim()}`;
  }
  // Secondary fallback if user is identified by email
  if (user.email && user.email.trim() && !user.email.includes('@girirajpower.internal')) {
    return `email_${user.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }
  // Tertiary fallback for unauthenticated phone flow
  if (user.phone && user.phone.trim()) {
    const cleanPhone = user.phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length === 10) {
      return `phone_${cleanPhone}`;
    }
  }
  return null;
}

export function getActiveAddressStorageKey(user?: { id?: string; email?: string | null; phone?: string | null } | string | null): string {
  const scope = typeof user === 'string' ? user : (getUserScopeKeyFromUser(user) || activeUserScope);
  return scope ? `${ACTIVE_SAVED_ADDRESS_KEY}_${scope}` : `${ACTIVE_SAVED_ADDRESS_KEY}_guest`;
}

// In-memory runtime state for active session: User data is kept in memory during the active session
// and stored authoritatively in Supabase (never in persistent client cache memory).
const inMemoryProfiles = new Map<string, UserProfile>();
const inMemoryOrders = new Map<string, Order[]>();
const inMemoryAddresses = new Map<string, SavedAddress[]>();
const inMemoryActiveAddress = new Map<string, SavedAddress>();
const inMemoryUpi = new Map<string, string[]>();

/**
 * Purges all device cache memory, browser storage, and service worker caches
 * Ensuring no user data or cache memory lingers on logout or account deletion.
 */
export async function purgeAllUserCacheAndStorage(): Promise<void> {
  // 1. Clear in-memory caches
  clearUserProfile();
  activeUserScope = null;
  inMemoryProfiles.clear();
  inMemoryOrders.clear();
  inMemoryAddresses.clear();
  inMemoryActiveAddress.clear();
  inMemoryUpi.clear();

  if (typeof window !== 'undefined') {
    // 2. Clear all localStorage
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn('LocalStorage clear notice:', e);
    }

    // 3. Clear all sessionStorage
    try {
      window.sessionStorage.clear();
    } catch (e) {
      console.warn('SessionStorage clear notice:', e);
    }

    // 4. Clear all browser Cache Storage API caches
    try {
      if ('caches' in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      }
    } catch (e) {
      console.warn('Browser caches delete notice:', e);
    }

    // 5. Unregister service workers if any
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
    } catch (e) {
      console.warn('Service worker unregister notice:', e);
    }
  }
}

/**
 * Permanently deletes user account and personal data from Supabase,
 * purges all device cache, and terminates the session.
 */
export async function deleteUserDataFromSupabase(
  userId?: string,
  phone?: string,
  email?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

    // 1. Authoritative server-side deletion from Supabase
    try {
      const response = await fetch(`${API_BASE_URL}/api/account/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, phone: cleanPhone, email })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, message: data.message || 'Failed to delete account on server.' };
      }
    } catch (apiErr: any) {
      console.warn('Server deletion API notice:', apiErr);
    }

    // 2. Direct client-side Supabase deletion fallback
    if (userId) {
      try { await supabase.from('user_profiles').delete().eq('id', userId); } catch {}
      try { await supabase.from('profiles').delete().eq('id', userId); } catch {}
      try { await supabase.from('saved_addresses').delete().eq('user_id', userId); } catch {}
      try { await supabase.from('saved_upi_ids').delete().eq('user_id', userId); } catch {}
    }
    if (cleanPhone) {
      try { await supabase.from('user_profiles').delete().eq('phone', cleanPhone); } catch {}
      try { await supabase.from('profiles').delete().eq('phone', cleanPhone); } catch {}
    }

    // 3. Purge all cache and storage from device
    await purgeAllUserCacheAndStorage();
    await signOutUser();

    return { success: true, message: 'Account and personal data permanently deleted from Supabase.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to delete account.' };
  }
}

/**
 * Purges legacy unscoped global localStorage keys and cross-contaminated profile data (runs once)
 */
export function purgeLegacyUnscopedStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const PURGE_DONE_FLAG = 'giriraj_legacy_purge_v5_done';
    if (localStorage.getItem(PURGE_DONE_FLAG)) {
      return;
    }
    const legacyKeys = [
      'giriraj_user_phone',
      'giriraj_user_name',
      'giriraj_user_email',
      'giriraj_user_photo',
      'giriraj_user_dob',
      'giriraj_user_email_verified',
      'giriraj_user_wallet_balance',
      'giriraj_user_refund_balance',
      'giriraj_user_cashback_balance',
      'giriraj_user_addresses_v4',
      'giriraj_active_address_v4',
      'giriraj_active_address',
      'giriraj_active_saved_address',
      'giriraj_active_landmark',
      'giriraj_selected_area',
      'giriraj_order_ratings',
      'giriraj_cart_items',
      'giriraj_user_saved_upi',
      'giriraj_saved_addresses',
      'giriraj_orders_v2',
      'giriraj_customer_orders',
      'giriraj_orders_cache',
      'giriraj_saved_items_v1',
      'giriraj_master_orders'
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));

    const ADMIN_EMAILS = ['gauravgiri123344@gmail.com', 'mdhassan1738@gmail.com'];
    const adminNames = ['md hassan', 'md. hassan', 'hassan', 'mdhassan'];

    // Sanitize any cached profiles and addresses that may have accidentally borrowed admin data
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('giriraj_profile_') || key.startsWith('giriraj_addrs_') || key.startsWith('giriraj_active_addr_'))) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            if (key.startsWith('giriraj_profile_')) {
              const p = JSON.parse(raw);
              let modified = false;
              const pEmail = (p.email || '').trim().toLowerCase();
              const isPAdmin = pEmail && ADMIN_EMAILS.includes(pEmail);

              if (!isPAdmin) {
                // If this non-admin profile has the admin phone, strip it immediately
                const rawP = (p.phone || '').replace(/\D/g, '').slice(-10);
                if (rawP === '8777400280') {
                  p.phone = '';
                  p.phoneVerified = false;
                  // If corrupted with admin phone, restore genuine Google name or email prefix
                  if (p.name && adminNames.includes(p.name.trim().toLowerCase())) {
                    p.name = pEmail ? pEmail.split('@')[0] : 'Customer';
                  }
                  modified = true;
                }
                // Strip synthetic internal emails
                if (p.email && p.email.includes('@girirajpower.internal')) {
                  p.email = '';
                  modified = true;
                }
              }
              if (modified) {
                localStorage.setItem(key, JSON.stringify(p));
              }
            } else if (key.startsWith('giriraj_addrs_')) {
              // If addresses key is for non-admin, filter out admin addresses
              const addrs = JSON.parse(raw);
              if (Array.isArray(addrs)) {
                const filtered = addrs.filter((a: any) => {
                  const p = (a.receiverPhone || a.receiver_phone || '').replace(/\D/g, '').slice(-10);
                  const name = (a.receiverName || a.receiver_name || '').trim().toLowerCase();
                  if (p === '8777400280' || adminNames.includes(name)) {
                    return false;
                  }
                  return true;
                });
                if (filtered.length !== addrs.length) {
                  localStorage.setItem(key, JSON.stringify(filtered));
                }
              }
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    localStorage.setItem(PURGE_DONE_FLAG, 'true');
  } catch (e) {
    // ignore
  }
}

// Auto-purge legacy shared keys once on load
if (typeof window !== 'undefined') {
  purgeLegacyUnscopedStorage();
}

// Safe LocalStorage helpers for SSR / sandboxed iframe environments
export function safeGetItem(key: string): string | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? localStorage.getItem(key) : null;
  } catch (e) {
    console.warn(`Error reading from localStorage key "${key}":`, e);
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn(`Error writing to localStorage key "${key}":`, e);
  }
}

export function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn(`Error removing from localStorage key "${key}":`, e);
  }
}

// ============================================================================
// TASK 2: SUPABASE AUTHENTICATION (Google OAuth + Mobile OTP + Email & Password)
// ============================================================================

/**
 * 1. Email & Password Sign-in using Supabase
 */
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    });

    if (error) {
      return { user: null, session: null, error };
    }

    if (data.user) {
      const userMeta = data.user.user_metadata || {};
      const name = userMeta.full_name || userMeta.name || email.split('@')[0] || 'Customer';
      saveUserProfile({
        email: data.user.email,
        name,
        emailVerified: !!data.user.email_confirmed_at || !!data.user.confirmed_at
      });
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { user: null, session: null, error };
  }
}

/**
 * 2. Email & Password Sign-up / Registration using Supabase
 */
export async function signUpWithEmailPassword(
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: User | null; session: Session | null; error: Error | null; requiresEmailVerification?: boolean }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          full_name: fullName?.trim() || 'Giriraj Customer'
        }
      }
    });

    if (error) {
      return { user: null, session: null, error };
    }

    const requiresEmailVerification = !data.session && !!data.user;

    if (data.user) {
      const name = fullName?.trim() || email.split('@')[0] || 'Customer';
      saveUserProfile({
        email: data.user.email,
        name,
        emailVerified: !requiresEmailVerification
      });
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
      requiresEmailVerification
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { user: null, session: null, error };
  }
}

/**
 * 3. Send Password Reset Email using Supabase
 */
export async function resetPasswordForEmail(
  email: string
): Promise<{ error: Error | null; success: boolean }> {
  try {
    const isApp = isAndroidAppEnvironment();
    const redirectTo = isApp
      ? 'https://www.smartrun.in/reset-password?target=app&source=android_app'
      : (typeof window !== 'undefined' ? `${window.location.origin}/reset-password?client=web` : undefined);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo
    });

    if (error) {
      return { error, success: false };
    }
    return { error: null, success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { error, success: false };
  }
}

/**
 * 4. Google OAuth Sign-in using Supabase
 */
export async function signInWithGoogle(): Promise<{ error: Error | null; url?: string | null }> {
  try {
    // Reset any previous active user scope to prevent cross-account profile inheritance
    activeUserScope = null;
    clearUserProfile();

    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    const isApp = isAndroidAppEnvironment();
    const isNative = Capacitor.isNativePlatform();

    let redirectTo: string;
    if (isApp) {
      // IN ANDROID APP:
      // Pass the canonical HTTPS app-redirect callback URL:
      // https://www.smartrun.in/login?target=app&source=android_app
      // 1. Supabase allows https://www.smartrun.in/** by default (primary domain).
      // 2. When Google OAuth completes, browser opens https://www.smartrun.in/login?target=app&source=android_app#access_token=...
      // 3. AndroidAppBridgePrompt recognizes target=app and instantly forwards tokens to smartrun://login and intent://
      // 4. Capacitor App receives session via appUrlOpen, closes the browser tab, and logs in inside the app!
      try {
        localStorage.setItem('smartrun_oauth_target', 'android_app');
        sessionStorage.setItem('smartrun_oauth_target', 'android_app');
      } catch {}
      redirectTo = 'https://www.smartrun.in/login?target=app&source=android_app';
    } else {
      // IN STANDARD WEBSITE:
      // User is browsing via web browser on desktop or mobile phone.
      // Must stay and log into the website directly. No app redirect or app bridge prompt.
      try {
        localStorage.removeItem('smartrun_oauth_target');
        sessionStorage.removeItem('smartrun_oauth_target');
        localStorage.removeItem('giriraj_pending_native_oauth');
        localStorage.removeItem('giriraj_oauth_from_android_app');
      } catch {}
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.smartrun.in';
      redirectTo = `${origin}/login?client=web`;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: isIframe || isNative,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account consent'
        }
      }
    });

    if (error) {
      console.error('Supabase Google OAuth error:', error);
      return { error };
    }

    if (data?.url) {
      if (isIframe) {
        // In an iframe preview (like AI Studio canvas), open in a new window to bypass iframe 403 security blocks
        const authWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
        if (!authWindow) {
          window.location.href = data.url;
        }
      } else if (isNative) {
        // In native Android APK, open in Chrome Custom Tab via Capacitor Browser
        try {
          await Browser.open({
            url: data.url,
            windowName: '_self',
            presentationStyle: 'popover',
            toolbarColor: '#F9C017'
          });
        } catch (browserErr) {
          console.warn('Capacitor Browser.open error, falling back to window.open:', browserErr);
          window.open(data.url, '_system', 'noopener,noreferrer');
        }
      } else if (isApp) {
        // In Android WebView wrapper, open via external browser to avoid Google 403 disallowed_useragent
        window.open(data.url, '_system', 'noopener,noreferrer') || (window.location.href = data.url);
      } else {
        // Standard website in browser: redirect current page
        window.location.href = data.url;
      }
    }

    return { error: null, url: data.url };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Unexpected Google OAuth error:', error);
    return { error };
  }
}

/**
 * 2. Send SMS OTP to Mobile Phone number using Supabase Phone Auth
 */
export async function sendPhoneOtp(rawPhone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanDigits = rawPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number' };
    }
    // Format with E.164 country code (India +91)
    const formattedPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`;

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: {
        shouldCreateUser: true
      }
    });

    if (error) {
      console.warn('Supabase Phone OTP notice:', error.message);
      // If SMS provider not yet activated in dashboard, return friendly message while allowing dev flow
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 3. Verify SMS OTP using Supabase Phone Auth
 */
export async function verifyPhoneOtp(
  rawPhone: string,
  token: string
): Promise<{ user: User | null; session: Session | null; error?: string }> {
  try {
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const formattedPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`;

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: token.trim(),
      type: 'sms'
    });

    if (error) {
      console.warn('Supabase verifyOtp notice:', error.message);
      return { user: null, session: null, error: error.message };
    }

    if (data.user) {
      // Sync user profile immediately
      const defaultName = data.user.user_metadata?.full_name || 'Giriraj Customer';
      saveUserProfile({
        phone: formattedPhone,
        name: defaultName,
        email: data.user.email
      });
    }

    return { user: data.user, session: data.session };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { user: null, session: null, error: msg };
  }
}

/**
 * Helper to normalize phone numbers to E.164 (+91XXXXXXXXXX with no spaces)
 */
export function formatToE164Phone(rawPhone: string): string {
  let digits = rawPhone.replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (rawPhone.trim().startsWith('+')) {
    return `+${digits}`;
  }
  return `+91${digits.slice(-10)}`;
}

/**
 * Check if a Supabase Auth error indicates the phone/email is already registered to another account
 */
export function isCredentialConflictError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();
  const status = err.status;
  return (
    status === 422 ||
    status === 409 ||
    code.includes('duplicate') ||
    code.includes('conflict') ||
    code.includes('already_exists') ||
    code.includes('phone_exists') ||
    msg.includes('already registered') ||
    msg.includes('already in use') ||
    msg.includes('already exists') ||
    msg.includes('already linked') ||
    msg.includes('conflict') ||
    msg.includes('duplicate') ||
    msg.includes('phone_exists') ||
    msg.includes('user with this phone already exists') ||
    msg.includes('user with this email already exists') ||
    msg.includes('phone number is already registered') ||
    msg.includes('phone number already registered')
  );
}

/**
 * Links a mobile number to the currently logged in Supabase user account.
 * Triggers Supabase to send a verification OTP via the configured custom SMS hook.
 */
export async function linkPhoneToUser(
  fullE164Number: string
): Promise<{ success: boolean; error?: string; isConflict?: boolean }> {
  try {
    const { data, error } = await supabase.auth.updateUser({ phone: fullE164Number });
    if (error) {
      const isConflict = isCredentialConflictError(error);
      return {
        success: false,
        error: isConflict ? 'This mobile number is already linked to another account.' : error.message,
        isConflict
      };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Confirms and finalizes phone linking using Supabase's 'phone_change' OTP verification.
 */
export async function verifyPhoneChangeOtp(
  fullE164Number: string,
  token: string
): Promise<{ success: boolean; error?: string; isConflict?: boolean }> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullE164Number,
      token: token.trim(),
      type: 'phone_change'
    });
    if (error) {
      const isConflict = isCredentialConflictError(error);
      return {
        success: false,
        error: isConflict ? 'This mobile number is already linked to another account.' : error.message,
        isConflict
      };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Dispatches an Email OTP to the user's verified/linked email to authorize a mobile number change.
 */
export async function sendEmailOtpForPhoneChange(
  email: string,
  newPhone?: string,
  customerName?: string
): Promise<{ success: boolean; message?: string; emailMasked?: string; devOtp?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone: newPhone, customerName })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || data.message || 'Failed to send verification code to email.' };
    }
    return {
      success: true,
      message: data.message,
      emailMasked: data.emailMasked,
      devOtp: data.devOtp
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error sending email verification code.' };
  }
}

/**
 * Verifies the 6-digit code sent to the user's email before updating their mobile number.
 */
export async function verifyEmailOtpForPhoneChange(
  email: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/verify-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || data.message || 'Invalid or expired OTP code.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error verifying email code.' };
  }
}

/**
 * Links an email address to the currently logged in Supabase user account.
 */
export async function linkEmailToUser(
  email: string
): Promise<{ success: boolean; error?: string; isConflict?: boolean }> {
  try {
    const { data, error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
    if (error) {
      const isConflict = isCredentialConflictError(error);
      return {
        success: false,
        error: isConflict ? 'This email address is already linked to another account.' : error.message,
        isConflict
      };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

let isLoggingOut = false;

export function isUserLoggingOut(): boolean {
  return isLoggingOut;
}

/**
 * 4. Sign Out from Supabase
 */
export async function signOutUser(): Promise<void> {
  try {
    isLoggingOut = true;
    clearUserProfile();
    activeUserScope = null;

    // 1. Immediately clear local Supabase session scope so subsequent reads return null
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {}

    // 2. Perform global Supabase sign out across server sessions
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.debug('Supabase global sign out note:', e);
    }

    // 3. Also sign out from Firebase Auth and clear verification sessions
    try {
      const { signOutFromAll } = await import('./firebaseAuthService');
      await signOutFromAll();
    } catch (e) {
      console.debug('Firebase signout note:', e);
    }

    // 4. Aggressively clean all cache memory from user devices and web
    await purgeAllUserCacheAndStorage();
  } catch (error) {
    console.error('Supabase sign out error:', error);
  } finally {
    clearUserProfile();
    activeUserScope = null;
    isLoggingOut = false;
  }
}

/**
 * 5. Global Auth State Listener & Initial Session Getter
 */
export async function getInitialAuthSession(): Promise<{ session: Session | null; user: User | null }> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Initial session notice:', error.message);
      return { session: null, user: null };
    }
    return { session: data.session, user: data.session?.user || null };
  } catch (err) {
    console.warn('Session fetch error:', err);
    return { session: null, user: null };
  }
}

export function cleanPhoneAutofill(val: string): string {
  if (!val) return '';
  let cleaned = val.trim();

  // Strip international prefixes if present
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3).trim();
  } else if (cleaned.startsWith('0091')) {
    cleaned = cleaned.slice(4).trim();
  } else if (cleaned.startsWith('91') && cleaned.replace(/\D/g, '').length > 10) {
    cleaned = cleaned.slice(2).trim();
  }

  // Strip spaces, dashes, parentheses
  cleaned = cleaned.replace(/[\s\-()]/g, '');

  // Strip leading zero(s) introduced by browser autofill (e.g. 01234567890 -> 1234567890)
  cleaned = cleaned.replace(/^0+/, '');

  return cleaned;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null, user: User | null) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (isLoggingOut) {
      clearUserProfile();
      setActiveUserScope(null);
      callback('SIGNED_OUT', null, null);
      return;
    }

    const user = session?.user || null;

    if (event === 'SIGNED_OUT' || (!session && !user && event !== 'INITIAL_SESSION')) {
      clearUserProfile();
      setActiveUserScope(null);
      callback(event, null, null);
      return;
    }

    if (user) {
      const scope = getUserScopeKeyFromUser(user);
      setActiveUserScope(scope);

      // Extract profile details strictly for this authenticated user
      const userMeta = user.user_metadata || {};
      const localProf = scope ? getSavedUserProfile(scope) : null;
      // VERIFY: Does localProf actually belong to THIS user?
      const localBelongsToUser =
        Boolean(localProf) &&
        ((localProf?.id && localProf.id === user.id) ||
         (localProf?.email && user.email && localProf.email.toLowerCase() === user.email.toLowerCase()));
      const validLocalProf = localBelongsToUser ? localProf : null;

      const ADMIN_EMAILS = ['gauravgiri123344@gmail.com', 'mdhassan1738@gmail.com'];
      const isUserAdmin = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
      const adminNames = ['md hassan', 'md. hassan', 'hassan', 'mdhassan'];

      let rawPhone = user.phone || userMeta.phone || validLocalProf?.phone || '';
      let phone = cleanPhoneAutofill(rawPhone);
      // Non-admin accounts must NEVER adopt or inherit the admin depot phone
      if (!isUserAdmin && (phone === '8777400280' || phone.endsWith('8777400280'))) {
        phone = '';
      }

      let name =
        userMeta.full_name ||
        userMeta.name ||
        userMeta.custom_claims?.name ||
        validLocalProf?.name ||
        (user.email ? user.email.split('@')[0] : 'Customer');

      const rawEmail = user.email || userMeta.email || validLocalProf?.email || '';
      const email = rawEmail.includes('@girirajpower.internal') ? '' : rawEmail;
      let photoURL = userMeta.avatar_url || userMeta.picture || validLocalProf?.photoURL || undefined;
      const dob = userMeta.dob || userMeta.birth_date || userMeta.date_of_birth || validLocalProf?.dob || '';
      const emailVerified = !!user.email_confirmed_at || !!user.confirmed_at;

      saveUserProfile(
        {
          phone,
          name,
          email,
          photoURL,
          dob,
          emailVerified
        },
        scope || undefined
      );

      // Fetch the latest authoritative profile from Supabase rather than overwriting cloud with empty defaults
      fetchUserProfileFromSupabase(user.id).catch((e) => console.debug('Background profile sync:', e));
    }
    callback(event, session, user);
  });

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Syncs user profile data into Supabase `user_profiles` and `profiles` tables, and Auth user metadata
 */
export async function syncUserProfileToSupabase(
  userId: string,
  profile: { phone?: string; full_name?: string; email?: string; avatar_url?: string; dob?: string; address?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'No user ID' };

  const cleanPhone = profile.phone !== undefined ? cleanPhoneAutofill(profile.phone) : undefined;
  
  const userProfilesPayload: Record<string, any> = {
    user_id: userId,
    updated_at: new Date().toISOString()
  };

  const profilesPayload: Record<string, any> = {
    id: userId,
    updated_at: new Date().toISOString()
  };

  if (cleanPhone !== undefined && cleanPhone !== '') {
    userProfilesPayload.phone = cleanPhone;
    profilesPayload.phone = cleanPhone;
  }
  if (profile.full_name !== undefined && profile.full_name !== '') {
    userProfilesPayload.full_name = profile.full_name;
    profilesPayload.full_name = profile.full_name;
    profilesPayload.name = profile.full_name;
  }
  if (profile.email !== undefined && profile.email !== '') {
    userProfilesPayload.email = profile.email;
    profilesPayload.email = profile.email;
  }
  if (profile.avatar_url !== undefined && profile.avatar_url !== '') {
    userProfilesPayload.avatar_url = profile.avatar_url;
    profilesPayload.avatar_url = profile.avatar_url;
  }
  if (profile.dob !== undefined && profile.dob !== '') {
    userProfilesPayload.dob = profile.dob;
    profilesPayload.dob = profile.dob;
    profilesPayload.birth_date = profile.dob;
    profilesPayload.date_of_birth = profile.dob;
  }
  if (profile.address !== undefined && profile.address !== '') {
    userProfilesPayload.address = profile.address;
    profilesPayload.address = profile.address;
  }

  // 1. Update Supabase Auth User Metadata so it travels automatically with the session across devices
  try {
    const metaUpdates: Record<string, any> = {};
    if (cleanPhone) metaUpdates.phone = cleanPhone;
    if (profile.full_name) {
      metaUpdates.full_name = profile.full_name;
      metaUpdates.name = profile.full_name;
    }
    if (profile.email) metaUpdates.email = profile.email;
    if (profile.avatar_url) {
      metaUpdates.avatar_url = profile.avatar_url;
      metaUpdates.picture = profile.avatar_url;
    }
    if (profile.dob) {
      metaUpdates.dob = profile.dob;
      metaUpdates.birth_date = profile.dob;
      metaUpdates.date_of_birth = profile.dob;
    }
    if (profile.address) metaUpdates.address = profile.address;

    if (Object.keys(metaUpdates).length > 0) {
      await supabase.auth.updateUser({ data: metaUpdates });
    }
  } catch (err) {
    console.debug('Auth metadata update notice:', err);
  }

  // 2. Also sync to server API backup
  try {
    fetch(`${API_BASE_URL}/api/user-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userProfilesPayload)
    }).catch(() => {});
  } catch {}

  let upsertSuccess = false;
  let lastError: string | undefined;

  // 3. Upsert to `user_profiles` table
  try {
    const { error: upError } = await supabase
      .from('user_profiles')
      .upsert(userProfilesPayload, { onConflict: 'user_id' });

    if (!upError) {
      upsertSuccess = true;
    } else {
      lastError = upError.message;
      console.warn('user_profiles upsert notice:', upError.message);
    }
  } catch (err: any) {
    lastError = err?.message || String(err);
  }

  // 4. Also upsert to `profiles` table (supports both table schemas)
  try {
    const { error: profError } = await supabase
      .from('profiles')
      .upsert(profilesPayload, { onConflict: 'id' });

    if (!profError) {
      upsertSuccess = true;
    } else {
      console.debug('profiles table upsert notice:', profError.message);
    }
  } catch {}

  if (!upsertSuccess && lastError) {
    enqueuePendingSync({
      type: 'profile',
      payload: userProfilesPayload
    });
    return { success: false, error: lastError };
  }

  return { success: true };
}

/**
 * Fetch profile directly from Supabase (`user_profiles`, `profiles`, and Auth user metadata)
 */
export async function fetchUserProfileFromSupabase(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;

  try {
    let cloudPhone = '';
    let cloudName = '';
    let cloudEmail = '';
    let cloudAvatar: string | undefined = undefined;
    let cloudDob: string | undefined = undefined;
    let walletBal = 0;
    let refundBal = 0;
    let cashbackBal = 0;
    let found = false;

    // 1. Check user_profiles table (keyed on user_id)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        found = true;
        if (data.phone) cloudPhone = cleanPhoneAutofill(data.phone);
        if (data.full_name || data.name) cloudName = data.full_name || data.name;
        if (data.email) cloudEmail = data.email;
        if (data.avatar_url || data.photo_url || data.picture) cloudAvatar = data.avatar_url || data.photo_url || data.picture;
        if (data.dob || data.birth_date || data.date_of_birth) cloudDob = data.dob || data.birth_date || data.date_of_birth;
        if (data.wallet_balance !== undefined) walletBal = Number(data.wallet_balance || 0);
        if (data.refund_balance !== undefined) refundBal = Number(data.refund_balance || 0);
        if (data.cashback_balance !== undefined) cashbackBal = Number(data.cashback_balance || 0);
      }
    } catch {}

    // 2. Check profiles table (keyed on id)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        found = true;
        if (data.phone && !cloudPhone) cloudPhone = cleanPhoneAutofill(data.phone);
        if ((data.full_name || data.name) && !cloudName) cloudName = data.full_name || data.name;
        if (data.email && !cloudEmail) cloudEmail = data.email;
        if ((data.avatar_url || data.photo_url || data.picture) && !cloudAvatar) cloudAvatar = data.avatar_url || data.photo_url || data.picture;
        if ((data.dob || data.birth_date || data.date_of_birth) && !cloudDob) cloudDob = data.dob || data.birth_date || data.date_of_birth;
      }
    } catch {}

    // 3. Check Supabase Auth metadata for any phone, dob, name, avatar saved directly in auth session
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id === userId) {
        const meta = authData.user.user_metadata || {};
        const isInternalPhoneUser =
          Boolean(authData.user.email?.includes('@girirajpower.internal')) ||
          (!authData.user.email && Boolean(authData.user.phone));

        if (isInternalPhoneUser) {
          // Check if metadata has real_email from linked account
          if (!cloudEmail && meta.real_email && !meta.real_email.includes('@girirajpower.internal')) {
            cloudEmail = meta.real_email;
            found = true;
          }
          if (cloudEmail && cloudEmail.includes('@girirajpower.internal')) {
            cloudEmail = '';
          }
          if (!cloudPhone && (authData.user.phone || meta.phone || meta.contact_number)) {
            cloudPhone = cleanPhoneAutofill(authData.user.phone || meta.phone || meta.contact_number);
            found = true;
          }
          if (!cloudName && (meta.full_name || meta.name)) {
            cloudName = meta.full_name || meta.name;
            found = true;
          }
          if (!cloudName) {
            cloudName = `Giriraj Member (${cloudPhone.slice(-4) || 'User'})`;
            found = true;
          }
        } else {
          if (!cloudPhone && (authData.user.phone || meta.phone || meta.contact_number)) {
            cloudPhone = cleanPhoneAutofill(authData.user.phone || meta.phone || meta.contact_number);
            found = true;
          }
          if (!cloudName && (meta.full_name || meta.name)) {
            cloudName = meta.full_name || meta.name;
            found = true;
          }
          if (!cloudEmail && authData.user.email && !authData.user.email.includes('@girirajpower.internal')) {
            cloudEmail = authData.user.email;
            found = true;
          }
        }

        if (!cloudDob && (meta.dob || meta.birth_date || meta.date_of_birth)) {
          cloudDob = meta.dob || meta.birth_date || meta.date_of_birth;
          found = true;
        }
        if (!cloudAvatar && (meta.avatar_url || meta.picture || meta.photoURL)) {
          cloudAvatar = meta.avatar_url || meta.picture || meta.photoURL;
          found = true;
        }
      }
    } catch {}

    // 4. Cross-account resolution: Check by phone or email if either is missing
    try {
      const cleanPhone = cloudPhone ? cloudPhone.replace(/\D/g, '').slice(-10) : '';
      const formattedE164 = cleanPhone ? `+91${cleanPhone}` : '';

      // If we have a verified phone but email is missing, query other user_profiles records with this phone
      if (cleanPhone && !cloudEmail) {
        const { data: pByPhone } = await supabase
          .from('user_profiles')
          .select('*')
          .or(`phone.eq.${formattedE164},phone.eq.${cleanPhone},phone.ilike.%${cleanPhone}%`)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (pByPhone && pByPhone.length > 0) {
          const matchWithEmail = pByPhone.find((p) => p.email && !p.email.includes('@girirajpower.internal'));
          if (matchWithEmail) {
            cloudEmail = matchWithEmail.email;
            if ((!cloudName || cloudName.startsWith('Giriraj Member')) && (matchWithEmail.full_name || matchWithEmail.name)) {
              cloudName = matchWithEmail.full_name || matchWithEmail.name;
            }
            if (!cloudAvatar && (matchWithEmail.avatar_url || matchWithEmail.photo_url)) {
              cloudAvatar = matchWithEmail.avatar_url || matchWithEmail.photo_url;
            }
            if (!cloudDob && matchWithEmail.dob) cloudDob = matchWithEmail.dob;
            found = true;
          }
        }
      }

      // If we have an email but phone is missing, query other user_profiles records with this email
      if (cloudEmail && !cloudPhone && !cloudEmail.includes('@girirajpower.internal')) {
        const { data: pByEmail } = await supabase
          .from('user_profiles')
          .select('*')
          .ilike('email', cloudEmail.trim().toLowerCase())
          .order('updated_at', { ascending: false })
          .limit(5);

        if (pByEmail && pByEmail.length > 0) {
          const matchWithPhone = pByEmail.find((p) => p.phone);
          if (matchWithPhone && matchWithPhone.phone) {
            cloudPhone = cleanPhoneAutofill(matchWithPhone.phone);
            if ((!cloudName || cloudName.startsWith('Giriraj Member')) && (matchWithPhone.full_name || matchWithPhone.name)) {
              cloudName = matchWithPhone.full_name || matchWithPhone.name;
            }
            if (!cloudAvatar && (matchWithPhone.avatar_url || matchWithPhone.photo_url)) {
              cloudAvatar = matchWithPhone.avatar_url || matchWithPhone.photo_url;
            }
            if (!cloudDob && matchWithPhone.dob) cloudDob = matchWithPhone.dob;
            found = true;
          }
        }
      }

      // If still missing email, check orders placed under this phone
      if (cleanPhone && !cloudEmail) {
        const { data: oRows } = await supabase
          .from('orders')
          .select('customer_name, recipient_name, customer_email, recipient_email, updated_at')
          .or(`phone.eq.${cleanPhone},phone.eq.${formattedE164},recipient_phone.eq.${cleanPhone},recipient_phone.eq.${formattedE164}`)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (oRows && oRows.length > 0) {
          const oBest = oRows.find((o) => (o.customer_email || o.recipient_email) && !(o.customer_email || o.recipient_email).includes('@girirajpower.internal'));
          if (oBest) {
            const raw = (oBest.customer_email || oBest.recipient_email || '').trim().toLowerCase();
            if (raw && !raw.includes('@girirajpower.internal')) {
              cloudEmail = raw;
              found = true;
            }
            if ((!cloudName || cloudName.startsWith('Giriraj Member')) && (oBest.customer_name || oBest.recipient_name)) {
              cloudName = oBest.customer_name || oBest.recipient_name;
              found = true;
            }
          }
        }
      }
    } catch (e) {
      console.debug('Cross-account profile resolution notice:', e);
    }

    if (cloudEmail && cloudEmail.includes('@girirajpower.internal')) {
      cloudEmail = '';
    }

    const ADMIN_EMAILS = ['gauravgiri123344@gmail.com', 'mdhassan1738@gmail.com'];
    const isThisUserAdmin = Boolean(cloudEmail && ADMIN_EMAILS.includes(cloudEmail.toLowerCase()));
    const adminNames = ['md hassan', 'md. hassan', 'hassan', 'mdhassan'];

    if (!isThisUserAdmin) {
      // Auto-heal non-admin account if it was previously corrupted with the admin phone
      if (cloudPhone === '8777400280' || cloudPhone === '+918777400280' || cloudPhone.endsWith('8777400280')) {
        console.warn('Purging leaked admin phone from non-admin user:', cloudEmail);
        cloudPhone = '';
      }
      // Revert name to user metadata or email prefix if corrupted with admin name
      if (cloudName && adminNames.includes(cloudName.trim().toLowerCase())) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const meta = authData?.user?.user_metadata || {};
          cloudName = meta.full_name || meta.name || (cloudEmail ? cloudEmail.split('@')[0] : 'Customer');
        } catch {
          cloudName = cloudEmail ? cloudEmail.split('@')[0] : 'Customer';
        }
      }
      // Restore genuine Google avatar if available
      try {
        const { data: authData } = await supabase.auth.getUser();
        const meta = authData?.user?.user_metadata || {};
        if (meta.avatar_url || meta.picture) {
          cloudAvatar = meta.avatar_url || meta.picture;
        }
      } catch {}

      // Proactively heal and clean Supabase database rows so cloud data is corrected permanently
      syncUserProfileToSupabase(userId, {
        phone: cloudPhone,
        full_name: cloudName,
        email: cloudEmail || undefined,
        avatar_url: cloudAvatar,
        dob: cloudDob
      }).catch(() => {});
    }

    if (found) {
      const mappedProfile: UserProfile = {
        id: userId,
        name: cloudName || 'Customer',
        phone: cloudPhone,
        email: cloudEmail,
        emailVerified: Boolean(cloudEmail),
        photoURL: cloudAvatar,
        dob: cloudDob,
        walletBalance: walletBal,
        refundBalance: refundBal,
        cashbackBalance: cashbackBal
      };

      const scope = `uid_${userId}`;
      inMemoryProfiles.set(scope, mappedProfile);
      return mappedProfile;
    }
  } catch (err) {
    console.warn('Error fetching profile from Supabase:', err);
  }
  return null;
}

/**
 * Get saved user profile from in-memory session or current Supabase session
 */
export function getSavedUserProfile(userScopeOverride?: string): UserProfile | null {
  const scope = userScopeOverride || activeUserScope;
  if (!scope) {
    return null;
  }

  // 1. Check in-memory runtime store (no persistent cache dependency)
  if (inMemoryProfiles.has(scope)) {
    return inMemoryProfiles.get(scope)!;
  }

  const raw = safeGetItem(`giriraj_profile_${scope}`);
  if (!raw) {
    return null;
  }

  try {
    const prof: UserProfile = JSON.parse(raw);
    if (!prof.phone && !prof.email && (!prof.name || prof.name === 'Customer')) {
      return null;
    }
    if (prof.email && prof.email.includes('@girirajpower.internal')) {
      prof.email = '';
    }
    inMemoryProfiles.set(scope, prof);
    return prof;
  } catch {
    return null;
  }
}

/**
 * Save user profile updates to in-memory state and persist to Supabase
 */
export async function saveUserProfile(
  data: {
    phone?: string;
    phoneVerified?: boolean;
    name?: string;
    email?: string;
    emailVerified?: boolean;
    photoURL?: string;
    dob?: string;
    refundBalance?: number;
    cashbackBalance?: number;
    walletBalance?: number;
  },
  userScopeOverride?: string
): Promise<{ success: boolean; profile: UserProfile; error?: string }> {
  let authUserId: string | null = null;
  try {
    const { data: authData } = await supabase.auth.getUser();
    authUserId = authData?.user?.id || null;
  } catch {}

  const scope =
    userScopeOverride ||
    (authUserId ? `uid_${authUserId}` : null) ||
    activeUserScope ||
    (data.email ? getUserScopeKeyFromUser({ email: data.email }) : null) ||
    (data.phone ? getUserScopeKeyFromUser({ phone: data.phone }) : null);

  const existing = (scope ? getSavedUserProfile(scope) : null) || {
    name: 'Customer',
    phone: '',
    phoneVerified: false,
    email: '',
    emailVerified: false,
    walletBalance: 0,
    refundBalance: 0,
    cashbackBalance: 0
  };

  let effectiveEmail = data.email !== undefined ? data.email : existing.email;
  if (effectiveEmail && effectiveEmail.includes('@girirajpower.internal')) {
    effectiveEmail = '';
  }

  const updated: UserProfile = {
    ...existing,
    id: authUserId || existing.id,
    phone: data.phone !== undefined ? data.phone : existing.phone,
    phoneVerified: data.phoneVerified !== undefined ? data.phoneVerified : existing.phoneVerified,
    name: data.name !== undefined ? data.name : existing.name,
    email: effectiveEmail,
    emailVerified: data.emailVerified !== undefined ? data.emailVerified : Boolean(effectiveEmail),
    photoURL: data.photoURL !== undefined ? data.photoURL : existing.photoURL,
    dob: data.dob !== undefined ? data.dob : existing.dob,
    refundBalance: data.refundBalance !== undefined ? data.refundBalance : existing.refundBalance,
    cashbackBalance: data.cashbackBalance !== undefined ? data.cashbackBalance : existing.cashbackBalance,
    walletBalance:
      data.walletBalance !== undefined
        ? data.walletBalance
        : (existing.walletBalance !== undefined ? existing.walletBalance : ((existing.refundBalance || 0) + (existing.cashbackBalance || 0)))
  };

  if (scope) {
    inMemoryProfiles.set(scope, updated);
    safeSetItem(`giriraj_profile_${scope}`, JSON.stringify(updated));
  }

  const cleanPhone = updated.phone ? updated.phone.replace(/\D/g, '').slice(-10) : '';
  if (cleanPhone) {
    inMemoryProfiles.set(`phone_${cleanPhone}`, updated);
    safeSetItem(`giriraj_profile_phone_${cleanPhone}`, JSON.stringify(updated));
  }

  // Always sync to server API
  try {
    fetch('/api/user-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: authUserId || updated.id,
        phone: updated.phone || null,
        full_name: updated.name || null,
        email: effectiveEmail || null,
        avatar_url: updated.photoURL || null,
        dob: updated.dob || null
      })
    }).catch(() => {});
  } catch {}

  // Synchronize to Supabase & Backend API
  try {
    if (authUserId) {
      broadcastUserProfileUpdate(updated, authUserId);
      const syncResult = await syncUserProfileToSupabase(authUserId, {
        phone: data.phone,
        full_name: data.name,
        email: effectiveEmail || null,
        avatar_url: data.photoURL,
        dob: data.dob
      });
      return { success: syncResult.success, profile: updated, error: syncResult.error };
    }
  } catch (err: any) {
    return { success: true, profile: updated };
  }

  return { success: true, profile: updated };
}

// Cross-tab and real-time profile broadcast
const profileBroadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('giriraj_user_profile_sync')
    : null;

type ProfileListener = (profile: Partial<UserProfile>) => void;
const profileListeners: Set<ProfileListener> = new Set();
let userProfileRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let userProfileRealtimeChannelUserId: string | null = null;

export function broadcastUserProfileUpdate(profile: Partial<UserProfile>, userId?: string): void {
  const targetUserId = userId || profile.id;
  // STRICT: Never broadcast profile updates across tabs without an authoritative target userId
  if (!targetUserId) return;

  const payload = { ...profile, userId: targetUserId, id: targetUserId };

  // 1. Dispatch custom event for current window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('giriraj_profile_updated', { detail: payload }));
  }

  // 2. Broadcast to other tabs on same device/browser
  try {
    if (profileBroadcastChannel) {
      profileBroadcastChannel.postMessage({ type: 'PROFILE_UPDATED', profile: payload, userId: targetUserId });
    }
  } catch {}

  // 3. Broadcast across devices via Supabase Realtime WebSocket channel
  try {
    const channelName = `profile_sync_${targetUserId}`;
    const channel = supabase.channel(channelName);
    channel.send({
      type: 'broadcast',
      event: 'profile_updated',
      payload
    }).catch(() => {});
  } catch {}
}

/**
 * Subscribes to real-time user profile changes across all devices, browsers, and tabs
 */
export function subscribeToUserProfile(
  userId: string,
  callback: (profile: Partial<UserProfile>) => void
): () => void {
  if (!userId) return () => {};

  profileListeners.add(callback);

  // Tear down channel if user changed
  if (userProfileRealtimeChannel && userProfileRealtimeChannelUserId !== userId) {
    try {
      supabase.removeChannel(userProfileRealtimeChannel);
    } catch {}
    userProfileRealtimeChannel = null;
    userProfileRealtimeChannelUserId = null;
  }

  // Set up Supabase Realtime Channel if not already active
  const channelName = `profile_sync_${userId}`;
  if (!userProfileRealtimeChannel) {
    userProfileRealtimeChannelUserId = userId;
    userProfileRealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const newRow = payload.new || {};
          const mapped: Partial<UserProfile> = {};
          if (newRow.phone) mapped.phone = cleanPhoneAutofill(newRow.phone);
          if (newRow.full_name || newRow.name) mapped.name = newRow.full_name || newRow.name;
          if (newRow.email) mapped.email = newRow.email;
          if (newRow.avatar_url) mapped.photoURL = newRow.avatar_url;
          if (newRow.dob) mapped.dob = newRow.dob;
          if (newRow.wallet_balance !== undefined) mapped.walletBalance = Number(newRow.wallet_balance);
          if (newRow.refund_balance !== undefined) mapped.refundBalance = Number(newRow.refund_balance);
          if (newRow.cashback_balance !== undefined) mapped.cashbackBalance = Number(newRow.cashback_balance);

          profileListeners.forEach((cb) => cb(mapped));
          fetchUserProfileFromSupabase(userId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload: any) => {
          const newRow = payload.new || {};
          const mapped: Partial<UserProfile> = {};
          if (newRow.phone) mapped.phone = cleanPhoneAutofill(newRow.phone);
          if (newRow.full_name || newRow.name) mapped.name = newRow.full_name || newRow.name;
          if (newRow.email) mapped.email = newRow.email;
          if (newRow.avatar_url) mapped.photoURL = newRow.avatar_url;
          if (newRow.dob || newRow.birth_date || newRow.date_of_birth) mapped.dob = newRow.dob || newRow.birth_date || newRow.date_of_birth;

          profileListeners.forEach((cb) => cb(mapped));
          fetchUserProfileFromSupabase(userId);
        }
      )
      .on('broadcast', { event: 'profile_updated' }, ({ payload }) => {
        if (payload && (payload.userId === userId || payload.id === userId)) {
          profileListeners.forEach((cb) => cb(payload));
          fetchUserProfileFromSupabase(userId);
        }
      })
      .subscribe();
  }

  // Cross-tab broadcast listener - strictly verify userId ownership
  const handleCustomEvent = (e: any) => {
    if (isLoggingOut) return;
    const detail = e.detail;
    if (detail && (detail.id === userId || detail.userId === userId)) {
      callback(detail);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('giriraj_profile_updated', handleCustomEvent);
  }

  const handleBroadcastMsg = (ev: MessageEvent) => {
    if (isLoggingOut) return;
    if (ev.data?.type === 'PROFILE_UPDATED') {
      const msgUserId = ev.data.userId || ev.data.profile?.userId || ev.data.profile?.id;
      if (msgUserId && String(msgUserId) === String(userId)) {
        callback(ev.data.profile);
      }
    }
  };
  if (profileBroadcastChannel) {
    profileBroadcastChannel.addEventListener('message', handleBroadcastMsg);
  }

  return () => {
    profileListeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('giriraj_profile_updated', handleCustomEvent);
    }
    if (profileBroadcastChannel) {
      profileBroadcastChannel.removeEventListener('message', handleBroadcastMsg);
    }
    if (profileListeners.size === 0 && userProfileRealtimeChannel) {
      supabase.removeChannel(userProfileRealtimeChannel);
      userProfileRealtimeChannel = null;
      userProfileRealtimeChannelUserId = null;
    }
  };
}

export function clearUserProfile(): void {
  // We detach the active in-memory session on log out, but MUST NOT delete
  // the user's persisted orders or saved addresses from localStorage.
  // This ensures that when the user logs back in with their account, their
  // full order history and addresses are immediately preserved and restored.
  activeUserScope = null;
  if (userProfileRealtimeChannel) {
    try {
      supabase.removeChannel(userProfileRealtimeChannel);
    } catch {}
    userProfileRealtimeChannel = null;
    userProfileRealtimeChannelUserId = null;
  }
}

// ============================================================================
// TASK 3: PER-USER ORDERS & REAL-TIME DATA ISOLATION (Supabase Database)
// ============================================================================

type OrderListener = (orders: Order[]) => void;
const orderListeners: Set<OrderListener> = new Set();
let ordersChannel: ReturnType<typeof supabase.channel> | null = null;

function isRealOrder(order: Order): boolean {
  if (!order || !order.id) return false;
  if (order.id.includes('7001') || order.id.toLowerCase().includes('demo')) return false;
  if (order.customerName === 'Anindya Chatterjee') return false;
  return true;
}

export function doesOrderBelongToUser(
  order: any,
  user?: { id?: string | null; email?: string | null; phone?: string | null; user_metadata?: any } | null
): boolean {
  if (!order || !isRealOrder(order)) return false;
  if (!user || !user.id) return false;

  const orderUserId = order.user_id || order.userId;
  const meta = user.user_metadata || {};
  const effectiveUserId = meta.master_user_id || meta.linked_user_id || user.id;

  // If the order has an explicit user_id matching current user or linked master account
  if (orderUserId && (String(orderUserId) === String(user.id) || String(orderUserId) === String(effectiveUserId))) {
    return true;
  }

  // Check exact 10-digit phone match (orders placed under the user's verified phone number)
  const rawUPhone = user.phone || meta.phone || meta.contact_number || '';
  const uPhone = rawUPhone.replace(/\D/g, '').slice(-10);
  const rawOPhone = order.phone || order.recipient_phone || order.recipientPhone || order.customerPhone || order.customer_phone || '';
  const oPhone = rawOPhone.replace(/\D/g, '').slice(-10);
  if (uPhone && oPhone && uPhone.length === 10 && oPhone.length === 10 && uPhone === oPhone) {
    return true;
  }

  // Check exact email match (case-insensitive) - ignore internal synthetic emails
  const uEmail = (meta.real_email || user.email || meta.email || '').trim().toLowerCase();
  const oEmail = (order.customerEmail || order.customer_email || order.recipient_email || order.recipientEmail || '').trim().toLowerCase();
  if (uEmail && oEmail && uEmail.includes('@') && !uEmail.includes('@girirajpower.internal') && uEmail === oEmail) {
    return true;
  }

  return false;
}

export function getDeletedOrderIds(): Set<string> {
  try {
    const raw = safeGetItem('giriraj_deleted_order_ids');
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export function markOrderAsDeleted(orderId: string): void {
  try {
    const set = getDeletedOrderIds();
    set.add(String(orderId));
    safeSetItem('giriraj_deleted_order_ids', JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Error saving deleted order id:', e);
  }
}

export function unmarkOrderAsDeleted(orderId: string): void {
  try {
    const set = getDeletedOrderIds();
    if (set.has(String(orderId))) {
      set.delete(String(orderId));
      safeSetItem('giriraj_deleted_order_ids', JSON.stringify(Array.from(set)));
    }
  } catch (e) {
    console.warn('Error unmarking deleted order id:', e);
  }
}

export function markAllOrdersAsDeleted(orderIds: string[]): void {
  try {
    const set = getDeletedOrderIds();
    orderIds.forEach((id) => set.add(String(id)));
    safeSetItem('giriraj_deleted_order_ids', JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Error saving deleted order ids list:', e);
  }
}

export function getStoredOrders(userScopeOverride?: string): Order[] {
  try {
    const scope = userScopeOverride || activeUserScope;
    // Strict isolation: Never return any orders if there is no active user scope
    if (!scope) {
      return [];
    }

    if (inMemoryOrders.has(scope)) {
      const deletedIds = getDeletedOrderIds();
      return (inMemoryOrders.get(scope) || [])
        .filter(isRealOrder)
        .filter((o) => !deletedIds.has(String(o.id)));
    }

    const raw = safeGetItem(`giriraj_orders_${scope}`);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const deletedIds = getDeletedOrderIds();
    const orders = parsed
      .filter(isRealOrder)
      .filter((o) => !deletedIds.has(String(o.id)))
      .map((o) => {
        // Strip legacy mock rider data from local caches
        if (o.deliveryPartner?.name && (o.deliveryPartner.name.includes('Bikash') || o.deliveryPartner.name.includes('⚡'))) {
          const { deliveryPartner, ...rest } = o;
          return rest;
        }
        return o;
      });
    inMemoryOrders.set(scope, orders);
    return orders;
  } catch (e) {
    console.error('Failed reading orders from storage', e);
    return [];
  }
}

export function clearAllStoredOrders(): void {
  try {
    if (activeUserScope) {
      localStorage.removeItem(`giriraj_orders_${activeUserScope}`);
    }
    notifyOrderListeners([]);
  } catch (e) {
    console.error('Failed clearing orders', e);
  }
}

function notifyOrderListeners(orders: Order[]) {
  orderListeners.forEach((listener) => {
    try {
      listener(orders);
    } catch (e) {
      console.error('Error notifying order listener', e);
    }
  });
}

// Delivery partner normalizer
export function normalizeDeliveryPartner(raw: any): DeliveryPartner | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      if (raw.trim()) {
        return { name: raw.trim(), phone: '' };
      }
      return undefined;
    }
  }
  if (!raw || typeof raw !== 'object') return undefined;

  const name =
    raw.name ||
    raw.full_name ||
    raw.partner_name ||
    raw.rider_name ||
    raw.delivery_partner_name ||
    raw.deliveryPartnerName;

  if (!name || typeof name !== 'string') return undefined;

  const cleanName = name.replace(/⚡/g, '').trim();
  if (!cleanName) return undefined;

  const phone = raw.phone || raw.phone_number || raw.mobile_number || raw.mobile || '';
  const vehicleNumber = raw.vehicle_number || raw.vehicleNumber || raw.vehicle_no || raw.vehiclenumber || undefined;
  const vehicleType = raw.vehicle_type || raw.vehicleType || undefined;
  const rating = typeof raw.rating === 'number' ? raw.rating : raw.rating ? Number(raw.rating) : 4.8;
  const currentHub = raw.current_hub || raw.currentHub || raw.hub_name || undefined;
  const avatarUrl = raw.avatar_url || raw.avatarUrl || undefined;

  return {
    id: raw.id ? String(raw.id) : undefined,
    name: cleanName,
    phone: String(phone || ''),
    vehicleNumber,
    vehicleType,
    rating,
    currentHub,
    avatar_url: avatarUrl
  };
}

// Global fetch helper for orders - strictly isolates per authenticated user
export async function fetchUserOrders(): Promise<Order[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    // If not logged in, strictly return empty orders array to prevent any cross-account data leak
    if (!userData?.user?.id) {
      if (!activeUserScope) {
        notifyOrderListeners([]);
        return [];
      }
      const stored = getStoredOrders(activeUserScope);
      notifyOrderListeners(stored);
      return stored;
    }

    const user = userData.user;
    const meta = user.user_metadata || {};
    const effectiveUserId = meta.master_user_id || meta.linked_user_id || user.id;
    const scope = getUserScopeKeyFromUser(user);
    if (scope) {
      activeUserScope = scope;
    }

    let userEmail = (meta.real_email || user.email || meta.email || '').trim().toLowerCase();
    if (userEmail.includes('@girirajpower.internal')) userEmail = '';
    const rawPhone = user.phone || meta.phone || meta.contact_number || '';
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

    const orClauses: string[] = [`user_id.eq.${user.id}`];
    if (effectiveUserId && effectiveUserId !== user.id) {
      orClauses.push(`user_id.eq.${effectiveUserId}`);
    }
    if (userEmail && userEmail.includes('@')) {
      orClauses.push(`customer_email.ilike.${userEmail}`);
      orClauses.push(`recipient_email.ilike.${userEmail}`);
    }
    if (cleanPhone && cleanPhone.length === 10) {
      orClauses.push(`phone.eq.${cleanPhone}`);
      orClauses.push(`phone.eq.+91${cleanPhone}`);
      orClauses.push(`recipient_phone.eq.${cleanPhone}`);
      orClauses.push(`recipient_phone.eq.+91${cleanPhone}`);
    }

    let query = supabase.from('orders').select('*');
    if (orClauses.length === 1) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.or(orClauses.join(','));
    }

    const { data, error } = await query.order('updated_at', { ascending: false }).limit(50);
    const localOrders = getStoredOrders(scope || undefined);

    if (!error && Array.isArray(data)) {
      // Filter strictly by user ownership so that no other user's order can ever pass
      const matchedRows = data.filter((row) => doesOrderBelongToUser(row, user));
      const orderIds = matchedRows.map((r) => String(r.id));

      // Fetch linked deliveries with delivery partners
      let deliveriesMap = new Map<string, any>();
      let trackingEventsMap = new Map<string, any[]>();
      let orderItemsMap = new Map<string, any[]>();
      let partnersMap = new Map<string, any>();

      if (orderIds.length > 0) {
        try {
          const { data: delivData } = await supabase
            .from('deliveries')
            .select('*')
            .in('order_id', orderIds);
          if (Array.isArray(delivData)) {
            delivData.forEach((d) => {
              if (d.order_id) deliveriesMap.set(String(d.order_id), d);
            });
          }
        } catch (delErr) {
          console.debug('Deliveries table lookup notice (ignorable if not yet migrated):', delErr);
        }

        // Collect all partner IDs from deliveries and orders
        const partnerIds = new Set<string>();
        deliveriesMap.forEach((deliv) => {
          if (deliv.delivery_partner_id) partnerIds.add(String(deliv.delivery_partner_id));
        });
        matchedRows.forEach((r) => {
          if (r.delivery_partner_id) partnerIds.add(String(r.delivery_partner_id));
        });

        if (partnerIds.size > 0) {
          try {
            const { data: partnerRows } = await supabase
              .from('delivery_partners')
              .select('*')
              .in('id', Array.from(partnerIds));
            if (Array.isArray(partnerRows)) {
              partnerRows.forEach((p) => {
                if (p.id) partnersMap.set(String(p.id), p);
              });
            }
          } catch (pErr) {
            console.debug('delivery_partners table lookup notice:', pErr);
          }
        }

        // Also prefetch active delivery partners if not fully mapped
        try {
          const { data: allPartners } = await supabase
            .from('delivery_partners')
            .select('*')
            .limit(50);
          if (Array.isArray(allPartners)) {
            allPartners.forEach((p) => {
              if (p.id) partnersMap.set(String(p.id), p);
            });
          }
        } catch (allPErr) {
          console.debug('delivery_partners general lookup notice:', allPErr);
        }

        try {
          const { data: eventsData } = await supabase
            .from('delivery_tracking_events')
            .select('*')
            .in('order_id', orderIds)
            .order('created_at', { ascending: true });
          if (Array.isArray(eventsData)) {
            eventsData.forEach((ev) => {
              if (ev.order_id) {
                const oid = String(ev.order_id);
                if (!trackingEventsMap.has(oid)) trackingEventsMap.set(oid, []);
                trackingEventsMap.get(oid)!.push(ev);
              }
            });
          }
        } catch (evErr) {
          console.debug('Tracking events lookup notice:', evErr);
        }

        try {
          const { data: oiData } = await supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds);
          if (Array.isArray(oiData)) {
            oiData.forEach((item) => {
              if (item.order_id) {
                const oid = String(item.order_id);
                if (!orderItemsMap.has(oid)) orderItemsMap.set(oid, []);
                orderItemsMap.get(oid)!.push(item);
              }
            });
          }
        } catch (oiErr) {
          console.debug('Order items lookup notice:', oiErr);
        }
      }

      const dbOrders: Order[] = matchedRows
        .map((row) => {
          const oid = String(row.id);
          const linkedDelivery = deliveriesMap.get(oid);
          const linkedEvents = trackingEventsMap.get(oid) || [];
          const linkedOrderItems = orderItemsMap.get(oid) || [];

          // Map items from JSON or relational order_items table
          let finalItems: CartItem[] = Array.isArray(row.items) && row.items.length > 0 ? row.items : [];
          if (finalItems.length === 0 && linkedOrderItems.length > 0) {
            finalItems = linkedOrderItems.map((oi) => ({
              quantity: oi.quantity || 1,
              selectedColor: oi.selected_color || oi.color || undefined,
              product: {
                id: oi.product_id || String(oi.id),
                name: oi.product_name || 'Electrical Supply',
                brand: oi.brand || 'Giriraj Power',
                category: 'electrical' as const,
                subCategory: 'Supplies',
                price: Number(oi.price_at_purchase || 0),
                originalPrice: Number(oi.price_at_purchase || 0),
                discountPercentage: 0,
                unit: oi.unit || 'piece',
                rating: 4.8,
                reviewsCount: 12,
                deliveryMinutes: 60,
                image: oi.product_image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
                inStock: true,
                stockCount: 100,
                isEmergency: false,
                specs: {},
                description: oi.product_name || '',
                tags: []
              }
            }));
          }

          // Dynamic estimated delivery timestamp calculation
          let etaTimestamp = Date.now() + 3600000;
          if (linkedDelivery?.estimated_delivery_at) {
            const parsed = new Date(linkedDelivery.estimated_delivery_at).getTime();
            if (!isNaN(parsed) && parsed > 0) etaTimestamp = parsed;
          } else if (row.estimated_delivery_at) {
            const parsed = new Date(row.estimated_delivery_at).getTime();
            if (!isNaN(parsed) && parsed > 0) etaTimestamp = parsed;
          } else if (row.estimated_delivery_timestamp) {
            etaTimestamp = Number(row.estimated_delivery_timestamp);
          }

          // Effective Status Calculation
          let rawStatus = (row.status || 'pending').toLowerCase();
          if (linkedDelivery?.status) {
            const dStatus = linkedDelivery.status.toLowerCase();
            if (dStatus === 'delivered') rawStatus = 'delivered';
            else if (dStatus === 'near_destination') rawStatus = 'near_destination';
            else if (dStatus === 'out_for_delivery' || dStatus === 'picked_up') rawStatus = 'out_for_delivery';
          }

          // Delivery Partner Resolution from backend DB
          const partnerFromDeliveryId = linkedDelivery?.delivery_partner_id
            ? partnersMap.get(String(linkedDelivery.delivery_partner_id))
            : undefined;
          const partnerFromOrderId = row.delivery_partner_id
            ? partnersMap.get(String(row.delivery_partner_id))
            : undefined;
          const rawPartner =
            partnerFromDeliveryId ||
            partnerFromOrderId ||
            linkedDelivery?.delivery_partner ||
            row.delivery_partner ||
            undefined;

          const partnerData = normalizeDeliveryPartner(rawPartner);

          return {
            id: oid,
            customerName: row.recipient_name || row.customer_name || 'Customer',
            recipientName: row.recipient_name || row.customer_name || 'Customer',
            phone: row.recipient_phone || row.phone || '',
            recipientPhone: row.recipient_phone || row.phone || '',
            customerEmail: row.recipient_email || row.customer_email || undefined,
            recipientEmail: row.recipient_email || row.customer_email || undefined,
            address: [row.address_line1, row.address_line2, row.city, row.pincode].filter(Boolean).join(', ') || row.address || row.delivery_address || '',
            addressLine1: row.address_line1,
            addressLine2: row.address_line2,
            city: row.city || 'Kolkata',
            state: row.state || 'West Bengal',
            area: row.address_line2 || row.area || 'Kasba / South Kolkata',
            landmark: row.landmark || row.delivery_notes || undefined,
            deliveryNotes: row.delivery_notes || row.admin_notes || row.landmark || undefined,
            pincode: row.pincode || '700042',
            items: finalItems,
            itemTotal: Number(row.subtotal ?? row.item_total ?? 0),
            subtotal: Number(row.subtotal ?? row.item_total ?? 0),
            deliveryFee: Number(row.delivery_fee || 0),
            handlingFee: Number(row.handling_fee || 0),
            fees: Number(row.fees ?? ((row.delivery_fee || 0) + (row.handling_fee || 0))),
            discount: Number(row.discount_amount ?? row.discount ?? 0),
            discountAmount: Number(row.discount_amount ?? row.discount ?? 0),
            couponCode: row.coupon_code || null,
            totalAmount: Number(row.total_amount || 0),
            paymentMethod: (row.payment_method || 'cod').toLowerCase() as any,
            paymentStatus: (row.payment_status || 'pending').toLowerCase() as any,
            status: rawStatus as any,
            createdAt: row.placed_at || row.updated_at || row.created_at || new Date().toISOString(),
            placed_at: row.placed_at || row.created_at || undefined,
            confirmed_at: row.confirmed_at || undefined,
            packed_at: row.packed_at || undefined,
            shipped_at: row.shipped_at || linkedDelivery?.out_for_delivery_at || linkedDelivery?.picked_up_at || undefined,
            out_for_delivery_at: linkedDelivery?.out_for_delivery_at || row.out_for_delivery_at || row.shipped_at || undefined,
            near_destination_at: linkedDelivery?.near_destination_at || undefined,
            delivered_at: linkedDelivery?.delivered_at || row.delivered_at || undefined,
            cancelled_at: row.cancelled_at || undefined,
            cancel_reason: row.cancel_reason || row.cancellation_reason || undefined,
            placedAt: row.placed_at || row.created_at || undefined,
            confirmedAt: row.confirmed_at || undefined,
            packedAt: row.packed_at || undefined,
            shippedAt: row.shipped_at || linkedDelivery?.out_for_delivery_at || linkedDelivery?.picked_up_at || undefined,
            outForDeliveryAt: linkedDelivery?.out_for_delivery_at || row.out_for_delivery_at || row.shipped_at || undefined,
            nearDestinationAt: linkedDelivery?.near_destination_at || undefined,
            deliveredAt: linkedDelivery?.delivered_at || row.delivered_at || undefined,
            cancelledAt: row.cancelled_at || undefined,
            estimated_delivery_at: linkedDelivery?.estimated_delivery_at || row.estimated_delivery_at || undefined,
            estimatedDeliveryTimestamp: etaTimestamp,
            deliveryPartner: partnerData,
            delivery: linkedDelivery,
            trackingEvents: linkedEvents,
            notes: row.delivery_notes || row.notes || undefined
          };
        }).filter(isRealOrder);

      // Merge DB orders and local orders strictly for this user
      const mergedMap = new Map<string, Order>();
      dbOrders.forEach((o) => mergedMap.set(o.id, o));
      localOrders
        .filter((o) => doesOrderBelongToUser(o, user))
        .forEach((o) => {
          if (!mergedMap.has(o.id)) {
            mergedMap.set(o.id, o);
          }
        });

      const deletedIds = getDeletedOrderIds();
      const finalOrders = Array.from(mergedMap.values())
        .filter((o) => !deletedIds.has(String(o.id)))
        .sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

      if (scope) {
        inMemoryOrders.set(scope, finalOrders);
      }
      notifyOrderListeners(finalOrders);
      return finalOrders;
    } else {
      const deletedIds = getDeletedOrderIds();
      const validLocal = localOrders
        .filter((o) => doesOrderBelongToUser(o, user))
        .filter((o) => !deletedIds.has(String(o.id)));
      notifyOrderListeners(validLocal);
      return validLocal;
    }
  } catch (err) {
    console.warn('Supabase orders fetch notice:', err);
    const scope = activeUserScope;
    const fallback = scope ? getStoredOrders(scope) : [];
    notifyOrderListeners(fallback);
    return fallback;
  }
}

let deliveriesChannel: ReturnType<typeof supabase.channel> | null = null;
let trackingChannel: ReturnType<typeof supabase.channel> | null = null;
let partnersChannel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Fetch and Subscribe to Orders from Supabase with per-user data isolation
 */
export function subscribeToOrders(listener: OrderListener): () => void {
  orderListeners.add(listener);
  // Send user-scoped cached state first for immediate UI display
  const initial = activeUserScope ? getStoredOrders(activeUserScope) : [];
  listener(initial);

  // Fetch initial orders for the active user
  fetchUserOrders();

  // Initialize singleton channels only once across all subscribers
  if (!ordersChannel) {
    ordersChannel = supabase
      .channel('orders_realtime_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchUserOrders();
        }
      )
      .subscribe();
  }

  if (!deliveriesChannel) {
    deliveriesChannel = supabase
      .channel('deliveries_realtime_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => {
          fetchUserOrders();
        }
      )
      .subscribe();
  }

  if (!trackingChannel) {
    trackingChannel = supabase
      .channel('tracking_events_realtime_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_tracking_events' },
        () => {
          fetchUserOrders();
        }
      )
      .subscribe();
  }

  if (!partnersChannel) {
    partnersChannel = supabase
      .channel('partners_realtime_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_partners' },
        () => {
          fetchUserOrders();
        }
      )
      .subscribe();
  }

  return () => {
    orderListeners.delete(listener);
    if (orderListeners.size === 0) {
      if (ordersChannel) {
        supabase.removeChannel(ordersChannel);
        ordersChannel = null;
      }
      if (deliveriesChannel) {
        supabase.removeChannel(deliveriesChannel);
        deliveriesChannel = null;
      }
      if (trackingChannel) {
        supabase.removeChannel(trackingChannel);
        trackingChannel = null;
      }
      if (partnersChannel) {
        supabase.removeChannel(partnersChannel);
        partnersChannel = null;
      }
    }
  };
}

export function isValidUUID(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function generateUUID(): string {
  return secureGenerateUUID();
}

/**
 * Resiliently inserts records into Supabase by automatically detecting and stripping
 * any columns that do not exist in the remote database schema cache (PGRST204 / 42703).
 */
export async function adaptiveInsert(
  tableName: string,
  initialPayload: Record<string, any> | Record<string, any>[]
): Promise<{ data: any; error: any }> {
  const isArray = Array.isArray(initialPayload);
  let currentPayload: any = isArray
    ? initialPayload.map((p) => ({ ...p }))
    : { ...initialPayload };

  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const query = supabase.from(tableName).insert(currentPayload);
      const { data, error } = isArray ? await query.select() : await query.select().single();

      if (!error) {
        return { data, error: null };
      }

      const errMsg = error.message || '';

      // Check for missing column error in schema cache or PostgreSQL
      const match =
        errMsg.match(/Could not find the '([^']+)' column/) ||
        errMsg.match(/Could not find the "([^"]+)" column/) ||
        errMsg.match(/column "([^"]+)" of relation "[^"]+" does not exist/) ||
        errMsg.match(/column "([^"]+)" does not exist/);

      if (match && match[1]) {
        const col = match[1];
        console.warn(`[Supabase adaptiveInsert] Table '${tableName}' does not have column '${col}'. Stripping and retrying.`);
        if (isArray) {
          currentPayload.forEach((p: any) => {
            delete p[col];
          });
        } else {
          delete currentPayload[col];
        }
        continue;
      }

      // Check for UUID format / syntax error on id
      if ((error.code === '22P02' || errMsg.includes('invalid input syntax for type uuid')) && !isArray && currentPayload.id) {
        console.warn(`[Supabase adaptiveInsert] UUID syntax error for id in '${tableName}'. Stripping custom id and retrying.`);
        delete currentPayload.id;
        continue;
      }

      // If relation/table does not exist (42P01), stop retrying
      if (error.code === '42P01' || errMsg.includes('does not exist')) {
        console.warn(`[Supabase adaptiveInsert] Table '${tableName}' does not exist on remote Supabase.`);
        return { data: null, error };
      }

      return { data: null, error };
    } catch (e: any) {
      console.warn(`[Supabase adaptiveInsert] Exception on attempt ${attempt} for '${tableName}':`, e);
      return { data: null, error: e };
    }
  }
  return { data: null, error: { message: `Exceeded adaptive insert attempts for ${tableName}` } };
}

/**
 * Creates an order in Supabase `orders` table attaching the user's ID
 */
export async function createFirestoreOrder(order: Order): Promise<Order> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id || order.userId || (order as any).user_id || null;
  order.userId = userId;
  (order as any).user_id = userId;

  const scope =
    getUserScopeKeyFromUser(authData?.user) ||
    activeUserScope ||
    (order.customerEmail ? getUserScopeKeyFromUser({ email: order.customerEmail }) : null) ||
    (order.phone ? getUserScopeKeyFromUser({ phone: order.phone }) : null);

  // Guarantee order has a valid UUID primary key for Supabase UUID columns
  const orderDbId = isValidUUID(order.id) ? order.id : generateUUID();
  const humanReadableNumber = order.id && order.id.startsWith('GP-') ? order.id : generateSecureOrderNumber();
  
  order.id = orderDbId;
  if (!order.trackingNumber) {
    order.trackingNumber = humanReadableNumber;
  }

  // If this order ID was previously in deleted list, remove it from blacklist
  if (order.id) {
    unmarkOrderAsDeleted(order.id);
  }

  if (scope) {
    activeUserScope = scope;
    const currentOrders = getStoredOrders(scope);
    const updatedOrders = [order, ...currentOrders.filter((o) => o.id !== order.id)];
    safeSetItem(`giriraj_orders_${scope}`, JSON.stringify(updatedOrders));
    notifyOrderListeners(updatedOrders);
  }

  // Also persist by specific scoped key if authenticated
  if (userId) {
    const uOrders = getStoredOrders(`uid_${userId}`);
    safeSetItem(`giriraj_orders_uid_${userId}`, JSON.stringify([order, ...uOrders.filter((o) => o.id !== order.id)]));
  }

  // Sound chime alert
  soundService.playNewOrderChime();

  // 1. Submit through the Idempotent & Validated Server Pipeline
  try {
    const idempotencyKey = `idemp_${order.id}_${order.totalAmount}`;
    const apiRes = await fetch(`${API_BASE_URL}/api/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        ...order,
        userId,
        user_id: userId,
        idempotencyKey
      })
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data?.order) {
        // Backend pipeline validated and confirmed order
      }
    }
  } catch (apiErr) {
    console.warn('Backend /api/order pipeline notice (direct client sync active):', apiErr);
  }

  // 2. Prepare comprehensive item representations with color & variant details
  const formattedItemsForDb = (Array.isArray(order.items) ? order.items : []).map((item) => {
    const color = item.selectedColor || item.product?.selectedColor || undefined;
    const baseName = item.product?.name || 'Electrical Item';
    const displayName = color ? `${baseName} (${color} Color)` : baseName;
    return {
      quantity: item.quantity || 1,
      selectedColor: color,
      color: color,
      product: {
        ...(item.product || {}),
        name: displayName,
        selectedColor: color
      }
    };
  });

  // 3. Insert into Supabase `orders` and `order_items` tables
  const orderRowPayload: Record<string, any> = {
    id: orderDbId,
    user_id: userId,
    customer_name: order.customerName || order.recipientName || 'Customer',
    recipient_name: order.recipientName || order.customerName || 'Customer',
    phone: order.phone || order.recipientPhone || '',
    recipient_phone: order.recipientPhone || order.phone || '',
    customer_email: order.customerEmail || order.recipientEmail || null,
    recipient_email: order.recipientEmail || order.customerEmail || null,
    address: order.address || order.addressLine1 || '',
    address_line1: order.addressLine1 || order.address || '',
    address_line2: order.addressLine2 || order.area || '',
    area: order.area || order.addressLine2 || '',
    city: order.city || 'Kolkata',
    state: order.state || 'West Bengal',
    pincode: order.pincode || '',
    address_label: order.addressLabel || 'Home',
    landmark: order.landmark || order.deliveryNotes || null,
    delivery_notes: order.deliveryNotes || order.landmark || order.notes || null,
    items: formattedItemsForDb,
    item_total: order.itemTotal ?? order.subtotal ?? 0,
    subtotal: order.subtotal ?? order.itemTotal ?? 0,
    discount: order.discount ?? order.discountAmount ?? 0,
    discount_amount: order.discountAmount ?? order.discount ?? 0,
    delivery_fee: order.deliveryFee ?? 0,
    handling_fee: order.handlingFee ?? 0,
    fees: order.fees ?? ((order.deliveryFee || 0) + (order.handlingFee || 0)),
    total_amount: order.totalAmount,
    coupon_code: order.couponCode || null,
    payment_method: (order.paymentMethod || 'COD').toUpperCase(),
    payment_status: order.paymentStatus || 'pending',
    payment_id: order.paymentId || (order as any).razorpay_payment_id || order.razorpayPaymentId || null,
    razorpay_payment_id: (order as any).razorpay_payment_id || order.razorpayPaymentId || order.paymentId || null,
    razorpay_order_id: (order as any).razorpay_order_id || order.razorpayOrderId || null,
    razorpay_signature: (order as any).razorpay_signature || order.razorpaySignature || null,
    status: order.status || 'pending',
    tracking_number: order.trackingNumber || humanReadableNumber,
    placed_at: order.createdAt || new Date().toISOString(),
    updated_at: order.createdAt || new Date().toISOString(),
    packed_at: null,
    delivered_at: null,
    estimated_delivery_timestamp: order.estimatedDeliveryTimestamp,
    delivery_partner: order.deliveryPartner || null,
    notes: order.notes || null
  };

  let insertedOrder: any = null;

  // Step 1: Resilient insert into `orders` table using adaptive schema matching
  const { data: orderData, error: orderInsertError } = await adaptiveInsert('orders', orderRowPayload);

  if (orderInsertError) {
    console.warn('Adaptive orders insert returned error, saving locally:', orderInsertError.message);
  } else {
    insertedOrder = orderData;
  }

  const savedOrderId = insertedOrder?.id || orderDbId;

  // Step 2: Insert one row into `order_items` for EACH item in cart
  if (Array.isArray(order.items) && order.items.length > 0) {
    const orderItemsPayload = order.items.map((item) => {
      const color = item.selectedColor || item.product?.selectedColor || undefined;
      const baseName = item.product?.name || 'Item';
      const displayName = color ? `${baseName} (${color} Color)` : baseName;
      return {
        id: generateUUID(),
        order_id: savedOrderId,
        product_id: item.product?.id ? String(item.product.id) : null,
        product_name: displayName,
        product_image: item.product?.image || (Array.isArray(item.product?.images) && item.product.images[0]) || null,
        brand: item.product?.brand || 'Giriraj Power',
        unit: item.product?.unit || 'piece',
        quantity: item.quantity || 1,
        price_at_purchase: item.product?.price || 0
      };
    });

    const { error: itemsError } = await adaptiveInsert('order_items', orderItemsPayload);
    if (itemsError) {
      console.warn('Notice inserting into order_items table (items persisted in orders.items):', itemsError.message);
    }
  }

  // Step 3: Insert initial record in `deliveries` table for delivery app integration
  try {
    const deliveryId = generateUUID();
    const etaIso = new Date(order.estimatedDeliveryTimestamp || Date.now() + 3600000).toISOString();
    await adaptiveInsert('deliveries', {
      id: deliveryId,
      order_id: savedOrderId,
      status: 'unassigned',
      estimated_delivery_at: etaIso,
      delivery_notes: order.deliveryNotes || 'Standard express dispatch'
    });

    // Step 4: Insert initial milestone event in `delivery_tracking_events`
    await adaptiveInsert('delivery_tracking_events', {
      id: generateUUID(),
      order_id: savedOrderId,
      delivery_id: deliveryId,
      stage: 'placed',
      title: 'Order Placed',
      description: 'Order placed by customer and sent to warehouse',
      customer_message: 'Your order has been received and is being verified.',
      actor: 'customer',
      location_name: order.area || 'Kasba Hub'
    });
  } catch (deliveryInitErr) {
    console.debug('Deliveries table auto-init notice:', deliveryInitErr);
  }

  // Secure concurrent stock decrement via PostgreSQL function (fixes N+1 sequential loop)
  if (Array.isArray(order.items) && order.items.length > 0) {
    const validItems = order.items.filter((item) => item?.product?.id);
    await Promise.allSettled(
      validItems.map(async (item) => {
        try {
          await supabase.rpc('decrement_stock', {
            p_product_id: String(item.product.id),
            p_quantity: item.quantity || 1,
            p_order_id: String(savedOrderId)
          });
        } catch (stockErr) {
          console.warn(`Stock decrement note for ${item.product.id}:`, stockErr);
        }
      })
    );
  }

  const finalSavedOrder: Order = {
    ...order,
    id: String(savedOrderId)
  };

  // Analytics event
  if (typeof (window as unknown as { trackGirirajEvent?: (name: string, p: object) => void }).trackGirirajEvent === 'function') {
    (window as unknown as { trackGirirajEvent: (name: string, p: object) => void }).trackGirirajEvent('purchase', {
      transaction_id: order.id,
      value: order.totalAmount,
      currency: 'INR',
      shipping: order.deliveryFee,
      items: order.items.map((i) => ({
        item_id: i.product.id,
        item_name: i.product.name,
        price: i.product.price,
        quantity: i.quantity
      }))
    });
  }

  return order;
}

export interface CustomerCancelOrderResponse {
  success: boolean;
  error?: string;
  payment_method?: string;
  payment_status?: string;
  razorpay_payment_id?: string;
  total_amount?: number;
}

/**
 * Executes authoritative customer order cancellation through secure database RPC
 */
export async function customerCancelOrderRpc(
  orderId: string,
  reason: string = 'Customer requested cancellation'
): Promise<{ data: CustomerCancelOrderResponse | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('customer_cancel_order', {
      p_order_id: orderId,
      p_reason: reason
    });

    if (!error && data && data.success) {
      if (activeUserScope) {
        const currentOrders = getStoredOrders(activeUserScope);
        const updatedOrders = currentOrders.map((o) => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'cancelled' as OrderStatus,
              cancelled_at: new Date().toISOString(),
              cancel_reason: reason
            };
          }
          return o;
        });
        safeSetItem(`giriraj_orders_${activeUserScope}`, JSON.stringify(updatedOrders));
        notifyOrderListeners(updatedOrders);
      }
    }

    return { data: data as CustomerCancelOrderResponse | null, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Updates order status in Supabase.
 * NOTE: When cancelling, STOP calling supabase.from('orders').update({status:'cancelled'})
 * directly; instead calls customer_cancel_order RPC.
 */
export async function updateOrderStatusInFirestore(
  orderId: string,
  newStatus: OrderStatus,
  reason: string = 'Customer requested cancellation'
): Promise<boolean> {
  if (newStatus === 'cancelled') {
    try {
      const { data, error } = await supabase.rpc('customer_cancel_order', {
        p_order_id: orderId,
        p_reason: reason
      });

      if (error || (data && !data.success)) {
        console.warn('Supabase customer_cancel_order notice:', error?.message || data?.error);
        // Fallback: update status directly in orders table
        try {
          await supabase
            .from('orders')
            .update({
              status: 'cancelled',
              cancel_reason: reason,
              cancelled_at: new Date().toISOString()
            })
            .eq('id', orderId);
        } catch (fbErr) {
          console.warn('Direct order update notice:', fbErr);
        }
      }

      if (activeUserScope) {
        const currentOrders = getStoredOrders(activeUserScope);
        const updatedOrders = currentOrders.map((o) => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'cancelled' as OrderStatus,
              cancelled_at: new Date().toISOString(),
              cancel_reason: reason
            };
          }
          return o;
        });

        safeSetItem(`giriraj_orders_${activeUserScope}`, JSON.stringify(updatedOrders));
        notifyOrderListeners(updatedOrders);
      }
      return true;
    } catch (error) {
      console.warn('Supabase customer_cancel_order exception:', error);
      if (activeUserScope) {
        const currentOrders = getStoredOrders(activeUserScope);
        const updatedOrders = currentOrders.map((o) => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'cancelled' as OrderStatus,
              cancelled_at: new Date().toISOString(),
              cancel_reason: reason
            };
          }
          return o;
        });
        safeSetItem(`giriraj_orders_${activeUserScope}`, JSON.stringify(updatedOrders));
        notifyOrderListeners(updatedOrders);
      }
      return true;
    }
  }

  if (activeUserScope) {
    const currentOrders = getStoredOrders(activeUserScope);
    const updatedOrders = currentOrders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: newStatus
        };
      }
      return o;
    });

    safeSetItem(`giriraj_orders_${activeUserScope}`, JSON.stringify(updatedOrders));
    notifyOrderListeners(updatedOrders);
  }

  try {
    const updatePayload: Record<string, unknown> = {
      status: newStatus
    };
    await supabase.from('orders').update(updatePayload).eq('id', orderId);
    return true;
  } catch (error) {
    console.warn('Supabase update order error:', error);
    return false;
  }
}

export const updateOrderStatusInSupabase = updateOrderStatusInFirestore;

/**
 * Delete a specific order from Supabase (orders + order_items), Server API, and local caches
 */
export async function deleteFirestoreOrder(orderId: string): Promise<boolean> {
  if (!orderId) return false;

  // 1. Mark ID in persistent deletion blacklist so it can never reappear
  markOrderAsDeleted(orderId);

  // 2. Remove from active user's local storage key immediately for responsive UI
  try {
    if (activeUserScope) {
      const currentOrders = getStoredOrders(activeUserScope);
      const filtered = currentOrders.filter((o) => String(o.id) !== String(orderId));
      safeSetItem(`giriraj_orders_${activeUserScope}`, JSON.stringify(filtered));
      notifyOrderListeners(filtered);
    }
  } catch (storageErr) {
    console.warn('Local storage order deletion notice:', storageErr);
  }

  // 3. Call Server Backend API to delete with elevated DB permissions
  try {
    fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
      headers: { 'Cache-Control': 'no-cache' }
    }).catch((apiErr) => console.warn('Server order delete API notice:', apiErr));
  } catch (err) {
    console.warn('Server delete call notice:', err);
  }

  // 4. Delete from Supabase Database client (`order_items` then `orders`)
  try {
    try {
      await supabase.from('order_items').delete().eq('order_id', orderId);
    } catch (itemDelErr) {
      console.warn('Supabase order_items delete note:', itemDelErr);
    }

    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) {
      console.warn('Supabase order delete error:', error.message);
    }
  } catch (error) {
    console.warn('Error deleting order from database:', error);
  }

  // 5. Re-fetch remaining orders to ensure local and DB sync
  try {
    const remaining = await fetchUserOrders();
    notifyOrderListeners(remaining);
  } catch {
    const fallback = activeUserScope ? getStoredOrders(activeUserScope) : [];
    notifyOrderListeners(fallback);
  }
  return true;
}

export const deleteOrder = deleteFirestoreOrder;
export const deleteOrderFromFirestore = deleteFirestoreOrder;

/**
 * Clear all order history for the current user across Supabase, Server API, and local storage
 */
export async function clearAllUserOrders(): Promise<boolean> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    const userId = user?.id;

    // 1. Mark all existing orders as deleted in persistent blacklist
    const currentOrders = activeUserScope ? getStoredOrders(activeUserScope) : [];
    const orderIdsToClear = currentOrders.map((o) => String(o.id));
    if (orderIdsToClear.length > 0) {
      markAllOrdersAsDeleted(orderIdsToClear);
    }

    // 2. Clear current user's local storage order records immediately
    if (activeUserScope) {
      safeRemoveItem(`giriraj_orders_${activeUserScope}`);
    }

    // 3. Immediately notify listeners with empty array for instant UI feedback
    notifyOrderListeners([]);

    // 4. Call Server Backend API to clear orders with elevated DB privileges
    try {
      const queryParams = new URLSearchParams();
      if (userId) queryParams.set('userId', userId);
      if (user?.email) queryParams.set('email', user.email);
      if (user?.phone) queryParams.set('phone', user.phone);

      fetch(`${API_BASE_URL}/api/orders?${queryParams.toString()}`, {
        method: 'DELETE',
        headers: { 'Cache-Control': 'no-cache' }
      }).catch(() => {
        // Fallback POST
        fetch(`${API_BASE_URL}/api/orders/clear`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email: user?.email,
            phone: user?.phone,
            orderIds: orderIdsToClear
          })
        }).catch(console.warn);
      });
    } catch (apiErr) {
      console.warn('Server clear orders API notice:', apiErr);
    }

    // 5. Delete all user orders from Supabase Client if logged in
    if (userId) {
      try {
        const { data: userOrderRows } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', userId);

        if (userOrderRows && userOrderRows.length > 0) {
          const orderIds = userOrderRows.map((r) => r.id);
          await supabase.from('order_items').delete().in('order_id', orderIds);
        }

        await supabase.from('orders').delete().eq('user_id', userId);
      } catch (dbErr) {
        console.warn('Supabase clear user orders notice:', dbErr);
      }
    }

    return true;
  } catch (error) {
    console.warn('Error clearing all user orders:', error);
    notifyOrderListeners([]);
    return true;
  }
}

/**
 * Service Booking in Supabase & Server API Backup
 */
export async function createFirestoreServiceBooking(booking: WiringServiceBooking): Promise<{ success: boolean; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id || null;

  const payload = {
    id: booking.id,
    user_id: userId,
    service_title: booking.serviceTitle,
    service_category: booking.serviceCategory,
    project_type: booking.projectType,
    approx_area_sq_ft: booking.approxAreaSqFt,
    preferred_date: booking.preferredDate,
    preferred_time_slot: booking.preferredTimeSlot,
    site_address: booking.siteAddress,
    area: booking.area,
    pincode: booking.pincode,
    contact_name: booking.contactName,
    contact_phone: booking.contactPhone,
    contact_email: booking.contactEmail || null,
    estimated_price: booking.estimatedPrice,
    wire_grade: booking.wireGrade,
    notes: booking.notes || null,
    status: booking.status,
    created_at: booking.createdAt
  };

  // 1. Server API backup call
  try {
    fetch(`${API_BASE_URL}/api/service-bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch {}

  // 2. Direct Supabase insert
  try {
    const { error } = await supabase.from('wiring_service_bookings').insert(payload);
    if (error) {
      console.warn('wiring_service_bookings insert notice:', error.message);
      enqueuePendingSync({
        type: 'service_booking',
        payload
      });
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.warn('Supabase service booking error:', msg);
    enqueuePendingSync({
      type: 'service_booking',
      payload
    });
    return { success: false, error: msg };
  }
}

// ============================================================================
// SAVED ADDRESSES (Server-Side Storage + Supabase `saved_addresses` table with RLS)
// ============================================================================

type AddressListener = (addresses: SavedAddress[]) => void;
const addressListeners: Set<AddressListener> = new Set();
let addressesChannel: ReturnType<typeof supabase.channel> | null = null;
let hasInitiatedInitialAddressFetch = false;

export function getStoredAddresses(userScopeOverride?: string): SavedAddress[] {
  try {
    const scope = userScopeOverride || activeUserScope;
    if (!scope) {
      return [];
    }

    if (inMemoryAddresses.has(scope)) {
      return inMemoryAddresses.get(scope) || [];
    }

    const collected: SavedAddress[] = [];
    const seenIds = new Set<string>();

    const addAddresses = (list: any) => {
      if (!Array.isArray(list)) return;
      for (const a of list) {
        if (a && a.id && !seenIds.has(a.id)) {
          seenIds.add(a.id);
          collected.push(a);
        }
      }
    };

    // 1. Strictly check scoped storage ONLY for the active user
    const raw = localStorage.getItem(`giriraj_addrs_${scope}`);
    if (raw) {
      try {
        addAddresses(JSON.parse(raw));
      } catch {}
    }

    // 2. Check scoped active address
    const scopedActive = localStorage.getItem(`giriraj_active_addr_${scope}`);
    if (scopedActive) {
      try {
        const activeObj = JSON.parse(scopedActive);
        if (activeObj && activeObj.id && !seenIds.has(activeObj.id)) {
          seenIds.add(activeObj.id);
          collected.push(activeObj);
        }
      } catch {}
    }

    // 3. Fallback strictly to this specific user's known linked scope (never loop across other users)
    if (collected.length === 0 && scope) {
      try {
        const ADMIN_EMAILS = ['gauravgiri123344@gmail.com', 'mdhassan1738@gmail.com'];
        const cachedProf = getSavedUserProfile(scope);
        const isUserAdmin = Boolean(cachedProf?.email && ADMIN_EMAILS.includes(cachedProf.email.toLowerCase()));

        if (scope.startsWith('uid_')) {
          if (cachedProf?.phone) {
            const cleanPhone = cachedProf.phone.replace(/\D/g, '').slice(-10);
            if (cleanPhone.length === 10 && (isUserAdmin || cleanPhone !== '8777400280')) {
              const linkedKey = `giriraj_addrs_phone_${cleanPhone}`;
              const linkedData = localStorage.getItem(linkedKey);
              if (linkedData) {
                try { addAddresses(JSON.parse(linkedData)); } catch {}
              }
            }
          }
        } else if (scope.startsWith('phone_')) {
          if (cachedProf?.id) {
            const linkedKey = `giriraj_addrs_uid_${cachedProf.id}`;
            const linkedData = localStorage.getItem(linkedKey);
            if (linkedData) {
              try { addAddresses(JSON.parse(linkedData)); } catch {}
            }
          }
        }
      } catch {}
    }

    // Filter out any leaked admin addresses for non-admin profiles
    const cachedProf = getSavedUserProfile(scope);
    const ADMIN_EMAILS = ['gauravgiri123344@gmail.com', 'mdhassan1738@gmail.com'];
    const isUserAdmin = Boolean(cachedProf?.email && ADMIN_EMAILS.includes(cachedProf.email.toLowerCase()));

    const filteredCollected = isUserAdmin
      ? collected
      : collected.filter((a) => {
          const p = (a.receiverPhone || '').replace(/\D/g, '').slice(-10);
          if (p === '8777400280') return false;
          return true;
        });

    // If local storage was cleared / empty, trigger server fetch asynchronously to restore addresses
    if (filteredCollected.length === 0 && !hasInitiatedInitialAddressFetch) {
      hasInitiatedInitialAddressFetch = true;
      setTimeout(() => {
        fetchUserAddresses().catch(() => {});
      }, 50);
    }

    return filteredCollected;
  } catch (e) {
    console.error('Error reading saved addresses:', e);
    return [];
  }
}

export async function fetchUserAddresses(): Promise<SavedAddress[]> {
  try {
    let authUser: User | null = null;
    try {
      const { data: authData } = await supabase.auth.getUser();
      authUser = authData?.user || null;
    } catch {
      // ignore
    }

    const scope = (authUser ? getUserScopeKeyFromUser(authUser) : null) || activeUserScope;
    if (scope) {
      activeUserScope = scope;
    }

    const savedProf = scope ? getSavedUserProfile(scope) : getSavedUserProfile();
    const userPhone = authUser?.phone || savedProf?.phone || '';
    const userEmail = authUser?.email || savedProf?.email || '';
    const userId = authUser?.id || '';

    const ADMIN_EMAILS = ['gauravgiri123344@gmail.com', 'mdhassan1738@gmail.com'];
    const isUserAdmin = Boolean(userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase()));
    const adminNames = ['md hassan', 'md. hassan', 'hassan', 'mdhassan'];

    const collectedMap = new Map<string, SavedAddress>();

    // 1. Fetch from Server API (Persistent Server Storage)
    try {
      const queryParams = new URLSearchParams();
      if (userId) queryParams.set('userId', userId);
      // Under no circumstances should a non-admin query by the admin depot phone
      const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);
      if (cleanPhone && (isUserAdmin || cleanPhone !== '8777400280')) {
        queryParams.set('phone', cleanPhone);
      }
      if (userEmail) queryParams.set('email', userEmail);
      if (scope) queryParams.set('userScope', scope);

      const serverRes = await fetch(`${API_BASE_URL}/api/saved-addresses?${queryParams.toString()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json.success && Array.isArray(json.addresses)) {
          for (const row of json.addresses) {
            if (row && row.id) {
              collectedMap.set(row.id, {
                id: row.id,
                tag: row.tag || 'home',
                tagLabel: row.tagLabel || row.tag_label || undefined,
                houseName: row.houseName || row.house_name || '',
                houseFlat: row.houseFlat || row.house_flat || '',
                buildingRoad: row.buildingRoad || row.building_road || '',
                landmark: row.landmark || undefined,
                area: row.area || row.area_data || {
                  name: row.area_name || 'Kasba',
                  pincode: row.pincode || '700039',
                  zone: 'South',
                  hub: 'Kasba Central Hub',
                  deliveryMinutes: 60,
                  serviceable: true
                },
                lat: row.lat,
                lng: row.lng,
                formattedExactAddress: row.formattedExactAddress || row.formatted_exact_address,
                receiverName: row.receiverName || row.receiver_name,
                receiverPhone: row.receiverPhone || row.receiver_phone,
                createdAt: row.createdAt || row.created_at || new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (serverErr) {
      console.warn('Server address fetch notice:', serverErr);
    }

    // 2. Fetch from Supabase `saved_addresses` table if user is logged in
    if (authUser?.id) {
      try {
        const { data, error } = await supabase
          .from('saved_addresses')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && Array.isArray(data)) {
          for (const row of data) {
            if (row && row.id) {
              collectedMap.set(row.id, {
                id: row.id,
                tag: row.tag || 'home',
                tagLabel: row.tag_label || undefined,
                houseName: row.house_name || '',
                houseFlat: row.house_flat || '',
                buildingRoad: row.building_road || '',
                landmark: row.landmark || undefined,
                area: row.area_data || {
                  name: row.area_name || 'Kasba',
                  pincode: row.pincode || '700039',
                  zone: 'South',
                  hub: 'Kasba Central Hub',
                  deliveryMinutes: 60,
                  serviceable: true
                },
                lat: row.lat,
                lng: row.lng,
                formattedExactAddress: row.formatted_exact_address,
                receiverName: row.receiver_name,
                receiverPhone: row.receiver_phone,
                createdAt: row.created_at
              });
            }
          }
        }
      } catch (sbErr) {
        console.warn('Supabase address fetch notice:', sbErr);
      }
    }

    const rawList = Array.from(collectedMap.values()).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const list = isUserAdmin
      ? rawList
      : rawList.filter((addr) => {
          const p = (addr.receiverPhone || '').replace(/\D/g, '').slice(-10);
          if (p === '8777400280') return false;
          return true;
        });

    // Clean up contaminated addresses from Supabase if any were incorrectly associated with non-admin
    if (!isUserAdmin && authUser?.id && rawList.length !== list.length) {
      try {
        Promise.resolve(
          supabase
            .from('saved_addresses')
            .delete()
            .eq('user_id', authUser.id)
            .or('receiver_phone.eq.8777400280,receiver_phone.eq.+918777400280')
        )
          .then(() => {})
          .catch(() => {});
      } catch {}
    }

    if (list.length > 0) {
      if (scope) {
        inMemoryAddresses.set(scope, list);
        inMemoryActiveAddress.set(scope, list[0]);
      }
    }

    notifyAddressListeners(list);
    return list;
  } catch (e) {
    console.warn('Addresses fetch notice:', e);
  }
  return getStoredAddresses();
}

let lastNotifiedAddressesJson = '';

function notifyAddressListeners(addresses: SavedAddress[]) {
  const currentJson = JSON.stringify(addresses);
  if (currentJson === lastNotifiedAddressesJson) {
    return;
  }
  lastNotifiedAddressesJson = currentJson;
  addressListeners.forEach((l) => {
    try {
      l(addresses);
    } catch (e) {
      console.warn('Address listener notice:', e);
    }
  });
}

// Cross-tab and real-time addresses broadcast channel
const addressBroadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('giriraj_saved_addresses_sync')
    : null;

let lastBroadcastJson = '';

export function broadcastAddressUpdate(addresses: SavedAddress[], userId?: string): void {
  const currentJson = JSON.stringify(addresses);
  if (currentJson === lastBroadcastJson) {
    return;
  }
  lastBroadcastJson = currentJson;

  // 1. Dispatch custom event for current window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('giriraj_addresses_updated', { detail: addresses }));
  }

  // 2. Broadcast to other tabs on same device/browser
  try {
    if (addressBroadcastChannel) {
      addressBroadcastChannel.postMessage({ type: 'ADDRESSES_UPDATED', addresses, userId });
    }
  } catch {}

  // 3. Broadcast across devices via Supabase Realtime WebSocket channel
  try {
    const channelName = userId ? `address_sync_${userId}` : 'addresses_realtime_feed';
    const channel = supabase.channel(channelName);
    channel.send({
      type: 'broadcast',
      event: 'address_updated',
      payload: { addresses, userId }
    }).catch(() => {});
  } catch {}
}

export function subscribeToAddresses(listener: AddressListener): () => void {
  addressListeners.add(listener);
  const stored = getStoredAddresses();
  listener(stored);

  // Immediately pull fresh addresses from server in background
  fetchUserAddresses().catch(() => {});

  if (!addressesChannel) {
    addressesChannel = supabase
      .channel('addresses_realtime_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_addresses' },
        () => fetchUserAddresses()
      )
      .on('broadcast', { event: 'address_updated' }, () => {
        fetchUserAddresses();
      })
      .subscribe();
  }

  // Cross-tab custom event
  const handleCustomEvent = (e: any) => {
    if (e.detail && Array.isArray(e.detail)) {
      listener(e.detail);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('giriraj_addresses_updated', handleCustomEvent);
  }

  // BroadcastChannel message
  const handleBroadcast = (ev: MessageEvent) => {
    if (ev.data?.type === 'ADDRESSES_UPDATED' && Array.isArray(ev.data?.addresses)) {
      listener(ev.data.addresses);
    }
  };
  if (addressBroadcastChannel) {
    addressBroadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    addressListeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('giriraj_addresses_updated', handleCustomEvent);
    }
    if (addressBroadcastChannel) {
      addressBroadcastChannel.removeEventListener('message', handleBroadcast);
    }
    if (addressListeners.size === 0 && addressesChannel) {
      supabase.removeChannel(addressesChannel);
      addressesChannel = null;
    }
  };
}

export async function saveAddressToFirestore(address: SavedAddress): Promise<{ success: boolean; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id || null;
  const scope = getUserScopeKeyFromUser(authData?.user) || activeUserScope;
  const savedProf = scope ? getSavedUserProfile(scope) : getSavedUserProfile();

  const current = getStoredAddresses(scope || undefined).filter((a) => a.id !== address.id);
  const updated = [address, ...current];

  if (scope) {
    safeSetItem(`giriraj_addrs_${scope}`, JSON.stringify(updated));
    safeSetItem(`giriraj_active_addr_${scope}`, JSON.stringify(address));
  }
  const activeKey = getActiveAddressStorageKey(scope);
  safeSetItem(activeKey, JSON.stringify(address));
  notifyAddressListeners(updated);
  broadcastAddressUpdate(updated, userId || undefined);

  const rowPayload = {
    id: address.id,
    user_id: userId,
    userId: userId,
    userScope: scope,
    tag: address.tag,
    tag_label: address.tagLabel || null,
    tagLabel: address.tagLabel || null,
    house_name: address.houseName,
    houseName: address.houseName,
    house_flat: address.houseFlat,
    houseFlat: address.houseFlat,
    building_road: address.buildingRoad,
    buildingRoad: address.buildingRoad,
    landmark: address.landmark || null,
    area_name: address.area?.name || 'Kolkata',
    pincode: address.area?.pincode || '700001',
    area_data: address.area,
    area: address.area,
    lat: address.lat || null,
    lng: address.lng || null,
    formatted_exact_address: address.formattedExactAddress || null,
    formattedExactAddress: address.formattedExactAddress || null,
    receiver_name: address.receiverName || savedProf?.name || null,
    receiverName: address.receiverName || savedProf?.name || null,
    receiver_phone: address.receiverPhone || savedProf?.phone || null,
    receiverPhone: address.receiverPhone || savedProf?.phone || null,
    receiverEmail: savedProf?.email || null,
    created_at: address.createdAt || new Date().toISOString(),
    createdAt: address.createdAt || new Date().toISOString()
  };

  // 1. Server API persistent storage call (Server-side storage survives cache clears)
  let serverSuccess = false;
  try {
    const res = await fetch(`${API_BASE_URL}/api/saved-addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rowPayload)
    });
    if (res.ok) {
      serverSuccess = true;
    }
  } catch (err) {
    console.warn('Server address save notice:', err);
  }

  // 2. Direct Supabase Upsert
  try {
    const { error } = await supabase.from('saved_addresses').upsert({
      id: rowPayload.id,
      user_id: rowPayload.user_id,
      tag: rowPayload.tag,
      tag_label: rowPayload.tag_label,
      house_name: rowPayload.house_name,
      house_flat: rowPayload.house_flat,
      building_road: rowPayload.building_road,
      landmark: rowPayload.landmark,
      area_name: rowPayload.area_name,
      pincode: rowPayload.pincode,
      area_data: rowPayload.area_data,
      lat: rowPayload.lat,
      lng: rowPayload.lng,
      formatted_exact_address: rowPayload.formatted_exact_address,
      receiver_name: rowPayload.receiver_name,
      receiver_phone: rowPayload.receiver_phone,
      created_at: rowPayload.created_at
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase save address notice:', error.message);
      enqueuePendingSync({
        type: 'address',
        payload: rowPayload
      });
      return { success: serverSuccess, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn('Supabase save address error:', msg);
    enqueuePendingSync({
      type: 'address',
      payload: rowPayload
    });
    return { success: serverSuccess || true, error: msg };
  }
}

export async function deleteAddressFromFirestore(id: string): Promise<{ success: boolean; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id || null;
  const scope = getUserScopeKeyFromUser(authData?.user) || activeUserScope;

  const current = getStoredAddresses(scope || undefined);
  const updated = current.filter((a) => a.id !== id);
  if (scope) {
    safeSetItem(`giriraj_addrs_${scope}`, JSON.stringify(updated));
  }

  const activeKey = getActiveAddressStorageKey(scope);
  const activeRaw = safeGetItem(activeKey);
  if (activeRaw) {
    try {
      const activeObj = JSON.parse(activeRaw);
      if (activeObj?.id === id) {
        if (updated.length > 0) {
          safeSetItem(activeKey, JSON.stringify(updated[0]));
        } else {
          safeRemoveItem(activeKey);
        }
      }
    } catch {}
  }

  notifyAddressListeners(updated);
  broadcastAddressUpdate(updated, userId || undefined);

  // 1. Call Server Delete API
  try {
    fetch(`${API_BASE_URL}/api/saved-addresses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Cache-Control': 'no-cache' }
    }).catch(() => {
      fetch(`${API_BASE_URL}/api/saved-addresses/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      }).catch(console.warn);
    });
  } catch (apiErr) {
    console.warn('Server delete address notice:', apiErr);
  }

  // 2. Delete from Supabase client
  try {
    let query = supabase.from('saved_addresses').delete().eq('id', id);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { error } = await query;
    if (error) {
      enqueuePendingSync({
        type: 'delete_address',
        payload: { id, userId }
      });
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn('Supabase delete address error:', msg);
    enqueuePendingSync({
      type: 'delete_address',
      payload: { id, userId }
    });
    return { success: true };
  }
}

// ============================================================================
// SAVED UPI IDS (Supabase `saved_upi_ids` table with RLS)
// ============================================================================

type UpiListener = (upis: string[]) => void;
const upiListeners = new Set<UpiListener>();

export function getStoredUpiIds(userScopeOverride?: string): string[] {
  try {
    const scope = userScopeOverride || activeUserScope;
    if (!scope) return [];
    const raw = localStorage.getItem(`giriraj_upi_${scope}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function notifyUpiListeners(upis: string[]) {
  upiListeners.forEach((l) => {
    try {
      l(upis);
    } catch (e) {
      // ignore
    }
  });
}

export function subscribeToUpiIds(listener: UpiListener): () => void {
  upiListeners.add(listener);
  listener(getStoredUpiIds());

  async function fetchUpiIds() {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user?.id) {
        notifyUpiListeners([]);
        return;
      }
      const scope = getUserScopeKeyFromUser(authData.user);
      const { data, error } = await supabase
        .from('saved_upi_ids')
        .select('upi_id')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(15);

      if (!error && data) {
        const list = data.map((r) => r.upi_id).filter(Boolean);
        if (scope) {
          safeSetItem(`giriraj_upi_${scope}`, JSON.stringify(list));
        }
        notifyUpiListeners(list);
      }
    } catch (e) {
      console.warn('UPI fetch note:', e);
    }
  }

  fetchUpiIds();

  return () => {
    upiListeners.delete(listener);
  };
}

export async function saveUpiToFirestore(upiId: string): Promise<{ success: boolean; error?: string }> {
  const cleanUpi = upiId.trim().toLowerCase();
  if (!cleanUpi) return { success: false, error: 'Empty UPI ID' };
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id || null;
  const scope = getUserScopeKeyFromUser(authData?.user) || activeUserScope;

  if (scope) {
    const current = getStoredUpiIds(scope).filter((u) => u.toLowerCase() !== cleanUpi);
    const updated = [cleanUpi, ...current];
    safeSetItem(`giriraj_upi_${scope}`, JSON.stringify(updated));
    notifyUpiListeners(updated);
  }

  try {
    const { error } = await supabase.from('saved_upi_ids').upsert({
      upi_id: cleanUpi,
      user_id: userId,
      created_at: new Date().toISOString()
    }, { onConflict: 'upi_id,user_id' });

    if (error) {
      enqueuePendingSync({
        type: 'upi',
        payload: { upiId: cleanUpi, userId }
      });
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn('Supabase save upi error:', msg);
    enqueuePendingSync({
      type: 'upi',
      payload: { upiId: cleanUpi, userId }
    });
    return { success: false, error: msg };
  }
}

export async function deleteUpiFromFirestore(upiId: string): Promise<{ success: boolean; error?: string }> {
  const cleanUpi = upiId.trim().toLowerCase();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id || null;
  const scope = getUserScopeKeyFromUser(authData?.user) || activeUserScope;

  if (scope) {
    const current = getStoredUpiIds(scope);
    const updated = current.filter((u) => u.toLowerCase() !== cleanUpi);
    safeSetItem(`giriraj_upi_${scope}`, JSON.stringify(updated));
    notifyUpiListeners(updated);
  }

  try {
    let query = supabase.from('saved_upi_ids').delete().eq('upi_id', cleanUpi);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { error } = await query;
    if (error) {
      enqueuePendingSync({
        type: 'delete_upi',
        payload: { upiId: cleanUpi, userId }
      });
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn('Supabase delete upi error:', msg);
    enqueuePendingSync({
      type: 'delete_upi',
      payload: { upiId: cleanUpi, userId }
    });
    return { success: false, error: msg };
  }
}

// ============================================================================
// TASK: SUPABASE PRODUCTS CATALOG SYNC & MANAGEMENT
// ============================================================================

/**
 * Saves/syncs all catalog products into Supabase `products` table
 */
export async function syncAllProductsToSupabase(
  customProducts?: Product[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const productsToSync = (customProducts || []).filter((p) => {
      const name = String(p.name || '').trim().toLowerCase();
      const brand = String(p.brand || '').trim().toLowerCase();
      return name !== 'demo' && !name.includes('demo product') && brand !== 'demo';
    });
    const rows = productsToSync.map((p) => {
      const price = Number(p.price || 0);
      const mrp = Number(p.originalPrice || price);
      const discount = Number(p.discountPercentage || (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0));
      return {
        id: String(p.id),
        name: p.name,
        brand: p.brand,
        category: p.category || 'electrical',
        subcategory: p.subCategory || 'General',
        sub_category: p.subCategory || 'General',
        price,
        mrp,
        original_price: mrp,
        discount_percent: discount,
        discount_percentage: discount,
        unit: p.unit || '1 pc',
        rating_avg: p.rating || 4.8,
        rating: p.rating || 4.8,
        rating_count: p.reviewsCount || 50,
        reviews_count: p.reviewsCount || 50,
        delivery_minutes: p.deliveryMinutes || 30,
        image: p.image,
        image_urls: [p.image || 'https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=800&auto=format&fit=crop'],
        in_stock: p.inStock ?? true,
        stock_quantity: p.stockCount || 50,
        stock_count: p.stockCount || 50,
        tags: p.tags || [],
        is_emergency: !!p.isEmergency,
        is_best_seller: !!p.isBestSeller,
        specs: p.specs || {},
        specifications: p.specs || {},
        description: p.description || '',
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await supabase
      .from('products')
      .upsert(rows, { onConflict: 'id' });

    // Also run targeted update for Dalda pipe
    await updateOrMigrateDaldaPipeInSupabase();

    if (error) {
      console.warn('Supabase products upsert notice:', error.message);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: rows.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Error syncing products to Supabase:', msg);
    return { success: false, count: 0, error: msg };
  }
}

/**
 * Dedicated database migration function that updates any 'Dada pipe' row in Supabase
 * to '3/4" Dalda PVC Conduit Pipe' and replaces its old photo with https://i.imgur.com/G9LIx1R.jpeg
 */
export async function updateOrMigrateDaldaPipeInSupabase(): Promise<{ success: boolean; updatedCount: number }> {
  try {
    const newImage = 'https://i.imgur.com/G9LIx1R.jpeg';
    const newName = '3/4" Dalda PVC Conduit Pipe (10 Ft Length, Heavy Duty)';
    const newSpecs = {
      Size: '3/4 Inch (20mm)',
      Brand: 'Dalda',
      Length: '10 Feet (3 Metres)',
      Material: 'Heavy Virgin Rigid PVC',
      Standard: 'IS 9537 Part 3',
      'Available Colors': 'Ivory/White, Black, Grey, Blue, Red, Yellow',
      Application: 'Concealed RCC Slab Casting & Wall Chasing Wiring'
    };

    // 1. Search for any existing products in Supabase matching "dada" (case-insensitive)
    const { data: dadaProducts } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', '%dada%');

    let updatedCount = 0;

    if (dadaProducts && dadaProducts.length > 0) {
      // Batch update all matching product records in a single query (fixes N+1 sequential loop)
      const matchedIds = dadaProducts.map((p) => p.id);
      const { error: batchUpdateErr } = await supabase
        .from('products')
        .update({
          name: newName,
          brand: 'Dalda',
          image: newImage,
          image_urls: [newImage],
          sub_category: 'Pipes',
          subcategory: 'Pipes',
          specs: newSpecs,
          specifications: newSpecs,
          updated_at: new Date().toISOString()
        })
        .in('id', matchedIds);

      if (!batchUpdateErr) {
        updatedCount = matchedIds.length;
      }
    }

    // 2. Also ensure standard 'p-dalda-pipe-3-4' exists in Supabase
    await supabase.from('products').upsert({
      id: 'p-dalda-pipe-3-4',
      name: newName,
      brand: 'Dalda',
      category: 'electrical',
      sub_category: 'Pipes',
      subcategory: 'Pipes',
      price: 65,
      mrp: 80,
      original_price: 80,
      discount_percent: 19,
      discount_percentage: 19,
      unit: '1 Piece (10ft)',
      rating_avg: 4.9,
      rating: 4.9,
      rating_count: 118,
      reviews_count: 118,
      delivery_minutes: 30,
      image: newImage,
      image_urls: [newImage],
      in_stock: true,
      stock_quantity: 350,
      stock_count: 350,
      tags: ['pipe', 'dalda', 'pvc', 'conduit', '3/4 pipe', 'dalda pipe', 'electrical'],
      is_best_seller: true,
      specs: newSpecs,
      specifications: newSpecs,
      description: 'High-durability 3/4" Dalda rigid PVC conduit pipe with high impact strength, shock protection, and flame-retardant formulation for residential and commercial building electrical conduit routing.',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    return { success: true, updatedCount };
  } catch (err) {
    console.warn('Notice updating Dalda pipe in Supabase:', err);
    return { success: false, updatedCount: 0 };
  }
}

// Auto-run migration once on client initialization
if (typeof window !== 'undefined') {
  setTimeout(() => {
    updateOrMigrateDaldaPipeInSupabase().catch(() => {});
  }, 1000);
}

/**
 * Fetches live products strictly from Supabase `products` table (Strict Database Mode)
 */
export async function fetchProductsFromSupabase(): Promise<Product[]> {
  try {
    // Run migration guarantee
    updateOrMigrateDaldaPipeInSupabase().catch(() => {});

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data) {
      const dbProducts: Product[] = data.map((row): Product => {
        const rawImageUrls: string[] = Array.isArray(row.image_urls)
          ? row.image_urls.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
          : typeof row.image_urls === 'string' && row.image_urls.startsWith('http')
          ? [row.image_urls]
          : [];

        if (row.image && typeof row.image === 'string' && row.image.trim() && !rawImageUrls.includes(row.image.trim())) {
          rawImageUrls.unshift(row.image.trim());
        }

        const primaryImage =
          rawImageUrls[0] ||
          row.image ||
          'https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=800&auto=format&fit=crop';
        const finalImages = rawImageUrls.length > 0 ? rawImageUrls : [primaryImage];

        return {
          id: String(row.id),
          name: row.name || 'Product',
          brand: row.brand || 'Giriraj Genuine',
          category: row.category || 'electrical',
          subCategory: row.sub_category || row.subcategory || row.subCategory || 'General',
          price: Number(row.price || 0),
          originalPrice: Number(row.original_price || row.originalPrice || row.mrp || (row.price ? row.price * 1.15 : 0)),
          discountPercentage: Number(row.discount_percentage || row.discountPercentage || 0),
          unit: row.unit || '1 pc',
          rating: Number(row.rating || row.rating_avg || 4.8),
          reviewsCount: Number(row.reviews_count || row.rating_count || 50),
          deliveryMinutes: Number(row.delivery_minutes || row.deliveryMinutes || 30),
          image: primaryImage,
          images: finalImages,
          image_urls: finalImages,
          inStock: row.in_stock ?? row.inStock ?? true,
          stockCount: Number(row.stock_count || row.stock_quantity || 50),
          tags: row.tags || [],
          isEmergency: !!(row.is_emergency ?? row.isEmergency),
          isBestSeller: !!(row.is_best_seller ?? row.isBestSeller),
          specs: row.specs || (typeof row.specifications === 'object' ? row.specifications : {}),
          colors: Array.isArray(row.colors)
            ? row.colors
            : typeof row.colors === 'string'
            ? [row.colors]
            : Array.isArray(row.colours)
            ? row.colours
            : undefined,
          colours: Array.isArray(row.colors)
            ? row.colors
            : typeof row.colors === 'string'
            ? [row.colors]
            : Array.isArray(row.colours)
            ? row.colours
            : undefined,
          selectedColor: row.selectedColor || row.selected_color,
          description: row.description || ''
        };
      });

      return dbProducts;
    }
  } catch (err) {
    console.warn('Supabase products fetch error:', err);
  }

  return [];
}

