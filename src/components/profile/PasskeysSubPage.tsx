import React, { useState, useEffect } from 'react';
import { ChevronLeft, Fingerprint, KeyRound, Plus, Trash2, CheckCircle2, AlertCircle, Loader2, Laptop, Smartphone } from 'lucide-react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { UserProfile } from '../../types';
import { apiUrl } from '../../lib/apiBase';
import { supabase } from '../../lib/supabaseClient';

interface PasskeyItem {
  id: string;
  deviceName?: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface PasskeysSubPageProps {
  userProfile: UserProfile | null;
  onBack: () => void;
}

export const PasskeysSubPage: React.FC<PasskeysSubPageProps> = ({ userProfile, onBack }) => {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const userId = userProfile?.id || '';

  // Check WebAuthn support
  useEffect(() => {
    try {
      const supported = browserSupportsWebAuthn();
      setIsSupported(supported);
    } catch {
      setIsSupported(false);
    }
  }, []);

  // Fetch registered passkeys for this user (both server-side and Supabase Auth)
  const loadPasskeys = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      let combined: PasskeyItem[] = [];

      // 1. Fetch from server passkey store
      try {
        const res = await fetch(apiUrl(`/api/auth/passkey/list?userId=${encodeURIComponent(userId)}`));
        const data = await res.json().catch(() => null);
        if (data && data.success && Array.isArray(data.credentials)) {
          combined = [...data.credentials];
        }
      } catch (err) {
        console.debug('[Server Passkeys] Load error:', err);
      }

      // 2. Fetch from Supabase native passkey API if enrolled
      try {
        if ((supabase.auth as any)?.passkey?.list) {
          const { data: sbPasskeys } = await (supabase.auth as any).passkey.list();
          if (sbPasskeys && Array.isArray(sbPasskeys)) {
            const existingIds = new Set(combined.map((c) => c.id));
            sbPasskeys.forEach((pk: any) => {
              if (!existingIds.has(pk.id)) {
                combined.push({
                  id: pk.id,
                  deviceName: pk.friendly_name || pk.nickname || 'Supabase Passkey',
                  createdAt: pk.created_at || new Date().toISOString(),
                  lastUsedAt: pk.last_used_at
                });
              }
            });
          }
        }
      } catch (sbErr) {
        console.debug('[Supabase Passkeys] List notice:', sbErr);
      }

      setPasskeys(combined);
    } catch (e) {
      console.debug('[Passkeys] Load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPasskeys();
  }, [userId]);

  // Create a new passkey on this device
  const handleCreatePasskey = async () => {
    if (!userId) {
      setMessage({ type: 'error', text: 'You must be signed in to set up a passkey.' });
      return;
    }
    setMessage(null);
    setIsRegistering(true);

    try {
      // 1. Get registration options from server
      const optRes = await fetch(apiUrl('/api/auth/passkey/register-options'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: userProfile?.email || undefined,
          phone: userProfile?.phone || undefined,
          fullName: userProfile?.name || 'Customer'
        })
      });

      const optData = await optRes.json().catch(() => null);
      if (!optData || !optData.success || !optData.options) {
        throw new Error(optData?.error || 'Failed to start passkey setup.');
      }

      // 2. Trigger native device biometric prompt (Touch ID, Windows Hello, Face ID, etc.)
      const regResp = await startRegistration({
        optionsJSON: optData.options
      });

      // 3. Determine device label
      let deviceLabel = 'This Device';
      if (typeof navigator !== 'undefined') {
        const ua = navigator.userAgent;
        if (/Android/i.test(ua)) deviceLabel = 'Android Phone / Tablet';
        else if (/iPhone|iPad/i.test(ua)) deviceLabel = 'Apple Device (Face ID / Touch ID)';
        else if (/Macintosh|Mac OS/i.test(ua)) deviceLabel = 'MacBook (Touch ID)';
        else if (/Windows/i.test(ua)) deviceLabel = 'Windows PC (Windows Hello)';
        else deviceLabel = 'Browser Passkey';
      }

      // 4. Verify on server
      const verifyRes = await fetch(apiUrl('/api/auth/passkey/register-verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          response: regResp,
          challengeToken: optData.challengeToken,
          deviceName: deviceLabel,
          email: userProfile?.email || undefined,
          phone: userProfile?.phone || undefined,
          fullName: userProfile?.name || 'Customer'
        })
      });

      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyData || !verifyData.success) {
        throw new Error(verifyData?.error || 'Failed to save passkey on server.');
      }

      setMessage({
        type: 'success',
        text: 'Passkey saved! Next time you sign in, your browser will automatically offer this Passkey.'
      });
      loadPasskeys();
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setMessage({ type: 'error', text: 'Passkey setup was cancelled or timed out.' });
      } else {
        setMessage({ type: 'error', text: err?.message || 'Could not register passkey on this device.' });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Delete a passkey
  const handleDeletePasskey = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this passkey?')) return;
    try {
      try {
        if ((supabase.auth as any)?.passkey?.delete) {
          await (supabase.auth as any).passkey.delete({ id });
        }
      } catch (sbErr) {
        console.debug('[Supabase Passkey Delete notice]:', sbErr);
      }

      const res = await fetch(apiUrl(`/api/auth/passkey/${encodeURIComponent(id)}`), {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        setPasskeys((prev) => prev.filter((p) => p.id !== id));
        setMessage({ type: 'success', text: 'Passkey removed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete passkey.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Sticky Header: only Passkey Heading and tailless arrow back button */}
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
          Passkey
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Feedback Alert if any */}
        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{message.text}</span>
          </div>
        )}

        {/* Browser Support Notice if unsupported */}
        {!isSupported && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Your current browser does not support WebAuthn Passkeys. Please try Chrome, Edge, or Safari.</span>
          </div>
        )}

        {/* Registered passkeys section with Plus sign button (no text on button) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-600" />
              <span>Registered passkeys ({passkeys.length})</span>
            </h2>

            {/* Plus sign button to add passkey (don't add text) */}
            <button
              type="button"
              id="btn-add-passkey"
              onClick={handleCreatePasskey}
              disabled={isRegistering || !isSupported}
              title="Add passkey"
              aria-label="Add passkey"
              className="w-8 h-8 rounded-full bg-slate-900 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0 shadow-xs"
            >
              {isRegistering ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
              )}
            </button>
          </div>

          {passkeys.length === 0 ? (
            <div className="p-6 text-center space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Fingerprint className="w-5 h-5" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">No passkeys created yet</p>
              <p className="text-[11px] text-slate-400">
                Tap the + button above to add a passkey on this device.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {passkeys.map((pk) => {
                const isMobile = pk.deviceName?.toLowerCase().includes('android') || pk.deviceName?.toLowerCase().includes('iphone');
                return (
                  <div key={pk.id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                        {isMobile ? <Smartphone className="w-4.5 h-4.5" /> : <Laptop className="w-4.5 h-4.5" />}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900">{pk.deviceName || 'Saved Passkey'}</p>
                        <p className="text-[11px] text-slate-500">
                          Added: {new Date(pk.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePasskey(pk.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove passkey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* How Passkey work? Section */}
        <div className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200/70 text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-900 text-xs sm:text-sm">How Passkey work?</p>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-600 leading-relaxed text-[11px] sm:text-xs">
            <li>When you sign in, selecting your email or username automatically displays your saved passkey in the autofill bar.</li>
            <li>Use your fingerprint, Face ID, or device screen lock to sign in instantly without typing passwords or waiting for SMS OTPs.</li>
            <li>Passkeys are protected by your device&apos;s biometric security chip and safely synced across devices via Google Password Manager, Apple iCloud, or Windows Hello.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
