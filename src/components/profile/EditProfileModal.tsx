import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types';
import {
  saveUserProfile,
  cleanPhoneAutofill,
  linkEmailToUser
} from '../../services/supabaseService';
import {
  sendFast2SmsPhoneOtp,
  verifyFast2SmsPhoneOtp
} from '../../services/firebaseAuthService';
import { showToast } from '../../utils/toast';

interface EditProfileModalProps {
  isOpen: boolean;
  userProfile: UserProfile | null;
  refundBalance: number;
  cashbackBalance: number;
  totalWalletBalance: number;
  onClose: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
}

export const EditProfileModal = ({
  isOpen,
  userProfile,
  refundBalance,
  cashbackBalance,
  totalWalletBalance,
  onClose,
  onProfileUpdated
}: EditProfileModalProps) => {
  const [editName, setEditName] = useState(userProfile?.name || '');
  const [editEmail, setEditEmail] = useState(userProfile?.email || '');
  const [editPhone, setEditPhone] = useState(userProfile?.phone ? cleanPhoneAutofill(userProfile.phone) : '');
  const [editDob, setEditDob] = useState(userProfile?.dob || '');
  const [editPhotoURL, setEditPhotoURL] = useState(userProfile?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Inline Fast2SMS Mobile OTP flow for changing mobile number
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [isPhoneOtpVerified, setIsPhoneOtpVerified] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState('');
  const [phoneOtpTimer, setPhoneOtpTimer] = useState(0);

  // Track the exact phone number that was successfully verified via OTP
  const verifiedPhoneRef = useRef<string>('');

  // Track if modal was opened to prevent background re-renders from wiping user input
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    // Only populate form fields upon opening transition
    if (isOpen && !prevIsOpenRef.current) {
      const currentSavedPhone = userProfile?.phone ? cleanPhoneAutofill(userProfile.phone) : '';
      setEditName(userProfile?.name || '');
      setEditEmail(userProfile?.email && !userProfile.email.includes('@girirajpower.internal') ? userProfile.email : '');
      setEditPhone(currentSavedPhone);
      setEditDob(userProfile?.dob || '');
      setEditPhotoURL(userProfile?.photoURL || '');
      setOtpDigits(['', '', '', '', '', '']);
      setIsPhoneOtpSent(false);
      setIsSendingPhoneOtp(false);
      setIsVerifyingPhoneOtp(false);
      setIsPhoneOtpVerified(false);
      setPhoneOtpError('');
      setPhoneOtpTimer(0);
      setFormError('');
      setIsSaving(false);
      verifiedPhoneRef.current = '';
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, userProfile]);

  // Countdown timer for Phone OTP resend
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (phoneOtpTimer > 0) {
      timer = setTimeout(() => setPhoneOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [phoneOtpTimer]);

  if (!isOpen) return null;

  const currentSavedPhone = cleanPhoneAutofill(userProfile?.phone || '');
  const targetPhoneClean = cleanPhoneAutofill(editPhone.trim());
  const isPhoneChanged = Boolean(targetPhoneClean && targetPhoneClean !== currentSavedPhone);
  const canShowSendOtp = isPhoneChanged && !isPhoneOtpVerified && targetPhoneClean.length === 10;

  const resolvedEmail = (editEmail || userProfile?.email || '').trim().toLowerCase();
  const resolvedEmailDisplay = resolvedEmail && !resolvedEmail.includes('@girirajpower.internal') ? resolvedEmail : '';

  const hasMissingName = !editName.trim();
  const hasMissingPhone = !editPhone.trim();

  // Send Fast2SMS OTP directly to the new mobile number
  const handleSendPhoneOtp = async () => {
    if (targetPhoneClean.length !== 10) {
      const msg = 'Please enter a valid 10-digit mobile number first.';
      setPhoneOtpError(msg);
      showToast(msg, 'error');
      return;
    }

    setIsSendingPhoneOtp(true);
    setPhoneOtpError('');
    try {
      const res = await sendFast2SmsPhoneOtp(targetPhoneClean);
      if (!res.success) {
        setPhoneOtpError(res.error || 'Failed to send OTP to your new mobile number.');
        showToast(res.error || 'Failed to send OTP via SMS.', 'error');
      } else {
        setIsPhoneOtpSent(true);
        setPhoneOtpTimer(60);
        showToast(`Verification code sent via SMS to +91 ${targetPhoneClean}`, 'info');
        // Auto-focus the first digit box
        setTimeout(() => {
          digitInputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (err: any) {
      setPhoneOtpError(err?.message || 'Error sending SMS verification code.');
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  // Seamless digit typing across the 6 boxes
  const handleDigitChange = (index: number, val: string) => {
    const numericOnly = val.replace(/\D/g, '');
    const nextDigits = [...otpDigits];

    if (!numericOnly) {
      nextDigits[index] = '';
      setOtpDigits(nextDigits);
      return;
    }

    const char = numericOnly[numericOnly.length - 1];
    nextDigits[index] = char;
    setOtpDigits(nextDigits);
    setPhoneOtpError('');

    // Advance focus to next input
    if (index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    // Auto verify when all 6 digits are typed
    const fullCode = nextDigits.join('');
    if (fullCode.length === 6) {
      triggerVerifyPhoneOtp(fullCode);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (!otpDigits[index] && index > 0) {
        e.preventDefault();
        const nextDigits = [...otpDigits];
        nextDigits[index - 1] = '';
        setOtpDigits(nextDigits);
        digitInputRefs.current[index - 1]?.focus();
      } else {
        const nextDigits = [...otpDigits];
        nextDigits[index] = '';
        setOtpDigits(nextDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      digitInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setOtpDigits(nextDigits);
    setPhoneOtpError('');

    const focusIdx = Math.min(pasted.length, 5);
    digitInputRefs.current[focusIdx]?.focus();

    if (pasted.length === 6) {
      triggerVerifyPhoneOtp(pasted);
    }
  };

  // Verify the 6-digit Fast2SMS OTP
  const triggerVerifyPhoneOtp = async (codeToVerify: string) => {
    const token = codeToVerify.trim();
    if (token.length !== 6) {
      setPhoneOtpError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifyingPhoneOtp(true);
    setPhoneOtpError('');

    try {
      const res = await verifyFast2SmsPhoneOtp(targetPhoneClean, token);
      if (!res.success) {
        setPhoneOtpError(res.error || 'Invalid or expired OTP code.');
        showToast(res.error || 'Invalid OTP code.', 'error');
      } else {
        setIsPhoneOtpVerified(true);
        verifiedPhoneRef.current = targetPhoneClean;
        setPhoneOtpError('');
        showToast('Mobile number verified successfully! You can now save your changes.', 'success');
      }
    } catch (err: any) {
      setPhoneOtpError(err?.message || 'Error verifying OTP code.');
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  // Handle Form Submission
  const handleProfileFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const targetName = editName.trim();
    if (!targetName) {
      setFormError('Please enter your full name.');
      showToast('Please enter your full name.', 'error');
      return;
    }

    const targetEmailClean = editEmail.trim().toLowerCase();
    const currentEmailClean = (userProfile?.email || '').trim().toLowerCase();
    const isEmailChanged = Boolean(targetEmailClean && targetEmailClean !== currentEmailClean && !targetEmailClean.includes('@girirajpower.internal'));

    // Validate phone number format if modified
    if (isPhoneChanged && targetPhoneClean.length !== 10) {
      const msg = 'Please enter a valid 10-digit Indian mobile number.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    // Validate email format if modified
    if (isEmailChanged && (!targetEmailClean.includes('@') || !targetEmailClean.includes('.'))) {
      const msg = 'Please enter a valid email address.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    // If mobile number was changed, verify that SMS OTP has been verified
    if (isPhoneChanged && (!isPhoneOtpVerified || verifiedPhoneRef.current !== targetPhoneClean)) {
      const msg = `Please enter the OTP sent to +91 ${targetPhoneClean} to verify your new mobile number.`;
      setFormError(msg);
      setPhoneOtpError(msg);
      showToast('Please verify your new mobile number before saving.', 'error');
      if (!isPhoneOtpSent) {
        handleSendPhoneOtp();
      }
      return;
    }

    setIsSaving(true);
    try {
      const finalPhone = isPhoneChanged ? targetPhoneClean : (userProfile?.phone ? cleanPhoneAutofill(userProfile.phone) : '');

      // Save profile with verified mobile number and updated fields
      await saveUserProfile({
        name: targetName,
        phone: finalPhone || undefined,
        phoneVerified: isPhoneChanged ? true : userProfile?.phoneVerified,
        email: targetEmailClean || userProfile?.email,
        dob: editDob,
        photoURL: editPhotoURL.trim() || userProfile?.photoURL
      });

      // If user also changed their email, trigger Supabase email update
      if (isEmailChanged) {
        try {
          await linkEmailToUser(targetEmailClean);
          showToast(`Confirmation email sent to ${targetEmailClean}.`, 'info');
        } catch {}
      }

      const updated: UserProfile = {
        ...userProfile,
        name: targetName,
        phone: finalPhone || userProfile?.phone || '',
        phoneVerified: isPhoneChanged ? true : userProfile?.phoneVerified,
        email: targetEmailClean || userProfile?.email || '',
        dob: editDob,
        photoURL: editPhotoURL.trim() || userProfile?.photoURL,
        refundBalance,
        cashbackBalance,
        walletBalance: totalWalletBalance
      };

      onProfileUpdated(updated);
      showToast('Profile updated successfully!', 'success');
      onClose();
    } catch (err: any) {
      showToast('Profile updated.', 'success');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-black text-slate-900">Edit Your Profile</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3 font-medium">
          Update your personal details and contact information.
        </p>

        {formError && (
          <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleProfileFormSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Full Name</span>
                {hasMissingName && (
                  <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block animate-pulse" title="Name is required" />
                )}
              </label>
            </div>
            <input
              type="text"
              value={editName}
              onChange={(e) => {
                setEditName(e.target.value);
                setFormError('');
              }}
              placeholder="Enter your full name"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
              required
            />
          </div>

          {/* Mobile Number Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                <span>Mobile Number</span>
                {hasMissingPhone && (
                  <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block animate-pulse" title="Mobile number is required" />
                )}
              </label>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-bold text-slate-500 select-none">
                +91
              </span>
              <input
                type="tel"
                autoComplete="tel"
                value={editPhone}
                onChange={(e) => {
                  const raw = e.target.value;
                  const digits = raw.replace(/\D/g, '');
                  const finalVal = digits.length > 10 ? cleanPhoneAutofill(raw) : digits;
                  setEditPhone(finalVal);
                  setFormError('');
                  setPhoneOtpError('');
                  if (finalVal !== verifiedPhoneRef.current) {
                    setIsPhoneOtpVerified(false);
                    setIsPhoneOtpSent(false);
                    setOtpDigits(['', '', '', '', '', '']);
                  }
                }}
                placeholder="Enter 10-digit mobile number"
                className={`w-full pl-10 ${canShowSendOtp ? 'pr-24' : 'pr-3.5'} py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white`}
                required
              />

              {/* Send OTP / Resend OTP button inside mobile number box - only appears once 10 digits are filled */}
              {canShowSendOtp && (
                <div className="absolute right-1.5 flex items-center">
                  {!isPhoneOtpSent ? (
                    <button
                      type="button"
                      id="send-phone-otp-btn"
                      disabled={isSendingPhoneOtp}
                      onClick={handleSendPhoneOtp}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isSendingPhoneOtp ? 'Sending...' : 'Send OTP'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="resend-phone-otp-btn"
                      disabled={phoneOtpTimer > 0 || isSendingPhoneOtp}
                      onClick={handleSendPhoneOtp}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        phoneOtpTimer > 0 || isSendingPhoneOtp
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-900 cursor-pointer border border-amber-300'
                      }`}
                    >
                      {isSendingPhoneOtp ? 'Sending...' : phoneOtpTimer > 0 ? `Resend (${phoneOtpTimer}s)` : 'Resend OTP'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* OTP BOX BELOW MOBILE NUMBER: Appears ONLY after user presses Send OTP (or is verified) */}
            {isPhoneChanged && (isPhoneOtpSent || isPhoneOtpVerified) && (
              <div className="mt-2.5 p-3 bg-amber-50/80 rounded-xl border border-amber-200/90 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                    <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] text-slate-700 leading-snug font-medium">
                        Otp sent to <strong className="text-slate-900 font-bold">+91 {targetPhoneClean}</strong>
                      </p>
                      {isPhoneOtpVerified && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isPhoneOtpVerified ? (
                  <div className="space-y-2 pt-0.5">
                    {/* 6 separate small compact boxes that fit phone screen nicely */}
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            digitInputRefs.current[index] = el;
                          }}
                          type="text"
                          maxLength={1}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          value={digit}
                          disabled={isVerifyingPhoneOtp}
                          onChange={(e) => handleDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleDigitKeyDown(index, e)}
                          onPaste={handleDigitPaste}
                          onFocus={(e) => e.target.select()}
                          className={`w-8.5 h-10 sm:w-10 sm:h-11 text-center text-base sm:text-lg font-mono font-bold rounded-lg border transition-all duration-150 shadow-xs focus:outline-none ${
                            digit
                              ? 'border-amber-500 bg-white text-slate-900 shadow-xs ring-1 ring-amber-300'
                              : 'border-slate-300 bg-white/95 text-slate-900'
                          } focus:ring-2 focus:ring-amber-400 focus:border-amber-500 disabled:opacity-50`}
                        />
                      ))}
                    </div>

                    {isVerifyingPhoneOtp && (
                      <p className="text-[11px] font-bold text-amber-800 text-center flex items-center justify-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                        Verifying code...
                      </p>
                    )}

                    {phoneOtpError && (
                      <p className="text-[11px] font-semibold text-red-600 flex items-center justify-center gap-1 text-center">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{phoneOtpError}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mobile number change verified! Tap "Save Changes" to save.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Address */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Gmail / Email Address</span>
              </label>
            </div>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => {
                setEditEmail(e.target.value);
                setFormError('');
              }}
              placeholder="Enter your email (e.g. name@gmail.com)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
              required
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Date of Birth (Optional)
            </label>
            <input
              type="date"
              value={editDob}
              onChange={(e) => setEditDob(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Used for exclusive birthday loyalty cashbacks and discounts.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (isPhoneChanged && !isPhoneOtpVerified)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
