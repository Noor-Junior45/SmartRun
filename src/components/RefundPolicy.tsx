import React from 'react';
import {
  ArrowLeft,
  PhoneCall
} from 'lucide-react';

export interface RefundPolicyProps {
  onBack?: () => void;
  isEmbedded?: boolean;
  onContactSupport?: () => void;
}

export const RefundPolicy = ({
  onBack,
  isEmbedded = false,
  onContactSupport
}: RefundPolicyProps) => {
  return (
    <div
      id="refund-policy-container"
      className="min-h-screen bg-white text-slate-900 pb-20 font-sans"
    >
      {/* Top Header: Simple Heading 'Refund policy' and Arrow Back Button in the same line with White Background */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {onBack && (
            <button
              id="btn-refund-policy-back"
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
            Refund policy
          </h1>
        </div>
      </div>

      {/* Main Content Area - Clean Article Layout without unnecessary background boxes */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        
        {/* Article 1: 100% Direct to Source Account */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              1. Direct-to-Source Refund Guarantee
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold whitespace-nowrap shrink-0">
              100% Refund
            </span>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            SmartRun does <strong>not</strong> withhold your funds as locked in-app store credits or non-withdrawable wallet points. When an eligible order cancellation or return is confirmed, the full amount is returned directly through the <strong>Razorpay Payment Gateway</strong> to the original payment source you used (your original UPI handle, bank account, or debit/credit card).
          </p>

          {/* Highlight Box: Direct Refund Security */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold whitespace-nowrap">
                Zero Deduction
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold whitespace-nowrap">
                Direct Bank Transfer
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-normal">
              ₹0 cancellation charges or processing fees are deducted when cancellations occur within the approved window.
            </p>
          </div>
        </section>

        {/* Article 2: The 2-Minute Cancellation Window */}
        <section className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              2. Order Cancellation Rules
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold whitespace-nowrap shrink-0">
              60-Min Express
            </span>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Because our express delivery partners dispatch materials within minutes of placement, order processing begins immediately at our Kasba warehouse:
          </p>

          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
              <div>
                <strong className="text-slate-900">Cancelled Within 2 Minutes:</strong> You can cancel directly from the order screen. A 100% full refund is initiated automatically with an instant Razorpay Refund ID.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 shrink-0" />
              <div>
                <strong className="text-slate-900">After 2 Minutes:</strong> Once materials are packed or our delivery rider has departed, automatic in-app cancellation locks to protect warehouse operations. For urgent issues, please reach out to customer support immediately.
              </div>
            </div>
          </div>
        </section>

        {/* Article 3: Clearing Timelines by Payment Method */}
        <section className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              3. Bank Clearing Timelines
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold whitespace-nowrap shrink-0">
              Standard Banking SLA
            </span>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Refunds are released into the banking network immediately by Razorpay. Settlement into your account follows Indian banking turnaround schedules:
          </p>

          <div className="divide-y divide-slate-100 text-sm">
            <div className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">UPI Payments</p>
                <p className="text-xs text-slate-500">Google Pay, PhonePe, Paytm, BHIM, CRED</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold whitespace-nowrap shrink-0">
                Instant – 24 Hours
              </span>
            </div>

            <div className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">Debit &amp; Credit Cards</p>
                <p className="text-xs text-slate-500">Visa, MasterCard, RuPay (All issuing banks)</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold whitespace-nowrap shrink-0">
                5 to 7 Working Days
              </span>
            </div>

            <div className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">Net Banking</p>
                <p className="text-xs text-slate-500">SBI, HDFC, ICICI, Axis, PNB &amp; others</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold whitespace-nowrap shrink-0">
                2 to 4 Working Days
              </span>
            </div>

            <div className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">Cash on Delivery (COD)</p>
                <p className="text-xs text-slate-500">Payment not yet made</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold whitespace-nowrap shrink-0">
                ₹0 Charged
              </span>
            </div>
          </div>
        </section>

        {/* Article 4: Razorpay Refund ID & Bank ARN Tracking */}
        <section className="space-y-3 pt-6 border-t border-slate-100">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            4. Tracking Your Refund
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every refund initiated generates an official <strong>Razorpay Refund ID</strong> (e.g., <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-xs font-bold">rfnd_P18xyz9482</code>) and an <strong>Acquiring Bank Reference Number (ARN)</strong>.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
            <li><strong>Automated SMS &amp; Email:</strong> Razorpay dispatches notification messages directly to your registered contact upon fund release.</li>
            <li><strong>Bank Branch Trace:</strong> In the rare event a credit is delayed beyond the standard banking SLA, your bank manager can instantly locate the transaction using the ARN reference.</li>
          </ul>
        </section>

        {/* Article 5: 7-Day Return & Replacement for Damaged/Defective Goods */}
        <section className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              5. 7-Day Replacement for Damaged Items
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold whitespace-nowrap shrink-0">
              Doorstep Verification
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            If you receive defective, wrong, or transit-damaged materials, please report it within <strong>7 days of delivery</strong>:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
            <li>Unused products with manufacturer packaging, seals, and tags intact are eligible for immediate doorstep replacement or refund.</li>
            <li>Custom-cut wire coils or opened chemical buckets cannot be accepted once altered.</li>
          </ul>
        </section>

        {/* Highlight Box: Need Help / Support Section */}
        <section className="pt-6 border-t border-slate-100">
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Have questions about a refund?
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold whitespace-nowrap shrink-0">
                Daily 9 AM – 9 PM
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Our Kolkata finance and dispatch desk is ready to help you track references or answer questions.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                id="link-call-helpline"
                href="tel:+918777400280"
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl transition-all shadow-2xs whitespace-nowrap"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Support (+91 87774 00280)</span>
              </a>
              {onContactSupport && (
                <button
                  type="button"
                  onClick={onContactSupport}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Open Help Center</span>
                </button>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
