import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface ServicesSubPageProps {
  onBack: () => void;
}

export const ServicesSubPage = ({ onBack }: ServicesSubPageProps) => {
  return (
    <div className="min-h-screen bg-white text-black pb-20">
      <div className="border-b border-slate-200 px-4 py-3.5 flex items-center gap-2.5">
        <button
          onClick={onBack}
          className="p-1 -ml-1 rounded-full hover:bg-slate-100 text-slate-800 hover:text-black transition-colors cursor-pointer"
          title="Back to Profile"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
      </div>

      <div className="py-24 flex items-center justify-center">
        <h1 className="text-2xl sm:text-3xl font-medium text-black">
          Coming Soon
        </h1>
      </div>
    </div>
  );
};
