import { Capacitor } from '@capacitor/core';

/**
 * Universal API Base URL resolution for Native Apps (Capacitor Android & iOS) and Web Deployments.
 *
 * In native mobile builds (Android & iOS WebView) and external frontend deployments (Vercel),
 * relative fetch('/api/...') calls need to resolve to the active Render backend server (https://smartrun.onrender.com
 * or https://www.smartrun.in), while preserving standard local relative paths during local development.
 */
export const API_BASE_URL: string = (() => {
  // 1. Prioritize explicit environment variables if set (e.g. Render backend URL in Vercel)
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (process.env as any || {});
  const explicitApiUrl =
    env.VITE_API_URL ||
    env.VITE_API_BASE_URL ||
    env.VITE_API_KEY ||
    env.API_KEY;

  if (explicitApiUrl) {
    // Trim whitespace and remove trailing slashes
    const cleaned = String(explicitApiUrl).trim().replace(/\/+$/, '');
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      return cleaned;
    }
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
    return 'https://smartrun.onrender.com';
  }

  // 3. If deployed on Vercel (*.vercel.app), route API traffic to Render live backend
  if (hostname.endsWith('.vercel.app') || hostname === 'smartrun.vercel.app') {
    return 'https://smartrun.onrender.com';
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

/**
 * Client-Side Warm-Up Helper
 * Sends a lightweight keep-alive ping to Render to prevent sleeping or wake up cold starts.
 */
export function pingRenderKeepAlive(): void {
  try {
    const url = apiUrl('/api/health');
    fetch(url, {
      method: 'GET',
      headers: { 'X-Keep-Alive': 'smartrun-frontend' }
    }).catch(() => {});
  } catch {}
}
