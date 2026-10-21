import { apiUrl } from '../lib/apiBase';
import { UserProfile } from '../types';

const SERVER_SESSION_TOKEN_KEY = 'smartrun_server_session_token';

/**
 * Retrieve stored server-authoritative JWT session token
 * (Crucial for Android Native App / Capacitor WebView where cookies may be isolated)
 */
export function getServerAuthToken(): string | null {
  try {
    return localStorage.getItem(SERVER_SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Save server-authoritative session token
 */
export function setServerAuthToken(token: string): void {
  try {
    if (token) {
      localStorage.setItem(SERVER_SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SERVER_SESSION_TOKEN_KEY);
    }
  } catch {
    // ignore storage quota error
  }
}

/**
 * Clear server session token from client
 */
export function clearServerAuthToken(): void {
  try {
    localStorage.removeItem(SERVER_SESSION_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Generate standard authorization headers containing the server session token
 * (Used across both Web and Android Native App)
 */
export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  const token = getServerAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface ServerAuthResponse {
  success: boolean;
  authenticated?: boolean;
  sessionToken?: string;
  user?: UserProfile | null;
  profile?: any;
  error?: string;
  message?: string;
}

/**
 * Fetch authenticated user profile directly from Cloud Run backend server.
 * Uses both httpOnly cookie (for web browsers) and Bearer header (for Android App).
 */
export async function fetchServerCurrentUser(): Promise<UserProfile | null> {
  try {
    const res = await fetch(apiUrl('/api/auth/me'), {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache'
      })
    });

    if (!res.ok) {
      return null;
    }

    const data: ServerAuthResponse = await res.json().catch(() => null);
    if (data && data.success && data.user) {
      if (data.sessionToken) {
        setServerAuthToken(data.sessionToken);
      }
      return data.user;
    }
    return null;
  } catch (err) {
    console.debug('[ServerAuth] fetchServerCurrentUser error:', err);
    return null;
  }
}

/**
 * Mint or refresh server-authoritative session on Cloud Run.
 * Sets the secure httpOnly cookie and returns signed session token.
 */
export async function syncServerSession(user: Partial<UserProfile>): Promise<ServerAuthResponse> {
  try {
    const res = await fetch(apiUrl('/api/auth/server-session'), {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        userId: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role || 'customer',
        dob: (user as any).dob,
        avatar_url: user.photoURL
      })
    });

    const data: ServerAuthResponse = await res.json().catch(() => null);
    if (data?.success && data.sessionToken) {
      setServerAuthToken(data.sessionToken);
    }
    return data || { success: false, error: 'Failed to establish server session.' };
  } catch (err: any) {
    console.warn('[ServerAuth] syncServerSession error:', err);
    return { success: false, error: err?.message || 'Network error syncing server session.' };
  }
}

/**
 * Log out from Cloud Run backend server.
 * Clears the httpOnly session cookie and wipes client token.
 */
export async function serverLogout(): Promise<boolean> {
  try {
    clearServerAuthToken();
    await fetch(apiUrl('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders()
    }).catch(() => {});
    return true;
  } catch {
    clearServerAuthToken();
    return true;
  }
}
