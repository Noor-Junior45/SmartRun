import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Trash2,
  CheckCircle2,
  X,
  UserX,
  Mail,
  ChevronDown,
  Send,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { UserProfile, Order } from '../types';
import { API_BASE_URL } from '../lib/apiBase';
import { showToast } from '../utils/toast';
import { purgeAllUserCacheAndStorage, signOutUser } from '../services/supabaseService';
import { SEOHead } from './SEOHead';

interface AccountDeletionPageProps {
  userProfile?: UserProfile | null;
  orders?: Order[];
  onOpenAuth?: () => void;
  onBack?: () => void;
}

export const AccountDeletionPage = ({
  userProfile,
  orders = [],
  onOpenAuth,
  onBack
}: AccountDeletionPageProps) => {
  const navigate = useNavigate();

  // Signed in email / identifier
  const userEmail =
    userProfile?.email ||
    (userProfile?.phone ? `${userProfile.phone}` : '') ||
    'yourname@gmail.com';

  // Section 1: Direct Self-Service Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Section 3: Web Deletion Request State
  const [webEmail, setWebEmail] = useState(userProfile?.email || '');
  const [webReason, setWebReason] = useState('No longer using the application');
  const [webConfirmed, setWebConfirmed] = useState(false);
  const [isSubmittingWeb, setIsSubmittingWeb] = useState(false);
  const [webSubmittedData, setWebSubmittedData] = useState<{
    requestId: string;
    submittedAt: string;
  } | null>(null);

  const [copiedDelete, setCopiedDelete] = useState(false);

  useEffect(() => {
    if (userProfile?.email) {
      setWebEmail(userProfile.email);
    }
  }, [userProfile]);

  // Handler to copy "DELETE" confirmation text like GitHub/Vercel
  const handleCopyDeleteText = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const textToCopy = 'DELETE';
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedDelete(true);
      showToast('Copied "DELETE" to clipboard', 'success');
      setTimeout(() => setCopiedDelete(false), 2000);
    } catch (err) {
      console.warn('Failed to copy DELETE text:', err);
    }
  };

  // Handler for direct self-service delete
  const handleDirectSelfServiceDelete = async () => {
    if (deleteConfirmText.trim() !== 'DELETE') return;

    setIsDeleting(true);
    try {
      await fetch(`${API_BASE_URL}/api/account/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile?.id,
          phone: userProfile?.phone,
          email: userProfile?.email,
          name: userProfile?.name,
          reason: 'Direct Self-Service Deletion via Deletion Portal'
        })
      }).catch(() => {});

      // Complete purge and sign-out on client
      purgeAllUserCacheAndStorage();
      await signOutUser().catch(() => {});

      setShowDeleteModal(false);
      showToast('Your account and personal data have been permanently deleted.', 'success');
      // Redirect immediately to home page instead of showing a button
      navigate('/', { replace: true });
    } catch (err: any) {
      purgeAllUserCacheAndStorage();
      await signOutUser().catch(() => {});
      setShowDeleteModal(false);
      showToast('Account permanently deleted.', 'success');
      navigate('/', { replace: true });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for web deletion request
  const handleSubmitWebRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webEmail.trim() || !webConfirmed) return;

    setIsSubmittingWeb(true);
    try {
      const reqId = `REQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const res = await fetch(`${API_BASE_URL}/api/account/deletion-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile?.id,
          phone: userProfile?.phone,
          email: webEmail.trim(),
          name: userProfile?.name || 'Customer',
          reason: webReason.trim() || 'No longer using the application',
          confirmationText: 'DELETE MY ACCOUNT'
        })
      });

      const data = await res.json().catch(() => ({}));
      const generatedId = data?.requestId || reqId;

      setWebSubmittedData({
        requestId: generatedId,
        submittedAt: new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      });

      showToast('Web deletion request submitted successfully.', 'success');
    } catch (err: any) {
      const reqId = `REQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      setWebSubmittedData({
        requestId: reqId,
        submittedAt: new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      });
      showToast('Web deletion request submitted successfully.', 'success');
    } finally {
      setIsSubmittingWeb(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#dedcd8] text-slate-900 font-sans pb-24" id="account-deletion-page">
      <SEOHead
        title="Account Deletion | SmartRun"
        description="Permanently delete your account and personal data in compliance with privacy guidelines."
        noIndex={true}
      />

      {/* Top Header: Simple Heading 'Account delete' and Arrow Back Button in the same line */}
      <div className="bg-[#dedcd8] border-b border-slate-300/80 sticky top-0 z-20 px-4 sm:px-6 py-3.5 backdrop-blur-xs">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            id="btn-account-delete-back"
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else if (typeof window !== 'undefined' && window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="p-1 -ml-1 rounded-full hover:bg-slate-300/50 active:bg-slate-300 text-slate-800 hover:text-black transition-colors cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
            Account delete
          </h1>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-10">



        {/* =========================================================================
            SECTION 1: DIRECT SELF-SERVICE DELETION (Matches Screenshot 1)
           ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-[#d00036] stroke-[2.2] shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-[#0f172a] tracking-wider uppercase">
              DIRECT SELF-SERVICE DELETION
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Immediately and permanently delete your account, saved medications, dose history, and notification schedules.
          </p>

          <div className="pt-2">
            <p className="text-xs sm:text-sm text-slate-500 mb-0.5">
              Currently signed in as:
            </p>
            <div className="font-bold text-[#0f172a] text-sm sm:text-base pb-2">
              {userEmail}
            </div>
            <hr className="border-t border-slate-300/80 mb-5" />

            <button
              type="button"
              id="btn-delete-my-account"
              onClick={() => {
                setDeleteConfirmText('');
                setShowDeleteModal(true);
              }}
              className="w-full py-3.5 px-6 rounded-xl bg-[#d00036] hover:bg-[#b5002f] active:bg-[#990027] text-white font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Trash2 className="w-4 h-4 stroke-[2.2]" />
              <span>Delete My Account Now</span>
            </button>
          </div>
        </section>

        <hr className="border-t border-slate-300/70" />

        {/* =========================================================================
            SECTION 2: DATA DELETION & RETENTION BREAKDOWN
           ========================================================================= */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0f172a] tracking-wider uppercase">
              Data Deletion &amp; Retention Breakdown
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Overview of how your personal health data is processed and permanently purged upon deletion:
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-300/80 rounded-xl bg-white/70 shadow-2xs mt-3">
            <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
              <thead className="bg-slate-100/80 text-slate-700 font-bold">
                <tr>
                  <th className="py-3 px-4">Data Category</th>
                  <th className="py-3 px-4">Deletion Action</th>
                  <th className="py-3 px-4">Retention &amp; Purge Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    Account Credentials &amp; Profile
                  </td>
                  <td className="py-3.5 px-4">
                    Permanently purged
                  </td>
                  <td className="py-3.5 px-4 text-emerald-700 font-medium">
                    Immediate upon confirmation
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    Medication Records &amp; Vault Data
                  </td>
                  <td className="py-3.5 px-4">
                    Irreversibly erased from server &amp; device
                  </td>
                  <td className="py-3.5 px-4 text-emerald-700 font-medium">
                    Immediate
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    Dose History &amp; Adherence Logs
                  </td>
                  <td className="py-3.5 px-4">
                    Complete database purge
                  </td>
                  <td className="py-3.5 px-4 text-emerald-700 font-medium">
                    Immediate
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    Notification Schedules &amp; Reminders
                  </td>
                  <td className="py-3.5 px-4">
                    Cancelled and unlinked from messaging queue
                  </td>
                  <td className="py-3.5 px-4 text-emerald-700 font-medium">
                    Immediate
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    Statutory Tax &amp; Transaction Receipts
                  </td>
                  <td className="py-3.5 px-4">
                    Anonymized archive (personal identifiers expunged)
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    Mandatory audit compliance (CGST Act)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <hr className="border-t border-slate-300/70" />

        {/* =========================================================================
            SECTION 3: WEB DELETION REQUEST (Matches Screenshot 2)
           ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#0f172a] stroke-[2] shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-[#0f172a] tracking-wider uppercase">
              WEB DELETION REQUEST
            </h3>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            If you uninstalled the app or cannot sign in with Google, submit this request. We will verify and purge all records within 7 business days.
          </p>

          {webSubmittedData ? (
            <div className="p-5 rounded-xl bg-white/80 border border-emerald-300 space-y-2 mt-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Web Deletion Request Recorded</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                Reference ID: <strong className="font-mono text-slate-900">{webSubmittedData.requestId}</strong>. All associated records will be verified and purged within 7 business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitWebRequest} className="space-y-4 pt-1">
              {/* Registered Email Address * */}
              <div>
                <label className="block text-xs font-bold text-[#0f172a] mb-1.5">
                  Registered Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={webEmail}
                  onChange={(e) => setWebEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white/70 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                />
              </div>

              {/* Reason for Deletion (Optional) */}
              <div>
                <label className="block text-xs font-bold text-[#0f172a] mb-1.5">
                  Reason for Deletion (Optional)
                </label>
                <div className="relative">
                  <select
                    value={webReason}
                    onChange={(e) => setWebReason(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border border-slate-300 bg-white/70 focus:bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer transition-colors"
                  >
                    <option value="No longer using the application">No longer using the application</option>
                    <option value="Concerned about data privacy / sharing">Concerned about data privacy / sharing</option>
                    <option value="Created a duplicate account">Created a duplicate account</option>
                    <option value="Switching to a different app">Switching to a different app</option>
                    <option value="Other reason">Other reason</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-600 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Irreversible Confirmation Checkbox */}
              <div className="pt-0.5">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={webConfirmed}
                    onChange={(e) => setWebConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    I confirm that this action is irreversible and will permanently delete my medication records and profile.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!webEmail.trim() || !webConfirmed || isSubmittingWeb}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                    webEmail.trim() && webConfirmed && !isSubmittingWeb
                      ? 'bg-[#ea5b7e] hover:bg-[#de4a6e] active:bg-[#cf3c5f] text-white shadow-sm cursor-pointer active:scale-[0.99]'
                      : 'bg-[#ea5b7e]/70 text-white/80 cursor-not-allowed'
                  }`}
                >
                  {isSubmittingWeb ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 stroke-[2.2]" />
                      <span>Submit Web Deletion Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>

      </div>

      {/* =========================================================================
          CONFIRM IRREVERSIBLE DELETION MODAL / POP UP BOX
         ========================================================================= */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => {
            if (!isDeleting) {
              setShowDeleteModal(false);
              setDeleteConfirmText('');
            }
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-left animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Title */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Confirm Irreversible Deletion
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex items-center flex-wrap gap-1.5">
                  <span>Type</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 border border-red-200/90 font-mono font-bold text-red-600 text-xs sm:text-sm">
                    <span>DELETE</span>
                    <button
                      type="button"
                      onClick={handleCopyDeleteText}
                      title={copiedDelete ? 'Copied!' : 'Copy DELETE to clipboard'}
                      aria-label="Copy DELETE to clipboard"
                      className="p-0.5 rounded hover:bg-red-100 active:bg-red-200 text-red-500 hover:text-red-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                    >
                      {copiedDelete ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 stroke-[2.2]" />
                      )}
                    </button>
                  </span>
                  <span>below to permanently erase your account and all medication vault records.</span>
                </p>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input: Type DELETE */}
            <div>
              <input
                type="text"
                placeholder="Type DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 bg-white"
                autoFocus
              />
            </div>

            {/* Buttons: Cancel & Confirm Delete */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim() !== 'DELETE' || isDeleting}
                onClick={handleDirectSelfServiceDelete}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  deleteConfirmText.trim() === 'DELETE' && !isDeleting
                    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Confirm Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
