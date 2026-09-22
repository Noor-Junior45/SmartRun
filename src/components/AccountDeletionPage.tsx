import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  FileText,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Calendar,
  UserCheck,
  RefreshCw,
  XCircle,
  HelpCircle,
  Phone,
  Mail,
  CreditCard,
  ShoppingBag
} from 'lucide-react';
import { UserProfile, Order } from '../types';
import { API_BASE_URL } from '../lib/apiBase';
import { showToast } from '../utils/toast';
import { purgeAllUserCacheAndStorage, signOutUser } from '../services/supabaseService';

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

  // Form inputs
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [name, setName] = useState(userProfile?.name || '');
  const [reason, setReason] = useState('I no longer need electrical goods delivery');
  const [feedback, setFeedback] = useState('');
  const [confirmInput, setConfirmInput] = useState('');

  // Checks & state
  const [isChecking, setIsChecking] = useState(false);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [unpaidOrdersCount, setUnpaidOrdersCount] = useState(0);
  const [hasCheckedPrereqs, setHasCheckedPrereqs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any | null>(null);

  // Success state after permanent deletion
  const [isDeletedSuccess, setIsDeletedSuccess] = useState(false);

  // Success state after submission
  const [submittedData, setSubmittedData] = useState<{
    requestId: string;
    scheduledDeletionDate: string;
  } | null>(null);

  // Sync profile if available
  useEffect(() => {
    if (userProfile) {
      if (userProfile.phone) setPhone(userProfile.phone);
      if (userProfile.email) setEmail(userProfile.email);
      if (userProfile.name) setName(userProfile.name);
    }
  }, [userProfile]);

  // Check prerequisites on mount or when phone/userId changes
  const checkPrerequisites = async (targetPhone?: string, targetUserId?: string) => {
    const p = (targetPhone || phone || '').trim();
    const u = targetUserId || userProfile?.id;
    if (!p && !u) return;

    setIsChecking(true);
    try {
      // 1. Check client-side orders if passed
      if (orders && orders.length > 0) {
        const activeClientOrders = orders.filter((o) => {
          const s = String(o.status || '').toLowerCase();
          return s !== 'delivered' && s !== 'cancelled' && s !== 'failed';
        });
        setActiveOrdersCount(activeClientOrders.length);

        const unpaidClientOrders = orders.filter((o) => {
          const pStatus = String(o.paymentStatus || '').toLowerCase();
          const s = String(o.status || '').toLowerCase();
          return (pStatus === 'unpaid' || pStatus === 'pending') && s !== 'cancelled' && s !== 'failed';
        });
        setUnpaidOrdersCount(unpaidClientOrders.length);
      }

      // 2. Check server-side DB for comprehensive orders & pending requests
      const params = new URLSearchParams();
      if (u) params.append('userId', u);
      if (p) params.append('phone', p);
      if (email) params.append('email', email);

      const res = await fetch(`${API_BASE_URL}/api/account/deletion-check?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveOrdersCount(data.activeOrdersCount || 0);
          setUnpaidOrdersCount(data.unpaidOrdersCount || 0);
          if (data.existingRequest) {
            setExistingRequest(data.existingRequest);
          }
        }
      }
    } catch (err) {
      console.warn('Check prerequisites notice:', err);
    } finally {
      setIsChecking(false);
      setHasCheckedPrereqs(true);
    }
  };

  useEffect(() => {
    if (userProfile?.id || phone) {
      checkPrerequisites(phone, userProfile?.id);
    }
  }, [phone, userProfile?.id]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (confirmInput.trim() !== 'DELETE MY ACCOUNT') {
      showToast('Please type "DELETE MY ACCOUNT" exactly to proceed.', 'error');
      return;
    }

    if (activeOrdersCount > 0) {
      showToast(`You have ${activeOrdersCount} live order(s) in progress. Please wait until they are delivered or cancel them first.`, 'error');
      return;
    }

    if (unpaidOrdersCount > 0) {
      showToast(`You have ${unpaidOrdersCount} unpaid product(s) or pending dues. Please clear payments before deleting your account.`, 'error');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone && !email && !userProfile?.id) {
      showToast('Please enter your registered mobile number or email.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Permanently delete account and all associated user records from Supabase
      const res = await fetch(`${API_BASE_URL}/api/account/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile?.id || null,
          phone: cleanPhone || phone,
          email: email.trim(),
          name: name.trim() || 'Customer',
          reason,
          feedback: feedback.trim(),
          confirmationText: confirmInput.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // 2. Wipes all cache memory and storage from user device
        await purgeAllUserCacheAndStorage();
        await signOutUser();

        setIsDeletedSuccess(true);
        showToast('Your account and personal data have been permanently deleted from Supabase.', 'success');
      } else {
        showToast(data.message || 'Failed to delete account.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error deleting account.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (reqId?: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/account/deletion-request/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: reqId || submittedData?.requestId || existingRequest?.requestId,
          phone,
          email,
          userId: userProfile?.id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmittedData(null);
        setExistingRequest(null);
        setConfirmInput('');
        showToast('Account deletion request has been cancelled. Your account remains active.', 'success');
      } else {
        showToast(data.message || 'Failed to cancel request.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error cancelling request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-20" id="account-deletion-page">
      {/* Top Header: Simple Heading 'Account delete' and Arrow Back Button in the same line with White Background */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            id="btn-account-delete-back"
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/profile');
              }
            }}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
            Account delete
          </h1>
        </div>
      </div>

      {/* Main Content Area - Clean Article Layout without unnecessary background boxes */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        
        {/* Existing Pending Request Notice (Highlighted Section) */}
        {existingRequest && !submittedData && (
          <div className="p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-amber-900">
                    Active Deletion Request in Progress
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold whitespace-nowrap shrink-0">
                    Under Review
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                  A deletion request for this account is currently undergoing the mandatory{' '}
                  <strong>7-day cooling-off verification period</strong>. Administrator confirmation is pending.
                </p>
                <div className="bg-white/80 rounded-lg p-3 text-xs space-y-1 font-mono text-slate-700 border border-amber-200">
                  <div>Request ID: <span className="font-semibold">{existingRequest.requestId}</span></div>
                  <div>Status: <span className="font-semibold text-amber-600 uppercase">{existingRequest.status}</span></div>
                  <div>Scheduled Deletion: <span className="font-semibold">{new Date(existingRequest.scheduledDeletionDate).toDateString()}</span></div>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleCancelRequest(existingRequest.requestId)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-slate-500" />
                    <span>Cancel Deletion &amp; Keep Account Active</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Permanent Deletion Successful State (Highlighted Section) */}
        {isDeletedSuccess ? (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-emerald-200 space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Account &amp; Personal Data Permanently Deleted
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Your profile, saved addresses, payment methods, and personal identifiers have been completely deleted from Supabase. All device and browser cache memory has been wiped clean.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 max-w-md mx-auto space-y-2 text-left">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Supabase personal data records deleted</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Device cache memory &amp; browser storage purged</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Active session successfully logged out</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  navigate('/');
                  window.location.reload();
                }}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                Return to Storefront
              </button>
            </div>
          </div>
        ) : submittedData ? (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-emerald-200 space-y-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Account Deletion Request Dispatched
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
                Your request has been officially recorded and an administrative alert has been sent to our verification team.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 text-xs">Reference Tracking ID</span>
                <span className="font-mono font-bold text-slate-900">{submittedData.requestId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 text-xs">Status</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  7-Day Grace Period Active
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 text-xs">Scheduled Erasure Date</span>
                <span className="font-semibold text-slate-900">
                  {new Date(submittedData.scheduledDeletionDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 text-xs">Admin Notification</span>
                <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Alert Dispatched for Review
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleCancelRequest()}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-slate-500" />
                <span>Cancel Deletion Request</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-xs whitespace-nowrap cursor-pointer"
              >
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Article 1: Account & Personal Data Deletion Policy */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  1. Account &amp; Personal Data Deletion
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold whitespace-nowrap shrink-0">
                  Play Store Compliant
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                In compliance with Google Play Developer Policy and Indian data protection regulations, you can permanently delete your account, authentication tokens, and personal identifying data from SmartRun.
              </p>
            </section>

            {/* Article 2: Prerequisites & Rules */}
            <section className="space-y-3 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  2. Prerequisites &amp; Verification Rules
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold whitespace-nowrap shrink-0">
                  Safety Checks
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                To prevent fraud or in-transit delivery abandonment, the following safety criteria must be satisfied before account erasure:
              </p>

              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-2 shrink-0" />
                  <div>
                    <strong className="text-slate-900">All Orders &amp; Deliveries Completed:</strong> Accounts with in-flight shipments cannot be deleted. Any pending deliveries must either be received or cancelled.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-2 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Outstanding Balances Settled:</strong> All pending payments or unpaid Cash-on-Delivery dues must be cleared.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-2 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Permanent Personal Data Erasure:</strong> Your name, phone, email, addresses, and auth tokens are wiped. Local cache memory on your device is purged.
                  </div>
                </div>
              </div>

              {/* Active Orders Warning Box (Highlighted if active orders exist) */}
              {activeOrdersCount > 0 && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2.5 text-red-950 mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-red-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      Deletion Blocked: {activeOrdersCount} Active Order(s) In Progress
                    </h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[11px] font-bold whitespace-nowrap shrink-0">
                      Action Required
                    </span>
                  </div>
                  <p className="text-xs text-red-800 leading-relaxed">
                    You currently have orders that are being packed or out for delivery. Please wait until they are delivered or cancel them first.
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate('/orders')}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                    >
                      View Active Orders
                    </button>
                  </div>
                </div>
              )}

              {/* Unpaid Products Warning Box (Highlighted if unpaid orders exist) */}
              {unpaidOrdersCount > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5 text-amber-950 mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                      Deletion Blocked: {unpaidOrdersCount} Unpaid Product(s) / Pending Dues
                    </h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold whitespace-nowrap shrink-0">
                      Settlement Required
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    You have orders with pending payments or unsettled dues. All outstanding amounts must be settled or cancelled first.
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate('/orders')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                    >
                      View Unpaid Orders &amp; Clear Dues
                    </button>
                  </div>
                </div>
              )}

              {/* Eligible Banner (Highlighted Section when verified clean) */}
              {hasCheckedPrereqs && activeOrdersCount === 0 && unpaidOrdersCount === 0 && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold whitespace-nowrap">
                      Eligible for Deletion
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[11px] font-bold whitespace-nowrap">
                      0 Active Deliveries
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-normal">
                    Your account has 0 active deliveries and 0 unpaid products. You can safely proceed with account deletion below.
                  </p>
                </div>
              )}
            </section>

            {/* Article 3: Deletion Form (Highlighted Interactive Container) */}
            <section className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  3. Submit Deletion Request
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold whitespace-nowrap shrink-0">
                  Permanent Action
                </span>
              </div>

              <form onSubmit={handleSubmitRequest} className="p-4 sm:p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                {/* Account Identification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Email (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. name@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name / Account Holder
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your registered name"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Reason Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Deletion <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="I no longer need electrical goods delivery">I no longer need electrical goods delivery</option>
                    <option value="Concerned about data privacy / sharing">Concerned about data privacy / sharing</option>
                    <option value="Created a duplicate account">Created a duplicate account</option>
                    <option value="Dissatisfied with products or delivery speed">Dissatisfied with products or delivery speed</option>
                    <option value="Switching to a different supplier">Switching to a different supplier</option>
                    <option value="Other reason">Other reason</option>
                  </select>
                </div>

                {/* Feedback */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Additional Feedback (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us what we could have done better..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                  />
                </div>

                {/* Mandatory Confirmation Input */}
                <div className="p-3.5 rounded-lg bg-rose-50/70 border border-rose-200 space-y-1.5">
                  <label className="block text-xs font-bold text-rose-900">
                    Type <span className="font-mono uppercase bg-rose-100 px-1 py-0.5 rounded text-rose-700">DELETE MY ACCOUNT</span> to confirm:
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-md text-xs sm:text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="text-[11px] text-rose-700 leading-tight">
                    This safety check ensures your account cannot be deleted by accident.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || isChecking || activeOrdersCount > 0 || unpaidOrdersCount > 0 || confirmInput.trim() !== 'DELETE MY ACCOUNT'}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                      confirmInput.trim() === 'DELETE MY ACCOUNT' && activeOrdersCount === 0 && unpaidOrdersCount === 0
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    id="submit-deletion-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="whitespace-nowrap">Deleting Account &amp; Clearing Data...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span className="whitespace-nowrap">Permanently Delete Account &amp; Clear All Data</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-center text-[11px] text-slate-500">
                  When confirmed, your user account and personal identifiers are immediately removed from Supabase and local cache memory is purged.
                </p>
              </form>
            </section>
          </>
        )}

        {/* Article 4: Statutory Data Retention Disclosure (Google Play Store Policy) */}
        <section className="pt-6 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span>4. Statutory Data Retention Disclosure</span>
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold whitespace-nowrap shrink-0">
              Audit Compliance
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Under Section 36 of the Central Goods and Services Tax (CGST) Act, 2017, and the Companies Act, 2013, businesses registered in India are legally mandated to retain commercial tax records, invoice copies, and payment transaction receipts for a minimum statutory audit period of 72 months (6 years).
          </p>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            All personal identification records—including your name, mobile phone number, personal delivery addresses, UPI handles, and device notification tokens—are permanently expunged or anonymized from active application databases.
          </p>
        </section>

      </div>
    </div>
  );
};
