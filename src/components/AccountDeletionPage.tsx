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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24" id="account-deletion-page">
      {/* Top App Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-950 text-sm font-semibold transition-colors py-2 px-2 -ml-2 rounded-lg hover:bg-slate-100"
            id="deletion-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldAlert className="w-3.5 h-3.5" />
              Google Play Policy Compliant
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Title Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Request Account &amp; Personal Data Deletion
              </h1>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                In compliance with Google Play Developer Policy and Indian data protection regulations,
                you can submit a formal request to delete your account and personal identifying data.
              </p>
            </div>
          </div>
        </div>

        {/* Existing Pending Request Notice */}
        {existingRequest && !submittedData && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-950">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h3 className="font-bold text-base text-amber-900">
                  Active Deletion Request in Progress
                </h3>
                <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                  A deletion request for this account is currently undergoing the mandatory{' '}
                  <strong>7-day cooling-off verification period</strong>. Administrator confirmation is pending.
                </p>
                <div className="bg-white/80 rounded-xl p-3 text-xs space-y-1 font-mono text-slate-700 border border-amber-200">
                  <div>Request ID: <span className="font-semibold">{existingRequest.requestId}</span></div>
                  <div>Status: <span className="font-semibold text-amber-600 uppercase">{existingRequest.status}</span></div>
                  <div>Scheduled Deletion: <span className="font-semibold">{new Date(existingRequest.scheduledDeletionDate).toDateString()}</span></div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleCancelRequest(existingRequest.requestId)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors"
                  >
                    <XCircle className="w-4 h-4 text-slate-500" />
                    <span>Cancel Deletion &amp; Keep Account Active</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Permanent Deletion Successful State */}
        {isDeletedSuccess ? (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-emerald-200 shadow-sm space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                Account &amp; Personal Data Permanently Deleted
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Your profile, saved addresses, payment methods, and personal identifiers have been completely deleted from Supabase. All device and browser cache memory has been wiped clean.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 max-w-md mx-auto space-y-1 text-left">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Supabase personal data records deleted</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Device cache memory &amp; browser storage purged</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
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
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Return to Storefront
              </button>
            </div>
          </div>
        ) : submittedData ? (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-emerald-200 shadow-sm space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                Account Deletion Request Dispatched
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Your request has been officially recorded and an administrative alert has been sent to our verification team.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                <span className="text-slate-500 text-xs">Reference Tracking ID</span>
                <span className="font-mono font-bold text-slate-900">{submittedData.requestId}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                <span className="text-slate-500 text-xs">Status</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3 h-3" />
                  7-Day Grace Period Active
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                <span className="text-slate-500 text-xs">Scheduled Erasure Date</span>
                <span className="font-semibold text-slate-900">
                  {new Date(submittedData.scheduledDeletionDate).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-start py-1.5">
                <span className="text-slate-500 text-xs">Admin Notification</span>
                <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Alert Dispatched for Review
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Changed your mind?
              </p>
              <p>
                You have a 7-day cooling-off window. If you wish to cancel this request and preserve your saved addresses and purchase history, you can click below or contact support before the scheduled erasure date.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleCancelRequest()}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4 text-slate-500" />
                <span>Cancel Deletion Request</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Condition Rules Accordion/Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="font-bold text-sm text-slate-900">All Orders &amp; Dues Cleared</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You cannot delete an account with in-flight deliveries. Pending orders must be delivered or cancelled, and any COD dues settled.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="font-bold text-sm text-slate-900">7-Day Cooling Period</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Account deletion does not occur instantaneously. It enters a 7-day review queue with an immediate alert to our administrator.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h3 className="font-bold text-sm text-slate-900">Personal Data Erasure</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your name, mobile, email, and addresses are wiped. Tax/statutory GST invoices are retained as required by Indian commercial law.
                </p>
              </div>
            </div>

            {/* Active Orders Warning if Active Orders exist */}
            {activeOrdersCount > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 text-red-950 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-red-900">
                      Deletion Blocked: {activeOrdersCount} Active Order(s) In Progress
                    </h4>
                    <p className="text-xs text-red-800 leading-relaxed">
                      You currently have orders that are being packed, shipped, or out for delivery. In accordance with consumer safety policies, you cannot delete your account until these orders reach you or are cancelled.
                    </p>
                  </div>
                </div>
                <div className="pl-8 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/orders')}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    View Active Orders
                  </button>
                </div>
              </div>
            )}

            {/* Unpaid Products Warning if Unpaid Orders exist */}
            {unpaidOrdersCount > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 text-amber-950 space-y-3">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-amber-900">
                      Deletion Blocked: {unpaidOrdersCount} Unpaid Product(s) / Pending Dues
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      You have orders with pending payments or unsettled dues. In accordance with our financial and transaction policies, all outstanding amounts must be settled or cancelled before your account can be deleted.
                    </p>
                  </div>
                </div>
                <div className="pl-8 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/orders')}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    View Unpaid Orders &amp; Clear Dues
                  </button>
                </div>
              </div>
            )}

            {/* Eligible for Deletion Banner if NO live orders and NO unpaid products */}
            {hasCheckedPrereqs && activeOrdersCount === 0 && unpaidOrdersCount === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 text-emerald-950 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-sm text-emerald-900">
                    Eligible for Deletion: No Active Orders or Unpaid Dues Found
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Your account has 0 active deliveries and 0 unpaid products. You can safely delete your account and wipe all stored user data.
                  </p>
                </div>
              </div>
            )}

            {/* Deletion Form */}
            <form onSubmit={handleSubmitRequest} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                Submit Account Deletion Request
              </h2>

              {/* Account Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@example.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name / Account Holder
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name as registered"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              {/* Reason Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reason for Account Deletion <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Additional Details or Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Help us improve: tell us what we could have done better..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white resize-none"
                />
              </div>

              {/* Mandatory Confirmation Input */}
              <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 space-y-2">
                <label className="block text-xs font-bold text-red-900">
                  Type <span className="font-mono uppercase bg-red-100 px-1.5 py-0.5 rounded text-red-700">DELETE MY ACCOUNT</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-[11px] text-red-700 leading-tight">
                  This safety measure ensures no account is deleted accidentally. Submitting starts the 7-day administrative alert queue.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isChecking || activeOrdersCount > 0 || unpaidOrdersCount > 0 || confirmInput.trim() !== 'DELETE MY ACCOUNT'}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    confirmInput.trim() === 'DELETE MY ACCOUNT' && activeOrdersCount === 0 && unpaidOrdersCount === 0
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                  id="submit-deletion-btn"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Deleting Account &amp; Clearing Data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete Account &amp; Clear All Data</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-500">
                When you click delete with 0 active orders and 0 unpaid dues, your user account and all personal data are immediately wiped from Supabase, and your local cache memory is completely cleared.
              </p>
            </form>
          </>
        )}

        {/* Data Retention & Statutory Disclosure (Required for Google Play Store Policy) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-3 text-xs text-slate-600 leading-relaxed">
          <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            Statutory Data Retention Disclosure
          </h4>
          <p>
            Under Section 36 of the Central Goods and Services Tax (CGST) Act, 2017, and the Companies Act, 2013, businesses registered in India are legally mandated to retain commercial tax records, invoice copies, and payment transaction receipts for a minimum statutory audit period of 72 months (6 years).
          </p>
          <p>
            Upon completion of the 7-day cooling-off verification period and administrator approval, all personal identification records—including your name, mobile phone number, personal delivery addresses, UPI handles, and device notification tokens—are permanently expunged or anonymized from active application databases.
          </p>
        </div>
      </div>
    </div>
  );
};
