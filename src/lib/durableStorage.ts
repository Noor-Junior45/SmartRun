import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

// In-memory cache for ultra-fast, synchronous access
const memoryCache = new Map<string, string>();

// List of critical keys that must be synchronized between Preferences and localStorage
const CRITICAL_KEYS = [
  'giriraj_supabase_auth_session',
  'smartrun_user_profile',
  'giriraj_active_user_scope',
  'smartrun_last_known_user',
  'giriraj_phone_auth_credentials',
  'giriraj_auth_recovery_snapshot'
];

/**
 * Synchronous get from in-memory cache or window.localStorage
 */
export function durableGetItem(key: string): string | null {
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) {
        memoryCache.set(key, val);
        return val;
      }
    } catch {}
  }
  return null;
}

/**
 * Asynchronous get: checks memory/localStorage, then falls back to native Capacitor Preferences
 */
export async function durableGetItemAsync(key: string): Promise<string | null> {
  const syncVal = durableGetItem(key);
  if (syncVal !== null) {
    return syncVal;
  }

  try {
    const res = await Preferences.get({ key });
    if (res.value !== null && res.value !== undefined) {
      memoryCache.set(key, res.value);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(key, res.value);
        } catch {}
      }
      return res.value;
    }
  } catch {}

  return null;
}

/**
 * Durable set: writes synchronously to memory + localStorage,
 * and asynchronously persists to native Android/iOS SharedPreferences.
 */
export function durableSetItem(key: string, value: string): void {
  memoryCache.set(key, value);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  }

  // Persist to native storage
  Preferences.set({ key, value }).catch((err) => {
    console.debug(`[DurableStorage] Preferences.set error for ${key}:`, err);
  });
}

/**
 * Durable remove: removes from memory, localStorage, and native Preferences
 */
export function durableRemoveItem(key: string): void {
  memoryCache.delete(key);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }

  Preferences.remove({ key }).catch((err) => {
    console.debug(`[DurableStorage] Preferences.remove error for ${key}:`, err);
  });
}

/**
 * Pre-hydrates critical storage from native Android Preferences into memory & localStorage on startup.
 * Ensures that if the Android OS WebView was cold or cleared, all auth tokens and profile data
 * are immediately restored before any components render or auth state checks run.
 */
export async function hydrateDurableStorage(): Promise<void> {
  try {
    for (const key of CRITICAL_KEYS) {
      const res = await Preferences.get({ key });
      if (res.value) {
        memoryCache.set(key, res.value);
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.setItem(key, res.value);
          } catch {}
        }
      }
    }

    // Also check for any scope-specific profile keys
    const scopeVal = memoryCache.get('giriraj_active_user_scope') || (typeof window !== 'undefined' ? window.localStorage.getItem('giriraj_active_user_scope') : null);
    if (scopeVal) {
      const scopeKey = `giriraj_profile_${scopeVal}`;
      const scopeRes = await Preferences.get({ key: scopeKey });
      if (scopeRes.value) {
        memoryCache.set(scopeKey, scopeRes.value);
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.setItem(scopeKey, scopeRes.value);
          } catch {}
        }
      }
    }
  } catch (err) {
    console.debug('[DurableStorage] Hydration error notice:', err);
  }
}

// Start hydration immediately on module load
if (Capacitor.isNativePlatform()) {
  hydrateDurableStorage().catch(() => {});
}

/**
 * Supabase auth storage adapter conforming to Supabase client auth.storage contract
 */
export const durableAuthStorage = {
  getItem: (key: string): string | Promise<string | null> | null => {
    const cached = durableGetItem(key);
    if (cached !== null) {
      return cached;
    }
    // Fall back to native async Preferences if on native app
    if (Capacitor.isNativePlatform()) {
      return durableGetItemAsync(key);
    }
    return null;
  },

  setItem: (key: string, value: string): void | Promise<void> => {
    durableSetItem(key, value);
  },

  removeItem: (key: string): void | Promise<void> => {
    durableRemoveItem(key);
  }
};
