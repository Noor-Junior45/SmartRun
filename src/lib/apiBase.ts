import { Capacitor } from '@capacitor/core';

/**
 * Universal API Base URL resolution for Native Apps (Capacitor Android & iOS) and Web Deployments.
 *
 * In native mobile builds (Android & iOS WebView), relative fetch('/api/...') calls
 * fail because there is no local backend server inside the device container.
 * This resolves to the live backend server (https://smartrun.in / https://www.girirajpower.in) or VITE_API_BASE_URL,
 * while preserving standard relative paths in web browsers.
 */
export const API_BASE_URL: string = (() => {
  // 1. Prioritize explicit environment variable if set
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (process.env as any || {});
  if (env.VITE_API_BASE_URL) {
    return String(env.VITE_API_BASE_URL).replace(/\/+$/, '');
  }

  if (typeof window === 'undefined') return '';

  const origin = window.location.origin || '';
  const hostname = window.location.hostname || '';
  const port = window.location.port || '';

  // 2. Comprehensive check for Native Android & iOS Capacitor runtime
  const isCapacitorNative =
    Capacitor.isNativePlatform() ||
    Capacitor.getPlatform() === 'android' ||
    Capacitor.getPlatform() === 'ios' ||
    (typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) ||
    origin.startsWith('capacitor://') ||
    origin.startsWith('ionic://') ||
    origin.startsWith('file://') ||
    // On Android Capacitor with androidScheme: 'https', origin is strictly https://localhost without port
    (origin === 'https://localhost' && (!port || port === '443')) ||
    // Common emulator loopback addresses when testing on Android
    hostname === '10.0.2.2';

  if (isCapacitorNative) {
    return 'https://www.smartrun.in';
  }

  return '';
})();

/**
 * Helper to safely construct full API URLs across Web and Capacitor platforms.
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return cleanPath;
  return `${API_BASE_URL.replace(/\/+$/, '')}${cleanPath}`;
}
