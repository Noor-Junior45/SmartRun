import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  KeyRound,
  LogIn,
  UserPlus,
  Phone,
  User,
  AlertTriangle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabaseClient';
import { apiUrl } from '../lib/apiBase';
import { isAndroidAppEnvironment } from '../utils/platformDetection';
import {
  saveUserProfile,
  signInWithGoogle,
  fetchUserProfileFromSupabase
} from '../services/supabaseService';
import { sendLoginNotificationEmail } from '../services/securityNotificationService';
import {
  sendFirebasePhoneOtp,
  verifyFirebaseOtpAndBridgeToSupabase,
  formatToE164Phone
} from '../services/firebaseAuthService';

interface LoginPageProps {
  onAuthSuccess: (phone: string, name: string, email?: string, userObj?: any) => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

// Helper: If user or browser autofill entered an 11-digit number starting with 0, don't count the first zero
const cleanAutofillPhone = (input: string): string => {
  const trimmed = input.trim();
  if (trimmed.includes('@')) return input;

  const digits = trimmed.replace(/[^0-9]/g, '');
  // Only if total digits is 11 AND starts with '0'
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return input;
};

// Helper: Normalize phone to E.164 (defaulting to +91 for 10-digit Indian numbers)
const normalizePhone = (input: string): string => {
  const trimmed = input.trim();
  if (trimmed.startsWith('+')) {
    return trimmed.replace(/[^0-9+]/g, '');
  }
  let digits = trimmed.replace(/[^0-9]/g, '');

  // If 11 digits and starts with 0 (autofill adding 0 in starting), don't count the first zero
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return `+${digits}`;
};

// Helper: Detect if user entered a phone number rather than an email
const isPhoneInput = (input: string): boolean => {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.includes('@')) return false;
  const digits = trimmed.replace(/[^0-9]/g, '');
  return digits.length >= 7;
};

// Helper: Check and persist terms agreement across sessions
const isTermsAgreedSaved = (): boolean => {
  try {
    return (
      localStorage.getItem('smartrun_terms_agreed') === 'true' ||
      localStorage.getItem('gp_terms_agreed') === 'true' ||
      localStorage.getItem('terms_agreed') === 'true'
    );
  } catch {
    return false;
  }
};

const saveTermsAgreed = (agreed: boolean): void => {
  try {
    const val = String(agreed);
    localStorage.setItem('smartrun_terms_agreed', val);
    localStorage.setItem('gp_terms_agreed', val);
    localStorage.setItem('terms_agreed', val);
  } catch {
    // Ignore storage quota / private mode errors
  }
};

export const LoginPage = ({ onAuthSuccess }: LoginPageProps) => {
  const navigate = useNavigate();

  // Mode: 'signin' | 'signup' | 'forgot'
  const [mode, setMode] = useState<AuthMode>('signin');

  // Input states
  const [identifier, setIdentifier] = useState(''); // Holds email or phone in signin
  const [email, setEmail] = useState(''); // Used in signup/forgot
  const [signupName, setSignupName] = useState(''); // Full name for signup
  const [signupPhone, setSignupPhone] = useState(''); // Mobile number for signup
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Signup method: 'password' | 'otp'
  const [signupMethod, setSignupMethod] = useState<'password' | 'otp'>('password');
  const [signupOtpSent, setSignupOtpSent] = useState(false);
  const [signupOtpCode, setSignupOtpCode] = useState('');
  const [signupOtpCooldown, setSignupOtpCooldown] = useState(0);

  // Progressive field reveal states
  const [showSecondField, setShowSecondField] = useState(false);
  const [phoneUsePassword, setPhoneUsePassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sentToPhone, setSentToPhone] = useState('');

  // Terms and Privacy Agreement state (persisted across login & logout)
  const [termsAgreed, setTermsAgreed] = useState<boolean>(() => isTermsAgreedSaved());

  const handleToggleTerms = () => {
    setTermsAgreed((prev) => {
      const next = !prev;
      saveTermsAgreed(next);
      return next;
    });
    if (error && error.toLowerCase().includes('terms')) {
      setError(null);
    }
  };

  // Timers
  const [magicLinkCooldown, setMagicLinkCooldown] = useState(0);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);

  const handleCopyIp = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('34.34.254.4');
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2500);
    }
  };

  const secondInputRef = useRef<HTMLInputElement>(null);

  // Focus second input when revealed
  useEffect(() => {
    if (showSecondField && secondInputRef.current) {
      secondInputRef.current.focus();
    }
  }, [showSecondField]);

  // Magic Link cooldown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (magicLinkCooldown > 0) {
      interval = setInterval(() => {
        setMagicLinkCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [magicLinkCooldown]);

  // OTP cooldown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (otpCooldown > 0) {
      interval = setInterval(() => {
        setOtpCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCooldown]);

  // Signup OTP cooldown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (signupOtpCooldown > 0) {
      interval = setInterval(() => {
        setSignupOtpCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [signupOtpCooldown]);

  const resetMessages = () => {
    setError(null);
    setInfoMessage(null);
  };

  // --- 1. GOOGLE SIGN IN ---
  const handleGoogleSignIn = async () => {
    if (!termsAgreed) {
      setError('Please agree to the Terms of service and Privacy policy to continue.');
      return;
    }
    setIsGoogleLoading(true);
    resetMessages();
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setError(res.error.message || 'Google Sign-In failed. Please try again.');
      } else {
        saveTermsAgreed(true);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Google Sign-In encountered an issue.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // --- 2. SEND PHONE OTP VIA FIREBASE (WITH DATABASE EXISTENCE CHECK) ---
  const handleSendPhoneOtp = async () => {
    resetMessages();
    let rawDigits = identifier.replace(/[^0-9]/g, '');
    // If autofill added 0 at start making it 11 digits, don't count first zero
    if (rawDigits.length === 11 && rawDigits.startsWith('0')) {
      rawDigits = rawDigits.slice(1);
    }
    const clean10 = rawDigits.slice(-10);

    if (clean10.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);

    // Rule: Check if user is present in database BEFORE sending OTP
    let userExists = false;
    const formattedE164 = `+91${clean10}`;

    // 1. Check server profile resolver (checks serverProfileStore, user_profiles, orders)
    try {
      const resolveRes = await fetch(apiUrl('/api/auth/resolve-phone-user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean10 })
      });

      if (resolveRes.ok) {
        const resolveData = await resolveRes.json().catch(() => null);
        if (resolveData?.exists) {
          userExists = true;
        }
      }
    } catch (e) {
      console.warn('[Phone resolve check error]:', e);
    }

    // 2. Direct Supabase user_profiles table check fallback
    if (!userExists) {
      try {
        const canonicalPhoneEmail = `p${clean10}@girirajpower.internal`;
        const canonicalLegacyEmail = `phone_${clean10}@girirajpower.internal`;
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, user_id, phone, full_name, email')
          .or(`phone.eq.${formattedE164},phone.eq.${clean10},phone.ilike.%${clean10}%,email.eq.${canonicalPhoneEmail},email.eq.${canonicalLegacyEmail}`)
          .limit(1);

        if (profiles && profiles.length > 0) {
          userExists = true;
        }
      } catch (sbErr) {
        console.warn('[Supabase user_profiles check error]:', sbErr);
      }
    }

    // 3. Direct Supabase orders table check fallback
    if (!userExists) {
      try {
        const { data: orderRows } = await supabase
          .from('orders')
          .select('id, user_id, phone')
          .or(`phone.eq.${clean10},phone.eq.${formattedE164},recipient_phone.eq.${clean10},recipient_phone.eq.${formattedE164}`)
          .limit(1);

        if (orderRows && orderRows.length > 0) {
          userExists = true;
        }
      } catch (ordErr) {
        console.warn('[Orders check error]:', ordErr);
      }
    }

    // 4. Local storage cached profile check fallback
    if (!userExists) {
      try {
        const rawLocal = localStorage.getItem('smartrun_user_profile') || localStorage.getItem('giriraj_user_profile');
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          const pDigits = (parsed?.phone || '').replace(/\D/g, '').slice(-10);
          if (pDigits === clean10) {
            userExists = true;
          }
        }
      } catch {}
    }

    // STRICT CHECK: If user is not present in our database, do NOT send OTP!
    if (!userExists) {
      setIsLoading(false);
      setError('No account found with this mobile number. Please create an account first to continue.');
      return;
    }

    try {
      const res = await sendFirebasePhoneOtp(clean10, 'recaptcha-container');

      if (!res.success) {
        if (res.isBillingRequired) {
          setError(
            res.error ||
              'Firebase Phone Auth requires the project to be upgraded to the Blaze plan (pay-as-you-go) in Firebase Console, or test phone numbers configured under Authentication > Sign-in method.'
          );
        } else {
          setError(res.error || 'Failed to send OTP to mobile number. Please try again.');
        }
      } else {
        const phone = res.formattedPhone || formatToE164Phone(clean10);
        setSentToPhone(phone);
        setOtpSent(true);
        setShowSecondField(true);
        setOtpCooldown(60);

        if (res.provider === 'fast2sms') {
          setInfoMessage(
            res.message || `OTP sent via Fast2SMS to ${phone}. Enter the 6-digit code below.`
          );
          setOtpCode('');
        } else {
          setInfoMessage(res.message || `OTP sent to ${phone}. Enter the 6-digit code below.`);
          setOtpCode('');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2b. PASSWORD SIGN IN (MOBILE NUMBER) ---
  const handlePhonePasswordLogin = async (clean10: string) => {
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    resetMessages();
    try {
      let targetEmail = `p${clean10}@girirajpower.internal`;
      let userFullName = '';

      const resolveRes = await fetch(apiUrl('/api/auth/resolve-phone-user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean10 })
      }).catch(() => null);

      if (resolveRes && resolveRes.ok) {
        const resolveData = await resolveRes.json().catch(() => null);
        if (!resolveData?.exists) {
          setError('No account found with this mobile number. Please create an account first.');
          setIsLoading(false);
          return;
        }
        if (resolveData?.profile?.email && !resolveData.profile.email.includes('@girirajpower.internal')) {
          targetEmail = resolveData.profile.email;
        }
        userFullName = resolveData?.profile?.full_name || '';
      }

      let { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password
      });

      // If sign in with resolved email or p-canonical failed, try secondary canonical variants
      if (signInErr) {
        const candidates = [`p${clean10}@girirajpower.internal`, `phone_${clean10}@girirajpower.internal`];
        for (const candidateEmail of candidates) {
          if (candidateEmail === targetEmail) continue;
          const fallbackRes = await supabase.auth.signInWithPassword({
            email: candidateEmail,
            password: password
          });
          if (!fallbackRes.error && fallbackRes.data?.user) {
            data = fallbackRes.data;
            signInErr = null;
            targetEmail = candidateEmail;
            break;
          }
        }
      }

      if (signInErr) {
        setError(signInErr.message || 'Incorrect password for this mobile number.');
      } else if (data?.user) {
        const resolvedName =
          userFullName ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          'Customer';
        const formattedPhone = `+91${clean10}`;
        const finalEmail = targetEmail.includes('@girirajpower.internal') ? undefined : targetEmail;

        saveTermsAgreed(true);
        navigate('/', { replace: true });
        onAuthSuccess(formattedPhone, resolvedName, finalEmail, data.user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your password.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. VERIFY PHONE OTP VIA FIREBASE & BRIDGE TO SAME SUPABASE ACCOUNT ---
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const phone = sentToPhone || formatToE164Phone(identifier);
    const cleanOtp = otpCode.replace(/\D/g, '');

    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the complete 6-digit verification code received on your mobile.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyFirebaseOtpAndBridgeToSupabase(cleanOtp, undefined, phone);

      if (!result.success) {
        setError(result.error || 'The OTP code is invalid or has expired. Please try again.');
      } else {
        const profile = result.profile;
        const rawName = profile?.name || '';
        const userFullName =
          rawName && !rawName.toLowerCase().startsWith('giriraj member') && !rawName.toLowerCase().startsWith('giriraj power')
            ? rawName
            : 'Customer';
        const finalPhone = profile?.phone || phone;
        const finalEmail = profile?.email || '';

        saveTermsAgreed(true);
        navigate('/', { replace: true });
        onAuthSuccess(finalPhone, userFullName, finalEmail, result.user);

        if (finalEmail) {
          sendLoginNotificationEmail({
            email: finalEmail,
            name: userFullName,
            userId: result.user?.id || '',
            loginMethod: 'Mobile Number & Firebase Phone OTP',
            force: false,
          }).catch((e) => console.debug('[Security Alert Note]:', e));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify OTP.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. PASSWORD SIGN IN (EMAIL) ---
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = identifier.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (loginError) {
        setError(loginError.message || 'Invalid email or password.');
      } else if (data.user) {
        const userFullName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          cleanEmail.split('@')[0] ||
          'Giriraj Customer';
        const finalPhone = data.user.phone || data.user.user_metadata?.phone || '';

        saveTermsAgreed(true);
        navigate('/', { replace: true });
        onAuthSuccess(finalPhone, userFullName, cleanEmail, data.user);
        sendLoginNotificationEmail({
          email: cleanEmail,
          name: userFullName,
          userId: data.user.id,
          loginMethod: 'Email & Password',
          force: true
        }).catch((e) => console.debug('[Security Alert Trigger Note]:', e));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 5. HYBRID PRIMARY SUBMIT HANDLER ---
  const handlePrimarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!termsAgreed) {
      setError('Please agree to the Terms of service and Privacy policy to continue.');
      return;
    }

    // If identifier was autofilled with 11 digits starting with 0, clean the leading zero
    let cleanId = identifier.trim();
    if (!cleanId.includes('@')) {
      const digits = cleanId.replace(/[^0-9]/g, '');
      if (digits.length === 11 && digits.startsWith('0')) {
        cleanId = digits.slice(1);
        setIdentifier(cleanId);
      }
    }

    const isPhone = isPhoneInput(cleanId);

    if (isPhone) {
      // Mobile Number Flow
      const clean10 = cleanId.replace(/\D/g, '').slice(-10);
      if (phoneUsePassword) {
        await handlePhonePasswordLogin(clean10);
      } else if (!otpSent || !showSecondField) {
        await handleSendPhoneOtp();
      } else {
        await handleVerifyPhoneOtp(e);
      }
    } else {
      // Email Flow
      const cleanEmail = identifier.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setError('Please enter a valid email address or 10-digit mobile number.');
        return;
      }

      if (!showSecondField) {
        // Reveal password input line
        setShowSecondField(true);
        return;
      }

      // Password input is visible -> submit login
      if (!password) {
        setError('Please enter your password.');
        return;
      }

      await handlePasswordLogin(e);
    }
  };

  // --- 6. PASSWORD SIGN UP ---
  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!termsAgreed) {
      setError('Please agree to the Terms of service and Privacy policy to continue.');
      return;
    }

    const finalFullName = signupName.trim();
    if (!finalFullName) {
      setError('Please enter your full name.');
      return;
    }

    const cleanPhone = signupPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    const formattedPhone = `+91${cleanPhone}`;

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      setError('Please enter a valid email address, or leave it blank.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    // Rule: Check if account already exists with this mobile number
    try {
      const checkRes = await fetch(apiUrl('/api/auth/resolve-phone-user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      }).catch(() => null);

      if (checkRes && checkRes.ok) {
        const checkData = await checkRes.json().catch(() => null);
        if (checkData?.exists && checkData?.profile) {
          setError('An account with this mobile number already exists. Please sign in instead.');
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Continue if network check fails
    }

    const canonicalAuthEmail = cleanEmail || `p${cleanPhone}@girirajpower.internal`;

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: canonicalAuthEmail,
        password: password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: finalFullName,
            phone: formattedPhone,
            contact_number: formattedPhone,
            ...(cleanEmail ? { email: cleanEmail } : {})
          }
        },
      });

      if (signUpError) {
        setError(signUpError.message || 'Failed to create account.');
      } else if (data.session && data.user) {
        // Upsert user_profiles immediately with full details
        try {
          await supabase.from('user_profiles').upsert(
            {
              user_id: data.user.id,
              full_name: finalFullName,
              email: cleanEmail || null,
              phone: formattedPhone,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
          );
        } catch {}

        // Push to server-side profile store
        fetch(apiUrl('/api/user-profile'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            full_name: finalFullName,
            email: cleanEmail || null,
            phone: formattedPhone
          })
        }).catch(() => {});

        saveTermsAgreed(true);
        navigate('/', { replace: true });
        onAuthSuccess(formattedPhone, finalFullName, cleanEmail || undefined, data.user);
        if (cleanEmail) {
          sendLoginNotificationEmail({
            email: cleanEmail,
            name: finalFullName,
            userId: data.user.id,
            loginMethod: 'New Account Creation & Password Sign-in',
            force: true
          }).catch((e) => console.debug('[Security Alert Trigger Note]:', e));
        }
      } else {
        if (data.user) {
          try {
            await supabase.from('user_profiles').upsert(
              {
                user_id: data.user.id,
                full_name: finalFullName,
                email: cleanEmail || null,
                phone: formattedPhone,
                updated_at: new Date().toISOString()
              },
              { onConflict: 'user_id' }
            );
          } catch {}
        }
        if (cleanEmail) {
          setInfoMessage(`Account created! We have sent a confirmation link to ${cleanEmail}. You can also sign in with your mobile number.`);
        } else {
          setInfoMessage('Account created successfully! Please sign in with your mobile number.');
        }
        setMode('signin');
        setIdentifier(cleanPhone);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create account.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 6b. SEND OTP FOR SIGNUP VERIFICATION ---
  const handleSendSignupPhoneOtp = async () => {
    resetMessages();
    const finalFullName = signupName.trim();
    if (!finalFullName) {
      setError('Please enter your full name first.');
      return;
    }

    const cleanPhone = signupPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);

    // Rule: Check if account already exists with this mobile number
    try {
      const checkRes = await fetch(apiUrl('/api/auth/resolve-phone-user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      }).catch(() => null);

      if (checkRes && checkRes.ok) {
        const checkData = await checkRes.json().catch(() => null);
        if (checkData?.exists && checkData?.profile) {
          setError('An account with this mobile number already exists. Please sign in instead.');
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Continue
    }

    try {
      const res = await sendFirebasePhoneOtp(cleanPhone, 'recaptcha-container');
      if (!res.success) {
        setError(res.error || 'Failed to send OTP to mobile number. Please try again.');
      } else {
        const phone = res.formattedPhone || formatToE164Phone(cleanPhone);
        setSignupOtpSent(true);
        setSignupOtpCooldown(60);
        setInfoMessage(`Verification OTP sent to ${phone}. Enter the 6-digit code below to create your account.`);
        setSignupOtpCode('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 6c. VERIFY OTP & CREATE ACCOUNT ---
  const handleVerifySignupPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!termsAgreed) {
      setError('Please agree to the Terms of service and Privacy policy to continue.');
      return;
    }

    const finalFullName = signupName.trim();
    if (!finalFullName) {
      setError('Please enter your full name.');
      return;
    }

    const cleanPhone = signupPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    const formattedPhone = `+91${cleanPhone}`;

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      setError('Please enter a valid email address, or leave it blank.');
      return;
    }

    const cleanOtp = signupOtpCode.replace(/\D/g, '');
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the complete 6-digit verification code received on your mobile.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyFirebaseOtpAndBridgeToSupabase(cleanOtp, finalFullName, formattedPhone);

      if (!result.success) {
        setError(result.error || 'The OTP code is invalid or has expired. Please try again.');
        setIsLoading(false);
        return;
      }

      const targetUserId = result.user?.id;
      if (targetUserId) {
        try {
          await supabase.from('user_profiles').upsert(
            {
              user_id: targetUserId,
              full_name: finalFullName,
              email: cleanEmail || null,
              phone: formattedPhone,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
          );
        } catch {}

        fetch(apiUrl('/api/user-profile'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: targetUserId,
            full_name: finalFullName,
            email: cleanEmail || null,
            phone: formattedPhone
          })
        }).catch(() => {});
      }

      // If user also set an optional password, update it in Supabase Auth
      if (password && password.length >= 6) {
        try {
          await supabase.auth.updateUser({ password });
        } catch (pwErr) {
          console.warn('[Optional Password Set Notice]:', pwErr);
        }
      }

      saveTermsAgreed(true);
      navigate('/', { replace: true });
      onAuthSuccess(formattedPhone, finalFullName, cleanEmail || undefined, result.user);

      if (cleanEmail) {
        sendLoginNotificationEmail({
          email: cleanEmail,
          name: finalFullName,
          userId: targetUserId || '',
          loginMethod: 'New Account Creation via Verified Mobile OTP',
          force: true
        }).catch((e) => console.debug('[Security Alert Trigger Note]:', e));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify OTP and create account.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 7. FORGOT PASSWORD ---
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter your account email.');
      return;
    }

    setIsLoading(true);
    try {
      const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
      const redirectTo = isNative
        ? 'smartrun://reset-password'
        : `${window.location.origin}/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message || 'Failed to send reset link.');
      } else {
        setInfoMessage(`Password reset link sent to ${cleanEmail}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset link.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 8. MAGIC LINK (1-CLICK PASSWORDLESS) ---
  const handleSendMagicLink = async () => {
    resetMessages();

    if (!termsAgreed) {
      setError('Please agree to the Terms of service and Privacy policy to continue.');
      return;
    }

    const cleanEmail = (identifier || email).trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address above to receive a magic link.');
      return;
    }

    if (magicLinkCooldown > 0) return;

    setIsMagicLoading(true);
    try {
      const isApp = isAndroidAppEnvironment();
      const redirectTo = isApp
        ? 'https://www.smartrun.in/login?target=app&source=android_app'
        : (typeof window !== 'undefined' ? `${window.location.origin}/login?client=web` : undefined);

      const { error: magicError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (magicError) {
        setError(magicError.message || 'Failed to send magic link.');
      } else {
        setMagicLinkCooldown(60);
        setInfoMessage(`Magic link sent to ${cleanEmail}! Check your inbox.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send magic link.';
      setError(msg);
    } finally {
      setIsMagicLoading(false);
    }
  };

  const isAnyLoading = isLoading || isMagicLoading || isGoogleLoading;
  const isPhone = isPhoneInput(identifier);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-8 sm:py-12">
      {/* Main Centered Login Container (Borderless Full-Page Look) */}
      <div className="w-full max-w-md bg-white border-0 shadow-none p-4 sm:p-6 space-y-5">
        
        {/* Brand Logo & Name Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div>
            <img
              src="/smartrun.jpeg"
              alt="SmartRun Logo"
              className="w-16 h-16 object-cover rounded-2xl shadow-sm border border-slate-100 p-0.5 bg-white"
            />
          </div>

          <div>
            <div className="text-3xl font-bold font-bodoni flex items-center justify-center leading-none tracking-tight">
              <span className="text-slate-950">Smart</span>
              <span className="text-[#00875a]">Run</span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Electrical &amp; Construction Materials Hub
            </p>
          </div>
        </div>

        {/* Clean Login Heading */}
        <div className="text-center pt-1 pb-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </h1>
        </div>

        {/* Feedback Messages */}
        {infoMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMessage}</span>
          </div>
        )}

        {error && (
          error.includes('Fast2SMS Error 414') || error.includes('blacklisted') || error.includes('34.34.254.4') ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2.5 animate-in fade-in leading-relaxed shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">Fast2SMS Error 414: IP Whitelist Required</h4>
                  <p className="text-amber-800 text-xs mt-0.5">
                    Fast2SMS blocked OTP dispatch because cloud server IP <code className="font-mono font-bold bg-amber-200/60 px-1 py-0.5 rounded text-amber-950">34.34.254.4</code> is blocked by Fast2SMS Dev API IP security filter.
                  </p>
                </div>
              </div>

              <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block">Server Public Egress IP</span>
                  <code className="text-xs font-mono font-bold text-slate-800">34.34.254.4</code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyIp}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-[11px] flex items-center gap-1.5 transition-colors border border-amber-300/60"
                >
                  {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-700" />}
                  <span>{copiedIp ? 'Copied IP' : 'Copy IP'}</span>
                </button>
              </div>

              <div className="text-[11px] text-amber-900 space-y-1 pl-1">
                <p className="font-bold text-amber-950">Steps to fix in Fast2SMS (30 seconds):</p>
                <ol className="list-decimal list-inside space-y-0.5 text-amber-800">
                  <li>Log in to Fast2SMS Dashboard &rarr; <strong>Dev API</strong> &rarr; <strong>SECURITY</strong> tab.</li>
                  <li>Turn <strong>OFF / Disable</strong> the <strong>IP Whitelist</strong> option (or add <code className="bg-amber-100 px-1 rounded font-mono font-semibold">34.34.254.4</code>).</li>
                  <li>Return here and tap <strong>Get OTP</strong> again.</li>
                </ol>
              </div>

              <div className="pt-1 border-t border-amber-200/80 flex items-center justify-between">
                <a
                  href="https://www.fast2sms.com/dashboard/dev-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 underline"
                >
                  <span>Open Fast2SMS Dev API Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold animate-in fade-in leading-relaxed">
              {error}
            </div>
          )
        )}

        {/* Authentication Forms */}
        <div className="space-y-4">
          
          {/* 1. SIGN IN MODE (HYBRID EMAIL & MOBILE OTP) */}
          {mode === 'signin' && (
            <form onSubmit={handlePrimarySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                  MOBILE NUMBER / EMAIL
                </label>
                <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                  {isPhone ? (
                    <Phone className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                  ) : (
                    <Mail className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                  )}
                  <input
                    type={isPhone ? 'tel' : 'text'}
                    autoComplete="username tel email"
                    placeholder="10-digit mobile number or email"
                    value={identifier}
                    onChange={(e) => {
                      let val = e.target.value;
                      // When autofill adds 0 at the start of an 11-digit number, don't count the first zero
                      if (!val.includes('@')) {
                        const digits = val.replace(/[^0-9]/g, '');
                        if (digits.length === 11 && digits.startsWith('0')) {
                          val = digits.slice(1);
                        }
                      }
                      setIdentifier(val);
                      resetMessages();
                      if (otpSent && !isPhoneInput(val)) {
                        setOtpSent(false);
                        setShowSecondField(false);
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted && !pasted.includes('@')) {
                        const digits = pasted.replace(/[^0-9]/g, '');
                        if (digits.length === 11 && digits.startsWith('0')) {
                          e.preventDefault();
                          const cleaned = digits.slice(1);
                          setIdentifier(cleaned);
                          resetMessages();
                        }
                      }
                    }}
                    className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Toggle between OTP and Password for Mobile Number */}
              {isPhone && !otpSent && (
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !phoneUsePassword;
                      setPhoneUsePassword(next);
                      setShowSecondField(next);
                      resetMessages();
                    }}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
                  >
                    {phoneUsePassword ? '← Sign in with SMS OTP instead' : 'Sign in with password instead'}
                  </button>
                </div>
              )}

              {/* Refined Second Input: Appears according to user email or phone */}
              <div className={showSecondField ? 'space-y-1 block animate-in fade-in duration-200' : 'hidden'}>
                <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                  {isPhone && !phoneUsePassword ? 'SMS OTP Code' : 'Password'}
                </label>

                {isPhone && !phoneUsePassword ? (
                  /* Mobile OTP Fill Functions */
                  <div>
                    <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                      <KeyRound className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                      <input
                        ref={secondInputRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={otpCode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                          setOtpCode(digits);
                          if (error) setError(null);
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData('text');
                          const digits = pasted.replace(/[^0-9]/g, '').slice(0, 6);
                          if (digits) {
                            setOtpCode(digits);
                            if (error) setError(null);
                          }
                        }}
                        className="w-full bg-transparent py-2 text-sm font-semibold tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        required={showSecondField && isPhone && !phoneUsePassword}
                      />
                      {otpCode.length > 0 && (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 select-none">
                          {otpCode.length}/6
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setShowSecondField(false);
                          setOtpCode('');
                          resetMessages();
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        Change number
                      </button>

                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={otpCooldown > 0 || isLoading}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 disabled:text-slate-400 cursor-pointer"
                      >
                        {otpCooldown > 0 ? `Resend OTP (${otpCooldown}s)` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Password Input for Email or Phone */
                  <div>
                    <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                      <Lock className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                      <input
                        ref={secondInputRef}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        required={showSecondField && (!isPhone || phoneUsePassword)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSecondField(false);
                          setPhoneUsePassword(false);
                          setPassword('');
                          resetMessages();
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        {isPhone ? 'Change number' : 'Change email'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          resetMessages();
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Invisible Firebase Phone Auth reCAPTCHA mount */}
              <div id="recaptcha-container" className="my-1" />

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isAnyLoading}
                className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    {isPhone && !phoneUsePassword
                      ? (otpSent ? 'Verifying OTP...' : 'Checking & Sending OTP...')
                      : 'Signing In...'}
                  </span>
                ) : isPhone && !phoneUsePassword ? (
                  !showSecondField ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Get OTP</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Verify OTP & Sign In</span>
                    </>
                  )
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>

              {/* No account found quick CTA card */}
              {error && error.toLowerCase().includes('no account found') && isPhone && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2 animate-in fade-in duration-200">
                  <p className="text-xs text-amber-950 font-semibold">
                    No account found for this mobile number. Please create an account to get started.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const clean10 = identifier.replace(/[^0-9]/g, '').slice(-10);
                      setSignupPhone(clean10);
                      setMode('signup');
                      resetMessages();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account with +91 {identifier.replace(/[^0-9]/g, '').slice(-10)}</span>
                  </button>
                </div>
              )}

              {/* Create Account Helper Toggle */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    resetMessages();
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Don't have an account? <span className="font-bold text-amber-700 hover:text-amber-800">Create one</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. SIGN UP MODE */}
          {mode === 'signup' && (
            <form
              onSubmit={signupMethod === 'password' ? handlePasswordSignUp : handleVerifySignupPhoneOtp}
              className="space-y-4"
            >
              {/* Field 1: FULL NAME */}
              <div>
                <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                  FULL NAME <span className="text-red-500 font-black">*</span>
                </label>
                <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                  <User className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Field 2: MOBILE NUMBER (MANDATORY WITH RED STAR) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                  MOBILE NUMBER <span className="text-red-500 font-black">*</span>
                </label>
                <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                  <Phone className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                  <span className="text-sm font-semibold text-slate-600 mr-2">+91</span>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={signupPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setSignupPhone(val);
                      if (signupOtpSent) {
                        setSignupOtpSent(false);
                        setSignupOtpCode('');
                      }
                    }}
                    className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    required
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Field 3: EMAIL ADDRESS (OPTIONAL) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                  EMAIL ADDRESS (OPTIONAL)
                </label>
                <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                  <Mail className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="email"
                    placeholder="your@email.com (optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Method Switcher: Password or Sms Otp (Minimal Pill Shape Design) */}
              <div className="pt-1">
                <div className="flex rounded-full bg-slate-100 p-1 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setSignupMethod('password');
                      resetMessages();
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      signupMethod === 'password'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignupMethod('otp');
                      resetMessages();
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      signupMethod === 'otp'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-700" />
                    <span>Sms Otp</span>
                  </button>
                </div>
              </div>

              {/* METHOD A: PASSWORD SIGNUP (ONLY CREATE & CONFIRM PASSWORD LINES) */}
              {signupMethod === 'password' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Field 4: CREATE PASSWORD */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                      CREATE PASSWORD <span className="text-red-500 font-black">*</span>
                    </label>
                    <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                      <Lock className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        required={signupMethod === 'password'}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Field 5: CONFIRM PASSWORD */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                      CONFIRM PASSWORD <span className="text-red-500 font-black">*</span>
                    </label>
                    <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                      <Lock className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        required={signupMethod === 'password'}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAnyLoading}
                    className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 mt-2"
                  >
                    {isLoading ? (
                      'Signing up...'
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Sign up</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* METHOD B: SMS OTP SIGNUP (SHOWS OTP FILLING BOX AT SAME PLACE) */}
              {signupMethod === 'otp' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* OTP FILLING BOX */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase">
                        SMS OTP CODE <span className="text-red-500 font-black">*</span>
                      </label>
                      {signupOtpSent && (
                        <button
                          type="button"
                          onClick={handleSendSignupPhoneOtp}
                          disabled={signupOtpCooldown > 0 || isLoading}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 disabled:text-slate-400 cursor-pointer"
                        >
                          {signupOtpCooldown > 0 ? `Resend (${signupOtpCooldown}s)` : 'Resend OTP'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                      <KeyRound className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={signupOtpCode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                          setSignupOtpCode(digits);
                          if (error) setError(null);
                        }}
                        className="w-full bg-transparent py-2 text-sm font-semibold tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        required={signupMethod === 'otp'}
                      />
                      {!signupOtpSent ? (
                        <button
                          type="button"
                          onClick={handleSendSignupPhoneOtp}
                          disabled={isAnyLoading || !signupPhone || signupPhone.replace(/\D/g, '').length !== 10}
                          className="px-3.5 py-1.5 rounded-full bg-amber-400 hover:bg-yellow-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                        >
                          {isLoading ? 'Sending...' : 'Send OTP'}
                        </button>
                      ) : (
                        signupOtpCode.length > 0 && (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 select-none">
                            {signupOtpCode.length}/6
                          </span>
                        )
                      )}
                    </div>
                    {signupOtpSent && (
                      <div className="flex justify-between items-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSignupOtpSent(false);
                            setSignupOtpCode('');
                            resetMessages();
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          Change mobile number
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Sent to +91 {signupPhone.slice(-10)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Primary Action Button */}
                  {!signupOtpSent ? (
                    <button
                      type="button"
                      onClick={handleSendSignupPhoneOtp}
                      disabled={isAnyLoading || !signupPhone || signupPhone.replace(/\D/g, '').length !== 10}
                      className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 mt-2"
                    >
                      {isLoading ? (
                        'Sending OTP...'
                      ) : (
                        <>
                          <Phone className="w-4 h-4" />
                          <span>Confirm otp</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isAnyLoading || signupOtpCode.length < 6}
                      className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 mt-2"
                    >
                      {isLoading ? (
                        'Verifying OTP...'
                      ) : (
                        <>
                          <Phone className="w-4 h-4" />
                          <span>Confirm otp</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    resetMessages();
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Already have an account? <span className="font-bold text-amber-700 hover:text-amber-800">Login</span>
                </button>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD MODE */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center pb-1">
                <p className="text-xs text-slate-500">Enter your email and we will send a password reset link.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                  ACCOUNT EMAIL
                </label>
                <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                  <Mail className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAnyLoading}
                className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  'Sending Reset Link...'
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Password Reset Link</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    resetMessages();
                  }}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                >
                  Remember password? Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="relative flex items-center justify-center py-2">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
              or continue with
            </span>
          </div>

          {/* OR CONTINUE WITH SECTION: Magic Link & Google */}
          <div className="space-y-2.5">
            {/* Magic Link with email logo */}
            <button
              type="button"
              onClick={handleSendMagicLink}
              disabled={isAnyLoading || magicLinkCooldown > 0}
              className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 bg-white cursor-pointer active:scale-[0.99] disabled:opacity-50 shadow-2xs"
            >
              <Mail className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {isMagicLoading
                  ? 'Sending Magic link...'
                  : magicLinkCooldown > 0
                  ? `Resend Magic link (${magicLinkCooldown}s)`
                  : 'Magic link'}
              </span>
            </button>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAnyLoading}
              className="w-full py-2.5 px-4 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 bg-white cursor-pointer active:scale-[0.99] disabled:opacity-50 shadow-2xs"
            >
              {isGoogleLoading ? (
                <span className="flex items-center gap-2 text-xs text-slate-600">Connecting Google...</span>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Simple Hyperlink Legal Text with Minimal Circle Checkbox */}
        <div className="pt-3 text-center border-t border-slate-100">
          <p className="text-xs text-slate-500 inline-flex items-center justify-center gap-2">
            <button
              type="button"
              id="terms-agreed-tick"
              role="checkbox"
              aria-checked={termsAgreed}
              aria-label="Agree to terms of service and privacy policy"
              onClick={handleToggleTerms}
              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                termsAgreed
                  ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              {termsAgreed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </button>
            <span className="leading-tight">
              <span onClick={handleToggleTerms} className="cursor-pointer select-none">
                You agree to our{' '}
              </span>
              <Link
                to="/terms"
                className="text-slate-700 hover:text-slate-900 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-600 transition-colors font-medium"
              >
                Terms of service
              </Link>
              {' '}and{' '}
              <Link
                to="/privacy"
                className="text-slate-700 hover:text-slate-900 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-600 transition-colors font-medium"
              >
                Privacy policy
              </Link>
            </span>
          </p>
        </div>

      </div>
    </div>
  );
};
