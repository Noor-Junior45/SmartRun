import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { apiUrl } from '../lib/apiBase';
import { saveUserProfile } from '../services/supabaseService';
import { sendWelcomeEmail } from '../services/welcomeEmailService';
import { UserProfile } from '../types';
import { SEOHead } from './SEOHead';

interface PersonalInfoPageProps {
  initialPhone?: string;
  initialName?: string;
  initialEmail?: string;
  initialDob?: string;
  isPhoneVerified?: boolean;
  onSuccess?: (phone: string, name: string, email?: string, userObj?: any) => void;
  onBack?: () => void;
}

export const PersonalInfoPage = ({
  initialPhone = '',
  initialName = '',
  initialEmail = '',
  initialDob = '',
  isPhoneVerified = true,
  onSuccess,
  onBack
}: PersonalInfoPageProps) => {
  const navigate = useNavigate();

  // Retrieve initial values from props or sessionStorage if arriving via navigation
  const [name, setName] = useState(() => {
    return initialName || sessionStorage.getItem('smartrun_onboard_name') || '';
  });
  const [email, setEmail] = useState(() => {
    return initialEmail || sessionStorage.getItem('smartrun_onboard_email') || '';
  });
  const [phone, setPhone] = useState(() => {
    const raw = initialPhone || sessionStorage.getItem('smartrun_onboard_phone') || '';
    const digits = raw.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  });
  const [dob, setDob] = useState(() => {
    return initialDob || sessionStorage.getItem('smartrun_onboard_dob') || '';
  });
  const [isLocked, setIsLocked] = useState(() => {
    if (isPhoneVerified) return true;
    const stored = sessionStorage.getItem('smartrun_onboard_phone_verified');
    return stored === 'true';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPhone) {
      const digits = initialPhone.replace(/\D/g, '');
      setPhone(digits.length > 10 ? digits.slice(-10) : digits);
      setIsLocked(isPhoneVerified);
    }
    if (initialName) setName(initialName);
    if (initialEmail) setEmail(initialEmail);
    if (initialDob) setDob(initialDob);
  }, [initialPhone, initialName, initialEmail, initialDob, isPhoneVerified]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter your full Name.');
      return;
    }

    const clean10 = phone.replace(/\D/g, '').slice(-10);
    if (!clean10 || clean10.length !== 10) {
      setError('Please provide a valid 10-digit mobile number.');
      return;
    }

    const formattedPhone = `+91${clean10}`;
    const cleanEmail = email.trim().toLowerCase();
    const cleanDob = dob.trim();

    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userMeta = authData?.user?.user_metadata || {};
      const currentUserId =
        userMeta.master_user_id ||
        userMeta.linked_user_id ||
        authData?.user?.id ||
        `uid_${clean10}`;

      const finalizedProfile: UserProfile = {
        id: currentUserId,
        phone: formattedPhone,
        phoneVerified: true,
        name: cleanName,
        email: cleanEmail || undefined,
        emailVerified: Boolean(cleanEmail),
        dob: cleanDob || undefined
      };

      // 1. Save locally in localStorage cache
      saveUserProfile(finalizedProfile, `uid_${currentUserId}`);
      saveUserProfile(finalizedProfile, `phone_${clean10}`);
      saveUserProfile(finalizedProfile);

      // 2. Persist in Supabase user_profiles table
      try {
        await supabase.from('user_profiles').upsert(
          {
            user_id: currentUserId,
            phone: formattedPhone,
            full_name: cleanName,
            email: cleanEmail || null,
            dob: cleanDob || null,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      } catch (sbErr) {
        console.warn('[Supabase user_profiles upsert]:', sbErr);
      }

      // 3. Post to backend server
      fetch(apiUrl('/api/user-profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          phone: formattedPhone,
          full_name: cleanName,
          email: cleanEmail || null,
          dob: cleanDob || null
        })
      }).catch(() => {});

      // 4. Cross-share with Firebase
      fetch(apiUrl('/api/auth/sync-user-to-firebase'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          profile: {
            phone: formattedPhone,
            full_name: cleanName,
            email: cleanEmail || undefined,
            dob: cleanDob || undefined
          }
        })
      }).catch(() => {});

      // 5. Dispatch welcome email to new member joining SmartRun
      if (cleanEmail && !cleanEmail.includes('@girirajpower.internal')) {
        sendWelcomeEmail({
          email: cleanEmail,
          name: cleanName,
          userId: currentUserId,
        }).catch(() => {});
      }

      // Clean up session onboarding storage
      try {
        sessionStorage.removeItem('smartrun_onboard_name');
        sessionStorage.removeItem('smartrun_onboard_email');
        sessionStorage.removeItem('smartrun_onboard_phone');
        sessionStorage.removeItem('smartrun_onboard_dob');
        sessionStorage.removeItem('smartrun_onboard_phone_verified');
      } catch {}

      if (onSuccess) {
        onSuccess(formattedPhone, cleanName, cleanEmail || undefined, authData?.user);
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save personal info.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackAction = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col text-slate-900">
      <SEOHead
        title="Personal Info | SmartRun Express Electricals"
        description="Complete your SmartRun profile with your name, verified phone, and personal details."
        keywords="smartrun personal info, user profile, account setup"
      />

      {/* Top Header: Keep "Personal Info." alone in top header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-20 shadow-2xs">
        <button
          type="button"
          onClick={handleBackAction}
          className="p-1 -ml-1 text-slate-700 hover:text-black rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-none">
          Personal Info.
        </h1>
      </div>

      {/* Main Form Body */}
      <div className="flex-1 w-full max-w-md mx-auto px-5 py-6 sm:py-8 flex flex-col justify-start">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Name with red star [*] and horizontal line */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1">
              Name <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              required
              autoFocus
              className="w-full py-2 px-0 text-slate-900 placeholder:text-slate-400 font-medium text-base focus:outline-none bg-transparent"
            />
            <hr className="border-t border-slate-200 mt-1 mb-2" />
          </div>

          {/* 2. Email (optional) and horizontal line */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full py-2 px-0 text-slate-900 placeholder:text-slate-400 font-medium text-base focus:outline-none bg-transparent"
            />
            <hr className="border-t border-slate-200 mt-1 mb-2" />
          </div>

          {/* 3. mobile no. (red dot *) - auto filled and read-only */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1">
              mobile no. <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="flex items-center gap-2 py-2">
              <span className="text-slate-900 font-medium text-base select-none shrink-0">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit mobile number"
                value={phone}
                readOnly={isLocked}
                maxLength={10}
                onChange={(e) => {
                  if (!isLocked) {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(digits);
                    if (error) setError(null);
                  }
                }}
                className={`w-full py-0 px-0 text-slate-900 placeholder:text-slate-400 font-medium text-base focus:outline-none bg-transparent ${
                  isLocked ? 'text-slate-600 cursor-not-allowed select-none' : ''
                }`}
                required
              />
            </div>
            <hr className="border-t border-slate-200 mt-1 mb-2" />
          </div>

          {/* 4. D.O.B (optional) and horizontal line */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1">
              D.O.B (optional)
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full py-2 px-0 text-slate-900 font-medium text-base focus:outline-none bg-transparent cursor-pointer"
            />
            <hr className="border-t border-slate-200 mt-1 mb-2" />
          </div>

          {/* 5. In last: Pill shape long button in red colour background with Continue Text */}
          <div className="pt-6 sm:pt-8">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-4 px-6 rounded-full bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-base shadow-sm transition-all text-center flex items-center justify-center cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
