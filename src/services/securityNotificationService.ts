/**
 * Security Notification Service
 * Dispatches real-time login alert notifications (Binance / Uber / Zomato style)
 * with timestamp, detected device, and approximate location.
 */
import { API_BASE_URL } from '../lib/apiBase';
import { ACTIVE_SAVED_ADDRESS_KEY, getActiveAddressStorageKey, safeGetItem } from './supabaseService';

export interface LoginAlertPayload {
  email: string;
  name?: string;
  userId?: string;
  phone?: string;
  accountId?: string;
  loginMethod?: string;
  force?: boolean;
}

export interface ClientDeviceInfo {
  deviceType: string;
  osName: string;
  browserName: string;
  isApp: boolean;
  userAgent: string;
  screenResolution: string;
  language: string;
  timeZone: string;
}

/**
 * Accurately parses userAgent and client capabilities to detect device & environment
 */
export function getClientDeviceInfo(): ClientDeviceInfo {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'Web Browser',
      osName: 'Unknown OS',
      browserName: 'Unknown Browser',
      isApp: false,
      userAgent: '',
      screenResolution: '1920x1080',
      language: 'en-IN',
      timeZone: 'Asia/Kolkata',
    };
  }

  const ua = navigator.userAgent || '';
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  // 1. Detect OS
  let osName = 'Unknown OS';
  if (/android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9\.]+)/i);
    osName = match ? `Android ${match[1]}` : 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/OS\s([0-9_]+)/i);
    osName = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/Windows NT/i.test(ua)) {
    if (/Windows NT 10.0/i.test(ua)) osName = 'Windows 10/11';
    else if (/Windows NT 6.3/i.test(ua)) osName = 'Windows 8.1';
    else if (/Windows NT 6.1/i.test(ua)) osName = 'Windows 7';
    else osName = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    const match = ua.match(/Mac OS X\s([0-9_]+)/i);
    osName = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/Linux/i.test(ua)) {
    osName = 'Linux';
  }

  // 2. Detect Browser / App wrapper
  let browserName = 'Browser';
  let isApp = false;

  if (ua.includes('SmartRun') || ua.includes('Smartrun') || ua.includes('BuildNow') || ua.includes('TWA') || ua.includes('AndroidApp') || isStandalone) {
    isApp = true;
    browserName = /android/i.test(ua) ? 'SmartRun Android App' : 'SmartRun App (Standalone)';
  } else if (/Edg\//i.test(ua)) {
    const match = ua.match(/Edg\/([0-9\.]+)/i);
    browserName = match ? `Microsoft Edge ${match[1].split('.')[0]}` : 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua) && !/Chromium|Edg|OPR/i.test(ua)) {
    const match = ua.match(/Chrome\/([0-9\.]+)/i);
    browserName = match ? `Google Chrome ${match[1].split('.')[0]}` : 'Google Chrome';
  } else if (/Safari\//i.test(ua) && !/Chrome|Chromium/i.test(ua)) {
    const match = ua.match(/Version\/([0-9\.]+)/i);
    browserName = match ? `Apple Safari ${match[1].split('.')[0]}` : 'Apple Safari';
  } else if (/Firefox\//i.test(ua)) {
    const match = ua.match(/Firefox\/([0-9\.]+)/i);
    browserName = match ? `Mozilla Firefox ${match[1].split('.')[0]}` : 'Mozilla Firefox';
  } else if (/Opera|OPR/i.test(ua)) {
    browserName = 'Opera Browser';
  }

  // 3. Detect Device Form Factor
  let deviceType = 'Desktop PC / Laptop';
  if (/tablet|ipad/i.test(ua) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua))) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|ipod|android.*mobile/i.test(ua)) {
    deviceType = isApp ? 'Android Smartphone (SmartRun App)' : 'Mobile Device';
  }

  let screenResolution = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
  let language = navigator.language || 'en-IN';
  let timeZone = 'Asia/Kolkata';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    // fallback
  }

  return {
    deviceType,
    osName,
    browserName,
    isApp,
    userAgent: ua,
    screenResolution,
    language,
    timeZone,
  };
}

const LAST_ALERT_STORAGE_KEY = 'giriraj_last_login_alert_v1';
const SESSION_ALERT_KEY = 'giriraj_session_alert_sent';

/**
 * Triggers the login notification email to the authenticated user.
 * Implements intelligent debouncing (2 minutes window) to prevent duplicate spam
 * while ensuring every genuine sign-in sends a real-time security alert.
 */
export async function sendLoginNotificationEmail(payload: LoginAlertPayload): Promise<{ success: boolean; message?: string }> {
  const cleanEmail = (payload.email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, message: 'Invalid email address.' };
  }

  // Check debounce unless explicitly forced
  if (!payload.force && typeof window !== 'undefined') {
    try {
      const sessionSent = sessionStorage.getItem(SESSION_ALERT_KEY);
      const lastSentRaw = localStorage.getItem(`${LAST_ALERT_STORAGE_KEY}_${cleanEmail}`);
      const now = Date.now();

      // If already sent in this tab session for this email, skip
      if (sessionSent === cleanEmail) {
        return { success: true, message: 'Login alert already recorded for this session.' };
      }

      // If sent in the last 120 seconds across tabs, skip duplicate
      if (lastSentRaw) {
        const lastSentTime = parseInt(lastSentRaw, 10);
        if (!isNaN(lastSentTime) && now - lastSentTime < 120000) {
          return { success: true, message: 'Login alert recently dispatched.' };
        }
      }
    } catch {
      // Continue if storage check errors
    }
  }

  try {
    const deviceInfo = getClientDeviceInfo();
    const clientTimeIso = new Date().toISOString();
    const clientTimeFormatted = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    // Attempt to extract localized area / city if set
    let detectedLocation = '';
    if (typeof window !== 'undefined') {
      try {
        const storedActiveAddr = safeGetItem(getActiveAddressStorageKey(payload.userId)) || safeGetItem(ACTIVE_SAVED_ADDRESS_KEY);
        if (storedActiveAddr) {
          const parsed = JSON.parse(storedActiveAddr);
          if (parsed && typeof parsed === 'object') {
            const areaName = typeof parsed.area === 'object' ? parsed.area?.name : parsed.area;
            if (areaName || parsed.city) {
              detectedLocation = [areaName, parsed.city || 'Kolkata', 'West Bengal, India'].filter(Boolean).join(', ');
            }
          }
        }
      } catch {
        // fallback
      }
    }

    const body = {
      email: cleanEmail,
      name: payload.name || cleanEmail.split('@')[0] || 'Valued Customer',
      userId: payload.userId,
      phone: payload.phone,
      accountId: payload.accountId || (payload.phone ? `+91 ${payload.phone.replace(/\D/g, '').slice(-10)}` : cleanEmail),
      loginMethod: payload.loginMethod || 'Email & Password',
      device: deviceInfo.deviceType,
      os: deviceInfo.osName,
      browser: deviceInfo.browserName,
      userAgent: deviceInfo.userAgent,
      isApp: deviceInfo.isApp,
      screenResolution: deviceInfo.screenResolution,
      timeZone: deviceInfo.timeZone,
      clientTime: clientTimeIso,
      clientTimeFormatted,
      clientLocation: detectedLocation,
      force: payload.force,
    };

    const targetUrl = API_BASE_URL ? `${API_BASE_URL}/api/auth/login-notification` : '/api/auth/login-notification';

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    // Record success in storage to avoid duplicate spam
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_ALERT_KEY, cleanEmail);
        localStorage.setItem(`${LAST_ALERT_STORAGE_KEY}_${cleanEmail}`, Date.now().toString());
      } catch {
        // ignore
      }
    }

    return {
      success: res.ok,
      message: data.message || 'Login notification sent.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Security Notification Service Notice]:', msg);
    return { success: false, message: msg };
  }
}
