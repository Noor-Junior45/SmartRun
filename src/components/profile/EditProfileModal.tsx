import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, User, Calendar } from 'lucide-react';
import { UserProfile } from '../../types';
import { saveUserProfile } from '../../services/supabaseService';
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
  const [editDob, setEditDob] = useState(userProfile?.dob || '');
  const [editPhotoURL, setEditPhotoURL] = useState(userProfile?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setEditName(userProfile?.name || '');
      setEditDob(userProfile?.dob || '');
      setEditPhotoURL(userProfile?.photoURL || '');
      setFormError('');
      setIsSaving(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const hasMissingName = !editName.trim();

  const handleProfileFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const targetName = editName.trim();
    if (!targetName) {
      const msg = 'Please enter your full name.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    setIsSaving(true);
    try {
      await saveUserProfile({
        name: targetName,
        phone: userProfile?.phone,
        phoneVerified: userProfile?.phoneVerified,
        email: userProfile?.email,
        dob: editDob,
        photoURL: editPhotoURL.trim() || userProfile?.photoURL
      });

      const updated: UserProfile = {
        ...userProfile,
        name: targetName,
        phone: userProfile?.phone || '',
        phoneVerified: userProfile?.phoneVerified,
        email: userProfile?.email || '',
        dob: editDob,
        photoURL: editPhotoURL.trim() || userProfile?.photoURL,
        refundBalance,
        cashbackBalance,
        walletBalance: totalWalletBalance
      };

      onProfileUpdated(updated);
      showToast('Profile updated successfully!', 'success');
      onClose();
    } catch {
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
        <p className="text-xs text-slate-500 mb-4 font-medium">
          Update your personal details.
        </p>

        {formError && (
          <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleProfileFormSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between h-5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
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
              className="w-full h-11 min-h-[44px] max-h-[44px] px-3.5 py-0 rounded-xl border border-slate-300 text-xs font-bold font-sans focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-slate-900 bg-white box-border transition-all appearance-none leading-[42px]"
              required
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between h-5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Date of Birth (Optional)</span>
              </label>
            </div>
            <input
              type="date"
              value={editDob}
              onChange={(e) => setEditDob(e.target.value)}
              className="w-full h-11 min-h-[44px] max-h-[44px] px-3.5 py-0 rounded-xl border border-slate-300 text-xs font-bold font-sans focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-slate-900 bg-white box-border transition-all appearance-none leading-[42px] [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:p-0 [&::-webkit-date-and-time-value]:min-h-0 [&::-webkit-date-and-time-value]:leading-[42px] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
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
              className="flex-1 h-11 min-h-[44px] px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-11 min-h-[44px] px-4 rounded-xl bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
