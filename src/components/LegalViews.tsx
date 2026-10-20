import React from 'react';
import { RefundPolicy } from './RefundPolicy';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';
import { TermsOfServicePage } from './TermsOfServicePage';
import { FAQPage } from './FAQPage';
import {
  ChevronLeft,
  ShieldCheck,
  FileText,
  Lock,
  Mail,
  Phone,
  MapPin,
  RotateCcw,
  Truck,
  HelpCircle,
  Building2,
  CheckCircle2,
  Globe,
  ExternalLink,
  Scale,
  AlertTriangle,
  Zap,
  Users
} from 'lucide-react';
import { SEOHead } from './SEOHead';

export type LegalPageType = 'privacy' | 'terms' | 'refund' | 'shipping' | 'about' | 'faqs';

interface LegalViewProps {
  onBack: () => void;
  type: LegalPageType;
}

export const LegalView = ({ onBack, type }: LegalViewProps) => {
  const effectiveDate = 'October 11, 2026';

  // Always reset scroll to top when legal view opens or changes type
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [type]);

  const getPageMeta = () => {
    switch (type) {
      case 'about':
        return {
          title: 'About Us',
          subtitle: 'Kolkata’s Premier Express Electricals & Quick Commerce Building Supplies Depot',
          icon: Building2,
          badge: 'Company Profile'
        };
      case 'faqs':
        return {
          title: 'Frequently Asked Questions (FAQ)',
          subtitle: 'Quick answers about ordering, 60-min delivery, bulk contractor pricing & GST tax invoices',
          icon: HelpCircle,
          badge: 'Help Center'
        };
      case 'refund':
        return {
          title: 'Refund & Cancellation Policy',
          subtitle: 'Hassle-free 7-day replacements, instant direct-to-source refunds and transparent SLAs',
          icon: RotateCcw,
          badge: 'Customer Protection'
        };
      case 'shipping':
        return {
          title: 'Shipping & Delivery Policy',
          subtitle: '60-Minute rapid bike dispatch and calibrated heavy freight site delivery across Kolkata',
          icon: Truck,
          badge: 'Logistics Policy'
        };
      case 'privacy':
        return {
          title: 'Privacy Policy',
          subtitle: 'DPDP Act 2023 & IT Act Compliant — How SmartRun protects, encrypts, and handles your data',
          icon: Lock,
          badge: 'Legal & Compliance'
        };
      case 'terms':
      default:
        return {
          title: 'Terms of Service',
          subtitle: 'Statutory rules, copyright protections, anti-framing policies, and conditions of use',
          icon: Scale,
          badge: 'Legal & Compliance'
        };
    }
  };

  if (type === 'refund') {
    return <RefundPolicy onBack={onBack} />;
  }

  if (type === 'faqs') {
    return <FAQPage onBack={onBack} />;
  }

  if (type === 'privacy') {
    return <PrivacyPolicyPage onBack={onBack} />;
  }

  if (type === 'terms') {
    return <TermsOfServicePage onBack={onBack} />;
  }

  const meta = getPageMeta();
  const IconComponent = meta.icon;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      <SEOHead
        title={`${meta.title} | SmartRun`}
        description={meta.subtitle}
      />
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-2xs sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Back"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
          <div className="flex items-center gap-2">
            <IconComponent className="w-5 h-5 text-[#00875a]" />
            <h1 className="text-base sm:text-lg font-black text-slate-900">
              {meta.title}
            </h1>
          </div>
        </div>

        {meta.badge ? (
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full whitespace-nowrap">
            {meta.badge}
          </span>
        ) : null}
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#00875a] text-white rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <IconComponent className="w-6 h-6 text-white" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black">
                {meta.title}
              </h2>
              <p className="text-xs text-emerald-100">
                SmartRun Quick Commerce (https://www.smartrun.in) • Last Updated: {effectiveDate}
              </p>
            </div>
          </div>
          <p className="text-xs text-white/90 leading-relaxed mt-2">
            {meta.subtitle}
          </p>
        </div>

        {/* Dynamic Content */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-8 text-xs text-slate-700 leading-relaxed">
          
          {/* =========================================================================
              1. ABOUT US VIEW
              ========================================================================= */}
          {type === 'about' && (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  Who We Are
                </h3>
                <p>
                  <strong>SmartRun</strong> (operating at <em>https://www.smartrun.in</em>) is Kolkata’s premier express electrical supplies platform, quick-commerce building materials hub, and verified on-demand electrician contractor service platform. Operating from our central Kasba warehouse depot, we supply retail homeowners, licensed contractors, real estate developers, architects, and electrical engineers with 100% genuine factory-certified materials with express 60-minute delivery.
                </p>
              </section>

              <section className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  What We Provide
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-sm">⚡ Electrical Wires, Cables &amp; Switchgear</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      100% genuine ISI/BIS certified wires &amp; cables from Polycab, Havells, RR Kabel, Finolex, Schneider Electric MCBs/RCBOs, and Legrand modular switches.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-sm">🏗️ High-Grade Construction Raw Materials</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Fresh UltraTech Cement, ACC Suraksha, Tata Tiscon 550D TMT rebars, Dr. Fixit waterproofing solutions, and heavy-duty CPVC/UPVC plumbing fittings.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-sm">👨‍🔧 Verified On-Demand Electricians</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Instant booking of verified, certified electricians for diagnostics, short-circuit troubleshooting, switchboard installations, and full home wiring consultations.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-sm">🚀 60-Minute Rapid Express Dispatch</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Dedicated delivery fleet stationed at our Kasba hub ensuring urgent maintenance materials reach your site within 60 minutes across Kolkata.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* =========================================================================
              2. SHIPPING POLICY VIEW
              ========================================================================= */}
          {type === 'shipping' && (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  1. Delivery Timelines &amp; Dispatch Modes
                </h3>
                <p>
                  SmartRun operates a multi-modal logistics network centered around our Kasba Warehouse Hub in Kolkata:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li><strong>60-Minute Express Bike Dispatch:</strong> Applicable to standard electrical items (wires, switches, lighting, circuit breakers, tools) weighing up to 20 kg. Dispatched immediately via delivery partners.</li>
                  <li><strong>Same-Day / Scheduled Site Truck Freight:</strong> Applicable to heavy bulk materials (cement bags, sand, TMT steel rebars, plumbing pipes). Dispatched in heavy commercial vehicles adhering to municipal Kolkata traffic movement windows.</li>
                  <li><strong>Site Accessibility Requirement:</strong> Customers must ensure vehicular access to the unloading point. For multi-storey buildings without freight elevators, delivery is completed at the ground floor unloading zone.</li>
                </ul>
              </section>

              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  2. Calibrated Shipping &amp; Surcharge Structure
                </h3>
                <p>
                  Delivery fees are calculated transparently prior to checkout based on radial distance from Kasba depot, total volumetric weight, and statutory weather or peak surcharges. Orders qualifying for promotional thresholds receive free express delivery.
                </p>
              </section>
            </div>
          )}



          {/* =========================================================================
              CONTACT & COMPANY DETAILS (Physical Address & Support)
              ========================================================================= */}
          <div className="pt-6 border-t border-slate-200/80 bg-slate-50/80 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Official Entity &amp; Support Contact
              </h4>
              <span className="text-[11px] text-[#00875a] font-bold">
                https://www.smartrun.in
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
              {/* Address */}
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#00875a] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Store &amp; Central Depot</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                    SmartRun, Bediadanga 1st Lane, Nator Park, Kasba, Kolkata, West Bengal 700039, India
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Support &amp; WhatsApp</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                    <a href="https://wa.me/918777400280" className="text-emerald-700 hover:underline font-medium" target="_blank" rel="noreferrer">
                      +91 87774 00280
                    </a><br />
                    <a href="tel:+919007168561" className="text-slate-700 hover:underline">
                      +91 90071 68561
                    </a>
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Official Email Desk</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                    <a href="mailto:team@smartrun.in" className="text-blue-700 hover:underline font-medium">
                      team@smartrun.in
                    </a><br />
                    <a href="mailto:grievance@smartrun.in" className="text-slate-600 hover:underline">
                      grievance@smartrun.in
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
