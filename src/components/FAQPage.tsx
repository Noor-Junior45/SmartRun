import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  Search,
  X,
  ChevronDown,
  ShieldAlert,
  Zap,
  PackageCheck,
  ReceiptText,
  CreditCard,
  RotateCcw,
  Wrench,
  HelpCircle,
  ExternalLink,
  PhoneCall,
  Mail
} from 'lucide-react';
import { SEOHead } from './SEOHead';

export interface FAQItem {
  id: string;
  category: 'security' | 'delivery' | 'products' | 'billing' | 'payments' | 'returns' | 'electricians';
  question: string;
  answer: string;
  actionLink?: {
    text: string;
    url: string;
  };
}

export const FAQ_CATEGORIES = [
  { id: 'all', label: 'All Topics', icon: HelpCircle },
  { id: 'security', label: 'Security & Login', icon: ShieldAlert },
  { id: 'delivery', label: '60-Min Express', icon: Zap },
  { id: 'products', label: 'Genuine Materials', icon: PackageCheck },
  { id: 'billing', label: 'GST Invoices', icon: ReceiptText },
  { id: 'payments', label: 'Payments & COD', icon: CreditCard },
  { id: 'returns', label: 'Returns & Refunds', icon: RotateCcw },
  { id: 'electricians', label: 'Electricians & Hub', icon: Wrench },
] as const;

export const ENRICHED_FAQ_LIST: FAQItem[] = [
  // --- SECTION 1: SECURITY & LOGIN NOTIFICATIONS ---
  {
    id: 'security-login-alerts',
    category: 'security',
    question: 'Why did I receive an email saying "Important: Login from new device and location"?',
    answer: 'SmartRun sends automated, real-time security alerts whenever your account is accessed from a new device, mobile browser, or IP network. We do this to immediately protect your personal profile, saved delivery addresses, past order history, and saved payment preferences against unauthorized logins. If this login was made by you, you can safely disregard the notification.',
    actionLink: {
      text: 'Manage Account Security',
      url: '/profile'
    }
  },
  {
    id: 'security-not-me',
    category: 'security',
    question: 'What should I do if this login was NOT me?',
    answer: 'If you do not recognize the device, browser, or timestamp shown in the security alert email, your credentials may have been compromised. Tap the "forgot password" option in the email or visit our Password Reset page immediately to invalidate active sessions and create a fresh password. You can also contact our 24/7 security assistance desk at +91 87774 00280.',
    actionLink: {
      text: 'Reset Login Password',
      url: '/reset-password'
    }
  },
  {
    id: 'security-was-me',
    category: 'security',
    question: 'What should I do if the login was made by me?',
    answer: 'If you recently signed in using that phone, computer, or new browser session, no action is required on your part. You can safely archive or ignore the notification. SmartRun records the device so future logins from the same browser will not trigger redundant alerts.',
  },
  {
    id: 'security-location',
    category: 'security',
    question: 'Why does the login location show "Kolkata, India" or a nearby city?',
    answer: 'The location shown in security alerts is determined via network IP routing provided by telecommunication providers (Airtel, Jio, Vi, BSNL, etc.). Because cellular towers route traffic through regional gateway servers, the approximate city might occasionally display an adjacent hub or general metropolitan area rather than your exact physical street coordinate.',
  },
  {
    id: 'security-passwords-otp',
    category: 'security',
    question: 'How does SmartRun protect my account and password?',
    answer: 'SmartRun enforces end-to-end industry encryption, secure cryptographic password hashing, and phone OTP verification via Google Identity Platform / Firebase. SmartRun staff, support agents, or delivery partners will NEVER ask you for your account password or SMS OTP code.',
  },

  // --- SECTION 2: 60-MINUTE EXPRESS DELIVERY & LOGISTICS ---
  {
    id: 'delivery-speed',
    category: 'delivery',
    question: 'How fast is express delivery from SmartRun?',
    answer: 'Standard electrical orders—including domestic house wires, switches, circuit breakers (MCBs), LED fixtures, junction boxes, and installation tools—are packed within minutes and delivered in 60 minutes across Kolkata directly from our central Kasba warehouse hub.',
  },
  {
    id: 'delivery-areas',
    category: 'delivery',
    question: 'Which areas and pincodes in Kolkata do you deliver to?',
    answer: 'We deliver across Kolkata including Kasba, Ballygunge, Gariahat, Jadavpur, Tollygunge, Behala, Salt Lake, New Town, Rajarhat, Central Kolkata, Bhowanipore, Park Street, EM Bypass corridor, and surrounding localities. We are actively expanding to new pincodes each week.',
  },
  {
    id: 'delivery-tracking',
    category: 'delivery',
    question: 'Can I track my delivery partner live on a GPS map?',
    answer: 'Yes! As soon as your order is dispatched from our Kasba depot, you can track your delivery partner’s live location, view their vehicle registration number (e.g., WB 02 AR 4491), and monitor their estimated arrival time in real time.',
  },
  {
    id: 'delivery-freight',
    category: 'delivery',
    question: 'Do you deliver heavy construction materials and commercial freight?',
    answer: 'Yes. For bulky items—such as bundles of rigid PVC conduit pipes, heavy armored cables, cement, sand, and structural supplies—we dispatch dedicated 4-wheeler commercial trucks (Tata Ace / pickup freight) scheduled directly to your construction job site.',
  },

  // --- SECTION 3: GENUINE MATERIALS & BRANDS ---
  {
    id: 'products-genuine',
    category: 'products',
    question: 'Are all electrical items and wires 100% genuine?',
    answer: 'Yes, unconditionally. Every single coil of wire, circuit breaker, modular switch plate, and accessory sold on SmartRun is 100% original, sourced directly from authorized brand distributors (Polycab, Havells, RR Kabel, Finolex, Schneider Electric, Legrand, Anchor by Panasonic, Philips, etc.), and carries authentic ISI/BIS certification and original holographic seals.',
  },
  {
    id: 'products-warranty',
    category: 'products',
    question: 'Do wires and electrical components carry manufacturer warranty?',
    answer: 'Yes. All branded goods include the full manufacturer warranty against defects. In addition, SmartRun provides an instant 7-day doorstep replacement guarantee if an item arrives damaged or non-functional.',
  },
  {
    id: 'products-colors-sizes',
    category: 'products',
    question: 'Can I select specific wire colors and gauge sizes?',
    answer: 'Yes. Wires are available in all standardized ISI color codes (Red, Black, Blue, Yellow, Green, White) with real-time stock availability, custom pricing per variant, and full cross-sectional specifications (0.75 sq mm to 10.0 sq mm).',
  },

  // --- SECTION 4: GST TAX INVOICES & BULK CONTRACTOR PRICING ---
  {
    id: 'billing-gst',
    category: 'billing',
    question: 'Can I get an official GST tax invoice for business Input Tax Credit (ITC)?',
    answer: 'Yes. Every order automatically generates a statutory GST tax invoice complete with HSN/SAC codes, itemized CGST/SGST/IGST breakdown, and your registered company GSTIN. Official A4 PDF invoices can be downloaded anytime directly from your Order History.',
  },
  {
    id: 'billing-wholesale',
    category: 'billing',
    question: 'Do you offer contractor and wholesale volume discounts?',
    answer: 'Yes. Electrical contractors, site supervisors, licensed electricians, and bulk commercial buyers receive tiered volume discounts automatically applied in the cart. You can also request custom bulk project quotations directly through our support desk.',
  },

  // --- SECTION 5: PAYMENTS & CASH ON DELIVERY (COD) ---
  {
    id: 'payments-modes',
    category: 'payments',
    question: 'What payment modes are supported?',
    answer: 'We support all major Indian payment methods through Razorpay: UPI (Google Pay, PhonePe, Paytm, BHIM, CRED), Credit & Debit Cards (Visa, MasterCard, RuPay), Net Banking across 50+ banks, and Cash on Delivery (COD) for eligible pincodes.',
  },
  {
    id: 'payments-cod',
    category: 'payments',
    question: 'Is Cash on Delivery (COD) available?',
    answer: 'Yes, Cash on Delivery is available for retail orders up to specified order limits across our serviceable Kolkata delivery network. You can also pay the delivery partner via UPI QR code upon arrival at your doorstep.',
  },
  {
    id: 'payments-security',
    category: 'payments',
    question: 'Is online payment secure on SmartRun?',
    answer: 'All transactions are processed through RBI-authorized, 256-bit SSL encrypted Razorpay payment gateways adhering strictly to PCI-DSS Level 1 security standards and RBI card tokenization rules. SmartRun never stores your CVV or card PIN.',
  },

  // --- SECTION 6: RETURNS, CANCELLATIONS & REFUNDS ---
  {
    id: 'returns-replacements',
    category: 'returns',
    question: 'How do returns and replacements work?',
    answer: 'We provide a hassle-free 7-day doorstep replacement policy for defective, damaged, or incorrect items. Simply raise a request from your Order History, and our delivery partner will inspect and swap the item directly at your premises.',
    actionLink: {
      text: 'View Refund Policy',
      url: '/refund-policy'
    }
  },
  {
    id: 'returns-refund-timing',
    category: 'returns',
    question: 'How does the refund process work and when will I get my money back?',
    answer: 'When an order is cancelled or a return is approved, 100% of your refund is credited directly to your original payment method (bank account, UPI, credit/debit card) within 24 to 48 banking hours via Razorpay. We never force store credits or wallet locks.',
  },
  {
    id: 'returns-cancellation',
    category: 'returns',
    question: 'Can I cancel an order after placing it?',
    answer: 'Yes. You can cancel your order directly from the app within the cancellation window before warehouse packing and dispatch begin. Once cancelled, an automatic refund is triggered immediately.',
  },

  // --- SECTION 7: ELECTRICIAN BOOKING & KASBA WAREHOUSE HUB ---
  {
    id: 'electricians-booking',
    category: 'electricians',
    question: 'How do I book a verified electrician on SmartRun?',
    answer: 'You can book certified, background-checked electricians directly through the Technician tab in the app for switchboard fitting, MCB trip diagnostics, home rewiring, light fixture installation, or emergency repairs at transparent, standardized hourly/job rates.',
  },
  {
    id: 'hub-contact',
    category: 'electricians',
    question: 'Where is your physical warehouse and how do I contact support?',
    answer: 'Our central fulfillment depot and operations hub is located at: SMARTRUN MATERIALS Pvt. Ltd., Kheyadah Village, Bhagabanpur, West Bengal - 700150. You can reach our Kolkata support team via in-app chat, by calling +91 87774 00280 (Open every day 8:00 AM – 10:00 PM IST), or by emailing team@smartrun.in.',
  }
];

interface FAQPageProps {
  onBack: () => void;
}

export const FAQPage: React.FC<FAQPageProps> = ({ onBack }) => {
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const targetedItemRef = useRef<HTMLElement | null>(null);

  // Read URL hash on load or route change (e.g., #security-login-alerts)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    const rawHash = (location.hash || window.location.hash || '').replace('#', '').trim();
    if (rawHash) {
      const match = ENRICHED_FAQ_LIST.find(
        (f) => f.id.toLowerCase() === rawHash.toLowerCase() || rawHash.includes(f.id)
      );
      if (match) {
        setSelectedCategory('all');
        setExpandedId(match.id);
        setHighlightedId(match.id);

        // Smooth scroll to targeted question
        setTimeout(() => {
          const el = document.getElementById(match.id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 350);

        // Clear highlight ring after 5s
        const timer = setTimeout(() => {
          setHighlightedId(null);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [location.hash]);

  // Filter FAQs based on category and search query
  const filteredFAQs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return ENRICHED_FAQ_LIST.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!query) return true;
      return (
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    });
  }, [selectedCategory, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans antialiased">
      <SEOHead
        title="Frequently Asked Questions (FAQ) | SmartRun Express Electricals"
        description="Find answers to all questions regarding SmartRun 60-minute express delivery in Kolkata, security login alerts, genuine wire authenticity, GST invoices, and return policies."
      />

      {/* Sticky Top Header with Tailless Arrow Back Button and Simple Heading on exact same line */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="p-1 -ml-1 text-slate-800 hover:text-black hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-none">
              Help & FAQ
            </h1>
            <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300/60 px-2 py-0.5 rounded-md whitespace-nowrap">
              Public Portal
            </span>
          </div>
        </div>

        <a
          href="tel:8777400280"
          className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Helpline:</span>
          <span>8777400280</span>
        </a>
      </header>

      {/* Hero Search & Title Section */}
      <section className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-5 sm:py-7">
        <div className="max-w-3xl mx-auto text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            How can we help you today?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
            Answers on 60-min express deliveries, account login security alerts, genuine brand guarantees, and GST tax invoices.
          </p>

          {/* Quick Search Box */}
          <div className="relative mt-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword (e.g. login alert, delivery, wire, refund, GST invoice)..."
              className="w-full h-11 pl-10 pr-9 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-slate-400 rounded-xl outline-hidden transition-all text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Category Filter Chips */}
      <nav className="sticky top-[53px] z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 overflow-x-auto no-scrollbar shadow-2xs">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {FAQ_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main FAQ List Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-10">
        {/* Results Counter & Toggle Options */}
        <div className="flex items-center justify-between mb-3 text-xs text-slate-500 font-medium">
          <span>
            Showing <strong className="text-slate-900">{filteredFAQs.length}</strong> questions
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (expandedId === 'all') {
                  setExpandedId(null);
                } else {
                  setExpandedId('all');
                }
              }}
              className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
            >
              {expandedId === 'all' ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredFAQs.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center my-6 shadow-2xs">
            <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">No matching questions found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              We couldn't find an answer matching "{searchQuery}". Try a different keyword or contact our Kolkata helpline directly.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* FAQ Accordion List */}
        <div className="space-y-2.5">
          {filteredFAQs.map((faq) => {
            const isExpanded = expandedId === 'all' || expandedId === faq.id;
            const isHighlighted = highlightedId === faq.id;

            return (
              <article
                key={faq.id}
                id={faq.id}
                ref={isHighlighted ? (el) => { targetedItemRef.current = el; } : undefined}
                className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${
                  isHighlighted
                    ? 'border-blue-500 shadow-md ring-2 ring-blue-500/30'
                    : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                }`}
              >
                {/* Question Trigger Header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(faq.id)}
                  aria-expanded={isExpanded}
                  className="w-full text-left px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3 cursor-pointer select-none group"
                >
                  <div className="flex-1">
                    {faq.category === 'security' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-sm uppercase tracking-wide mb-1.5">
                        <ShieldAlert className="w-2.5 h-2.5" /> Security Alert
                      </span>
                    )}
                    <h2 className="text-sm sm:text-[15px] font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                      {faq.question}
                    </h2>
                  </div>

                  <span
                    className={`p-1 rounded-full text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 mt-0.5 ${
                      isExpanded ? 'rotate-180 text-blue-600' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>

                {/* Answer Content Body */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                    <p className="whitespace-pre-line">{faq.answer}</p>

                    {faq.actionLink && (
                      <div className="mt-3 pt-2">
                        <a
                          href={faq.actionLink.url}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <span>{faq.actionLink.text}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* Support Help Card */}
        <div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-md mb-2">
                ⚡ 24/7 Priority Support
              </div>
              <h3 className="text-base sm:text-lg font-bold">Still have a question?</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Our Kasba warehouse operations desk is available to assist you with active orders, accounts, or bulk inquiries.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href="tel:8777400280"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-yellow-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Helpline</span>
              </a>

              <a
                href="mailto:team@smartrun.in"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer border border-white/10"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Support</span>
              </a>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span>SMARTRUN MATERIALS Pvt. Ltd. • Kheyadah Village, Bhagabanpur, Kolkata 700150</span>
            <span>Helpline: +91 87774 00280</span>
          </div>
        </div>
      </main>
    </div>
  );
};
