import React from 'react';
import {
  Zap,
  ShieldCheck,
  TrendingUp,
  FileText,
  Truck,
  Package,
  Wrench,
  Info,
} from 'lucide-react';

interface WhyChooseSmartRunProps {
  onOpenBulkQuoteModal?: () => void;
}

export const WhyChooseSmartRun: React.FC<WhyChooseSmartRunProps> = ({ onOpenBulkQuoteModal }) => {
  return (
    <section
      id="row-6-trust"
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#FDFBF7] via-[#F8F6F0] to-[#F4F1E8] border border-amber-200/80 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 shadow-xs"
    >
      {/* Decorative Technical & Circuit Background Art */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
        {/* Ambient Radial Highlights */}
        <div className="absolute -top-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 bg-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 sm:w-96 sm:h-96 bg-blue-100/40 rounded-full blur-3xl" />

        {/* SVG Electrical Grid & Technical Blueprint Art */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="trust-grid-pattern-comp" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#0F1B2D" strokeWidth="0.8" />
              <circle cx="24" cy="24" r="1.2" fill="#FF9800" />
              <path d="M 12 24 h 6 M 30 24 h 6 M 24 12 v 6 M 24 30 v 6" stroke="#0F1B2D" strokeWidth="0.6" strokeDasharray="1 3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#trust-grid-pattern-comp)" />
        </svg>

        {/* Corner Industrial Framing Accents */}
        <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400/60 rounded-tl" />
        <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400/60 rounded-tr" />
        <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400/60 rounded-bl" />
        <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400/60 rounded-br" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 space-y-3.5 sm:space-y-5">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-1.5 sm:space-y-2">
          <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2">
            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center justify-center shadow-2xs">
              <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-sf-pro text-[#0F1B2D] tracking-tight">
              Why Choose SmartRun?
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-[#5F6B7A] font-medium leading-relaxed max-w-lg mx-auto">
            <span className="font-bold text-[#0F1B2D]">SmartRun</span> delivers genuine electricals, certified wiring supplies, and construction materials with wholesale transparency across Kolkata.
          </p>
        </div>

        {/* Compact Value Pillar Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {/* Card 1: Genuine Branded Products */}
          <div className="group relative overflow-hidden bg-gradient-to-b from-white/95 via-[#FDFBF7]/85 to-[#F5EEDB]/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-white/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(245,158,11,0.08),0_4px_14px_rgba(15,27,45,0.06)] hover:shadow-[inset_0_2px_6px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(245,158,11,0.14),0_8px_20px_rgba(245,158,11,0.16)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-start space-y-1.5 sm:space-y-2">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/80 via-white/30 to-transparent rounded-t-xl sm:rounded-t-2xl z-1" />
            <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100 text-[#FF9800] border border-amber-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.06)] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="relative z-10 text-xs sm:text-sm font-bold text-[#0F1B2D] group-hover:text-amber-800 transition-colors leading-snug">
              100% Genuine Brands
            </h3>
            <p className="relative z-10 text-[10px] sm:text-xs text-[#5F6B7A] leading-relaxed">
              Authorized distribution channels with valid manufacturer warranty &amp; ISI certifications.
            </p>
          </div>

          {/* Card 2: Transparent Wholesale Pricing */}
          <div className="group relative overflow-hidden bg-gradient-to-b from-white/95 via-[#FDFBF7]/85 to-[#F5EEDB]/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-white/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(245,158,11,0.08),0_4px_14px_rgba(15,27,45,0.06)] hover:shadow-[inset_0_2px_6px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(245,158,11,0.14),0_8px_20px_rgba(245,158,11,0.16)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-start space-y-1.5 sm:space-y-2">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/80 via-white/30 to-transparent rounded-t-xl sm:rounded-t-2xl z-1" />
            <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100 text-[#FF9800] border border-amber-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.06)] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="relative z-10 text-xs sm:text-sm font-bold text-[#0F1B2D] group-hover:text-amber-800 transition-colors leading-snug">
              Wholesale Pricing
            </h3>
            <p className="relative z-10 text-[10px] sm:text-xs text-[#5F6B7A] leading-relaxed">
              Direct factory and distributor pricing with clear quotes and no middleman markups.
            </p>
          </div>

          {/* Card 3: GST Invoices & Business Documentation */}
          <div className="group relative overflow-hidden bg-gradient-to-b from-white/95 via-[#FDFBF7]/85 to-[#F5EEDB]/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-white/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(245,158,11,0.08),0_4px_14px_rgba(15,27,45,0.06)] hover:shadow-[inset_0_2px_6px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(245,158,11,0.14),0_8px_20px_rgba(245,158,11,0.16)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-start space-y-1.5 sm:space-y-2">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/80 via-white/30 to-transparent rounded-t-xl sm:rounded-t-2xl z-1" />
            <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100 text-[#FF9800] border border-amber-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.06)] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="relative z-10 text-xs sm:text-sm font-bold text-[#0F1B2D] group-hover:text-amber-800 transition-colors leading-snug">
              GST Invoices (ITC)
            </h3>
            <p className="relative z-10 text-[10px] sm:text-xs text-[#5F6B7A] leading-relaxed">
              Official computer-generated GST tax invoices to easily claim input tax credit.
            </p>
          </div>

          {/* Card 4: Reliable Greater Kolkata Delivery */}
          <div className="group relative overflow-hidden bg-gradient-to-b from-white/95 via-[#FDFBF7]/85 to-[#F5EEDB]/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-white/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(245,158,11,0.08),0_4px_14px_rgba(15,27,45,0.06)] hover:shadow-[inset_0_2px_6px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(245,158,11,0.14),0_8px_20px_rgba(245,158,11,0.16)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-start space-y-1.5 sm:space-y-2">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/80 via-white/30 to-transparent rounded-t-xl sm:rounded-t-2xl z-1" />
            <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100 text-[#FF9800] border border-amber-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.06)] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="relative z-10 text-xs sm:text-sm font-bold text-[#0F1B2D] group-hover:text-amber-800 transition-colors leading-snug">
              Kolkata Site Delivery
            </h3>
            <p className="relative z-10 text-[10px] sm:text-xs text-[#5F6B7A] leading-relaxed">
              Fast local dispatch and scheduled heavy truck logistics right to your job site.
            </p>
          </div>

          {/* Card 5: Heavy Material Logistics */}
          <div className="group relative overflow-hidden bg-gradient-to-b from-white/95 via-[#FDFBF7]/85 to-[#F5EEDB]/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-white/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(245,158,11,0.08),0_4px_14px_rgba(15,27,45,0.06)] hover:shadow-[inset_0_2px_6px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(245,158,11,0.14),0_8px_20px_rgba(245,158,11,0.16)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-start space-y-1.5 sm:space-y-2">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/80 via-white/30 to-transparent rounded-t-xl sm:rounded-t-2xl z-1" />
            <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100 text-[#FF9800] border border-amber-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.06)] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <h3 className="relative z-10 text-xs sm:text-sm font-bold text-[#0F1B2D] group-hover:text-amber-800 transition-colors leading-snug">
              Bulk &amp; Heavy Orders
            </h3>
            <p className="relative z-10 text-[10px] sm:text-xs text-[#5F6B7A] leading-relaxed">
              Full truckloads of Cement, TMT Rebars, Cables, and Plywood handled seamlessly.
            </p>
          </div>

          {/* Card 6: Technical Support */}
          <div className="group relative overflow-hidden bg-gradient-to-b from-white/95 via-[#FDFBF7]/85 to-[#F5EEDB]/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-white/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(245,158,11,0.08),0_4px_14px_rgba(15,27,45,0.06)] hover:shadow-[inset_0_2px_6px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(245,158,11,0.14),0_8px_20px_rgba(245,158,11,0.16)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-start space-y-1.5 sm:space-y-2">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/80 via-white/30 to-transparent rounded-t-xl sm:rounded-t-2xl z-1" />
            <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100 text-[#FF9800] border border-amber-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.06)] flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <h3 className="relative z-10 text-xs sm:text-sm font-bold text-[#0F1B2D] group-hover:text-amber-800 transition-colors leading-snug">
              Project Estimation
            </h3>
            <p className="relative z-10 text-[10px] sm:text-xs text-[#5F6B7A] leading-relaxed">
              Expert assistance with electrical BOQ sizing, material planning, and quotes.
            </p>
          </div>
        </div>

        {/* Compact Delivery Notice Strip */}
        <div className="relative overflow-hidden rounded-xl border border-white/80 bg-gradient-to-r from-white/95 via-[#FDFBF7]/90 to-amber-50/80 backdrop-blur-md p-2.5 sm:p-3 flex items-center gap-2.5 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.9),0_2px_8px_rgba(245,158,11,0.08)]">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-white/60 to-transparent z-1" />
          <Info className="relative z-10 w-4 h-4 text-[#FF9800] shrink-0" />
          <p className="relative z-10 text-[10px] sm:text-xs text-[#5F6B7A] leading-relaxed">
            <span className="font-semibold text-[#0F1B2D]">SmartRun Express Logistics</span>: Standard deliveries take 1–7 working days with express local dispatch available across Greater Kolkata.
          </p>
        </div>

        {/* Action CTA */}
        <div className="flex items-center justify-center pt-1">
          <button
            onClick={() => {
              if (onOpenBulkQuoteModal) {
                onOpenBulkQuoteModal();
              } else {
                window.open(
                  'https://wa.me/918777400280?text=Hi%20SmartRun,%20I%20would%20like%20to%20request%20a%20project%20wholesale%20quote.',
                  '_blank',
                  'noopener,noreferrer'
                );
              }
            }}
            className="relative overflow-hidden w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-b from-[#FDE047] via-[#FBBF24] to-[#F59E0B] hover:from-[#FEF08A] hover:via-[#FCD34D] hover:to-[#FBBF24] text-slate-950 font-black font-sf-pro text-xs sm:text-sm transition-all duration-200 border border-yellow-100/80 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.85),inset_0_-2px_4px_rgba(180,83,9,0.25),0_4px_14px_rgba(245,158,11,0.32)] cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/60 to-transparent rounded-t-[10px]" />
            <FileText className="w-4 h-4 text-slate-950 relative z-10" />
            <span className="relative z-10">Request a Project Quote</span>
          </button>
        </div>
      </div>
    </section>
  );
};
