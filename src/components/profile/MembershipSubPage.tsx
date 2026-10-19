import React from 'react';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';

interface MembershipSubPageProps {
  totalSavings: number;
  onBack: () => void;
}

export const MembershipSubPage = ({
  totalSavings,
  onBack
}: MembershipSubPageProps) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-2.5 shadow-2xs">
        <button
          onClick={onBack}
          className="p-1 -ml-1 rounded-full hover:bg-slate-100 text-slate-800 hover:text-black transition-colors cursor-pointer"
          title="Back to Profile"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
        <h1 className="text-lg font-black text-slate-900 leading-none">Giriraj Power Pro Membership</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 text-slate-950 rounded-3xl p-6 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-wider bg-slate-950 text-yellow-300 px-2.5 py-0.5 rounded-full">
              Active Member
            </span>
          </div>
          <h2 className="text-2xl font-black">₹{totalSavings} Saved This Year</h2>
          <p className="text-xs font-bold text-slate-900/80 mt-1">
            Unlimited free 60-min express deliveries &amp; 5% instant cashback.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">Your Pro Benefits</h3>
          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Zero delivery fees on all electrical material orders above ₹299</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Direct priority dispatch from Giriraj Power Kasba central distribution hub</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Instant refund to Giriraj Wallet on returns with 0 questions asked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
