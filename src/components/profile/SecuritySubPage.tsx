import React from 'react';
import { ChevronLeft, Fingerprint, Smartphone, Mail, ChevronRight } from 'lucide-react';

interface SecuritySubPageProps {
  onBack: () => void;
  onOpenPasskeys: () => void;
  onOpenMobileUpdate: () => void;
  onOpenEmailUpdate: () => void;
}

export const SecuritySubPage: React.FC<SecuritySubPageProps> = ({
  onBack,
  onOpenPasskeys,
  onOpenMobileUpdate,
  onOpenEmailUpdate
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Header: Clean with tailless arrow back button and Security title */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-2.5 shadow-2xs sticky top-0 z-20">
        <button
          onClick={onBack}
          className="p-1 -ml-1 rounded-full hover:bg-slate-100 text-slate-800 hover:text-black transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 leading-none">Security</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {/* 1. Passkey Button */}
          <button
            id="btn-security-passkey"
            onClick={onOpenPasskeys}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Passkey</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* 2. Mobile No. Update Button */}
          <button
            id="btn-security-mobile-update"
            onClick={onOpenMobileUpdate}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Mobile No. Update</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* 3. Email Update Button */}
          <button
            id="btn-security-email-update"
            onClick={onOpenEmailUpdate}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Email Update</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};
