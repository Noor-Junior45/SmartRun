import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabaseClient';
import { Smartphone, CheckCircle, ExternalLink, X } from 'lucide-react';

/**
 * Bridge component rendered when Google OAuth redirects back to the web browser on Android.
 * It immediately forwards the authentication session back to the SmartRun Android APK
 * using custom URL schemes (smartrun://login#access_token=... / in.smartrun.app://).
 */
export const AndroidAppBridgePrompt: React.FC = () => {
  const [appRedirectUrl, setAppRedirectUrl] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);

  useEffect(() => {
    // Only run in non-native browser environment
    if (Capacitor.isNativePlatform()) return;
    if (typeof window === 'undefined' || !window.navigator) return;

    const isAndroid = /Android/i.test(window.navigator.userAgent || '');
    if (!isAndroid) return;

    // Check if coming from an app OAuth initiation or OAuth callback with tokens
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const hasTokens = hash.includes('access_token') || hash.includes('refresh_token') || search.includes('code=');
    const wasAppInitiated =
      localStorage.getItem('giriraj_pending_native_oauth') ||
      localStorage.getItem('giriraj_oauth_from_android_app') === 'true' ||
      search.includes('target=app') ||
      search.includes('app_redirect=true');

    if (!hasTokens && !wasAppInitiated) {
      // Also check if user recently signed in with Google within the last 5 minutes
      const pendingTime = Number(localStorage.getItem('giriraj_pending_native_oauth') || '0');
      const isRecent = Date.now() - pendingTime < 5 * 60 * 1000;
      if (!isRecent) return;
    }

    // Build the deep link URL with tokens
    const buildDeepLink = (accessToken?: string, refreshToken?: string) => {
      if (accessToken && refreshToken) {
        return `smartrun://login#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&type=recovery`;
      }
      if (hash.length > 1) {
        return `smartrun://login${hash}`;
      }
      if (search.length > 1) {
        return `smartrun://login${search}`;
      }
      return 'smartrun://login';
    };

    // First try immediately if hash has tokens
    if (hasTokens) {
      const directUrl = buildDeepLink();
      setAppRedirectUrl(directUrl);

      // Auto-attempt redirect to SmartRun Android app
      if (!autoTriggered) {
        setAutoTriggered(true);
        const timer = setTimeout(() => {
          try {
            window.location.href = directUrl;
          } catch (e) {
            console.warn('Auto app redirect notice:', e);
          }
        }, 400);
        return () => clearTimeout(timer);
      }
    } else {
      // Check if Supabase already parsed the session
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          const deepUrl = buildDeepLink(data.session.access_token, data.session.refresh_token);
          setAppRedirectUrl(deepUrl);
          if (!autoTriggered) {
            setAutoTriggered(true);
            const timer = setTimeout(() => {
              try {
                window.location.href = deepUrl;
              } catch (e) {
                console.warn('Auto app redirect notice:', e);
              }
            }, 500);
            return () => clearTimeout(timer);
          }
        }
      });
    }
  }, [autoTriggered]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.removeItem('giriraj_pending_native_oauth');
      localStorage.removeItem('giriraj_oauth_from_android_app');
    } catch {}
  };

  const handleOpenApp = () => {
    if (!appRedirectUrl) return;
    window.location.href = appRedirectUrl;
  };

  if (dismissed || !appRedirectUrl) return null;

  return (
    <div
      id="android-app-bridge-prompt"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-300 dark:border-amber-600/40 text-center">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          title="Dismiss"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
          <Smartphone className="w-7 h-7 animate-bounce" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="w-3.5 h-3.5" />
          Google Sign-In Complete
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
          Return to SmartRun App
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
          You are signed in! Tap the button below to switch back to your installed Android app.
        </p>

        <div className="space-y-2.5">
          <button
            onClick={handleOpenApp}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4 text-slate-950" />
            Open SmartRun App
          </button>

          <a
            href={appRedirectUrl}
            className="inline-flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline py-1"
          >
            <span>Direct App Scheme Link</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleDismiss}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Continue using website in browser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
