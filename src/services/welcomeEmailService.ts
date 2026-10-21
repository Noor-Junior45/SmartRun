/**
 * Welcome Email Service
 * Dispatches onboarding welcome email to new SmartRun members using the minimalist Zerodha card design.
 * Includes client-side deduplication so users receive it exactly once upon account creation.
 */
import { apiUrl } from '../lib/apiBase';

export interface WelcomeEmailPayload {
  email: string;
  name?: string;
  userId?: string;
  force?: boolean;
}

const WELCOME_EMAIL_SENT_PREFIX = 'smartrun_welcome_sent_';

export async function sendWelcomeEmail(
  payload: WelcomeEmailPayload
): Promise<{ success: boolean; message: string; alreadySent?: boolean }> {
  const cleanEmail = (payload.email || '').trim().toLowerCase();
  if (
    !cleanEmail ||
    !cleanEmail.includes('@') ||
    !cleanEmail.includes('.') ||
    cleanEmail.includes('@girirajpower.internal')
  ) {
    return { success: false, message: 'Invalid or internal email address.' };
  }

  // Deduplication guard: ensure only sent once per account
  if (!payload.force && typeof window !== 'undefined') {
    try {
      const alreadySent = localStorage.getItem(`${WELCOME_EMAIL_SENT_PREFIX}${cleanEmail}`);
      if (alreadySent === 'true') {
        return { success: true, message: 'Welcome email already delivered to this account.', alreadySent: true };
      }
    } catch {}
  }

  try {
    const targetUrl = apiUrl('/api/auth/send-welcome-email');
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        name: payload.name || cleanEmail.split('@')[0] || 'Valued Customer',
        userId: payload.userId,
        force: payload.force,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (typeof window !== 'undefined' && (res.ok || data.alreadySent)) {
      try {
        localStorage.setItem(`${WELCOME_EMAIL_SENT_PREFIX}${cleanEmail}`, 'true');
      } catch {}
    }

    return {
      success: res.ok,
      message: data.message || (res.ok ? 'Welcome email dispatched successfully.' : 'Failed to dispatch welcome email.'),
      alreadySent: data.alreadySent,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Welcome Email Service Notice]:', msg);
    return { success: false, message: msg };
  }
}
