import React from 'react';
import { RefundPolicy } from './RefundPolicy';
import {
  ArrowLeft,
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
  ExternalLink
} from 'lucide-react';

export type LegalPageType = 'privacy' | 'terms' | 'refund' | 'shipping' | 'about' | 'faqs';

interface LegalViewProps {
  onBack: () => void;
  type: LegalPageType;
}

export const LegalView = ({ onBack, type }: LegalViewProps) => {
  const effectiveDate = 'August 28, 2026';

  // Always reset scroll to top when legal view opens or changes type
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [type]);

  const getPageMeta = () => {
    switch (type) {
      case 'about':
        return {
          title: 'About Us',
          subtitle: 'Kolkata’s Premier Industrial Electrical & Building Material Hub',
          icon: Building2,
          badge: 'Company Profile'
        };
      case 'faqs':
        return {
          title: 'Frequently Asked Questions (FAQ)',
          subtitle: 'Quick answers about ordering, 60-min delivery, bulk discounts & GST invoices',
          icon: HelpCircle,
          badge: 'Help Center'
        };
      case 'refund':
        return {
          title: 'Refund & Cancellation Policy',
          subtitle: 'Hassle-free 7-day replacements, instant wallet credits and bank refunds',
          icon: RotateCcw,
          badge: 'Customer Protection'
        };
      case 'shipping':
        return {
          title: 'Shipping & Delivery Policy',
          subtitle: '60-Minute express dispatch and heavy material site truck delivery across Kolkata',
          icon: Truck,
          badge: 'Logistics Policy'
        };
      case 'privacy':
        return {
          title: 'Privacy Policy',
          subtitle: 'How SmartRun protects, secures, and handles your account and order information',
          icon: Lock,
          badge: ''
        };
      case 'terms':
      default:
        return {
          title: 'Terms of Service',
          subtitle: 'Rules and conditions governing our marketplace, materials, and services',
          icon: FileText,
          badge: ''
        };
    }
  };

  if (type === 'refund') {
    return <RefundPolicy onBack={onBack} />;
  }

  const meta = getPageMeta();
  const IconComponent = meta.icon;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-2xs sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <IconComponent className="w-5 h-5 text-[#00875a]" />
            <h1 className="text-base sm:text-lg font-black text-slate-900">
              {meta.title}
            </h1>
          </div>
        </div>

        {meta.badge ? (
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
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
                SmartRun (https://smartrun.in • https://www.girirajpower.in) • Effective Date: {effectiveDate}
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
                  <strong>SmartRun</strong> (operating at <em>https://smartrun.in</em> and <em>https://www.girirajpower.in</em>) is Kolkata’s premier electrical goods depot, e-commerce marketplace, and licensed electrical contractor service platform. Headquartered at our central Kasba depot, we supply retail homeowners, commercial builders, architects, and electrical engineers with 100% genuine factory-certified materials.
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
                      Authorized distribution of Polycab, Havells, RR Kabel, Finolex, Schneider Electric MCBs, and Legrand modular switches.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-sm">🏗️ Heavy Construction Supplies</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      UltraTech Cement, ACC Suraksha, Tata Tiscon 550D TMT steel rebars, Dr. Fixit waterproofing, and heavy PVC/CPVC plumbing pipes.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-sm">👨‍🔧 Licensed Electrician Visits</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      On-demand booking of WBSEDCL/CESC certified electricians for diagnostics, short-circuit repairs, switchboard fitting, and building wiring.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-sm">🚀 60-Minute Express Dispatch</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Rapid dispatch fleets delivering emergency electrical supplies across Kolkata within 60 minutes.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* =========================================================================
              2. FAQ VIEW
              ========================================================================= */}
          {type === 'faqs' && (
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  Frequently Asked Questions
                </h3>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">Q: What is SmartRun?</p>
                    <p className="text-slate-600 text-xs">
                      SmartRun is an e-commerce platform and wholesale distributor in Kolkata offering genuine electrical goods, construction materials, and certified electrician wiring services.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">Q: Why should I sign in with Google?</p>
                    <p className="text-slate-600 text-xs">
                      Signing in with Google provides single-click, passwordless authentication to securely save multiple delivery addresses, track live orders, view technician bookings, and download GST tax invoices.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">Q: How does the 7-day return policy work?</p>
                    <p className="text-slate-600 text-xs">
                      Eligible items can be returned within 7 days of delivery provided they are unused, uninstalled, in original factory packaging, and accompanied by the original invoice.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">Q: How are delivery charges calculated?</p>
                    <p className="text-slate-600 text-xs">
                      Delivery fees are dynamically calculated based on the item type, total weight/volume, and the distance between our Kasba depot and your site address.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* =========================================================================
              4. SHIPPING POLICY VIEW
              ========================================================================= */}
          {type === 'shipping' && (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  1. Delivery Timelines &amp; Distance Factors
                </h3>
                <p>
                  Our quick-dispatch fleets endeavor to fulfill orders promptly. Shipping and delivery timelines may vary based on:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li><strong>Warehouse Distance:</strong> Radial distance between our central Kasba warehouse depot and your destination address across Greater Kolkata.</li>
                  <li><strong>Site Accessibility:</strong> Availability of truck access to narrow residential lanes or high-rise building service lifts.</li>
                  <li><strong>Heavy Load Movement Windows:</strong> Municipal Kolkata truck traffic regulations.</li>
                </ul>
              </section>

              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  2. Dynamic Shipping Fees
                </h3>
                <p>
                  Shipping charges are calculated based on the item category, aggregate weight, and delivery distance from our depot. Small parcels of electrical accessories qualify for standard nominal rates, while bulk truckloads of cement and steel rebars use calibrated freight tiers.
                </p>
              </section>
            </div>
          )}

          {/* =========================================================================
              5. PRIVACY POLICY VIEW (Google OAuth & Regulatory Compliant)
              ========================================================================= */}
          {type === 'privacy' && (
            <div className="space-y-6" id="privacy-policy-document">
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/90 space-y-1">
                <p className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Privacy Policy for SmartRun (https://smartrun.in &amp; https://www.girirajpower.in)</span>
                </p>
                <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                  This Privacy Policy explains how <strong>SmartRun</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, protects, and discloses personal information when you use our website, web application, and related services at <strong>https://smartrun.in</strong> (and <strong>https://www.girirajpower.in</strong>).
                </p>
              </div>

              {/* Section 1: Application Purpose */}
              <section className="space-y-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  1. Purpose of the Application
                </h3>
                <p>
                  SmartRun is an e-commerce platform and service marketplace dedicated to providing:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Wholesale and retail ordering of certified electrical cables, modular switches, lighting fixtures, and construction raw materials.</li>
                  <li>On-demand booking of verified, certified electrician technicians for residential and commercial electrical wiring and maintenance in Kolkata.</li>
                  <li>Customer account management, location-based delivery fee calculations, live order tracking, and GST tax invoice generation.</li>
                </ul>
              </section>

              {/* Section 2: Information We Collect */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  2. Information We Collect
                </h3>
                <p>
                  We collect information to provide, maintain, and improve our services:
                </p>
                <div className="space-y-2.5 pt-1">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">A. Personal Identification &amp; Contact Data</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      When you register an account, place an order, or request a service, we may collect your full name, email address, and mobile phone number.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">B. Delivery Address &amp; Location Information</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      To fulfill orders and dispatch technicians, we collect shipping addresses, building names, PIN codes, and device GPS coordinates (with your explicit permission) to calculate delivery distances and provide accurate transit times.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">C. Google OAuth / Sign-In Data</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      When you choose to sign in with Google via Supabase Authentication, Google shares basic profile information with your consent: your Google User ID, Name, Email Address, and Profile Picture. We use this data exclusively to authenticate your identity, create your user profile, display your name on invoices, and keep your session secure.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">D. Transaction &amp; Payment Data</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      We record ordered product SKUs, total amounts, GST identification numbers (if provided for business claims), and payment status. All online payments are securely processed through encrypted, RBI-authorized third-party payment gateways. SmartRun does not store your credit card numbers, CVV, or banking PINs.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3: Google API Limited Use Disclosure */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  3. Google API Services User Data Policy &amp; Limited Use
                </h3>
                <div className="p-4 bg-sky-50/80 rounded-xl border border-sky-200/90 space-y-2">
                  <p className="font-bold text-sky-950 text-xs">
                    Limited Use Disclosure:
                  </p>
                  <p className="text-[11px] text-sky-900 leading-relaxed">
                    SmartRun&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
                    <a
                      href="https://developers.google.com/terms/api-services-user-data-policy"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-700 underline font-semibold"
                    >
                      Google API Services User Data Policy
                    </a>
                    , including the Limited Use requirements.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-sky-900">
                    <li>We do not sell, rent, or trade Google user data to any third party, broker, or advertising platform.</li>
                    <li>We do not use Google user data for serving personalized third-party advertisements or building marketing profiles.</li>
                    <li>We only use Google authentication data to securely identify the user, manage saved delivery addresses, and present order histories.</li>
                  </ul>
                </div>
              </section>

              {/* Section 4: How We Use Your Information */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  4. How We Use Your Information
                </h3>
                <p>
                  We utilize collected information strictly for legitimate business purposes:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li>Processing, packaging, and dispatching electrical goods and construction supplies to your job site or home.</li>
                  <li>Assigning verified electrician technicians for on-site wiring, repair, or inspection visits.</li>
                  <li>Sending automated order confirmations, dispatch tracking links, and GST tax invoice receipts via email/SMS.</li>
                  <li>Preventing fraud, verifying authentic accounts, and enforcing our terms of service.</li>
                </ul>
              </section>

              {/* Section 5: Data Retention & Account Deletion */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  5. Data Retention &amp; User Account Deletion Rights
                </h3>
                <p>
                  We retain personal data only as long as necessary to maintain your account and fulfill legal tax and accounting requirements in India.
                </p>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <p className="font-bold text-slate-900 text-xs">Requesting Account &amp; Data Deletion:</p>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    You have the right to request the permanent deletion of your account and associated personal data at any time. To request deletion, send an email to <a href="mailto:team@girirajpower.in" className="text-[#00875a] underline font-medium">team@girirajpower.in</a> with the subject line <em>&quot;Account Deletion Request&quot;</em> from your registered email address. All non-statutory data will be deleted within 30 days of verification.
                  </p>
                </div>
              </section>

              {/* Section 6: Data Security Safeguards */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  6. Security Safeguards
                </h3>
                <p>
                  We employ industry-standard encryption protocols (HTTPS / TLS 1.3), secure cloud database storage with row-level security (RLS), and strict role-based access controls to protect your data from unauthorized access, alteration, or disclosure.
                </p>
              </section>

              {/* Section 7: Cookies & Local Storage */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  7. Cookies &amp; Local Storage
                </h3>
                <p>
                  We use browser local storage and essential session cookies to remember your shopping cart items, keep you logged in across sessions, and preserve your selected delivery area. We do not use intrusive cross-site tracking cookies.
                </p>
              </section>
            </div>
          )}

          {/* =========================================================================
              6. TERMS OF SERVICE VIEW
              ========================================================================= */}
          {type === 'terms' && (
            <div className="space-y-6" id="terms-of-service-document">
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/90 space-y-1">
                <p className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#00875a]" />
                  <span>Terms of Service for SmartRun (https://smartrun.in &amp; https://www.girirajpower.in)</span>
                </p>
                <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                  These Terms of Service govern your access to and use of the SmartRun e-commerce platform, website, and electrical technician services located at <strong>https://smartrun.in</strong> and <strong>https://www.girirajpower.in</strong>.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  1. Acceptance of Agreement
                </h3>
                <p>
                  By creating an account, signing in with Google, browsing our catalog, or placing orders on SmartRun, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service, our Privacy Policy, and our Refund Policy.
                </p>
              </section>

              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  2. Product Authenticity &amp; Pricing
                </h3>
                <p>
                  All electrical products (wires, cables, MCBs, switchboards, lighting) and construction supplies (cement, TMT steel rebars, waterproofing materials) sold on SmartRun are 100% genuine and sourced directly from certified manufacturing plants. Prices displayed are inclusive of applicable GST unless explicitly stated otherwise for wholesale bulk contractor quotes.
                </p>
              </section>

              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  3. Delivery &amp; Shipping Charges
                </h3>
                <p>
                  Delivery timelines and fees depend on the specific product, aggregate weight, and transit distance from our Kasba depot to your location. Heavy materials such as cement and TMT steel require accessible unloading points at the delivery site.
                </p>
              </section>

              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  4. Returns &amp; Cancellation
                </h3>
                <p>
                  Eligible products may be returned or replaced within 7 days of delivery if they are intact, uninstalled, undamaged, and in original manufacturer packaging. Custom-cut wires, opened sealants, and pre-mixed building materials are non-refundable.
                </p>
              </section>

              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  5. Licensed Electrician Services
                </h3>
                <p>
                  Electrician technician bookings connect customers with certified electrical contractors. While SmartRun verifies contractor certifications, customers are advised to verify site safety requirements and oversee final testing upon installation.
                </p>
              </section>

              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  6. Governing Law &amp; Jurisdiction
                </h3>
                <p>
                  These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes arising in connection with these terms shall be subject to the exclusive jurisdiction of the competent courts in Kolkata, West Bengal.
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
                https://smartrun.in • https://www.girirajpower.in
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
                    <a href="mailto:team@girirajpower.in" className="text-blue-700 hover:underline font-medium">
                      team@girirajpower.in
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
