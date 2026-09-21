import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabaseClient';
import { Smartphone, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';

/**
 * Bridge component rendered ONLY when Google OAuth was initiated from the
 * SmartRun Android App and redirected through the browser.
 * It immediately forwards the authentication session back to the SmartRun Android APK
 * using custom URL schemes (smartrun://login#access_token=... / in.smartrun.app://).
 *
 * For standard website users, this component returns null and does NOT interfere.
 */
export const AndroidAppBridgePrompt: React.FC = () => {
  const [appRedirectUrl, setAppRedirectUrl] = useState<string | null>(null);
  const [intentRedirectUrl, setIntentRedirectUrl] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [isAppFlow, setIsAppFlow] = useState(false);

  useEffect(() => {
    // 1. If already inside native app, the deep link listener in App.tsx handles it directly
    if (Capacitor.isNativePlatform()) return;
    if (typeof window === 'undefined' || !window.navigator) return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';

    // 2. STRICT CHECK: Only trigger if the OAuth redirect explicitly contains app markers
    const isExplicitAppTarget =
      search.includes('target=app') ||
      search.includes('source=android_app') ||
      search.includes('app_redirect=true') ||
      hash.includes('target=app');

    // Website users will have client=web or standard params without target=app
    if (!isExplicitAppTarget) {
      // Clean up any stale native oauth marker from previous sessions
      try {
        localStorage.removeItem('smartrun_oauth_target');
        sessionStorage.removeItem('smartrun_oauth_target');
      } catch {}
      return;
    }

    setIsAppFlow(true);

    const hasTokens = hash.includes('access_token') || hash.includes('refresh_token') || search.includes('code=');

    // Build the deep link URL with tokens as query parameters so Android Intent parsing succeeds
    const buildDeepLink = (accessToken?: string, refreshToken?: string) => {
      let queryPayload = '';
      if (accessToken && refreshToken) {
        queryPayload = `?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
      } else if (hash.length > 1) {
        // Convert #key=val to ?key=val so it is valid in Android Intent URI syntax
        queryPayload = '?' + hash.substring(1);
      } else if (search.length > 1) {
        queryPayload = search;
      }

      const direct = `smartrun://login${queryPayload}`;
      const intent = `intent://login${queryPayload}#Intent;scheme=smartrun;package=in.smartrun.app;end;`;
      return { direct, intent };
    };

    // First try immediately if hash has tokens
    if (hasTokens) {
      const { direct, intent } = buildDeepLink();
      setAppRedirectUrl(direct);
      setIntentRedirectUrl(intent);

      // Auto-attempt redirect to SmartRun Android app
      if (!autoTriggered) {
        setAutoTriggered(true);
        const timer = setTimeout(() => {
          try {
            // Try standard scheme first
            window.location.href = direct;
            // Backup intent scheme after short delay if still in browser
            setTimeout(() => {
              try {
                window.location.href = intent;
              } catch {}
            }, 500);
          } catch (e) {
            console.warn('Auto app redirect notice:', e);
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    } else {
      // Check if Supabase already parsed the session into memory
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          const { direct, intent } = buildDeepLink(data.session.access_token, data.session.refresh_token);
          setAppRedirectUrl(direct);
          setIntentRedirectUrl(intent);
          if (!autoTriggered) {
            setAutoTriggered(true);
            const timer = setTimeout(() => {
              try {
                window.location.href = direct;
                setTimeout(() => {
                  try {
                    window.location.href = intent;
                  } catch {}
                }, 500);
              } catch (e) {
                console.warn('Auto app redirect notice:', e);
              }
            }, 400);
            return () => clearTimeout(timer);
          }
        }
      });
    }
  }, [autoTriggered]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.removeItem('smartrun_oauth_target');
      sessionStorage.removeItem('smartrun_oauth_target');
    } catch {}
  };

  const handleOpenApp = () => {
    if (!appRedirectUrl) return;
    try {
      window.location.href = appRedirectUrl;
      setTimeout(() => {
        if (intentRedirectUrl) {
          window.location.href = intentRedirectUrl;
        }
      }, 500);
    } catch {
      if (intentRedirectUrl) {
        window.location.href = intentRedirectUrl;
      }
    }
  };

  if (dismissed || !isAppFlow || !appRedirectUrl) return null;

  return (
    <div
      id="android-app-bridge-prompt"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-300 dark:border-amber-600/40 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
          <Smartphone className="w-8 h-8 animate-bounce" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="w-3.5 h-3.5" />
          Google Account Verified
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
          Returning to SmartRun App
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
          Your Google Sign-In succeeded! We are switching you back to the SmartRun Android App now.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleOpenApp}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-400/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-slate-950" />
            <span>Open SmartRun App</span>
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
            <span>Switching back automatically...</span>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleDismiss}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Stay on website in browser instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

