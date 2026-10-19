import React, { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { SEOHead } from './SEOHead';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    question: 'What is SmartRun?',
    answer: 'SmartRun is Kolkata’s premier express electrical supplies and quick-commerce building materials platform, delivering 100% genuine electrical goods and verified electrician services directly to your doorstep with 60-minute dispatch from our Kasba warehouse depot.'
  },
  {
    question: 'How fast is express delivery?',
    answer: 'Standard electrical orders—including wires, switches, MCBs, lighting, and installation tools—are packed and dispatched immediately for express delivery within 60 minutes across Kolkata.'
  },
  {
    question: 'Are all electrical items genuine and certified?',
    answer: 'Yes, absolutely. Every coil of wire, circuit breaker, modular switch, and accessory sold on SmartRun is 100% original, sourced directly from authorized brand distributors (Polycab, Havells, RR Kabel, Finolex, Schneider Electric, Legrand, etc.), and carries authentic ISI/BIS marks.'
  },
  {
    question: 'Can I get a GST tax invoice for business input credit?',
    answer: 'Yes. Every order automatically generates an official GST tax invoice with valid HSN/SAC codes and CGST/SGST breakdown. You can view and download your PDF invoice anytime directly from the Order History page.'
  },
  {
    question: 'How do returns and replacements work?',
    answer: 'We provide a hassle-free 7-day return and replacement policy for defective, damaged, or incorrect items. Simply initiate a request from your Order History, and our delivery team will verify and process the replacement.'
  },
  {
    question: 'How does the refund process work?',
    answer: 'When an order is cancelled or a return is approved, 100% of your refund is credited directly to your original payment method (bank account, UPI, credit/debit card) via Razorpay. We do not lock your funds in store credit.'
  },
  {
    question: 'What payment modes are supported?',
    answer: 'We support all major payment modes including UPI (Google Pay, PhonePe, Paytm, BHIM), Credit & Debit Cards (Visa, MasterCard, RuPay), Net Banking across all major banks, and Cash on Delivery (COD) for eligible pincodes.'
  },
  {
    question: 'Can I track my delivery partner in real time?',
    answer: 'Yes. As soon as your order is dispatched, you can track your delivery partner’s live location and estimated arrival time on the real-time map tracking screen.'
  },
  {
    question: 'How do I book a verified electrician?',
    answer: 'You can book certified electricians directly through the app for short-circuit repairs, switchboard installations, appliance connections, and home wiring consultations at standardized, transparent rates.'
  },
  {
    question: 'Which areas in Kolkata do you deliver to?',
    answer: 'We deliver across Kolkata including Kasba, Ballygunge, Gariahat, Jadavpur, Tollygunge, Salt Lake, New Town, Central Kolkata, and surrounding localities, with new pincodes being added continuously.'
  },
  {
    question: 'Can I cancel an order after placing it?',
    answer: 'Yes. You can cancel your order directly from the app within the cancellation window before dispatch begins. Once cancelled, your refund is processed immediately.'
  },
  {
    question: 'How do I contact customer support?',
    answer: 'You can reach our dedicated support team via the Help Center in the app or call our helpline at +91 87774 00280 for immediate assistance.'
  }
];

interface FAQPageProps {
  onBack: () => void;
}

export const FAQPage: React.FC<FAQPageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-16 font-sans">
      <SEOHead
        title="FAQ | SmartRun Express Electricals"
        description="Frequently Asked Questions about SmartRun express delivery, product authenticity, GST invoices, and returns."
      />

      {/* Sticky Header with Tailless Arrow Back Button and FAQ Heading */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-2.5 shadow-2xs">
        <button
          type="button"
          onClick={onBack}
          className="p-1 -ml-1 text-slate-800 hover:text-black hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 leading-none">
          FAQ
        </h1>
      </div>

      {/* Clean, Minimal FAQ List with zero box design and no other info */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-2 sm:py-4 divide-y divide-slate-100">
        {FAQ_LIST.map((faq, index) => (
          <article key={index} className="py-4 first:pt-2">
            <h2 className="text-[15px] sm:text-base font-semibold text-slate-900 leading-snug">
              {faq.question}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mt-1.5">
              {faq.answer}
            </p>
          </article>
        ))}
      </main>
    </div>
  );
};
