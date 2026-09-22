import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { supabase } from '../lib/supabaseClient';
import { UserProfile } from '../types';
import {
  getUserScopeKeyFromUser,
  setActiveUserScope,
  getSavedUserProfile,
  saveUserProfile,
  fetchUserProfileFromSupabase,
  cleanPhoneAutofill,
  safeGetItem,
  safeSetItem
} from './supabaseService';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(firebaseApp);

// Global reference to active ConfirmationResult for multi-step verification
let activeConfirmationResult: ConfirmationResult | null = null;
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;
let lastSentPhoneNumber: string | null = null;
let isFast2SmsSession = false;

/**
 * Format any Indian phone number into strict E.164 (+91XXXXXXXXXX)
 */
export function formatToE164Phone(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  return `+91${digits.slice(-10)}`;
}

/**
 * Clears and resets reCAPTCHA instance to avoid stale container/badge errors
 */
export function resetRecaptchaVerifier(): void {
  try {
    if (activeRecaptchaVerifier) {
      activeRecaptchaVerifier.clear();
      activeRecaptchaVerifier = null;
    }
  } catch (err) {
    console.debug('[Firebase Auth] Error clearing recaptcha verifier:', err);
    activeRecaptchaVerifier = null;
  }

  if (typeof window !== 'undefined') {
    try {
      // Remove any lingering invisible reCAPTCHA DOM badges
      const badges = document.querySelectorAll('.grecaptcha-badge');
      badges.forEach((b) => b.remove());
    } catch {}
  }
}

/**
 * Prepares the RecaptchaVerifier on the specified container (invisible by default)
 */
export function getOrCreateRecaptchaVerifier(containerId = 'recaptcha-container'): RecaptchaVerifier {
  if (typeof window === 'undefined') {
    throw new Error('RecaptchaVerifier requires a browser window environment.');
  }

  // Ensure container element exists in DOM
  let containerEl = document.getElementById(containerId);
  if (!containerEl) {
    containerEl = document.createElement('div');
    containerEl.id = containerId;
    containerEl.style.display = 'none';
    document.body.appendChild(containerEl);
  }

  if (activeRecaptchaVerifier) {
    return activeRecaptchaVerifier;
  }

  activeRecaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
    callback: () => {
      console.log('[Firebase Auth] Invisible reCAPTCHA verification passed');
    },
    'expired-callback': () => {
      console.warn('[Firebase Auth] Invisible reCAPTCHA expired, resetting...');
      resetRecaptchaVerifier();
    }
  });

  return activeRecaptchaVerifier;
}

export interface SendFirebaseOtpResult {
  success: boolean;
  formattedPhone?: string;
  provider?: 'firebase' | 'fast2sms';
  error?: string;
  isBillingRequired?: boolean;
  isRateLimited?: boolean;
  message?: string;
}

/**
 * Direct Fast2SMS Quick SMS dispatch helper (Tier 2 in the cascade)
 */
export async function sendFast2SmsPhoneOtp(rawPhone: string): Promise<SendFirebaseOtpResult> {
  const digits = rawPhone.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) {
    return {
      success: false,
      error: 'Please enter a valid 10-digit mobile number.'
    };
  }
  const formattedPhone = formatToE164Phone(digits);

  try {
    const res = await fetch('/api/sms/send-fast2sms-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: digits })
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data || data.success === false) {
      console.warn('[Fast2SMS Client] Gateway error:', data?.error);
      return {
        success: false,
        formattedPhone,
        error: data?.error || 'Fast2SMS was unable to deliver SMS to this number.'
      };
    }

    lastSentPhoneNumber = formattedPhone;
    isFast2SmsSession = true;
    activeConfirmationResult = null;

    return {
      success: true,
      formattedPhone,
      provider: 'fast2sms',
      message: data.message || `OTP sent via Fast2SMS Quick SMS service to ${formattedPhone}.`
    };
  } catch (err: any) {
    console.warn('[Fast2SMS Client] Network error:', err);
    return {
      success: false,
      formattedPhone,
      error: err?.message || 'Network error reaching Fast2SMS gateway.'
    };
  }
}

/**
 * Direct Fast2SMS OTP verification helper
 */
export async function verifyFast2SmsPhoneOtp(
  phone: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> {
  const digits = phone.replace(/\D/g, '').slice(-10);
  const cleanCode = (otpCode || '').trim();

  try {
    const res = await fetch('/api/sms/verify-fast2sms-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: digits, otp: cleanCode })
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data || data.success === false) {
      return {
        success: false,
        error: data?.error || 'Invalid OTP verification code.'
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error verifying OTP.'
    };
  }
}

/**
 * Sends a real SMS OTP using dual real-SMS architecture:
 * 1. Primary: Google Firebase Phone Auth (Web Client reCAPTCHA)
 * 2. Fallback: Fast2SMS Quick SMS / Indian DLT Route
 * No demo login or mock OTPs.
 */
export async function sendFirebasePhoneOtp(
  rawPhone: string,
  containerId = 'recaptcha-container'
): Promise<SendFirebaseOtpResult> {
  const digits = rawPhone.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) {
    return {
      success: false,
      error: 'Please enter a valid 10-digit mobile number.'
    };
  }

  const formattedPhone = formatToE164Phone(digits);
  lastSentPhoneNumber = formattedPhone;

  // -------------------------------------------------------------
  // PRIMARY: Firebase Phone Auth
  // -------------------------------------------------------------
  try {
    resetRecaptchaVerifier();
    const verifier = getOrCreateRecaptchaVerifier(containerId);

    console.log('[Auth Primary] Requesting Firebase SMS OTP for:', formattedPhone);
    const confirmation = await signInWithPhoneNumber(firebaseAuth, formattedPhone, verifier);
    activeConfirmationResult = confirmation;
    isFast2SmsSession = false;

    return {
      success: true,
      formattedPhone,
      provider: 'firebase',
      message: `Firebase SMS verification code sent to ${formattedPhone}.`
    };
  } catch (firebaseErr: any) {
    console.warn('[Auth Primary Note] Firebase SMS unavailable, trying Fast2SMS:', firebaseErr?.message || firebaseErr);
    resetRecaptchaVerifier();

    // -------------------------------------------------------------
    // FALLBACK: Fast2SMS Quick SMS / OTP Service
    // -------------------------------------------------------------
    console.log('[Auth Fallback] Dispatching real SMS via Fast2SMS service...');
    const fast2smsRes = await sendFast2SmsPhoneOtp(digits);
    if (fast2smsRes.success) {
      return {
        success: true,
        formattedPhone,
        provider: 'fast2sms',
        message: fast2smsRes.message || `OTP sent via Fast2SMS to ${formattedPhone}.`
      };
    }
    console.warn('[Auth Fallback Notice] Fast2SMS returned error:', fast2smsRes.error);

    // If both real gateways fail, return the actual error — NO DEMO OTP
    return {
      success: false,
      formattedPhone,
      error: fast2smsRes.error || firebaseErr?.message || 'Unable to deliver SMS OTP. Please try again.'
    };
  }
}

export interface VerifyFirebaseOtpResult {
  success: boolean;
  user?: any;
  session?: any;
  profile?: UserProfile;
  firebaseUser?: FirebaseUser;
  error?: string;
}

/**
 * Verifies the 6-digit OTP code using Firebase Auth, then bridges the authenticated
 * phone identity into the EXACT SAME Supabase account and user session!
 */
export async function verifyFirebaseOtpAndBridgeToSupabase(
  otpCode: string,
  userFullName?: string,
  phoneOverride?: string
): Promise<VerifyFirebaseOtpResult> {
  const cleanCode = (otpCode || '').trim();
  if (!cleanCode || cleanCode.length < 6) {
    return {
      success: false,
      error: 'Please enter the complete 6-digit verification code.'
    };
  }

  let verifiedPhoneNumber = phoneOverride ? formatToE164Phone(phoneOverride) : lastSentPhoneNumber;
  let firebaseUser: FirebaseUser | undefined;

  // 1. Confirm OTP with Firebase ConfirmationResult
  if (activeConfirmationResult) {
    try {
      const userCredential = await activeConfirmationResult.confirm(cleanCode);
      firebaseUser = userCredential.user;
      if (firebaseUser?.phoneNumber) {
        verifiedPhoneNumber = firebaseUser.phoneNumber;
      }
    } catch (firebaseErr: any) {
      console.warn('[Firebase Auth] Confirmation note:', firebaseErr?.message || firebaseErr);
      const errCode = firebaseErr?.code || '';
      if (errCode === 'auth/invalid-verification-code') {
        return {
          success: false,
          error: 'The verification code entered is invalid. Please check the code and try again.'
        };
      }
      if (errCode === 'auth/code-expired') {
        return {
          success: false,
          error: 'The verification code has expired. Please tap "Resend OTP" to request a new code.'
        };
      }
      return {
        success: false,
        error: firebaseErr?.message || 'Verification failed. Please try again.'
      };
    }
  } else if (isFast2SmsSession) {
    // Verified via Fast2SMS Quick SMS gateway
    console.log('[Fast2SMS] Verifying OTP against Fast2SMS store for:', verifiedPhoneNumber);
    const verifyFastRes = await verifyFast2SmsPhoneOtp(verifiedPhoneNumber, cleanCode);
    if (!verifyFastRes.success) {
      return {
        success: false,
        error: verifyFastRes.error || 'Invalid OTP verification code. Please check your SMS and try again.'
      };
    }
    console.log('[Fast2SMS] Phone successfully verified via Fast2SMS SMS code:', verifiedPhoneNumber);
    isFast2SmsSession = false;
  } else if (!verifiedPhoneNumber) {
    return {
      success: false,
      error: 'No active verification session found. Please request a new OTP.'
    };
  }

  // 2. Bridge verified phone number into the EXACT SAME Supabase account
  if (!verifiedPhoneNumber) {
    return {
      success: false,
      error: 'Could not determine verified phone number from session.'
    };
  }

  const bridgeResult = await bridgeVerifiedPhoneToSupabase(verifiedPhoneNumber, userFullName);
  if (!bridgeResult.success) {
    return {
      success: false,
      error: bridgeResult.error || 'Failed to authenticate into Supabase account.'
    };
  }

  return {
    success: true,
    user: bridgeResult.user,
    session: bridgeResult.session,
    profile: bridgeResult.profile,
    firebaseUser
  };
}

/**
 * Verifies phone OTP (Firebase / Fast2SMS / dev test code) WITHOUT altering the active Supabase session.
 * Used when an already authenticated user links or verifies their mobile number in EditProfileModal.
 */
export async function verifyPhoneOtpOnly(
  otpCode: string,
  targetPhone?: string
): Promise<{ success: boolean; formattedPhone?: string; error?: string }> {
  const cleanCode = (otpCode || '').trim();
  const phone = targetPhone || lastSentPhoneNumber || '';
  const clean10 = phone.replace(/\D/g, '').slice(-10);
  const formattedPhone = `+91${clean10}`;

  if (isFast2SmsSession) {
    const verifyFastRes = await verifyFast2SmsPhoneOtp(phone, cleanCode);
    if (!verifyFastRes.success) {
      return {
        success: false,
        error: verifyFastRes.error || 'Invalid OTP verification code. Please check your SMS and try again.'
      };
    }
    isFast2SmsSession = false;
    return { success: true, formattedPhone };
  }

  if (activeConfirmationResult) {
    try {
      await activeConfirmationResult.confirm(cleanCode);
      activeConfirmationResult = null;
      return { success: true, formattedPhone };
    } catch (firebaseErr: any) {
      const errCode = firebaseErr?.code;
      if (errCode === 'auth/invalid-verification-code') {
        return {
          success: false,
          error: 'The verification code entered is incorrect. Please check your SMS and try again.'
        };
      }
      if (errCode === 'auth/code-expired') {
        return {
          success: false,
          error: 'The verification code has expired. Please tap "Resend OTP" to request a new code.'
        };
      }
      return {
        success: false,
        error: firebaseErr?.message || 'Verification failed. Please try again.'
      };
    }
  }

  return {
    success: false,
    error: 'No active verification session found. Please request a new OTP.'
  };
}

/**
 * Bridges any verified phone number into a genuine, persistent Supabase Auth session
 * guaranteeing that the user retains the same account, order history, addresses, and profile.
 */
export async function bridgeVerifiedPhoneToSupabase(
  verifiedPhoneNumber: string,
  preferredName?: string
): Promise<{
  success: boolean;
  user: any;
  session: any;
  profile: UserProfile;
  error?: string;
}> {
  const clean10 = verifiedPhoneNumber.replace(/\D/g, '').slice(-10);
  const formattedE164 = `+91${clean10}`;
  const canonicalEmail = `p${clean10}@girirajpower.internal`;
  const deterministicPassword = `GirirajPower@${clean10}#2026`;

  // Step 0: Ensure any previous different user session in the client is signed out cleanly
  try {
    const { data: currentAuth } = await supabase.auth.getUser();
    if (currentAuth?.user && currentAuth.user.email !== canonicalEmail) {
      await supabase.auth.signOut({ scope: 'local' });
    }
  } catch {
    // Ignore signout cleanup errors
  }

  // Pre-resolve existing customer profile across backend resolver and local storage
  let preResolvedUserId = '';
  let preResolvedName = preferredName || '';
  let preResolvedEmail = '';
  let preResolvedPhoto = '';
  let preResolvedDob = '';
  let preResolvedWallet = 0;
  let preResolvedRefund = 0;
  let preResolvedCashback = 0;

  try {
    const resolveRes = await fetch('/api/auth/resolve-phone-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: clean10 })
    }).catch(() => null);

    if (resolveRes && resolveRes.ok) {
      const resolveJson = await resolveRes.json().catch(() => null);
      if (resolveJson?.profile) {
        const p = resolveJson.profile;
        if (p.user_id) preResolvedUserId = p.user_id;
        if (p.full_name) preResolvedName = p.full_name;
        if (p.email && !p.email.includes('@girirajpower.internal')) preResolvedEmail = p.email;
        if (p.avatar_url) preResolvedPhoto = p.avatar_url;
        if (p.dob) preResolvedDob = p.dob;
        if (p.wallet_balance !== undefined) preResolvedWallet = Number(p.wallet_balance);
        if (p.refund_balance !== undefined) preResolvedRefund = Number(p.refund_balance);
        if (p.cashback_balance !== undefined) preResolvedCashback = Number(p.cashback_balance);
      }
    }
  } catch (e) {
    console.debug('[Phone Bridge] Profile resolver notice:', e);
  }

  const existingPhoneLocal = getSavedUserProfile(`phone_${clean10}`);
  if (existingPhoneLocal) {
    if (!preResolvedUserId && existingPhoneLocal.id && !existingPhoneLocal.id.startsWith('phone_')) {
      preResolvedUserId = existingPhoneLocal.id;
    }
    if (!preResolvedName && existingPhoneLocal.name) preResolvedName = existingPhoneLocal.name;
    if (!preResolvedEmail && existingPhoneLocal.email && !existingPhoneLocal.email.includes('@girirajpower.internal')) {
      preResolvedEmail = existingPhoneLocal.email;
    }
    if (!preResolvedPhoto && existingPhoneLocal.photoURL) preResolvedPhoto = existingPhoneLocal.photoURL;
    if (!preResolvedDob && existingPhoneLocal.dob) preResolvedDob = existingPhoneLocal.dob;
    if (!preResolvedWallet && existingPhoneLocal.walletBalance) preResolvedWallet = existingPhoneLocal.walletBalance;
    if (!preResolvedRefund && existingPhoneLocal.refundBalance) preResolvedRefund = existingPhoneLocal.refundBalance;
    if (!preResolvedCashback && existingPhoneLocal.cashbackBalance) preResolvedCashback = existingPhoneLocal.cashbackBalance;
  }

  let supabaseUser: any = null;
  let supabaseSession: any = null;

  try {
    // Step 1: Attempt sign-in with the canonical internal credentials
    const signInRes = await supabase.auth.signInWithPassword({
      email: canonicalEmail,
      password: deterministicPassword
    });

    if (!signInRes.error && signInRes.data?.session) {
      supabaseSession = signInRes.data.session;
      supabaseUser = signInRes.data.user;
    } else {
      // Step 2: First-time phone user -> Sign up automatically in Supabase
      const defaultName = preResolvedName || preferredName || `Giriraj Member (${clean10.slice(-4)})`;
      const signUpRes = await supabase.auth.signUp({
        email: canonicalEmail,
        password: deterministicPassword,
        options: {
          data: {
            phone: formattedE164,
            contact_number: formattedE164,
            full_name: defaultName,
            ...(preResolvedEmail ? { email: preResolvedEmail } : {})
          }
        }
      });

      if (signUpRes.data?.session) {
        supabaseSession = signUpRes.data.session;
        supabaseUser = signUpRes.data.user;
      } else if (signUpRes.data?.user) {
        // Retry sign-in immediately if user was created but session needs explicit token
        const retrySignIn = await supabase.auth.signInWithPassword({
          email: canonicalEmail,
          password: deterministicPassword
        });
        if (retrySignIn.data?.session) {
          supabaseSession = retrySignIn.data.session;
          supabaseUser = retrySignIn.data.user;
        } else {
          supabaseUser = signUpRes.data.user;
        }
      } else {
        throw new Error(signUpRes.error?.message || 'Could not establish Supabase session.');
      }
    }

    // Set session in Supabase client to trigger onAuthStateChange
    if (supabaseSession) {
      await supabase.auth.setSession({
        access_token: supabaseSession.access_token,
        refresh_token: supabaseSession.refresh_token
      });
    }

    const effectiveUserId = preResolvedUserId || supabaseUser?.id || `uid_${clean10}`;
    const scope = `uid_${effectiveUserId}`;
    setActiveUserScope(scope);

    // Step 3: Fetch linked user profile from user_profiles table (querying effectiveUserId)
    let resolvedName = preResolvedName || preferredName || `Giriraj Member (${clean10.slice(-4)})`;
    let resolvedEmail = preResolvedEmail || '';
    let resolvedDob = preResolvedDob || '';
    let resolvedPhoto = preResolvedPhoto || '';
    let resolvedWallet = preResolvedWallet || 0;
    let resolvedRefund = preResolvedRefund || 0;
    let resolvedCashback = preResolvedCashback || 0;

    try {
      const { data: userProfileRecord } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (userProfileRecord) {
        if (userProfileRecord.full_name) resolvedName = userProfileRecord.full_name;
        // ONLY accept email if it is a real, non-internal email
        if (userProfileRecord.email && !userProfileRecord.email.includes('@girirajpower.internal')) {
          resolvedEmail = userProfileRecord.email;
        }
        if (userProfileRecord.avatar_url) resolvedPhoto = userProfileRecord.avatar_url;
        if (userProfileRecord.dob) resolvedDob = userProfileRecord.dob;
        if (userProfileRecord.wallet_balance !== undefined) resolvedWallet = userProfileRecord.wallet_balance;
        if (userProfileRecord.refund_balance !== undefined) resolvedRefund = userProfileRecord.refund_balance;
        if (userProfileRecord.cashback_balance !== undefined) resolvedCashback = userProfileRecord.cashback_balance;
      }
    } catch (e) {
      console.debug('[Firebase-Supabase Bridge] Cloud profile query notice:', e);
    }

    // Check localStorage fallback STRICTLY for this user's scope
    const localProfile = getSavedUserProfile(scope);
    if (localProfile) {
      if (!resolvedName || resolvedName === 'Customer') resolvedName = localProfile.name || resolvedName;
      if (!resolvedEmail && localProfile.email && !localProfile.email.includes('@girirajpower.internal')) {
        resolvedEmail = localProfile.email;
      }
      if (!resolvedPhoto) resolvedPhoto = localProfile.photoURL || '';
      if (!resolvedDob) resolvedDob = localProfile.dob || '';
      if (!resolvedWallet && localProfile.walletBalance) resolvedWallet = localProfile.walletBalance;
      if (!resolvedRefund && localProfile.refundBalance) resolvedRefund = localProfile.refundBalance;
      if (!resolvedCashback && localProfile.cashbackBalance) resolvedCashback = localProfile.cashbackBalance;
    }

    // Sync Auth metadata with user details so Supabase Auth table reflects them
    try {
      await supabase.auth.updateUser({
        data: {
          phone: formattedE164,
          contact_number: formattedE164,
          full_name: resolvedName,
          master_user_id: effectiveUserId,
          linked_user_id: effectiveUserId,
          ...(resolvedEmail ? { real_email: resolvedEmail } : {})
        }
      });
    } catch {}

    const finalizedProfile: UserProfile = {
      id: effectiveUserId,
      phone: formattedE164,
      phoneVerified: true,
      name: resolvedName,
      email: resolvedEmail,
      emailVerified: Boolean(resolvedEmail),
      photoURL: resolvedPhoto,
      dob: resolvedDob,
      walletBalance: resolvedWallet,
      refundBalance: resolvedRefund,
      cashbackBalance: resolvedCashback
    };

    // Save profile under both user scope AND phone scope for instant multi-login consistency
    saveUserProfile(finalizedProfile, scope);
    saveUserProfile(finalizedProfile, `phone_${clean10}`);
    if (supabaseUser?.id && supabaseUser.id !== effectiveUserId) {
      saveUserProfile(finalizedProfile, `uid_${supabaseUser.id}`);
    }

    // Save to user_profiles table in Supabase under effective master user_id
    try {
      await supabase.from('user_profiles').upsert(
        {
          user_id: effectiveUserId,
          phone: formattedE164,
          full_name: resolvedName,
          email: resolvedEmail || null,
          avatar_url: resolvedPhoto || null,
          dob: resolvedDob || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );

      if (supabaseUser?.id && supabaseUser.id !== effectiveUserId) {
        try {
          await supabase.from('user_profiles').upsert(
            {
              user_id: supabaseUser.id,
              phone: formattedE164,
              full_name: resolvedName,
              email: resolvedEmail || null,
              avatar_url: resolvedPhoto || null,
              dob: resolvedDob || null,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
          );
        } catch {}
      }
    } catch {}

    // Synchronize to backend server-side store
    fetch('/api/user-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: effectiveUserId,
        phone: formattedE164,
        full_name: resolvedName,
        email: resolvedEmail || null,
        avatar_url: resolvedPhoto || null,
        dob: resolvedDob || null
      })
    }).catch(() => {});

    const unifiedUser = {
      ...(supabaseUser || {}),
      id: effectiveUserId,
      auth_id: supabaseUser?.id,
      email: resolvedEmail || supabaseUser?.email,
      phone: formattedE164,
      user_metadata: {
        ...(supabaseUser?.user_metadata || {}),
        full_name: resolvedName,
        name: resolvedName,
        phone: formattedE164,
        master_user_id: effectiveUserId,
        linked_user_id: effectiveUserId,
        real_email: resolvedEmail
      }
    };

    return {
      success: true,
      user: unifiedUser,
      session: supabaseSession,
      profile: finalizedProfile
    };
  } catch (bridgeErr: any) {
    console.error('[Firebase-Supabase Bridge Error]:', bridgeErr);
    return {
      success: false,
      user: null,
      session: null,
      profile: {
        id: `uid_${clean10}`,
        phone: formattedE164,
        phoneVerified: true,
        name: preferredName || 'Customer',
        email: '',
        emailVerified: false
      },
      error: bridgeErr?.message || 'Authentication bridge failed.'
    };
  }
}

/**
 * Sign out from both Firebase Auth and Supabase Auth
 */
export async function signOutFromAll(): Promise<void> {
  try {
    await firebaseSignOut(firebaseAuth);
  } catch {}
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {}
  try {
    await supabase.auth.signOut();
  } catch {}
  resetRecaptchaVerifier();
  activeConfirmationResult = null;
  lastSentPhoneNumber = null;
  isFast2SmsSession = false;
}
