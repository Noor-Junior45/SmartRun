import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Smartphone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { UserProfile } from '../../types';
import { saveUserProfile, cleanPhoneAutofill } from '../../services/supabaseService';
import { sendFirebasePhoneOtp, verifyPhoneOtpOnly } from '../../services/firebaseAuthService';
import { showToast } from '../../utils/toast';

interface UpdateMobileSubPageProps {
  userProfile: UserProfile | null;
  onBack: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export const UpdateMobileSubPage: React.FC<UpdateMobileSubPageProps> = ({
  userProfile,
  onBack,
  onProfileUpdated
}) => {
  const currentPhone = userProfile?.phone ? cleanPhoneAutofill(userProfile.phone) : '';
  const [newPhone, setNewPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const cleanNewPhone = cleanPhoneAutofill(newPhone.trim());
  const isValidLength = cleanNewPhone.length === 10;
  const isSameAsCurrent = cleanNewPhone === currentPhone;

  // Countdown timer for OTP
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (timer > 0) {
      t = setTimeout(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(t);
  }, [timer]);

  // Dispatch OTP via Google Firebase Phone Auth
  const handleSendOtp = async () => {
    if (!isValidLength) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (isSameAsCurrent) {
      setError('New mobile number cannot be the same as your current number.');
      return;
    }

    setError(null);
    setIsSendingOtp(true);

    try {
      // Use Firebase OTP exclusively
      const res = await sendFirebasePhoneOtp(cleanNewPhone);
      if (!res.success) {
        setError(res.error || 'Failed to dispatch verification code via Firebase. Please try again.');
      } else {
        setIsOtpSent(true);
        setTimer(60);
        setOtpDigits(['', '', '', '', '', '']);
        showToast(`Firebase OTP sent to +91 ${cleanNewPhone}`, 'info');
        setTimeout(() => digitInputRefs.current[0]?.focus(), 150);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not send Firebase OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP via Firebase Phone Auth
  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = (codeOverride || otpDigits.join('')).trim();
    if (code.length !== 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setError(null);
    setIsVerifying(true);
    const fullPhone = `+91${cleanNewPhone}`;

    try {
      // Verify exclusively via Firebase Phone Auth
      const res = await verifyPhoneOtpOnly(code, fullPhone);
      if (!res.success) {
        setError(res.error || 'Invalid or expired Firebase OTP. Please check the code.');
        setIsVerifying(false);
        return;
      }

      setIsVerified(true);
      setIsSaving(true);

      // Save verified mobile number to Profile in Supabase & Firestore
      await saveUserProfile({
        name: userProfile?.name,
        phone: cleanNewPhone,
        phoneVerified: true,
        email: userProfile?.email,
        dob: userProfile?.dob,
        photoURL: userProfile?.photoURL
      });

      const updatedProfile: UserProfile = {
        ...userProfile,
        name: userProfile?.name || 'Customer',
        phone: cleanNewPhone,
        phoneVerified: true,
        email: userProfile?.email || '',
        refundBalance: userProfile?.refundBalance || 0,
        cashbackBalance: userProfile?.cashbackBalance || 0,
        walletBalance: userProfile?.walletBalance || 0
      };

      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }
      showToast('Mobile number updated successfully!', 'success');
      setTimeout(() => {
        onBack();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Firebase verification failed. Please try again.');
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
      // Pasted full code
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
          Mobile No. Update
        </h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Current Phone Status */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Current Mobile Number
          </p>
          <p className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-600" />
            <span>{currentPhone ? `+91 ${currentPhone}` : 'No phone number linked'}</span>
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
            <span>Mobile number updated successfully!</span>
          </div>
        )}

        {/* New Mobile Number Input Form */}
        {!isVerified && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                New Mobile Number
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-bold text-slate-500 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  disabled={isOtpSent || isSaving}
                  value={newPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setNewPhone(digits);
                    setError(null);
                  }}
                  placeholder="Enter 10-digit number"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            {/* Send OTP Button (when OTP not yet sent) */}
            {!isOtpSent && (
              <button
                type="button"
                disabled={!isValidLength || isSendingOtp || isSameAsCurrent}
                onClick={handleSendOtp}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Sending Firebase OTP...</span>
                  </>
                ) : (
                  <span>Send Firebase OTP</span>
                )}
              </button>
            )}

            {/* OTP Verification Section (after OTP is sent) */}
            {isOtpSent && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600 font-medium">
                    Enter the 6-digit code sent to <strong className="text-slate-900">+91 {cleanNewPhone}</strong>
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
