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
  Phone,
  User,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabaseClient';
import { apiUrl } from '../lib/apiBase';
import { isAndroidAppEnvironment, isNativePhoneApp } from '../utils/platformDetection';
import { SEOHead } from './SEOHead';
import {
  saveUserProfile,
  signInWithGoogle
} from '../services/supabaseService';
import { UserProfile } from '../types';
import { sendLoginNotificationEmail } from '../services/securityNotificationService';
import {
  sendFirebasePhoneOtp,
  verifyFirebaseOtpAndBridgeToSupabase,
  formatToE164Phone
} from '../services/firebaseAuthService';

interface LoginPageProps {
  onAuthSuccess: (phone: string, name: string, email?: string, userObj?: any) => void;
}

type AuthStep = 'primary' | 'onboarding_phone' | 'onboarding_email' | 'forgot';

// Helper: If user or browser autofill entered an 11-digit number starting with 0, don't count the first zero
const cleanAutofillPhone = (input: string): string => {
  const trimmed = input.trim();
  if (trimmed.includes('@')) return input;

  const digits = trimmed.replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return input;
};

// Helper: Detect if user entered a phone number rather than an email
const isPhoneInput = (input: string): boolean => {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.includes('@')) return false;
  const digits = trimmed.replace(/[^0-9]/g, '');
  return digits.length >= 7;
};

// Helper: Check and persist terms agreement across sessions (defaults to YES tick)
const isTermsAgreedSaved = (): boolean => {
  try {
    const val =
      localStorage.getItem('smartrun_terms_agreed') ??
      localStorage.getItem('gp_terms_agreed') ??
      localStorage.getItem('terms_agreed');
    // If the user has explicitly unticked it, return false
    if (val === 'false') {
      return false;
    }
    // By default, keep yes tick checked
    return true;
  } catch {
    return true;
  }
};

const saveTermsAgreed = (agreed: boolean): void => {
  try {
    const val = String(agreed);
    localStorage.setItem('smartrun_terms_agreed', val);
    localStorage.setItem('gp_terms_agreed', val);
    localStorage.setItem('terms_agreed', val);
  } catch {
    // Ignore storage quota errors
  }
};

// Helper: Determine target destination route after successful authentication
const getPostAuthRedirect = (): string => {
  try {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('redirect') || sessionStorage.getItem('auth_redirect_target') || '/';
    sessionStorage.removeItem('auth_redirect_target');
    return target;
  } catch {
    return '/';
  }
};

export const LoginPage = ({ onAuthSuccess }: LoginPageProps) => {
  const navigate = useNavigate();
  const isNativeApp = isNativePhoneApp();

  // Active step: 'primary' | 'onboarding_phone' | 'onboarding_email' | 'forgot'
  const [authStep, setAuthStep] = useState<AuthStep>('primary');

  // Primary input states
  const [identifier, setIdentifier] = useState(''); // Mobile number or email
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [sentToPhone, setSentToPhone] = useState('');
  const [showSecondField, setShowSecondField] = useState(false);

  // Onboarding for New User via Phone OTP
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingEmail, setOnboardingEmail] = useState('');
  const [onboardingPassword, setOnboardingPassword] = useState('');
  const [showOnboardingPassword, setShowOnboardingPassword] = useState(false);

  // Onboarding for New User via Email & Password
  const [onboardingEmailAddr, setOnboardingEmailAddr] = useState('');
  const [onboardingEmailName, setOnboardingEmailName] = useState('');
  const [onboardingEmailPhone, setOnboardingEmailPhone] = useState('');
  const [onboardingEmailPw, setOnboardingEmailPw] = useState('');
  const [showOnboardingEmailPw, setShowOnboardingEmailPw] = useState(false);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Terms agreed: Default is true (YES)
  const [termsAgreed, setTermsAgreed] = useState<boolean>(() => isTermsAgreedSaved());

  const secondInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus second field when revealed
  useEffect(() => {
    if (showSecondField && secondInputRef.current) {
      secondInputRef.current.focus();
    }
  }, [showSecondField]);

  // Phone OTP cooldown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (otpCooldown > 0) {
      interval = setInterval(() => {
        setOtpCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCooldown]);

  const resetMessages = () => {
    setError(null);
    setInfoMessage(null);
  };

  const handleToggleTerms = () => {
    const next = !termsAgreed;
    setTermsAgreed(next);
    saveTermsAgreed(next);
    if (next && error && error.includes('Terms')) {
      setError(null);
    }
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
        const msg = res.error.message || '';
        if (
          msg.toLowerCase().includes('cancel') ||
          msg.includes('12501') ||
          msg.toLowerCase().includes('closed')
        ) {
          return;
        }
        setError(msg || 'Google Sign-In failed. Please try again.');
      } else {
        saveTermsAgreed(true);
        if (res.user) {
          const userPhone = res.user.phone || '';
          const userName = res.user.name || res.user.user_metadata?.full_name || 'Customer';
          const userEmail = res.user.email || '';
          onAuthSuccess(userPhone, userName, userEmail, res.user);
          navigate(getPostAuthRedirect(), { replace: true });
        }
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Google Sign-In encountered an issue.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // --- 2. SEND PHONE OTP ---
  const handleSendPhoneOtp = async () => {
    resetMessages();
    let rawDigits = identifier.replace(/[^0-9]/g, '');
    if (rawDigits.length === 11 && rawDigits.startsWith('0')) {
      rawDigits = rawDigits.slice(1);
    }
    const clean10 = rawDigits.slice(-10);

    if (clean10.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendFirebasePhoneOtp(clean10);

      if (!res.success) {
        setError(res.error || 'Failed to send OTP to mobile number. Please try again.');
      } else {
        const phone = res.formattedPhone || formatToE164Phone(clean10);
        setSentToPhone(phone);
        setOtpSent(true);
        setShowSecondField(true);
        setOtpCooldown(60); // 1 minute gap to resend OTP
        setInfoMessage(null); // Removed "firebase otp code sent to..." message banner as requested
        setOtpCode('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. VERIFY PHONE OTP & DETECT IF NEW OR EXISTING USER ---
  const handleVerifyPhoneOtp = async () => {
    resetMessages();
    const phone = sentToPhone || formatToE164Phone(identifier);
    const cleanOtp = otpCode.replace(/\D/g, '');
    const clean10 = phone.replace(/\D/g, '').slice(-10);

    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Verify OTP with server-authoritative backend
      const result = await verifyFirebaseOtpAndBridgeToSupabase(cleanOtp, undefined, phone);

      if (!result.success) {
        setError(result.error || 'The OTP code is invalid or has expired. Please try again.');
        setIsLoading(false);
        return;
      }

      // 2. Check if this mobile number already exists on the server (checks both Supabase & Firebase)
      let existingProfile: any = null;
      try {
        const resolveRes = await fetch(apiUrl('/api/auth/resolve-phone-user'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: clean10 })
        });
        if (resolveRes.ok) {
          const rData = await resolveRes.json().catch(() => null);
          if (rData?.exists && rData?.profile) {
            existingProfile = rData.profile;
          }
        }
      } catch (checkErr) {
        console.debug('[User check notice]:', checkErr);
      }

      // Check if user already exists on the server or in auth
      const isExistingUser = Boolean(
        existingProfile?.user_id ||
        existingProfile?.full_name ||
        existingProfile?.email ||
        result.user?.user_metadata?.master_user_id ||
        result.user?.id ||
        result.session ||
        (result.profile?.name && !result.profile.name.toLowerCase().startsWith('giriraj'))
      );

      if (isExistingUser || existingProfile || result.user) {
        // Sign in immediately with unified existing account identity!
        saveTermsAgreed(true);
        const finalName = existingProfile?.full_name || result.profile?.name || 'Customer';
        const finalEmail = (existingProfile?.email && !existingProfile.email.includes('@girirajpower.internal'))
          ? existingProfile.email
          : (result.profile?.email && !result.profile.email.includes('@girirajpower.internal') ? result.profile.email : '');
        onAuthSuccess(`+91${clean10}`, finalName, finalEmail, result.user);
        navigate(getPostAuthRedirect(), { replace: true });
      } else {
        // First-time new user -> Go to onboarding step to enter their name
        setOnboardingPhone(clean10);
        setOnboardingName(result.profile?.name && !result.profile.name.toLowerCase().startsWith('giriraj') ? result.profile.name : '');
        setOnboardingEmail(result.profile?.email && !result.profile.email.includes('@girirajpower.internal') ? result.profile.email : '');
        setAuthStep('onboarding_phone');
        resetMessages();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify OTP.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. SAVE NEW USER PROFILE (PHONE ONBOARDING NEXT PAGE) ---
  const handleSavePhoneOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanName = onboardingName.trim();
    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }

    const clean10 = onboardingPhone.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91${clean10}`;
    const cleanEmail = onboardingEmail.trim().toLowerCase();

    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userMeta = authData?.user?.user_metadata || {};
      const currentUserId = userMeta.master_user_id || userMeta.linked_user_id || authData?.user?.id || `uid_${clean10}`;

      // 1. If user provided optional password, save it in Supabase Auth
      if (onboardingPassword && onboardingPassword.length >= 6) {
        try {
          await supabase.auth.updateUser({ password: onboardingPassword });
        } catch (pwErr) {
          console.warn('[Optional password save]:', pwErr);
        }
      }

      // 2. Save profile in Supabase
      const finalizedProfile: UserProfile = {
        id: currentUserId,
        phone: formattedPhone,
        phoneVerified: true,
        name: cleanName,
        email: cleanEmail || undefined,
        emailVerified: Boolean(cleanEmail)
      };

      saveUserProfile(finalizedProfile, `uid_${currentUserId}`);
      saveUserProfile(finalizedProfile, `phone_${clean10}`);

      try {
        await supabase.from('user_profiles').upsert(
          {
            user_id: currentUserId,
            phone: formattedPhone,
            full_name: cleanName,
            email: cleanEmail || null,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      } catch (sbErr) {
        console.warn('[Supabase user_profiles upsert]:', sbErr);
      }

      // 3. Synchronize to backend server (updates Supabase and Firebase Firestore)
      fetch(apiUrl('/api/user-profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          phone: formattedPhone,
          full_name: cleanName,
          email: cleanEmail || null
        })
      }).catch(() => {});

      // 4. Cross-share with Firebase on backend server
      fetch(apiUrl('/api/auth/sync-user-to-firebase'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          profile: {
            phone: formattedPhone,
            full_name: cleanName,
            email: cleanEmail || undefined
          }
        })
      }).catch(() => {});

      saveTermsAgreed(true);
      onAuthSuccess(formattedPhone, cleanName, cleanEmail || undefined, authData?.user);
      navigate(getPostAuthRedirect(), { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 5. PASSWORD SIGN IN (MOBILE NUMBER) ---
  const handlePhonePasswordLogin = async (clean10: string) => {
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    resetMessages();
    try {
      const formattedPhone = `+91${clean10}`;
      // 1. Primary: Server-side authentication
      try {
        const srvRes = await fetch(apiUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: clean10, password })
        });
        const srvData = await srvRes.json().catch(() => null);

        if (srvData && srvData.success && srvData.user) {
          if (srvData.session) {
            await supabase.auth.setSession(srvData.session).catch(() => {});
          }
          const resolvedName = srvData.profile?.full_name || srvData.profile?.name || srvData.user?.user_metadata?.full_name || 'Customer';
          const finalEmail = srvData.profile?.email && !srvData.profile.email.includes('@girirajpower.internal')
            ? srvData.profile.email
            : undefined;

          saveTermsAgreed(true);
          navigate(getPostAuthRedirect(), { replace: true });
          onAuthSuccess(formattedPhone, resolvedName, finalEmail, srvData.user);
          return;
        } else if (srvData && !srvData.success && srvRes.status === 401) {
          setError(srvData.error || 'Incorrect password or account not found. Please sign in with SMS OTP instead.');
          setIsLoading(false);
          return;
        }
      } catch (srvErr) {
        console.warn('[Server Auth Login] Server unreachable, attempting client fallback:', srvErr);
      }

      // 2. Client fallback
      let targetEmail = `p${clean10}@girirajpower.internal`;
      let userFullName = '';

      const resolveRes = await fetch(apiUrl('/api/auth/resolve-phone-user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean10 })
      }).catch(() => null);

      if (resolveRes && resolveRes.ok) {
        const resolveData = await resolveRes.json().catch(() => null);
        if (resolveData?.profile?.email && !resolveData.profile.email.includes('@girirajpower.internal')) {
          targetEmail = resolveData.profile.email;
        }
        userFullName = resolveData?.profile?.full_name || '';
      }

      let { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password
      });

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
        setError('Incorrect password or account not found. Please sign in with SMS OTP instead.');
      } else if (data?.user) {
        const resolvedName = userFullName || data.user.user_metadata?.full_name || 'Customer';
        const finalEmail = targetEmail.includes('@girirajpower.internal') ? undefined : targetEmail;

        saveTermsAgreed(true);
        navigate(getPostAuthRedirect(), { replace: true });
        onAuthSuccess(formattedPhone, resolvedName, finalEmail, data.user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your password.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 6. PASSWORD SIGN IN (EMAIL) ---
  const handleEmailSignIn = async (cleanEmail: string) => {
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    resetMessages();
    try {
      // 1. Primary: Server-side authentication
      try {
        const srvRes = await fetch(apiUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanEmail, password })
        });
        const srvData = await srvRes.json().catch(() => null);

        if (srvData && srvData.success && srvData.user) {
          if (srvData.session) {
            await supabase.auth.setSession(srvData.session).catch(() => {});
          }
          const userFullName =
            srvData.profile?.full_name ||
            srvData.profile?.name ||
            srvData.user.user_metadata?.full_name ||
            cleanEmail.split('@')[0] ||
            'Customer';
          const finalPhone = srvData.profile?.phone || srvData.user.phone || srvData.user.user_metadata?.phone || '';

          saveTermsAgreed(true);
          navigate(getPostAuthRedirect(), { replace: true });
          onAuthSuccess(finalPhone, userFullName, cleanEmail, srvData.user);
          return;
        }
      } catch (srvErr) {
        console.warn('[Server Auth Login] Server unreachable, attempting client fallback:', srvErr);
      }

      // 2. Client fallback
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (loginError) {
        // If login failed due to invalid credentials, check if user exists on server
        let userExistsOnServer = false;
        try {
          const res = await fetch(apiUrl('/api/auth/resolve-google-user'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail })
          });
          if (res.ok) {
            const d = await res.json().catch(() => null);
            if (d?.exists && d?.profile?.full_name) {
              userExistsOnServer = true;
            }
          }
        } catch {}

        if (userExistsOnServer) {
          setError('Incorrect password for this email. Please check your password or reset it.');
        } else {
          // NEW USER via EMAIL (not found in server) -> Go to next page to ask name, mobile number, and save
          setOnboardingEmailAddr(cleanEmail);
          setOnboardingEmailPw(password);
          setAuthStep('onboarding_email');
          resetMessages();
        }
      } else if (data.user) {
        // Existing user logged in successfully!
        const userFullName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          cleanEmail.split('@')[0] ||
          'Customer';
        const finalPhone = data.user.phone || data.user.user_metadata?.phone || '';

        // Cross-share with Firebase in background
        fetch(apiUrl('/api/user-profile'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            email: cleanEmail,
            full_name: userFullName,
            phone: finalPhone || null
          })
        }).catch(() => {});

        saveTermsAgreed(true);
        navigate(getPostAuthRedirect(), { replace: true });
        onAuthSuccess(finalPhone, userFullName, cleanEmail, data.user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 7. SAVE NEW USER PROFILE (EMAIL ONBOARDING NEXT PAGE) ---
  const handleSaveEmailOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanName = onboardingEmailName.trim();
    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }

    const clean10 = onboardingEmailPhone.replace(/\D/g, '').slice(-10);
    if (!clean10 || clean10.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!onboardingEmailPw || onboardingEmailPw.length < 6) {
      setError('Please enter a password with at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = `+91${clean10}`;
      const cleanEmail = onboardingEmailAddr.trim().toLowerCase();

      // 1. Primary: Server-side registration endpoint
      let regUser: any = null;
      try {
        const regRes = await fetch(apiUrl('/api/auth/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            phone: formattedPhone,
            fullName: cleanName,
            password: onboardingEmailPw
          })
        });
        const regData = await regRes.json().catch(() => null);
        if (regData && regData.success && regData.user) {
          regUser = regData.user;
          if (regData.session) {
            await supabase.auth.setSession(regData.session).catch(() => {});
          }
        }
      } catch (regErr) {
        console.warn('[Server Auth Register] Server unreachable, attempting client fallback:', regErr);
      }

      // 2. Client fallback if server registration was not used
      if (!regUser) {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: onboardingEmailPw,
          options: {
            data: {
              full_name: cleanName,
              phone: formattedPhone
            }
          }
        });

        if (signUpErr && !signUpErr.message.includes('already registered')) {
          setError(signUpErr.message || 'Failed to create account.');
          setIsLoading(false);
          return;
        }
        regUser = signUpData?.user;
      }

      const userId = regUser?.id || `uid_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // 2. Save profile in Supabase
      const finalizedProfile: UserProfile = {
        id: userId,
        phone: formattedPhone,
        phoneVerified: true,
        name: cleanName,
        email: cleanEmail,
        emailVerified: true
      };

      saveUserProfile(finalizedProfile, `uid_${userId}`);
      saveUserProfile(finalizedProfile, `phone_${clean10}`);

      try {
        await supabase.from('user_profiles').upsert(
          {
            user_id: userId,
            phone: formattedPhone,
            full_name: cleanName,
            email: cleanEmail,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      } catch (sbErr) {
        console.warn('[Supabase user_profiles upsert]:', sbErr);
      }

      // 3. Synchronize to backend server (updates Supabase and Firebase Firestore)
      fetch(apiUrl('/api/user-profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          phone: formattedPhone,
          full_name: cleanName,
          email: cleanEmail
        })
      }).catch(() => {});

      // 4. Cross-share with Firebase on backend server
      fetch(apiUrl('/api/auth/sync-user-to-firebase'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          profile: {
            phone: formattedPhone,
            full_name: cleanName,
            email: cleanEmail
          }
        })
      }).catch(() => {});

      saveTermsAgreed(true);
      onAuthSuccess(formattedPhone, cleanName, cleanEmail, regUser);
      navigate(getPostAuthRedirect(), { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save account.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 8. PRIMARY FORM SUBMIT DISPATCHER ---
  const handlePrimarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!termsAgreed) {
      setError('Please agree to the Terms of service and Privacy policy to continue.');
      return;
    }

    let cleanId = cleanAutofillPhone(identifier.trim());
    const isPhone = isPhoneInput(cleanId);

    if (isPhone) {
      if (!otpSent || !showSecondField) {
        await handleSendPhoneOtp();
      } else {
        await handleVerifyPhoneOtp();
      }
    } else {
      const cleanEmail = cleanId.toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setError('Please enter a valid mobile number or email address.');
        return;
      }
      if (!showSecondField) {
        setShowSecondField(true);
      } else {
        await handleEmailSignIn(cleanEmail);
      }
    }
  };

  // --- 9. FORGOT PASSWORD HANDLER ---
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = forgotEmail.trim().toLowerCase();
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

  const isAnyLoading = isLoading || isGoogleLoading;
  const isPhone = isPhoneInput(identifier);
  const isFillingSecond = showSecondField;
  const isTypingSecond = (isPhone && otpCode.length > 0) || (!isPhone && password.length > 0);
  const isMotorcyclePassing = isLoading && showSecondField;

  // Progressive approach: as user enters digits/chars, rider rolls closer to the bracket gate (0px to 17px)
  const typingProgress = isPhone
    ? Math.min((otpCode.length || 0) / 6, 1)
    : Math.min((password.length || 0) / 6, 1);
  const riderApproachX = isMotorcyclePassing ? 38 : typingProgress * 17;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative">
      <SEOHead
        title="Sign In / Register | SmartRun Express Electricals"
        description="Sign in to your SmartRun account with mobile OTP, email, or Google to track express delivery orders, manage addresses, and access wholesale pricing."
        keywords="smartrun login, smartrun signup, electrical depot account, mobile otp login"
      />

      {/* Top Back Navigation Arrow Button */}
      {!isNativeApp && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <button
            type="button"
            onClick={() => {
              if (authStep !== 'primary') {
                setAuthStep('primary');
                resetMessages();
              } else if (typeof window !== 'undefined' && window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="p-1.5 text-slate-700 hover:text-black hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex items-center gap-1 active:scale-95 text-xs font-bold"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>{authStep !== 'primary' ? 'Back' : 'Store'}</span>
          </button>
        </div>
      )}

      {/* Main Login Container - Positioned in the middle of screen */}
      <div className="w-full max-w-md bg-white border-0 shadow-none px-4 py-2 space-y-3 sm:space-y-3.5 my-auto">

        {/* Brand Logo & Name Header - Starts right from top with increased prominent size */}
        <div className="flex flex-col items-center justify-center text-center space-y-1.5">
          <div>
            <img
              src="/SmartRun.png"
              alt="SmartRun Logo"
              className="w-18 h-18 sm:w-22 sm:h-22 object-cover rounded-3xl"
            />
          </div>

          <div>
            <div
              className="text-3xl sm:text-4xl font-black font-baloo text-black flex items-center justify-center leading-none tracking-tight"
              style={{ fontFamily: "'Baloo 2', 'Baloo Bhai 2', cursive, sans-serif" }}
            >
              <span className="text-black">SmartRun</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
              Electrical &amp; Construction Materials Hub
            </p>
          </div>
        </div>

        {/* Clean Heading */}
        <div className="text-center pt-0 pb-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {authStep === 'primary' && 'Sign in'}
            {authStep === 'onboarding_phone' && 'Complete Your Profile'}
            {authStep === 'onboarding_email' && 'Complete Your Profile'}
            {authStep === 'forgot' && 'Reset Password'}
          </h1>
          {authStep === 'onboarding_phone' && (
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Mobile number +91 {onboardingPhone} verified. Fill details to finish.
            </p>
          )}
          {authStep === 'onboarding_email' && (
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              New to SmartRun? Fill in your details to create your account.
            </p>
          )}
        </div>

        {/* Feedback Messages */}
        {infoMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold animate-in fade-in leading-relaxed">
            {error}
          </div>
        )}

        {/* =========================================================================
            VIEW 1: PRIMARY LOGIN FORM (HYBRID MOBILE OTP / EMAIL / PASSWORD)
           ========================================================================= */}
        {authStep === 'primary' && (
          <div className="space-y-3.5">
            <form onSubmit={handlePrimarySubmit} className="space-y-4">
              {/* Field 1: Mobile Number or Email */}
              <div>
                <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                  MOBILE NO. / EMAIL
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
                      if (!isPhoneInput(val) && val.includes('@')) {
                        setShowSecondField(true);
                      }
                    }}
                    className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Second Field: SMS OTP for Mobile Number, or Password for Email */}
              <div className={showSecondField ? 'space-y-1 block animate-in fade-in duration-200' : 'hidden'}>
                <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                  {isPhone ? 'SMS OTP CODE' : 'PASSWORD'}
                </label>

                {isPhone ? (
                  /* Mobile OTP Input */
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
                        className="w-full bg-transparent py-2 text-sm font-semibold tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        required={showSecondField && isPhone}
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

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-emerald-600">
                          Otp Sent..
                        </span>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          disabled={otpCooldown > 0 || isLoading}
                          className={`text-xs transition-colors ${
                            otpCooldown > 0 || isLoading
                              ? 'text-slate-400 font-medium cursor-not-allowed'
                              : 'text-amber-700 hover:text-amber-800 font-bold cursor-pointer'
                          }`}
                        >
                          {otpCooldown > 0 ? `Resend OTP (${otpCooldown}s)` : 'Resend OTP'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Password Input for Email */
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
                        required={showSecondField && !isPhone}
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
                          setPassword('');
                          resetMessages();
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        Change email
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(identifier.includes('@') ? identifier : '');
                          setAuthStep('forgot');
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

              {/* Primary Action Button with Delivery Motorcycle & Gate Micro-Animation */}
              <button
                type="submit"
                disabled={isAnyLoading}
                className="w-full py-2.5 sm:py-3 px-4 rounded-2xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-60 mt-2 relative overflow-hidden group"
              >
                {/* Center Content: Arrow & Bracket icon placed directly next to text on left side */}
                <div className="flex items-center justify-center gap-2 font-black truncate px-8">
                  <LogIn className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>
                    {isLoading ? (
                      isPhone
                        ? (otpSent ? 'Verifying OTP...' : 'Sending OTP...')
                        : 'Entering SmartRun...'
                    ) : isPhone ? (
                      !showSecondField ? (
                        'Get OTP'
                      ) : (
                        'Verify OTP & Continue'
                      )
                    ) : (
                      'Sign In'
                    )}
                  </span>
                </div>

                {/* Right Side: Delivery Motorcycle & Gate Micro-Animation */}
                <div className="absolute right-3.5 w-12 h-6 flex items-center justify-end select-none pointer-events-none overflow-hidden">
                  <svg
                    viewBox="0 0 52 24"
                    className="w-12 h-6 overflow-visible"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Road surface */}
                    <line
                      x1="0"
                      y1="21"
                      x2="52"
                      y2="21"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      strokeOpacity="0.35"
                    />

                    {/* Security Gate Post */}
                    <rect x="38" y="7" width="3.5" height="14" rx="1.5" fill="#0f172a" />
                    {/* LED Light on Gate: Green when open/passing, Red when waiting/closed */}
                    <circle
                      cx="39.75"
                      cy="6"
                      r="1.8"
                      fill={isMotorcyclePassing ? '#16a34a' : (isFillingSecond ? '#ef4444' : '#64748b')}
                      className="transition-colors duration-300"
                    />

                    {/* Boom Barrier Gate Arm (Bracket) - Pivots up when open/passing */}
                    <g
                      className="transition-transform duration-500 ease-out"
                      style={{
                        transformOrigin: '39.75px 10px',
                        transform: isMotorcyclePassing ? 'rotate(-75deg)' : 'rotate(0deg)'
                      }}
                    >
                      {/* Barrier bar */}
                      <rect x="17" y="9" width="23" height="2.2" rx="1" fill="#dc2626" />
                      {/* White reflective stripes on barrier bar */}
                      <rect x="21" y="9" width="3" height="2.2" fill="#ffffff" />
                      <rect x="28" y="9" width="3" height="2.2" fill="#ffffff" />
                      <rect x="35" y="9" width="3" height="2.2" fill="#ffffff" />
                    </g>

                    {/* Delivery Motorcycle & Courier - Moves closer to bracket during typing, and passes through when enter/submit */}
                    <g
                      className={`transition-all ${
                        isTypingSecond && !isMotorcyclePassing ? 'animate-bike-idle' : ''
                      }`}
                      style={{
                        transform: `translateX(${riderApproachX}px)`,
                        opacity: isMotorcyclePassing ? 0 : 1,
                        transition: isMotorcyclePassing
                          ? 'transform 0.65s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.65s ease-in'
                          : 'transform 0.25s ease-out, opacity 0.2s ease-out'
                      }}
                    >
                      {/* Headlight beam */}
                      <polygon
                        points="16,13 25,10 25,16"
                        fill="#fef08a"
                        opacity={isTypingSecond || isMotorcyclePassing ? 0.85 : 0.25}
                        className="transition-opacity duration-300"
                      />

                      {/* Rear Wheel */}
                      <circle cx="5" cy="18.5" r="2.5" stroke="#0f172a" strokeWidth="1.2" fill="#ffffff" />
                      <circle cx="5" cy="18.5" r="0.8" fill="#0f172a" />

                      {/* Front Wheel */}
                      <circle cx="15" cy="18.5" r="2.5" stroke="#0f172a" strokeWidth="1.2" fill="#ffffff" />
                      <circle cx="15" cy="18.5" r="0.8" fill="#0f172a" />

                      {/* Bike Chassis */}
                      <path
                        d="M5 18.5 L9 16.5 L12.5 16.5 L15 18.5"
                        stroke="#0f172a"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                      {/* Handlebar & Windshield */}
                      <path
                        d="M12.5 16.5 L14 12.5 L15 11.5"
                        stroke="#0f172a"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                      <circle cx="15" cy="13" r="0.9" fill="#eab308" />

                      {/* SmartRun Express Delivery Box on Back */}
                      <rect x="2.5" y="10" width="5" height="6" rx="1" fill="#e23744" stroke="#0f172a" strokeWidth="0.8" />
                      <rect x="3.8" y="12" width="2.4" height="0.8" fill="#ffffff" rx="0.4" />

                      {/* Courier Helmet & Silhouette */}
                      <circle cx="9.5" cy="8.5" r="2.2" fill="#0f172a" />
                      <path d="M8.2 11 C8.2 11 9.5 10 11.5 12 L13 14.5" stroke="#0f172a" strokeWidth="1.3" strokeLinecap="round" />
                    </g>
                  </svg>
                </div>
              </button>
            </form>

            {/* DIVIDER: "Or continue with" in middle with compact small lines on both sides */}
            <div className="flex items-center justify-center my-2 gap-2.5">
              <div className="w-10 sm:w-14 h-[1px] bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap select-none">
                Or continue with
              </span>
              <div className="w-10 sm:w-14 h-[1px] bg-slate-200" />
            </div>

            {/* CONTINUE WITH GOOGLE BUTTON */}
            <div>
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

            {/* TERMS OF SERVICE & PRIVACY POLICY AGREEMENT */}
            <div className="pt-2 text-center flex justify-center w-full overflow-hidden">
              <label
                htmlFor="terms-agreed-tick"
                className="inline-flex items-center justify-center gap-1 sm:gap-1.5 text-[10.5px] min-[360px]:text-[11px] sm:text-xs font-medium text-slate-800 cursor-pointer select-none whitespace-nowrap"
              >
                <button
                  type="button"
                  id="terms-agreed-tick"
                  role="checkbox"
                  aria-checked={termsAgreed}
                  aria-label="Agree to terms of service and privacy policy"
                  onClick={handleToggleTerms}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    termsAgreed
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'border-slate-700 bg-white hover:border-slate-900 shadow-2xs'
                  }`}
                >
                  {termsAgreed && <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3.5]" />}
                </button>
                <span className="leading-none text-slate-800 tracking-tight">
                  <span onClick={handleToggleTerms} className="cursor-pointer">
                    You agree to our{' '}
                  </span>
                  <Link
                    to="/terms"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-950 font-bold underline underline-offset-2 decoration-slate-400 hover:decoration-slate-900 transition-colors"
                  >
                    Terms of service
                  </Link>
                  {' '}and{' '}
                  <Link
                    to="/privacy"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-950 font-bold underline underline-offset-2 decoration-slate-400 hover:decoration-slate-900 transition-colors"
                  >
                    Privacy policy
                  </Link>
                </span>
              </label>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 2: ONBOARDING FOR NEW USER VIA MOBILE NUMBER
            Asks Name, Email (Optional), Password (Optional), and Save Button
           ========================================================================= */}
        {authStep === 'onboarding_phone' && (
          <form onSubmit={handleSavePhoneOnboarding} className="space-y-4 animate-in fade-in duration-200">
            {/* Verified Phone Badge */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>+91 {onboardingPhone}</span>
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[11px]">
                Verified ✓
              </span>
            </div>

            {/* Field: Full Name (Required) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                FULL NAME <span className="text-red-500 font-black">*</span>
              </label>
              <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                <User className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={onboardingName}
                  onChange={(e) => setOnboardingName(e.target.value)}
                  className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Field: Email Address (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                EMAIL ADDRESS <span className="text-slate-400 font-normal">(OPTIONAL)</span>
              </label>
              <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                <Mail className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                <input
                  type="email"
                  placeholder="your@email.com (optional)"
                  value={onboardingEmail}
                  onChange={(e) => setOnboardingEmail(e.target.value)}
                  className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isAnyLoading}
              className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 mt-4"
            >
              {isLoading ? (
                <span>Saving Profile...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save and Continue</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* =========================================================================
            VIEW 3: ONBOARDING FOR NEW USER VIA EMAIL & PASSWORD
            Asks Name, Mobile Number, and Save Button
           ========================================================================= */}
        {authStep === 'onboarding_email' && (
          <form onSubmit={handleSaveEmailOnboarding} className="space-y-4 animate-in fade-in duration-200">
            {/* Email Badge */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-600" />
                <span>{onboardingEmailAddr}</span>
              </span>
              <span className="font-semibold text-slate-500 text-[11px]">
                New Account
              </span>
            </div>

            {/* Field: Full Name (Required) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                FULL NAME <span className="text-red-500 font-black">*</span>
              </label>
              <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                <User className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={onboardingEmailName}
                  onChange={(e) => setOnboardingEmailName(e.target.value)}
                  className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Field: Mobile Number (Required) */}
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
                  value={onboardingEmailPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setOnboardingEmailPhone(digits);
                  }}
                  maxLength={10}
                  className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Field: Password */}
            <div>
              <label className="block text-xs font-bold text-slate-800 tracking-wider uppercase mb-1">
                PASSWORD <span className="text-red-500 font-black">*</span>
              </label>
              <div className="flex items-center border-b border-slate-300 focus-within:border-slate-800 transition-colors pb-1">
                <Lock className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                <input
                  type={showOnboardingEmailPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={onboardingEmailPw}
                  onChange={(e) => setOnboardingEmailPw(e.target.value)}
                  minLength={6}
                  className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOnboardingEmailPw(!showOnboardingEmailPw)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
                  tabIndex={-1}
                >
                  {showOnboardingEmailPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isAnyLoading}
              className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 mt-4"
            >
              {isLoading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save and Continue</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* =========================================================================
            VIEW 4: FORGOT PASSWORD
           ========================================================================= */}
        {authStep === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 animate-in fade-in duration-200">
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
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  required
                  autoFocus
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

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthStep('primary');
                  resetMessages();
                }}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                Back to Sign in
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
