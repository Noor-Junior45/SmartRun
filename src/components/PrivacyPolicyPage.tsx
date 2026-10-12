import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  FileText,
  MapPin,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  AlertCircle,
  Database,
  Building2,
  Trash2,
  ExternalLink,
  CreditCard,
  Truck,
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { SEOHead } from './SEOHead';

export interface PrivacyPolicyPageProps {
  onBack?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const tableOfContents = [
    { id: 'privacy-sec-1', no: '1', title: 'Introduction & Who We Are', desc: 'About SmartRun, our Kolkata central hub, and commitment to privacy' },
    { id: 'privacy-sec-2', no: '2', title: 'How Our Service Works', desc: 'Central Kasba warehouse dispatch, 60-min express deliveries, and order flow' },
    { id: 'privacy-sec-3', no: '3', title: 'Information We Collect from You', desc: 'Phone numbers, delivery addresses, order history, and device details' },
    { id: 'privacy-sec-4', no: '4', title: 'How We Manage & Protect Your Data', desc: 'Strict encryption, bank-grade cloud security, and zero data selling' },
    { id: 'privacy-sec-5', no: '5', title: 'Payment Security & RBI Guidelines', desc: 'Razorpay UPI & card processing with zero card numbers or PIN storage' },
    { id: 'privacy-sec-6', no: '6', title: 'Live Location & GPS During Delivery', desc: 'How delivery addresses and rider tracking coordinates are handled' },
    { id: 'privacy-sec-7', no: '7', title: 'Government Policies & DPDP Act 2023', desc: 'Compliance with DPDP Act 2023, IT Act 2000, and Consumer Protection Rules' },
    { id: 'privacy-sec-8', no: '8', title: 'Data Retention & Tax Audit Mandates', desc: '72-month CGST tax invoice rules versus session data purging' },
    { id: 'privacy-sec-9', no: '9', title: 'Your Rights & Account Deletion', desc: 'How to view, edit, or permanently erase your data and account' },
    { id: 'privacy-sec-10', no: '10', title: 'Cookies, Storage & Push Alerts', desc: 'Local session storage, push alerts, and communication settings' },
    { id: 'privacy-sec-11', no: '11', title: 'Doorstep Electrician Privacy & Safety', desc: 'Technician contact sharing and customer address protection' },
    { id: 'privacy-sec-12', no: '12', title: 'Contact Us & Grievance Redressal', desc: 'Phone, WhatsApp, email, Kasba warehouse depot, and officer SLA' }
  ];

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-[#2C261E] pb-24 font-sans">
      <SEOHead
        title="Privacy Policy | SmartRun Kolkata"
        description="SmartRun Privacy Policy: Learn how we protect your personal data, manage orders from our Kasba warehouse, comply with DPDP Act 2023, and safeguard your rights."
        keywords="smartrun privacy policy, data protection, dpdp act 2023, account deletion, kolkata electrical app"
      />

      {/* Top Sticky Header: Simple Heading 'Privacy policy' and Back Button in the same line */}
      <div className="bg-[#F9F6F0] border-b border-[#E6DEC8] sticky top-0 z-20 px-4 sm:px-6 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            id="btn-privacy-policy-back"
            type="button"
            onClick={handleBack}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-[#EFE9DC] active:bg-[#E5DEC7] text-[#2C261E] transition-colors cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-[#2C261E] tracking-tight whitespace-nowrap">
            Privacy policy
          </h1>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Intro & Statutory Compliance Box */}
        <section className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3">
          <div className="flex items-center gap-2 text-emerald-800">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Official Data Protection &amp; Privacy Statement
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#2C261E]">
            Your Trust and Privacy Matter to Us
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            This Privacy Policy explains how <strong>SmartRun</strong> (website: <a href="https://www.smartrun.in" className="text-amber-800 font-semibold underline">www.smartrun.in</a>, mobile app: <em>SmartRun</em>, package ID: <code>in.smartrun.app</code>) collects, uses, handles, and protects your personal information. We operate in strict compliance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act, 2023)</strong>, Section 43A of the <strong>Information Technology Act, 2000</strong>, the <strong>IT (Reasonable Security Practices) Rules, 2011</strong>, and the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong>.
          </p>
          <p className="text-xs sm:text-sm text-[#7C7469]">
            Last Updated &amp; Effective Date: October 12, 2026 | Operating Hub: Kasba, Kolkata, West Bengal
          </p>
        </section>

        {/* Content Table Box - Mobile Optimized Card List */}
        <section className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-4">
          <div className="border-b border-[#E6DEC8] pb-2.5">
            <h2 className="text-base sm:text-lg font-bold text-[#2C261E]">
              Content table
            </h2>
            <p className="text-xs sm:text-sm text-[#7C7469] mt-0.5">
              Tap any section below to jump directly to its details.
            </p>
          </div>

          <div className="space-y-2">
            {tableOfContents.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#FBF9F4] hover:bg-[#F3EDE0] border border-[#EFE9DC] transition-colors group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-[#EAE2D0] text-[#2C261E] font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#2C261E] group-hover:text-white transition-colors">
                  {item.no}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-semibold text-[#2C261E] group-hover:text-amber-900 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs sm:text-sm text-[#6B6254] mt-0.5 line-clamp-2">
                    {item.desc}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Section 1: Introduction & Who We Are */}
        <section id="privacy-sec-1" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            1. Introduction &amp; Who We Are
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            SmartRun is an express quick-commerce electrical and building supplies platform serving greater Kolkata. We supply 100% original, brand-certified electrical products—including Polycab and Havells copper wires, Schneider and Anchor modular switches, Philips LED panels, Finolex conduits, UltraTech cement, and Tata Tiscon steel—along with verified doorstep electrical technician bookings.
          </p>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            When you use our website or Android application, SmartRun acts as the <strong>Data Fiduciary</strong> (as defined under the Digital Personal Data Protection Act, 2023). This means we determine the specific purposes and methods of processing your personal information, and we are legally responsible for ensuring its absolute confidentiality, integrity, and safety.
          </p>
        </section>

        {/* Section 2: How Our Service Works */}
        <section id="privacy-sec-2" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            2. How Our Service Works (Kasba Hub Operations)
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            Knowing how SmartRun operates helps you understand why specific personal information is needed to fulfill your orders:
          </p>
          <div className="space-y-3 pt-1">
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">A. Central Kasba Depot Dispatch</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                All electrical products, wires, switches, tools, and lights are stored, barcoded, and quality-checked at our physical depot in Kasba, Kolkata. We do not drop-ship from unknown sellers.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">B. 60-Minute Express Bike Courier</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                Once an electrical order is confirmed, our warehouse team packs it in tamper-evident sealed packaging. Our dedicated delivery partner picks it up from Kasba and rides directly to your delivery address within 60 minutes across Kolkata serviceable pincodes.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">C. Commercial Site Freight</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                Heavy construction supplies (cement bags, sand, TMT steel bars) are scheduled in commercial freight vehicles and unloaded at the construction site ground floor according to municipal traffic hours.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">D. Verified Doorstep Technicians</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                We connect customers with certified master electricians for home wiring, DB dress-up, and electrical repairs. Technicians receive only the necessary address and contact details required for the scheduled visit.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Information We Collect */}
        <section id="privacy-sec-3" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            3. Information We Collect from You
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            We collect only the minimum information necessary to provide prompt, reliable service:
          </p>

          <div className="space-y-3 pt-1">
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">A. Account &amp; Identity Information</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                Your 10-digit mobile phone number (authenticated via SMS OTP), full name, and optional email address. If you choose to log in with Google, we receive your basic name, verified email, and profile avatar for one-click access.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">B. Delivery Addresses &amp; Landmarks</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                Apartment/house number, building name, street, nearby landmark, 6-digit Kolkata pincode, and recipient contact number so our delivery rider can locate your doorstep quickly without delay.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">C. Order Records &amp; Tax Billing</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                Purchased materials (wire sizes, color spools, switches, cement grades), order dates, payment mode (UPI, Cash on Delivery, or Cards), total bill amount, and generated GST tax invoice PDFs.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">D. Technical &amp; Device Data</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                IP address, device model, operating system, and Firebase Cloud Messaging (FCM) notification token to deliver live order status updates (e.g. order packed, out for delivery).
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: How We Manage & Protect Your Data */}
        <section id="privacy-sec-4" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            4. How We Manage &amp; Protect Your Data
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            We enforce strict technical and organizational safeguards to ensure your data is never misused:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4A4235] leading-relaxed">
            <li>
              <strong>Zero Data Selling:</strong> SmartRun does <strong>not</strong> sell, rent, trade, or monetize your phone number, email, or order history to third-party marketing companies, advertisers, or lead brokers.
            </li>
            <li>
              <strong>Modern Transport Encryption:</strong> All communications between the SmartRun mobile app and our backend servers are secured using TLS 1.3 / HTTPS 256-bit encryption.
            </li>
            <li>
              <strong>Cloud Row-Level Security (RLS):</strong> Our cloud database enforces strict user-level isolation. You can only query and view your own orders, addresses, and account details.
            </li>
            <li>
              <strong>Cryptographic OTP Verification:</strong> Mobile login OTPs use secure stateless HMAC-SHA256 signatures, preventing credential spoofing and unauthorized account hijacking.
            </li>
            <li>
              <strong>Role-Based Staff Access:</strong> Warehouse and customer support personnel only have access to the specific order information needed to pack and deliver packages.
            </li>
          </ul>
        </section>

        {/* Section 5: Payment Security */}
        <section id="privacy-sec-5" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            5. Payment Security &amp; RBI Guidelines
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            We adhere strictly to Reserve Bank of India (RBI) payment security directives:
          </p>
          <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-2.5 text-sm sm:text-base text-[#4A4235]">
            <p className="font-semibold text-[#2C261E]">
              RBI-Authorized Payment Gateway (Razorpay):
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[#4A4235]">
              <li>
                <strong>Zero Card Number Storage:</strong> SmartRun never stores, views, or logs your 16-digit debit or credit card number, expiry date, or CVV code. All card payments utilize RBI-mandated card tokenization.
              </li>
              <li>
                <strong>UPI PIN Privacy:</strong> When paying with UPI (Google Pay, PhonePe, Paytm, BHIM), your PIN is entered solely within your bank’s secure UPI application. SmartRun never sees your secret PIN.
              </li>
              <li>
                <strong>Cash on Delivery (COD):</strong> For cash orders, payment is handed directly to the delivery rider at your doorstep. No financial details are recorded.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 6: Live Location & GPS Tracking */}
        <section id="privacy-sec-6" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            6. Live Location &amp; GPS During Delivery
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            Location data is utilized strictly for physical order fulfillment:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4A4235] leading-relaxed">
            <li>
              <strong>Pincode Verification:</strong> Your location is queried only when you click <em>Use Current Location</em> to automatically find your 6-digit Kolkata pincode and nearest landmark.
            </li>
            <li>
              <strong>Live Rider Tracking:</strong> During an active delivery, the delivery partner’s live motorcycle coordinates are streamed to your screen so you can track your order in real time on the map.
            </li>
            <li>
              <strong>No Background Tracking:</strong> SmartRun does <strong>not</strong> track your device’s GPS location in the background when the application is closed or not in use.
            </li>
          </ul>
        </section>

        {/* Section 7: Government Policies & DPDP Act */}
        <section id="privacy-sec-7" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            7. Government Policies, Legal Compliance &amp; DPDP Act 2023
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            SmartRun operates in full compliance with the statutory laws of the Republic of India:
          </p>
          <div className="space-y-3 pt-1">
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">A. Digital Personal Data Protection Act, 2023 (DPDP Act)</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                As a Data Principal, you have statutory rights to obtain confirmation of data processing, request correction of incomplete data, withdraw consent, and appoint a nominee in accordance with DPDP rules.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">B. Information Technology Act, 2000 &amp; SPDI Rules, 2011</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                We maintain reasonable security practices under Section 43A of the IT Act, 2000, and ensure prompt grievance handling through a designated Grievance Officer under Rule 3(1) of the IT Rules, 2021.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">C. Consumer Protection (E-Commerce) Rules, 2020</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                We disclose our verified legal business identity, warehouse location, pricing breakdowns including GST, manufacturer warranty details, and direct-to-source refund procedures with zero hidden charges.
              </p>
            </div>
          </div>
        </section>

        {/* Section 8: Data Retention */}
        <section id="privacy-sec-8" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            8. Data Retention &amp; Tax Audit Mandates
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            We retain your active account details only for as long as you maintain an account with SmartRun. However, under <strong>Section 36 of the Central Goods and Services Tax (CGST) Act, 2017</strong>, commercial e-commerce businesses are legally required to retain official GST sales invoices and transaction audit ledgers for a mandatory statutory period of <strong>72 months (6 years)</strong> for government tax audits.
          </p>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            When you delete your account, your profile name, phone number, and delivery addresses are permanently purged from active customer databases. Historical purchase invoices are preserved exclusively in secured accounting archives to fulfill government tax audit requirements.
          </p>
        </section>

        {/* Section 9: Your Rights & Account Deletion */}
        <section id="privacy-sec-9" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            9. Your Rights as a User &amp; Account Deletion
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            You maintain full sovereignty over your personal data:
          </p>

          <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-2.5 text-sm sm:text-base text-[#4A4235]">
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Dedicated In-App Account Deletion Portal</span>
            </div>
            <p className="text-sm text-[#4A4235] leading-relaxed">
              In strict accordance with Google Play Store Developer policies and the DPDP Act 2023, you can permanently delete your SmartRun account and personal details at any time directly through the app by visiting the <strong>Account Delete</strong> portal.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => navigate('/delete')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2C261E] hover:bg-[#3D352A] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                <span>Go to Account Deletion Portal</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4A4235] leading-relaxed">
            <li><strong>Right to Update:</strong> You can edit your name, mobile number, and delivery addresses anytime in your Profile.</li>
            <li><strong>Right to Download Tax Invoices:</strong> You can download official PDF copies of your GST invoices from Order History.</li>
            <li><strong>Right to Opt Out:</strong> You can toggle off SMS, WhatsApp, and notification alerts inside Profile Settings.</li>
          </ul>
        </section>

        {/* Section 10: Cookies & Device Notifications */}
        <section id="privacy-sec-10" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            10. Cookies, Storage &amp; Push Alerts
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            We use secure local storage on your device to keep items in your shopping cart, remember your selected Kolkata neighborhood, and maintain your secure login session.
          </p>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            Push notifications are sent through Google Firebase Cloud Messaging (FCM) strictly for critical order updates (e.g. order dispatched, rider arriving, delivery completed). You can disable notifications at any time via your device settings.
          </p>
        </section>

        {/* Section 11: Doorstep Electrician Privacy & Safety */}
        <section id="privacy-sec-11" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            11. Doorstep Electrician Privacy &amp; Safety
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            When you book a certified electrician through SmartRun:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4A4235] leading-relaxed">
            <li>The electrician receives only your designated service address and phone number for the scheduled visit.</li>
            <li>Electricians are bound by confidentiality agreements and are prohibited from retaining customer phone numbers or contacting customers for non-service purposes.</li>
            <li>You can review the technician's name, rating, and credentials directly in the app prior to the doorstep appointment.</li>
          </ul>
        </section>

        {/* Section 12: Contact Us & Grievance Redressal */}
        <section id="privacy-sec-12" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-4 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            12. Contact Us &amp; Grievance Redressal
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            If you have questions about this Privacy Policy, wish to exercise your data rights, or have a grievance, our support team and designated Grievance Officer are available to assist you:
          </p>

          <div className="p-4 sm:p-5 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-3 text-sm text-[#4A4235]">
            <div className="flex items-center gap-2 text-[#2C261E] font-bold">
              <Building2 className="w-5 h-5 text-amber-800" />
              <span>SmartRun Kasba Central Hub &amp; Grievance Office</span>
            </div>

            <div className="space-y-2">
              <p className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#7C7469] shrink-0 mt-0.5" />
                <span><strong>Warehouse Address:</strong> SmartRun Kasba Hub, Bediadanga 1st Lane, Nator Park, Kasba, Kolkata, West Bengal 700039, India</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#7C7469] shrink-0" />
                <span><strong>Support Helpline:</strong> <a href="tel:+918777400280" className="text-amber-800 font-semibold underline">+91 87774 00280</a></span>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#7C7469] shrink-0" />
                <span><strong>Official Support Email:</strong> <a href="mailto:support@smartrun.in" className="text-amber-800 font-semibold underline">support@smartrun.in</a></span>
              </p>
              <p className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#7C7469] shrink-0" />
                <span><strong>Grievance Officer:</strong> <a href="mailto:grievance@smartrun.in" className="text-amber-800 font-semibold underline">grievance@smartrun.in</a></span>
              </p>
              <p className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#7C7469] shrink-0" />
                <span><strong>Depot Working Hours:</strong> Monday to Sunday, 8:00 AM – 10:00 PM IST</span>
              </p>
            </div>

            <div className="pt-2 border-t border-[#E6DEC8]/80 text-xs sm:text-sm text-[#6B6254]">
              <p>
                <strong>Statutory SLA under IT Rules, 2021:</strong> Formal data grievances submitted to our Grievance Officer are acknowledged within 24 business hours and fully resolved within 15 calendar days from the date of receipt.
              </p>
            </div>

            <div className="pt-2">
              <a
                href="https://wa.me/918777400280?text=Hello%20SmartRun,%20I%20have%20a%20question%20regarding%20the%20Privacy%20Policy."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C261E] hover:bg-[#3D352A] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Chat with Privacy Support on WhatsApp</span>
              </a>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};
