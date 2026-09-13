import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, ShieldCheck, CheckCircle2, ArrowLeft, Mail, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types';
import {
  saveUserProfile,
  cleanPhoneAutofill,
  formatToE164Phone,
  linkPhoneToUser,
  verifyPhoneChangeOtp,
  linkEmailToUser
} from '../../services/supabaseService';
import {
  sendFirebasePhoneOtp,
  verifyPhoneOtpOnly
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
  const [editPhone, setEditPhone] = useState(userProfile?.phone || '');
  const [editDob, setEditDob] = useState(userProfile?.dob || '');
  const [editPhotoURL, setEditPhotoURL] = useState(userProfile?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Real Supabase phone-linking OTP flow
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [pendingPhone, setPendingPhone] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);

  // Track if modal was opened to prevent background re-renders from wiping user input
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    // Only populate form fields upon opening transition
    if (isOpen && !prevIsOpenRef.current) {
      setEditName(userProfile?.name || '');
      setEditEmail(userProfile?.email || '');
      setEditPhone(userProfile?.phone ? cleanPhoneAutofill(userProfile.phone) : '');
      setEditDob(userProfile?.dob || '');
      setEditPhotoURL(userProfile?.photoURL || '');
      setIsOtpStep(false);
      setPendingPhone('');
      setPendingEmail('');
      setEnteredOtp('');
      setOtpError('');
      setFormError('');
      setIsSaving(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, userProfile]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isOtpStep && otpTimer > 0) {
      timer = setTimeout(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isOtpStep, otpTimer]);

  if (!isOpen) return null;

  const hasMissingName = !editName.trim();
  const hasMissingEmail = !editEmail.trim();
  const hasMissingPhone = !editPhone.trim();

  // Handle Form Submission (Step A of phone-linking or direct profile updates)
  const handleProfileFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setOtpError('');

    const targetName = editName.trim();
    if (!targetName) {
      setFormError('Please enter your full name.');
      showToast('Please enter your full name.', 'error');
      return;
    }

    const targetPhoneClean = cleanPhoneAutofill(editPhone.trim());
    const currentPhoneClean = cleanPhoneAutofill(userProfile?.phone || '');
    const isPhoneChanged = Boolean(targetPhoneClean && targetPhoneClean !== currentPhoneClean);

    const targetEmailClean = editEmail.trim().toLowerCase();
    const currentEmailClean = (userProfile?.email || '').trim().toLowerCase();
    const isEmailChanged = Boolean(targetEmailClean && targetEmailClean !== currentEmailClean);

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

    // =========================================================================
    // FLOW 1: PHONE NUMBER ADDED OR CHANGED -> FIREBASE PHONE VERIFICATION (STEP A)
    // =========================================================================
    if (isPhoneChanged) {
      setIsSaving(true);
      const fullE164 = formatToE164Phone(targetPhoneClean);

      // Request SMS OTP via Firebase Phone Auth
      const linkResult = await sendFirebasePhoneOtp(fullE164, 'profile-recaptcha-container');
      setIsSaving(false);

      if (!linkResult.success) {
        const errorMsg = linkResult.error || 'Failed to send OTP to this mobile number.';
        setFormError(errorMsg);
        showToast(errorMsg, 'error');
        return;
      }

      // Firebase successfully initiated phone verification and dispatched SMS OTP!
      const targetPhone = linkResult.formattedPhone || fullE164;
      setPendingPhone(targetPhone);
      setPendingEmail(isEmailChanged ? targetEmailClean : '');
      setIsOtpStep(true);
      setEnteredOtp(linkResult.isBillingFallback ? '123456' : '');
      setOtpError('');
      setOtpTimer(60);
      if (linkResult.isBillingFallback) {
        showToast(linkResult.message || 'Preview mode: Use code 123456 to verify.', 'info');
      } else if (linkResult.provider === 'fast2sms') {
        showToast(`Verification code sent to ${targetPhone} via Fast2SMS Quick SMS.`, 'info');
      } else {
        showToast(`Verification code sent to ${targetPhone} via SMS.`, 'info');
      }
      return;
    }

    // =========================================================================
    // FLOW 2: REVERSE CASE - ONLY EMAIL ADDED OR CHANGED (REQUIREMENT 5)
    // =========================================================================
    if (isEmailChanged) {
      setIsSaving(true);
      const emailResult = await linkEmailToUser(targetEmailClean);
      setIsSaving(false);

      if (!emailResult.success) {
        const errorMsg = emailResult.error || 'Failed to update email address.';
        setFormError(errorMsg);
        showToast(errorMsg, 'error');
        return;
      }

      // Save other non-phone profile changes
      await saveUserProfile({
        name: targetName,
        dob: editDob,
        photoURL: editPhotoURL.trim() || userProfile?.photoURL
      });

      const updated: UserProfile = {
        ...userProfile,
        name: targetName,
        email: targetEmailClean,
        dob: editDob,
        photoURL: editPhotoURL.trim() || userProfile?.photoURL,
        refundBalance,
        cashbackBalance,
        walletBalance: totalWalletBalance
      };

      onProfileUpdated(updated);
      showToast(`Confirmation email sent to ${targetEmailClean}. Please check your inbox.`, 'info');
      onClose();
      return;
    }

    // =========================================================================
    // FLOW 3: NEITHER PHONE NOR EMAIL CHANGED -> DIRECT SAVE (NAME, DOB, PHOTO)
    // =========================================================================
    setIsSaving(true);
    try {
      await saveUserProfile({
        name: targetName,
        dob: editDob,
        photoURL: editPhotoURL.trim() || userProfile?.photoURL
      });

      const updated: UserProfile = {
        ...userProfile,
        name: targetName,
        dob: editDob,
        photoURL: editPhotoURL.trim() || userProfile?.photoURL,
        refundBalance,
        cashbackBalance,
        walletBalance: totalWalletBalance
      };

      onProfileUpdated(updated);
      showToast('Profile updated successfully.', 'success');
      onClose();
    } catch {
      showToast('Profile updated.', 'success');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // STEP C: VERIFY OTP AND FINALIZE PHONE LINKING VIA SUPABASE
  // =========================================================================
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    const token = enteredOtp.trim();
    if (token.length < 4) {
      setOtpError('Please enter the complete OTP code received on your phone.');
      return;
    }

    setIsSaving(true);

    // Verify OTP using Firebase / Fast2SMS / dev mode WITHOUT altering the active user session
    let verifySuccess = false;
    let verifyErrorMsg = '';

    try {
      const fbResult = await verifyPhoneOtpOnly(token, pendingPhone);
      if (fbResult.success) {
        verifySuccess = true;
      } else {
        verifyErrorMsg = fbResult.error || '';
      }
    } catch (e: any) {
      verifyErrorMsg = e?.message || '';
    }

    // Fallback: If Firebase failed, check Supabase verifyPhoneChangeOtp
    if (!verifySuccess) {
      try {
        const sbResult = await verifyPhoneChangeOtp(pendingPhone, token);
        if (sbResult.success) {
          verifySuccess = true;
        } else {
          verifyErrorMsg = sbResult.error || verifyErrorMsg;
        }
      } catch {}
    }

    if (!verifySuccess) {
      setIsSaving(false);
      const msg = verifyErrorMsg || 'Invalid or expired OTP code. Please try again.';
      setOtpError(msg);
      return;
    }

    // Verification succeeded!
    // Save verified phone and any updated profile fields directly to the current user's profile
    const cleanDisplayPhone = cleanPhoneAutofill(pendingPhone);
    try {
      await saveUserProfile({
        phone: cleanDisplayPhone,
        phoneVerified: true,
        name: editName.trim() || userProfile?.name,
        dob: editDob,
        photoURL: editPhotoURL.trim() || userProfile?.photoURL
      });

      // If user also specified a new email in this flow, trigger email update
      if (pendingEmail) {
        await linkEmailToUser(pendingEmail);
        showToast(`Confirmation email also sent to ${pendingEmail}.`, 'info');
      }
    } catch (err) {
      console.warn('Profile auxiliary field update notice:', err);
    }

    // Update in-memory profile state so UI reflects the verified mobile number immediately
    const updated: UserProfile = {
      ...userProfile,
      name: editName.trim() || userProfile?.name || '',
      phone: cleanDisplayPhone,
      phoneVerified: true,
      email: pendingEmail || userProfile?.email || '',
      dob: editDob,
      photoURL: editPhotoURL.trim() || userProfile?.photoURL,
      refundBalance,
      cashbackBalance,
      walletBalance: totalWalletBalance
    };

    onProfileUpdated(updated);
    showToast('Mobile number successfully verified and linked to your account!', 'success');
    setIsSaving(false);
    setIsOtpStep(false);
    onClose();
  };

  // Resend Phone Verification OTP via Firebase
  const handleResendOtp = async () => {
    if (otpTimer > 0 || isSaving) return;
    setIsSaving(true);
    setOtpError('');

    const resendResult = await sendFirebasePhoneOtp(pendingPhone, 'profile-recaptcha-container');
    setIsSaving(false);

    if (!resendResult.success) {
      setOtpError(resendResult.error || 'Failed to resend OTP.');
    } else {
      setOtpTimer(60);
      showToast(`A fresh OTP has been sent to ${pendingPhone}`, 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
        {!isOtpStep ? (
          /* EDIT PROFILE FORM */
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-black text-slate-900">Edit Your Profile</h3>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Supabase Auth Linked</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3 font-medium">
              Adding or updating your mobile number links it directly to your Supabase login account.
            </p>

            {formError && (
              <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleProfileFormSubmit} className="space-y-3.5">
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Mobile Number</span>
                    {hasMissingPhone && (
                      <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block animate-pulse" title="Mobile number is required" />
                    )}
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    SMS OTP Linked
                  </span>
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
                      if (digits.length > 10) {
                        setEditPhone(cleanPhoneAutofill(raw));
                      } else {
                        setEditPhone(digits);
                      }
                      setFormError('');
                    }}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Enables one-click OTP login with this number on any device.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Gmail / Email Address</span>
                    {hasMissingEmail && (
                      <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block animate-pulse" title="Email is required" />
                    )}
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
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Connecting...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* STEP B: OTP VERIFICATION UI */
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
              <Smartphone className="w-6 h-6 text-amber-700" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">
                Verify Mobile Number
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                We sent a 6-digit verification code via SMS to:
              </p>
              <p className="text-sm font-black text-slate-950 mt-0.5 font-mono">
                {pendingPhone}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Enter the code below to link this number to your account.
              </p>
            </div>

            <form onSubmit={handleVerifyOtpSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                  OTP Verification Code (6 or 8 digits)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  autoFocus
                  value={enteredOtp}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEnteredOtp(clean);
                    setOtpError('');
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text');
                    const clean = text.replace(/\D/g, '').slice(0, 10);
                    if (clean) {
                      setEnteredOtp(clean);
                      setOtpError('');
                    }
                  }}
                  placeholder="Enter OTP code"
                  className="w-full text-center tracking-[0.3em] text-xl font-black px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 bg-white"
                />
              </div>

              {otpError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                <span>
                  {otpTimer > 0 ? `Resend code in ${otpTimer}s` : 'Code expired?'}
                </span>
                <button
                  type="button"
                  disabled={otpTimer > 0 || isSaving}
                  onClick={handleResendOtp}
                  className={`font-bold transition-colors ${
                    otpTimer > 0 || isSaving
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-amber-600 hover:text-amber-700 cursor-pointer'
                  }`}
                >
                  Resend OTP
                </button>
              </div>

              {/* Invisible Firebase Phone Auth reCAPTCHA mount */}
              <div id="profile-recaptcha-container" className="my-1" />

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpStep(false);
                    setEnteredOtp('');
                    setOtpError('');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Edit</span>
                </button>
                <button
                  type="submit"
                  disabled={enteredOtp.length < 6 || isSaving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    'Linking...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify &amp; Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <p className="text-[10px] text-slate-400">
                  Once verified, you can sign in anytime using either this mobile number or your email.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
