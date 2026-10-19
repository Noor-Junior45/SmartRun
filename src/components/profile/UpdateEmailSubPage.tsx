import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { UserProfile } from '../../types';
import { saveUserProfile, sendEmailChangeOtp, verifyEmailChangeOtp } from '../../services/supabaseService';
import { apiUrl } from '../../lib/apiBase';
import { showToast } from '../../utils/toast';

interface UpdateEmailSubPageProps {
  userProfile: UserProfile | null;
  onBack: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export const UpdateEmailSubPage: React.FC<UpdateEmailSubPageProps> = ({
  userProfile,
  onBack,
  onProfileUpdated
}) => {
  const currentEmail = userProfile?.email && !userProfile.email.includes('@girirajpower.internal')
    ? userProfile.email
    : '';

  const [newEmail, setNewEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const cleanEmail = newEmail.trim().toLowerCase();
  const isValidEmail = cleanEmail.includes('@') && cleanEmail.includes('.');
  const isSameAsCurrent = cleanEmail === currentEmail.toLowerCase();

  // Countdown timer for OTP resend
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (timer > 0) {
      t = setTimeout(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(t);
  }, [timer]);

  // Dispatch OTP to the new email address
  const handleSendOtp = async () => {
    if (!isValidEmail) {
      setError('Please enter a valid email address.');
      return;
    }
    if (isSameAsCurrent) {
      setError('New email cannot be the same as your current email.');
      return;
    }

    setError(null);
    setIsSendingOtp(true);

    try {
      const res = await sendEmailChangeOtp(cleanEmail);
      if (!res.success) {
        setError(res.error || 'Failed to dispatch verification code to this email. Please check and try again.');
      } else {
        setIsOtpSent(true);
        setTimer(60);
        setOtpDigits(['', '', '', '', '', '']);
        showToast(`Verification code sent to ${cleanEmail}`, 'info');
        setTimeout(() => digitInputRefs.current[0]?.focus(), 150);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not send verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP code entered by the user
  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = (codeOverride || otpDigits.join('')).trim();
    if (code.length !== 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      const res = await verifyEmailChangeOtp(cleanEmail, code);
      if (!res.success) {
        setError(res.error || 'Invalid or expired verification code. Please check the code.');
        setIsVerifying(false);
        return;
      }

      setIsVerified(true);
      setIsSaving(true);

      // Save verified email to Profile in Supabase & Firestore
      await saveUserProfile({
        name: userProfile?.name,
        phone: userProfile?.phone,
        phoneVerified: userProfile?.phoneVerified,
        email: cleanEmail,
        dob: userProfile?.dob,
        photoURL: userProfile?.photoURL
      });

      // Synchronize to backend server profile store
      fetch(apiUrl('/api/user-profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userProfile?.id,
          phone: userProfile?.phone || null,
          email: cleanEmail,
          full_name: userProfile?.name || null
        })
      }).catch(() => {});

      const updatedProfile: UserProfile = {
        ...userProfile,
        name: userProfile?.name || 'Customer',
        phone: userProfile?.phone || '',
        phoneVerified: userProfile?.phoneVerified,
        email: cleanEmail,
        refundBalance: userProfile?.refundBalance || 0,
        cashbackBalance: userProfile?.cashbackBalance || 0,
        walletBalance: userProfile?.walletBalance || 0
      };

      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }
      showToast('Email updated successfully!', 'success');
      setTimeout(() => {
        onBack();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
      setIsSaving(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }

    if (cleaned.length > 1) {
      const six = cleaned.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < six.length; i++) next[i] = six[i];
      setOtpDigits(next);
      if (six.length === 6) {
        handleVerifyOtp(cleaned.slice(0, 6));
      } else {
        digitInputRefs.current[Math.min(six.length, 5)]?.focus();
      }
      return;
    }

    const next = [...otpDigits];
    next[index] = cleaned;
    setOtpDigits(next);

    if (index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    } else {
      const full = [...next];
      full[5] = cleaned;
      if (full.every((d) => d.length === 1)) {
        handleVerifyOtp(full.join(''));
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header: Tailless arrow back button and clean title */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-2.5 shadow-2xs">
        <button
          type="button"
          onClick={onBack}
          className="p-1 -ml-1 text-slate-800 hover:text-black hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 leading-none">
          Email Update
        </h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Current Email Status */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Current Email Address
          </p>
          <p className="text-base font-bold text-slate-900 flex items-center gap-2 break-all">
            <Mail className="w-4 h-4 text-slate-600 shrink-0" />
            <span>{currentEmail || 'No email linked'}</span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {isVerified && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Email updated and verified successfully!</span>
          </div>
        )}

        {/* New Email Form */}
        {!isVerified && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                New Email Address
              </label>
              <input
                type="email"
                disabled={isOtpSent || isSaving}
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setError(null);
                }}
                placeholder="Enter new email (e.g. name@gmail.com)"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                required
              />
            </div>

            {/* Send OTP Button (when OTP not yet sent) */}
            {!isOtpSent && (
              <button
                type="button"
                disabled={!isValidEmail || isSendingOtp || isSameAsCurrent}
                onClick={handleSendOtp}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Sending Verification Code...</span>
                  </>
                ) : (
                  <span>Send Verification OTP</span>
                )}
              </button>
            )}

            {/* OTP Verification Section (after OTP is sent) */}
            {isOtpSent && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600 font-medium">
                    Enter the 6-digit code sent to <strong className="text-slate-900">{cleanEmail}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setOtpDigits(['', '', '', '', '', '']);
                      setError(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-900 font-bold underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* 6 Compact OTP boxes */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { digitInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-lg font-black rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white shadow-2xs"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    disabled={timer > 0 || isSendingOtp}
                    onClick={handleSendOtp}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                  >
                    {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
                  </button>

                  <button
                    type="button"
                    disabled={otpDigits.some((d) => !d) || isVerifying || isSaving}
                    onClick={() => handleVerifyOtp()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isVerifying || isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify &amp; Update</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
