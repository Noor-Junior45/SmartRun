import { API_BASE_URL } from '../../lib/apiBase';

export interface GoogleMapsStatus {
  available: boolean;
  billingEnabled: boolean;
  apiKey: string | null;
  reason?: string;
  message?: string;
}

let cachedApiKey: string | null = null;
let cachedStatus: GoogleMapsStatus | null = null;
let statusFetchPromise: Promise<GoogleMapsStatus> | null = null;

/**
 * Returns the Google Maps API key synchronously if already loaded in environment or cache.
 */
export function getSynchronousGoogleMapsKey(): string | null {
  if (cachedApiKey) return cachedApiKey;

  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ((process as any)?.env || {});
  const envKey = (
    env.VITE_GOOGLE_MAPS_API_KEY ||
    env.GOOGLE_MAPS_API_KEY ||
    (typeof window !== 'undefined' && (window as any).__GOOGLE_MAPS_API_KEY__) ||
    ''
  ).trim();

  if (envKey && envKey !== 'YOUR_API_KEY' && !envKey.includes('placeholder') && envKey.length > 10) {
    cachedApiKey = envKey;
    return envKey;
  }
  return null;
}

/**
 * Retrieves the comprehensive Google Maps status, verifying whether Cloud Billing is active.
 * This prevents the browser from loading maps.googleapis.com with an unbilled key,
 * which eliminates the fatal 'BillingNotEnabledMapError' error and watermark.
 */
export async function getGoogleMapsStatus(forceRefresh = false): Promise<GoogleMapsStatus> {
  if (!forceRefresh && cachedStatus) return cachedStatus;
  if (!forceRefresh && statusFetchPromise) return statusFetchPromise;

  statusFetchPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/maps/google/status${forceRefresh ? '?fresh=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        const status: GoogleMapsStatus = {
          available: Boolean(data.available),
          billingEnabled: Boolean(data.billingEnabled),
          apiKey: data.apiKey || null,
          reason: data.reason,
          message: data.message
        };
        cachedStatus = status;
        if (status.apiKey) {
          cachedApiKey = status.apiKey;
          if (typeof window !== 'undefined') {
            (window as any).__GOOGLE_MAPS_API_KEY__ = status.apiKey;
          }
        }
        return status;
      }
    } catch {
      // Ignore network errors gracefully
    }

    const fallbackKey = getSynchronousGoogleMapsKey();
    const fallbackStatus: GoogleMapsStatus = {
      available: false,
      billingEnabled: false,
      apiKey: fallbackKey,
      reason: 'StatusCheckFailed'
    };
    cachedStatus = fallbackStatus;
    return fallbackStatus;
  })();

  const result = await statusFetchPromise;
  statusFetchPromise = null;
  return result;
}

/**
 * Resolves the Google Maps API key, asynchronously querying the server endpoint if needed.
 */
export async function resolveGoogleMapsApiKey(): Promise<string | null> {
  const syncKey = getSynchronousGoogleMapsKey();
  if (syncKey) return syncKey;

  const status = await getGoogleMapsStatus();
  return status.apiKey;
}
