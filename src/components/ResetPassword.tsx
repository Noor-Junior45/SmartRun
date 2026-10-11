import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { saveUserProfile } from '../services/supabaseService';
import { SEOHead } from './SEOHead';

interface ResetPasswordProps {
  onSuccess?: () => void;
  onOpenAuth?: () => void;
}

export const ResetPassword = ({ onSuccess, onOpenAuth }: ResetPasswordProps) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Session verification states
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check existing session on mount (and parse any tokens/code in URL if present)
    const checkInitialSession = async () => {
      try {
        // If arrived with hash fragments or search code directly
        if (typeof window !== 'undefined') {
          const hash = window.location.hash;
          const search = window.location.search;

          if (hash && hash.includes('access_token')) {
            const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              }).catch(() => {});
            }
          } else if (search && search.includes('code=')) {
            const searchParams = new URLSearchParams(search);
            const authCode = searchParams.get('code');
            if (authCode) {
              await supabase.auth.exchangeCodeForSession(authCode).catch(() => {});
            }
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          setIsValidSession(true);
          setIsCheckingSession(false);
        }
      } catch (err) {
        console.error('Error checking recovery session:', err);
      }
    };

    checkInitialSession();

    // Listen for auth state changes, especially PASSWORD_RECOVERY event
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY' || (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED'))) {
        setIsValidSession(true);
        setIsCheckingSession(false);
      }
    });

    // Timeout: if no valid recovery session is verified within 5 seconds, mark as invalid
    const timer = setTimeout(() => {
      if (isMounted && isCheckingSession) {
        setIsCheckingSession(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      authListener.subscription.unsubscribe();
    };
  }, [isCheckingSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update password. Please try again.');
      } else {
        setIsSuccess(true);
        if (data.user) {
          saveUserProfile({
            email: data.user.email,
            name: data.user.user_metadata?.full_name || 'SmartRun Customer',
          });
        }
        if (onSuccess) {
          onSuccess();
        }
        setTimeout(() => {
          navigate('/');
        }, 2500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <SEOHead
        title="Reset Password | SmartRun"
        description="Securely reset your password for your SmartRun customer account."
        noIndex={true}
      />
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-200 relative overflow-hidden">
        
        {/* Top Decorative Header Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />

        {/* Checking session state */}
        {isCheckingSession ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Verifying Reset Link...
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Checking your security token with SmartRun...
            </p>
          </div>
        ) : !isValidSession ? (
          /* Invalid / Expired Session State */
          <div className="space-y-5 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Invalid or Expired Link
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleOpenLogin}
                className="w-full py-3 px-4 rounded-xl font-black text-xs bg-amber-400 hover:bg-yellow-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4" />
                <span>Request New Reset Link in Login</span>
              </button>

              <Link
                to="/"
                className="inline-block w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Return to Store
              </Link>
            </div>
          </div>
        ) : isSuccess ? (
          /* Success Feedback */
          <div className="space-y-4 text-center py-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <p className="text-base font-bold">Password Updated Successfully!</p>
              <p className="text-xs text-emerald-700 font-normal">
                Your password has been changed. Redirecting you to the home page...
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
            >
              <span>Go to Home</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Valid Session: Password Reset Form */
          <div>
            {/* Icon & Heading */}
            <div className="flex items-center gap-3 mb-6 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-extrabold shrink-0 shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  Reset Password
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Create a new secure password for your account
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Feedback */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold animate-in fade-in">
                  {error}
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="flex rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 transition-all bg-white">
                  <span className="px-3.5 py-2.5 bg-slate-50 border-r border-slate-200 text-slate-500 flex items-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none placeholder:text-slate-400"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="flex rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 transition-all bg-white">
                  <span className="px-3.5 py-2.5 bg-slate-50 border-r border-slate-200 text-slate-500 flex items-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none placeholder:text-slate-400"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="px-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-black text-sm bg-amber-400 hover:bg-yellow-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/"
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Return to Store
                </Link>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
