import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  X,
  Share,
  PlusSquare,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { useBottomSheetDismiss } from '../hooks/useBottomSheetDismiss';
import { launchSmartRunApp } from '../utils/appLauncher';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstalledSuccess?: () => void;
}

export const InstallAppModal = ({
  isOpen,
  onClose,
  onInstalledSuccess
}: InstallAppModalProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);

    // Detect if already installed (standalone mode)
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(isRunningStandalone);

    // Listen for beforeinstallprompt event (Chrome, Android, Edge, Desktop)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as unknown as { _girirajInstallPrompt?: BeforeInstallPromptEvent })._girirajInstallPrompt = e;
    };

    // Check if global prompt already exists
    if ((window as unknown as { _girirajInstallPrompt?: BeforeInstallPromptEvent })._girirajInstallPrompt) {
      setDeferredPrompt((window as unknown as { _girirajInstallPrompt?: BeforeInstallPromptEvent })._girirajInstallPrompt);
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstallSuccess(true);
      onInstalledSuccess?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstalledSuccess]);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as unknown as { _girirajInstallPrompt?: BeforeInstallPromptEvent })._girirajInstallPrompt;

    if (promptEvent) {
      setIsInstalling(true);
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setInstallSuccess(true);
          setDeferredPrompt(null);
          onInstalledSuccess?.();
        }
      } catch (err) {
        console.error('Installation error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      // For iOS, modal shows explicit instructions
    } else {
      // Fallback: trigger browser install instructions or notify
      setIsInstalling(true);
      setTimeout(() => {
        setIsInstalling(false);
      }, 1000);
    }
  };

  // Drag down to dismiss gesture on mobile
  const {
    handleTouchStart: handleSheetTouchStart,
    handleTouchMove: handleSheetTouchMove,
    handleTouchEnd: handleSheetTouchEnd,
    dragStyle
  } = useBottomSheetDismiss({
    onClose,
    disabled: !isOpen
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        style={dragStyle}
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative animate-in zoom-in-95 duration-200"
      >
        {/* Mobile Swipe Handle */}
        <div
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          className="w-full flex flex-col items-center justify-center pt-2.5 pb-1 sm:hidden cursor-grab active:cursor-grabbing touch-none select-none bg-slate-900"
        >
          <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
        </div>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Hero */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative mx-auto w-20 h-20 mb-3 rounded-2xl bg-white p-2.5 shadow-xl flex items-center justify-center border-2 border-amber-400/30">
            <img
              src="/smartrun.jpeg"
              alt="SmartRun App"
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute -bottom-1.5 -right-1.5 bg-amber-400 text-slate-950 p-1 rounded-full shadow-md">
              <Download className="w-3.5 h-3.5" />
            </div>
          </div>

          <h3 className="text-xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            <span>Download SmartRun App</span>
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Install on your phone or desktop for instant 1-tap orders, fast loading, and offline catalog access.
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">

          {/* Success state */}
          {installSuccess || isStandalone ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">App Ready on Your Device!</h4>
              <p className="text-xs text-slate-600">
                SmartRun is installed. You can now launch it directly from your Home Screen or Apps menu anytime.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100/80 flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Instant Launch</p>
                    <p className="text-[11px] text-slate-500">Opens in 1-tap without browser bars</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100/80 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Zero Storage Lag</p>
                    <p className="text-[11px] text-slate-500">Lightweight &lt; 2MB size, 100% free</p>
                  </div>
                </div>
              </div>

              {/* iOS Instructions */}
              {isIOS ? (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-slate-700" />
                    <span>How to Install on iPhone / iPad (Safari):</span>
                  </p>
                  <ol className="text-xs text-slate-600 space-y-2 pl-1">
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                      <span>Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline text-blue-500 mx-0.5" /> at the bottom of Safari.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                      <span>Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 mx-0.5" />.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                      <span>Tap <strong>Add</strong> in the top-right corner to finish.</span>
                    </li>
                  </ol>
                </div>
              ) : (
                /* Android / Chrome / Desktop One-Click Install */
                <div className="space-y-3">
                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstalling ? 'Opening Installer...' : 'Install Web App Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      launchSmartRunApp();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                    <span>Already have the app? Open SmartRun</span>
                  </button>

                  <p className="text-[11px] text-center text-slate-500">
                    Package: in.smartrun.app • Deep link: smartrun://
                  </p>
                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
};
