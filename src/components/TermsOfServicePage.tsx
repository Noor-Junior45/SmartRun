import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Scale,
  Zap,
  Truck,
  RotateCcw,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  Clock,
  MapPin,
  MessageCircle,
  ExternalLink,
  CreditCard,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { SEOHead } from './SEOHead';

export interface TermsOfServicePageProps {
  onBack?: () => void;
}

export const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onBack }) => {
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
    { id: 'terms-sec-1', no: '1', title: 'Introduction & Acceptance of Agreement', desc: 'Electronic contract under Consumer Protection & IT Rules' },
    { id: 'terms-sec-2', no: '2', title: 'Eligibility & Account Registration', desc: 'Legal capacity under Section 11 of the Indian Contract Act, 1872' },
    { id: 'terms-sec-3', no: '3', title: 'How SmartRun Operates', desc: 'Kasba central warehouse, 60-min express courier, and logistics architecture' },
    { id: 'terms-sec-4', no: '4', title: 'Orders, Pricing & 60-Minute Delivery', desc: 'Wholesale prices, stock availability, and Kolkata courier timelines' },
    { id: 'terms-sec-5', no: '5', title: 'Payment Processing & GST Invoices', desc: 'Razorpay UPI, Cash on Delivery, card tokenization, and tax invoices' },
    { id: 'terms-sec-6', no: '6', title: 'Cancellations, Returns & Direct Refunds', desc: '2-min cancellation rule, 7-day replacements, and 100% direct-to-source refunds' },
    { id: 'terms-sec-7', no: '7', title: 'Doorstep Electricians & Site Safety', desc: 'Certified electrician bookings and high-voltage electrical safety guidelines' },
    { id: 'terms-sec-8', no: '8', title: 'Intellectual Property & Anti-Framing Shield', desc: 'Copyright protections, anti-scraping rules, and strict framing prohibition' },
    { id: 'terms-sec-9', no: '9', title: 'Shield Against Fraud & Electronic Evidence', desc: 'Digital audit logs under Bharatiya Sakshya Adhiniyam, 2023' },
    { id: 'terms-sec-10', no: '10', title: 'User Conduct & Prohibited Misuse', desc: 'Prohibited actions, platform security, and account safeguards' },
    { id: 'terms-sec-11', no: '11', title: 'Intermediary Status & Manufacturer Warranties', desc: 'Safe harbor under Section 79 of the Information Technology Act, 2000' },
    { id: 'terms-sec-12', no: '12', title: 'Limitation of Liability & Force Majeure', desc: 'Kolkata monsoon, waterlogging, traffic curbs, and unforeseen events' },
    { id: 'terms-sec-13', no: '13', title: 'Governing Law & Kolkata Jurisdiction', desc: 'Jurisdiction of competent civil courts in Kolkata, West Bengal, India' },
    { id: 'terms-sec-14', no: '14', title: 'Contact Us & Customer Support Desk', desc: 'Helpline phone, WhatsApp chat, email, and Kasba warehouse depot address' }
  ];

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-[#2C261E] pb-24 font-sans">
      <SEOHead
        title="Terms of Service | SmartRun Kolkata"
        description="SmartRun Terms of Service: Understand our platform rules, 60-minute express delivery terms, wholesale rates, refund policies, and legal protections."
        keywords="smartrun terms of service, terms and conditions, kolkata electrical terms, smartrun agreement"
      />

      {/* Top Sticky Header: Simple Heading 'Terms of service' and Back Button in the same line */}
      <div className="bg-[#F9F6F0] border-b border-[#E6DEC8] sticky top-0 z-20 px-4 sm:px-6 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            id="btn-terms-of-service-back"
            type="button"
            onClick={handleBack}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-[#EFE9DC] active:bg-[#E5DEC7] text-[#2C261E] transition-colors cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-[#2C261E] tracking-tight whitespace-nowrap">
            Terms of service
          </h1>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Intro & Statutory Compliance Box */}
        <section className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3">
          <div className="flex items-center gap-2 text-emerald-800">
            <Scale className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Legally Enforceable User Agreement
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#2C261E]">
            Welcome to SmartRun
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            These Terms of Service constitute an electronic contract generated in accordance with Rule 3(1) of the <strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>, and the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong>. By accessing our website (<a href="https://www.smartrun.in" className="text-amber-800 font-semibold underline">www.smartrun.in</a>) or installing the <em>SmartRun</em> mobile application (package ID: <code>in.smartrun.app</code>), you agree to be bound by these terms.
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

        {/* Section 1: Introduction & Acceptance */}
        <section id="terms-sec-1" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            1. Introduction &amp; Acceptance of Agreement
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            These Terms govern your use of the SmartRun platform, browsing wholesale electrical and construction catalogs, placing orders, booking certified electricians, and interacting with our delivery partners.
          </p>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            If you do not agree to all terms outlined herein, you must refrain from using the application or ordering materials. By signing in via SMS OTP, placing an order, or booking a technician, you confirm that you have read, understood, and agreed to all provisions of these Terms and our Privacy Policy.
          </p>
        </section>

        {/* Section 2: Eligibility & Registration */}
        <section id="terms-sec-2" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            2. Eligibility &amp; Account Registration
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            Under <strong>Section 11 of the Indian Contract Act, 1872</strong>, you represent that you are at least 18 years of age, of sound mind, and legally competent to enter into a binding contract. If you represent a company, contractor business, or developer, you warrant that you hold legitimate legal authority to bind that entity.
          </p>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            You agree to provide true and accurate contact details (specifically your 10-digit mobile number for OTP login and courier delivery coordination). You are responsible for safeguarding your phone and any credentials associated with your SmartRun account.
          </p>
        </section>

        {/* Section 3: How SmartRun Operates */}
        <section id="terms-sec-3" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            3. How SmartRun Operates (Logistics &amp; Fulfillment Architecture)
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            SmartRun is organized into dedicated operating branches tailored for the Kolkata urban area:
          </p>
          <div className="space-y-3 pt-1">
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">A. Central Kasba Depot</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                We operate a physical central warehouse at Kasba, Kolkata where all electrical cables, MCBs, LED panels, modular switches, and tools are inspected, barcoded, and held in temperature-controlled inventory.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">B. 60-Minute Rapid Bike Couriers</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                Standard electrical packages under 20 kg are dispatched via our network of two-wheeler delivery riders, ensuring guaranteed 60-minute delivery to serviceable Kolkata addresses.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">C. Commercial Site Freight Trucks</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                Bulk building materials (UltraTech cement bags, sand, TMT steel bars) are transported in commercial flatbed trucks and unloaded on-site at the ground level according to municipal traffic windows.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-[#2C261E]">D. Verified Doorstep Technicians</h3>
              <p className="text-sm text-[#4A4235] leading-relaxed">
                We connect customers with certified master electricians for complete residential and commercial wiring, distribution board installations, and emergency troubleshooting.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Orders, Pricing & Delivery */}
        <section id="terms-sec-4" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            4. Orders, Wholesale Pricing &amp; 60-Minute Delivery Terms
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            All prices listed on the app are in Indian Rupees (INR) and include applicable Goods and Services Tax (GST) unless explicitly stated otherwise. We make every effort to display real-time inventory and pricing accurately.
          </p>
          <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-2 text-sm sm:text-base text-[#4A4235]">
            <p className="font-bold text-[#2C261E] text-sm sm:text-base">
              Delivery Commitments &amp; Site Accessibility:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[#4A4235]">
              <li>
                <strong>60-Minute Delivery Window:</strong> The 60-minute delivery commitment applies to serviceable Kolkata postal pincodes during standard warehouse operating hours (8:00 AM – 10:00 PM), subject to normal weather and traffic conditions.
              </li>
              <li>
                <strong>Ground Floor Delivery:</strong> For multi-story apartment buildings or commercial complexes without lift access, deliveries are completed at the ground floor security gate or building entrance lobby.
              </li>
              <li>
                <strong>Truck Unloading Space:</strong> For heavy construction deliveries (cement and steel), customers must ensure that commercial freight vehicles have legal vehicular access and parking space at the unloading site.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Payment Processing & GST Invoices */}
        <section id="terms-sec-5" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            5. Payment Methods, RBI Rules &amp; GST Invoicing
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            We provide secure payment options compliant with Reserve Bank of India (RBI) regulations:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4A4235] leading-relaxed">
            <li>
              <strong>UPI (Unified Payments Interface):</strong> Pay with Google Pay, PhonePe, Paytm, or BHIM. Transactions are securely routed via Razorpay directly to our merchant account.
            </li>
            <li>
              <strong>Cash on Delivery (COD):</strong> Pay cash or UPI directly to the delivery rider upon physical receipt of your package.
            </li>
            <li>
              <strong>Cards &amp; Net Banking:</strong> Secured with RBI-mandated card tokenization. No card numbers or banking passwords are ever stored on SmartRun servers.
            </li>
            <li>
              <strong>Official GST Tax Invoices:</strong> Every completed order generates an official GST tax invoice PDF containing full HSN codes, CGST, and SGST breakdowns suitable for claiming Input Tax Credit (ITC).
            </li>
          </ul>
        </section>

        {/* Section 6: Cancellations, Returns & Direct Refunds */}
        <section id="terms-sec-6" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            6. Cancellations, Returns &amp; 100% Direct-to-Source Refund Guarantee
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            We believe in honest, transparent customer satisfaction:
          </p>

          <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-2 text-sm sm:text-base text-[#4A4235]">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm sm:text-base">
              <RotateCcw className="w-5 h-5 text-emerald-600" />
              <span>100% Direct Refund Guarantee — Zero Deductions</span>
            </div>
            <p className="text-sm text-[#4A4235] leading-relaxed">
              When an order cancellation or return is confirmed, 100% of your paid amount is returned directly to your original bank account or UPI ID. We do not trap your money in non-withdrawable app coins or arbitrary store credits.
            </p>
          </div>

          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4A4235] leading-relaxed">
            <li>
              <strong>Cancellation Window:</strong> Because items are packed rapidly at Kasba, you can cancel freely before the delivery rider leaves the warehouse. Once out for delivery, nominal delivery charges may apply to cover rider transit expenses.
            </li>
            <li>
              <strong>7-Day Replacement for Electrical Goods:</strong> Defective, transit-damaged, or incorrect products reported within 7 days of delivery are replaced free of charge or refunded in full.
            </li>
            <li>
              <strong>Cut Wires &amp; Perishables:</strong> Custom-cut wire coils and cement bags exposed to rain at the customer's site are not eligible for return.
            </li>
          </ul>
        </section>

        {/* Section 7: Doorstep Electricians & Site Safety */}
        <section id="terms-sec-7" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            7. Doorstep Electrician Services &amp; High-Voltage Safety Guidelines
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            SmartRun connects homeowners and commercial clients with verified master electricians:
          </p>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs sm:text-sm text-[#4A4235]">
            <div className="flex items-center gap-2 text-amber-950 font-bold">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Critical Electrical Safety Advisory</span>
            </div>
            <p className="leading-relaxed">
              Electrical work carries inherent risks of high-voltage electric shock, arc flash, fire, and circuit damage if mishandled. Customers must ensure main supply isolators and MCBs are turned OFF during maintenance. Only licensed electricians should handle distribution boards and high-load power cables.
            </p>
          </div>

          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            Partner electricians operate as independent trade professionals. SmartRun facilitates fair pricing transparency and booking convenience, but is not liable for unauthorized physical alterations made outside agreed service scopes.
          </p>
        </section>

        {/* Section 8: Intellectual Property & Anti-Framing Shield */}
        <section id="terms-sec-8" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            8. Intellectual Property, Anti-Framing &amp; Anti-Scraping Protection
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            All content, graphics, visual layout, software code, algorithms, brand logos, and trade dress associated with &quot;SmartRun&quot; are protected under the <strong>Indian Copyright Act, 1957</strong> and <strong>Trade Marks Act, 1999</strong>:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4A4235] leading-relaxed">
            <li>
              <strong>Strict Prohibition on Framing &amp; Mirroring:</strong> You shall <strong>not</strong> frame, embed, mirror, wrap, or display this platform or its web pages inside any external iframe, webview, phishing site, or unauthorized third-party application.
            </li>
            <li>
              <strong>Anti-Scraping &amp; Data Mining Ban:</strong> Automated bot scraping or crawling of product pricing, inventory data, or customer databases is strictly prohibited under <strong>Sections 43 and 66 of the Information Technology Act, 2000</strong>.
            </li>
            <li>
              <strong>Legal Enforcement:</strong> Unauthorized brand impersonation or code theft will trigger immediate civil injunctions, statutory damages, and criminal prosecution under Sections 51 and 63 of the Indian Copyright Act, 1957.
            </li>
          </ul>
        </section>

        {/* Section 9: Shield Against Fraud & Evidence */}
        <section id="terms-sec-9" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            9. Shield Against Fraud, False Claims &amp; Legal Evidence
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            We enforce strict zero tolerance for fraudulent chargebacks, fabricated non-delivery claims, or harassment of delivery riders:
          </p>
          <div className="p-4 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-2 text-xs sm:text-sm text-[#4A4235]">
            <p className="font-bold text-[#2C261E]">
              Electronic Evidence Admissibility under Bharatiya Sakshya Adhiniyam, 2023:
            </p>
            <p className="leading-relaxed">
              SmartRun preserves tamper-proof digital audit logs—including IP addresses, device signatures, encrypted HMAC-SHA256 OTP tokens, delivery coordinates, and rider GPS milestones. These logs are admissible as conclusive electronic evidence in court under <strong>Section 63 of the Bharatiya Sakshya Adhiniyam, 2023</strong>.
            </p>
            <p className="leading-relaxed text-[#7C7469]">
              Attempting to defraud the platform or harass delivery staff will result in permanent account termination and legal action under <strong>Sections 318 (Cheating), 336 (Forgery), and 356 (Defamation) of the Bharatiya Nyaya Sanhita, 2023 (BNS)</strong>.
            </p>
          </div>
        </section>

        {/* Section 10: User Conduct */}
        <section id="terms-sec-10" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            10. User Conduct &amp; Prohibited Platform Misuse
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            When using the SmartRun platform, you agree not to:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4A4235] leading-relaxed">
            <li>Submit fake delivery addresses, false phone numbers, or fraudulent payment claims.</li>
            <li>Use automated software, bots, or scripts to place spam orders or manipulate inventory.</li>
            <li>Harass, abuse, or endanger delivery partners, warehouse staff, or partner electricians.</li>
            <li>Attempt to probe, scan, or breach system security, firewalls, or payment gateway APIs.</li>
          </ul>
        </section>

        {/* Section 11: Intermediary Status & Warranties */}
        <section id="terms-sec-11" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            11. Intermediary Status &amp; Third-Party Brand Warranties
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            Under <strong>Section 79 of the Information Technology Act, 2000</strong>, SmartRun functions as an e-commerce intermediary regarding third-party manufacturer product warranties.
          </p>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            All brand warranties (e.g. Havells, Polycab, Schneider, Anchor, UltraTech, Tata Tiscon) are backed directly by their respective manufacturers. SmartRun supplies 100% genuine, original factory-sealed products and assists you with authorized replacement claims within the approved return window.
          </p>
        </section>

        {/* Section 12: Limitation of Liability & Force Majeure */}
        <section id="terms-sec-12" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            12. Limitation of Liability &amp; Force Majeure
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            SmartRun shall not be liable for delivery delays or performance failures resulting from events beyond reasonable commercial control, including heavy Kolkata monsoon waterlogging, municipal road closures, political rallies, national holidays, power grid failures, or telecommunications outages.
          </p>
        </section>

        {/* Section 13: Governing Law & Jurisdiction */}
        <section id="terms-sec-13" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            13. Governing Law &amp; Exclusive Kolkata Jurisdiction
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            These Terms of Service and any dispute arising between you and SmartRun shall be governed exclusively by the laws of the Republic of India.
          </p>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            In the event of any legal dispute, controversy, or claim, the competent courts and consumer tribunals located in <strong>Kolkata, West Bengal, India</strong> shall possess exclusive jurisdiction.
          </p>
        </section>

        {/* Section 14: Contact Us */}
        <section id="terms-sec-14" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-4 scroll-mt-20">
          <h2 className="text-lg sm:text-xl font-bold text-[#2C261E]">
            14. Contact Us &amp; Customer Support Desk
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            If you have questions regarding these Terms, need assistance with an order, or wish to report a concern, contact our Kasba depot support desk:
          </p>

          <div className="p-4 sm:p-5 rounded-xl bg-[#FBF9F4] border border-[#E6DEC8] space-y-3 text-sm text-[#4A4235]">
            <div className="flex items-center gap-2 text-[#2C261E] font-bold">
              <Building2 className="w-5 h-4 text-amber-800" />
              <span>SmartRun Customer Support Desk</span>
            </div>

            <div className="space-y-2">
              <p className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#7C7469] shrink-0 mt-0.5" />
                <span><strong>Warehouse Address:</strong> SmartRun Kasba Depot, Bediadanga 1st Lane, Nator Park, Kasba, Kolkata, West Bengal 700039, India</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#7C7469] shrink-0" />
                <span><strong>Support Helpline:</strong> <a href="tel:+918777400280" className="text-amber-800 font-semibold underline">+91 87774 00280</a></span>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#7C7469] shrink-0" />
                <span><strong>Support Email:</strong> <a href="mailto:support@smartrun.in" className="text-amber-800 font-semibold underline">support@smartrun.in</a></span>
              </p>
              <p className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#7C7469] shrink-0" />
                <span><strong>Support Hours:</strong> Monday to Sunday, 8:00 AM – 10:00 PM IST</span>
              </p>
            </div>

            <div className="pt-2">
              <a
                href="https://wa.me/918777400280?text=Hello%20SmartRun,%20I%20have%20a%20question%20regarding%20the%20Terms%20of%20Service."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C261E] hover:bg-[#3D352A] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Chat with Support on WhatsApp</span>
              </a>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};
