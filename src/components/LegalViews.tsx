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
                      SmartRun is an express quick-commerce platform in Kolkata providing 100% genuine electrical goods, building materials, and on-demand certified electrician services with 60-minute doorstep dispatch.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">Q: Are all electrical items genuine and certified?</p>
                    <p className="text-slate-600 text-xs">
                      Yes. Every coil of wire, MCB, and switch sold on SmartRun is 100% authentic, sourced directly from authorized brand distributors, and carries genuine ISI marks and OEM batch numbers.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">Q: How do refunds work if I cancel an order?</p>
                    <p className="text-slate-600 text-xs">
                      When cancelled within the 2-minute cancellation window or if an item is returned under our 7-day policy, 100% of your payment is refunded directly to your original payment method (bank account, UPI, or card) via Razorpay. We do not lock funds into store credits.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">Q: Can I get an official GST tax invoice for business input credit?</p>
                    <p className="text-slate-600 text-xs">
                      Yes. Every order generates an official GST tax invoice with valid HSN codes, SAC codes, and breakdown of CGST/SGST. You can download your invoice PDF directly from the Order History page.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* =========================================================================
              3. SHIPPING POLICY VIEW
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
              4. PRIVACY POLICY VIEW (DPDP Act 2023 & IT Act Compliant)
              ========================================================================= */}
          {type === 'privacy' && (
            <div className="space-y-6" id="privacy-policy-document">
              <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-1.5">
                <p className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Statutory Privacy Policy — SmartRun (https://www.smartrun.in)</span>
                </p>
                <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                  This Privacy Policy is published in strict compliance with Section 43A of the Information Technology Act, 2000, Rule 4 of the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act, 2023)</strong>. SmartRun acts as a <strong>Data Fiduciary</strong> with respect to your personal data.
                </p>
              </div>

              {/* Section 1: Scope & Legal Basis */}
              <section className="space-y-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  1. Scope &amp; Lawful Grounds of Data Processing
                </h3>
                <p>
                  SmartRun (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) processes personal data exclusively under legitimate, recognized lawful bases:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Consent:</strong> Express, affirmative consent provided by you when registering, signing in via Google/Phone OTP, or requesting doorstep technician visits.</li>
                  <li><strong>Contractual Necessity:</strong> Processing required to fulfill purchase contracts, dispatch deliveries to your address, provide real-time rider tracking, and execute payment processing.</li>
                  <li><strong>Legal &amp; Statutory Compliance:</strong> Generating tax invoices under the Central Goods and Services Tax Act, 2017 (CGST Act), preventing financial fraud, and maintaining security audit logs mandated by CERT-In (Indian Computer Emergency Response Team).</li>
                </ul>
              </section>

              {/* Section 2: Information We Collect */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  2. Categories of Information Collected
                </h3>
                <div className="space-y-2.5 pt-1">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">A. Account &amp; Identity Data</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Full name, verified mobile phone number, email address, and profile picture provided through direct entry or federated authentication (Google OAuth / Supabase Auth).
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">B. Physical Delivery &amp; Geolocation Coordinates</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Destination postal addresses, building landmarks, PIN codes, and real-time device GPS coordinates (only upon explicit browser/app permission). Geolocation is utilized solely to compute delivery radius from our Kasba depot, calibrate accurate delivery charges, and guide our delivery partners to your site.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">C. Financial Transaction &amp; Invoicing Data</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Ordered SKUs, total transaction sums, payment modes, GSTIN (if claimed for B2B input credit), and tokenized payment IDs returned by RBI-authorized payment aggregators (Razorpay). <strong>SmartRun never collects or stores credit/debit card numbers, CVVs, net banking credentials, or UPI PINs</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">D. Technical, Device &amp; Security Telemetry</p>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Internet Protocol (IP) addresses, device form factor, operating system version, browser client signature, and access timestamps. These telemetry data points are captured to safeguard user accounts against credential stuffing, detect malicious brute force attacks, and dispatch real-time security alerts upon unfamiliar logins.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3: Google User Data & Limited Use */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  3. Google API Services User Data Policy Compliance
                </h3>
                <div className="p-4 bg-sky-50/80 rounded-xl border border-sky-200/90 space-y-2">
                  <p className="font-bold text-sky-950 text-xs">
                    Limited Use Disclosure:
                  </p>
                  <p className="text-[11px] text-sky-900 leading-relaxed">
                    SmartRun&apos;s use and transfer to any other application of information received from Google APIs adheres strictly to the{' '}
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
                    <li>We do <strong>not</strong> sell, lease, or barter Google user data to data aggregators, advertising brokers, or unauthorized third parties.</li>
                    <li>We do <strong>not</strong> use Google profile information to serve retargeted commercial advertisements.</li>
                    <li>Google authentication tokens are utilized exclusively to verify user identity, link delivery addresses, and grant secure access to order invoices.</li>
                  </ul>
                </div>
              </section>

              {/* Section 4: Data Principal Rights under DPDP Act 2023 */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  4. Your Statutory Rights (DPDP Act, 2023)
                </h3>
                <p>
                  As a Data Principal under Indian law, you possess explicit rights regarding your personal information:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li><strong>Right to Access Summary:</strong> You may request a summary of the personal data held by SmartRun and the processing activities undertaken.</li>
                  <li><strong>Right to Correction &amp; Updating:</strong> You can edit your name, contact phone number, and delivery addresses at any time via the Edit Profile section.</li>
                  <li><strong>Right to Erasure &amp; Account Deletion:</strong> You may initiate permanent account deletion directly through the Account Deletion page (<code>/account-deletion</code>) or by contacting our Grievance Officer.</li>
                  <li><strong>Right of Grievance Redressal:</strong> You have the right to swift resolution of any data privacy concerns by our designated Grievance Officer.</li>
                </ul>
              </section>

              {/* Section 5: Data Retention & Statutory Mandate */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  5. Data Retention &amp; Statutory Accounting Mandates
                </h3>
                <p>
                  Personal data is retained only for as long as necessary to fulfill the purposes outlined herein. However, pursuant to <strong>Section 36 of the Central Goods and Services Tax Act, 2017</strong>, e-commerce tax invoices, customer GST billing details, and accounting records must be retained for a mandatory statutory duration of <strong>72 months (6 years)</strong>. Non-statutory behavioral and session data is purged within 30 days of verified account deletion.
                </p>
              </section>

              {/* Section 6: Security Safeguards */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  6. Technical &amp; Organizational Security Safeguards
                </h3>
                <p>
                  We implement robust enterprise security measures: end-to-end transport layer security (TLS 1.3 / HTTPS), stateless cryptographic HMAC-SHA256 tokens for OTP validation, Row-Level Security (RLS) on cloud databases, DDoS mitigation via Cloudflare reverse proxy networks, and isolated server-side proxying of all third-party API credentials.
                </p>
              </section>

              {/* Section 7: Grievance Officer */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  7. Statutory Grievance Redressal Officer
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                  <p className="font-bold text-slate-900">
                    Designated Grievance Redressal Officer (IT Rules, 2021 &amp; DPDP Act, 2023):
                  </p>
                  <p><strong>Designation:</strong> Head of Grievance Redressal &amp; Regulatory Compliance, SmartRun</p>
                  <p><strong>Official Email:</strong> <a href="mailto:grievance@smartrun.in" className="text-[#00875a] underline font-bold">grievance@smartrun.in</a> (copy to <a href="mailto:team@smartrun.in" className="text-slate-800 underline">team@smartrun.in</a>)</p>
                  <p><strong>Direct Helpline:</strong> +91 87774 00280 / +91 90071 68561</p>
                  <p><strong>Office Address:</strong> SmartRun Kasba Hub, Bediadanga 1st Lane, Nator Park, Kasba, Kolkata, West Bengal 700039, India</p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    *Statutory SLA: Formal grievances will be acknowledged within 24 business hours and resolved within 15 calendar days from the date of receipt.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* =========================================================================
              5. TERMS OF SERVICE VIEW (Statutory Protection, Anti-Framing & Legal Shields)
              ========================================================================= */}
          {type === 'terms' && (
            <div className="space-y-6" id="terms-of-service-document">
              <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-1.5">
                <p className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#00875a]" />
                  <span>Terms of Service — SmartRun (https://www.smartrun.in)</span>
                </p>
                <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                  These Terms of Service constitute an electronic record generated by a computer system and published in accordance with the provisions of Rule 3(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong>. By accessing or using SmartRun, you enter into a legally enforceable agreement.
                </p>
              </div>

              {/* Clause 1: Eligibility & Electronic Contract */}
              <section className="space-y-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  1. Contractual Capacity &amp; Acceptance of Terms
                </h3>
                <p>
                  Under <strong>Section 11 of the Indian Contract Act, 1872</strong>, you represent and warrant that you are at least 18 years of age, of sound mind, and fully legally competent to enter into, execute, and be bound by these Terms of Service. If you are accessing this platform on behalf of a corporation, partnership, or contractor firm, you represent that you possess actual legal authority to bind that entity.
                </p>
              </section>

              {/* Clause 2: Intermediary Status & Safe Harbor */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  2. Intermediary Status &amp; Statutory Safe Harbor (Section 79, IT Act)
                </h3>
                <p>
                  SmartRun operates as an electronic quick-commerce marketplace and technology platform. Under <strong>Section 79 of the Information Technology Act, 2000</strong>, SmartRun functions as an intermediary with respect to third-party manufacturer product claims, independent certified technician service dispatches, and user-generated feedback. SmartRun does not manufacture the electrical switchgear, wires, cement, or steel sold on the platform, and disclaims all liability for claims, warranties, or manufacturing defects originating from respective third-party brand manufacturers.
                </p>
              </section>

              {/* Clause 3: Strict Anti-Framing, Anti-Scraping & Copyright Shield */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 text-rose-900">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  3. Intellectual Property, Copyright &amp; Anti-Framing Shield
                </h3>
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                  <p className="font-bold text-rose-950 text-xs">
                    Statutory Notice under Copyright Act, 1957 &amp; Trade Marks Act, 1999:
                  </p>
                  <p className="text-[11px] text-rose-900 leading-relaxed">
                    All software architecture, source code, visual interfaces, graphics, color combinations, product catalogs, pricing algorithms, trade names, and trademarks associated with &quot;SmartRun&quot; are the exclusive proprietary property of SmartRun (<strong>© 2026 SmartRun. All rights reserved</strong>).
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-950">
                    <li><strong>Strict Prohibition on Framing &amp; Embedding:</strong> You shall <strong>not</strong> frame, mirror, embed, wrap, or display this platform, any portion of its URLs, or its content within any iframe, webview wrapper, phishing page, external website, or portal without explicit prior written authorization from SmartRun.</li>
                    <li><strong>Anti-Scraping &amp; Data Mining Prohibition:</strong> Any scraping, crawling, automated harvesting, bot querying, indexing, or unauthorized extraction of product data, pricing, inventory, or user databases is strictly prohibited and constitutes an offence under <strong>Section 43 and Section 66 of the Information Technology Act, 2000</strong>.</li>
                    <li><strong>Legal Recourse:</strong> Unauthorized framing, brand impersonation, or copyright infringement will result in immediate civil injunctions, statutory damages, and criminal prosecution under <strong>Sections 51 and 63 of the Indian Copyright Act, 1957</strong>.</li>
                  </ul>
                </div>
              </section>

              {/* Clause 4: Protection Against Malicious Framing, False Allegations & Fraud */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  4. Shield Against Malicious Framing, False Claims &amp; Extortion
                </h3>
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <p className="font-bold text-amber-950 text-xs">
                    Zero-Tolerance Policy for Fraud &amp; Defamation:
                  </p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Users agree not to submit fraudulent dispute claims, stage false non-delivery reports, manipulate digital screenshots, forge payment receipts, or make false allegations to extract unearned refunds or damage the reputation of SmartRun, its proprietors, delivery riders, or partner technicians.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-950">
                    <li><strong>Digital Audit Trails as Legal Evidence:</strong> SmartRun maintains tamper-proof electronic audit logs—including client IP addresses, device signatures, encrypted HMAC-SHA256 OTP verification tokens, GPS dispatch coordinates, and rider delivery confirmations. These logs are preserved and admissible as conclusive electronic evidence under <strong>Section 63 of the Bharatiya Sakshya Adhiniyam, 2023</strong> (formerly Section 65B of the Indian Evidence Act, 1872).</li>
                    <li><strong>Criminal Prosecution for False Framing:</strong> Any malicious attempt to frame SmartRun or its personnel through fabricated complaints, extortionate demands, or fraudulent chargebacks will result in immediate account termination, forfeiture of platform balances, and criminal charges under <strong>Sections 318 (Cheating), 336 (Forgery), and 356 (Defamation) of the Bharatiya Nyaya Sanhita, 2023 (BNS)</strong> and <strong>Section 66D of the IT Act, 2000</strong>.</li>
                  </ul>
                </div>
              </section>

              {/* Clause 5: Electrical Products & Site Safety Disclaimer */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  5. Electrical High-Voltage Safety Disclaimer
                </h3>
                <p>
                  Electrical goods (wires, cables, circuit breakers, distribution boards, switchgear, and capacitors) involve inherent risks of electrocution, fire, electrical arc flash, and equipment burnout if incorrectly handled or improperly sized.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Mandatory Certified Installation:</strong> Customers must ensure that all electrical products are installed solely by certified, licensed electricians complying with the <strong>Central Electricity Authority (Measures relating to Safety and Electric Supply) Regulations</strong> and local utility guidelines (CESC / WBSEDCL).</li>
                  <li><strong>Disclaimer of Consequential Site Damage:</strong> SmartRun expressly disclaims all liability for site short circuits, electrical fires, appliance burnouts, power surges, property damage, personal injury, or loss of life resulting from improper installation, overloading, inadequate site earthing, or unauthorized structural modifications.</li>
                </ul>
              </section>

              {/* Clause 6: Independent Contractor Status for Technicians */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00875a]" />
                  6. Independent Contractor Status for Electricians
                </h3>
                <p>
                  Electricians and wiring supervisors accessible via SmartRun operate strictly as <strong>independent professional third-party contractors</strong>, and are not employees, agents, or joint-venture partners of SmartRun. SmartRun provides a technology booking facilitation interface. Customers are advised to supervise site activities, ensure premises power is disconnected at the main isolator prior to maintenance, and inspect work completion before releasing payments. SmartRun is not liable for contractor workmanship disputes, project schedule overruns, or on-site negligence.
                </p>
              </section>

              {/* Clause 7: Manufacturer Warranties */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  7. Manufacturer Warranties &amp; Disclaimer of Implied Warranties
                </h3>
                <p>
                  All branded products (Polycab, Havells, Schneider Electric, Finolex, Legrand, Anchor, UltraTech, Tata Tiscon) carry manufacturer warranties subject to their respective OEM terms. SmartRun sells exclusively genuine, factory-sealed goods. <strong>SmartRun hereby disclaims all implied warranties of merchantability, fitness for a particular purpose, or non-infringement</strong>. Warranty claims for products past the 7-day replacement window must be submitted directly to the authorized service centers of the respective brand manufacturer.
                </p>
              </section>

              {/* Clause 8: Limitation of Cumulative Liability */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  8. Limitation of Cumulative Liability &amp; Waiver of Consequential Damages
                </h3>
                <p>
                  To the maximum extent permissible under applicable Indian law, the total, aggregate, cumulative liability of SmartRun, its founders, directors, employees, riders, and agents arising out of or relating to any order, platform use, or breach of these terms—whether in contract, tort (including negligence), statutory warranty, or otherwise—shall be strictly limited to the <strong>actual amount paid by the customer for the specific order giving rise to the claim, or ₹1,000 INR (Indian Rupees One Thousand), whichever is lower</strong>.
                </p>
                <p className="text-slate-600 text-xs">
                  Under no circumstances shall SmartRun be liable for any indirect, incidental, special, punitive, exemplary, or consequential losses, including but not limited to loss of business profits, commercial downtime, construction delay penalties, or site rental damages.
                </p>
              </section>

              {/* Clause 9: Comprehensive Indemnification */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  9. User Indemnification Obligation
                </h3>
                <p>
                  You agree to defend, indemnify, and hold harmless SmartRun, its affiliates, licensors, directors, officers, delivery partners, and employees against any and all claims, demands, liabilities, damages, fines, penalties, losses, and reasonable legal fees arising out of: (a) your violation of these Terms of Service or any applicable law; (b) your misuse of products ordered; (c) any false, malicious, or fraudulent statements or chargebacks made by you; or (d) infringement by you of any third-party intellectual property or privacy rights.
                </p>
              </section>

              {/* Clause 10: Dispute Resolution & Exclusive Jurisdiction */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                  10. Governing Law, Arbitration &amp; Exclusive Jurisdiction
                </h3>
                <p>
                  These Terms of Service and any contractual or non-contractual disputes shall be governed by, construed, and enforced in accordance with the <strong>laws of the Republic of India</strong>.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Amicable Negotiation:</strong> The parties shall first attempt to resolve any dispute amicably within thirty (30) days of formal written notice to our Grievance Officer.</li>
                  <li><strong>Arbitration:</strong> In the event the dispute cannot be settled amicably, it shall be referred to and conclusively resolved by binding arbitration under the <strong>Arbitration and Conciliation Act, 1996</strong>, by a sole arbitrator mutually appointed, with seat and venue in Kolkata, West Bengal. The language of arbitration shall be English.</li>
                  <li><strong>Exclusive Court Jurisdiction:</strong> Subject to arbitration, the competent civil courts situated exclusively in <strong>Kolkata, West Bengal, India</strong>, shall have sole and exclusive territorial jurisdiction over any legal proceedings arising hereunder.</li>
                </ul>
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
