import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { requestPushNotificationPermission } from '../../services/pushNotificationService';

interface NotificationsSubPageProps {
  mobileAlerts: boolean;
  whatsappAlerts: boolean;
  smsAlerts: boolean;
  emailAlerts: boolean;
  onToggleMobileAlerts: (next: boolean) => void;
  onToggleWhatsappAlerts: (next: boolean) => void;
  onToggleSmsAlerts: (next: boolean) => void;
  onToggleEmailAlerts: (next: boolean) => void;
  onBack: () => void;
  onContactSupport?: () => void;
  userProfile?: any;
}

export const NotificationsSubPage = ({
  mobileAlerts,
  whatsappAlerts,
  smsAlerts,
  emailAlerts,
  onToggleMobileAlerts,
  onToggleWhatsappAlerts,
  onToggleSmsAlerts,
  onToggleEmailAlerts,
  onBack
}: NotificationsSubPageProps) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-2xs">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          title="Back to Profile"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black text-slate-900">Setting</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* COMMUNICATION NOTIFICATIONS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-5">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Communication Alerts</h2>
            <p className="text-xs text-slate-500 font-normal">Real-time alerts for dispatch, OTPs and bills</p>
          </div>

          {/* Mobile Push Notifications */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 pr-2">
              <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">Mobile Push Notifications</p>
              <p className="text-xs sm:text-[13px] text-slate-600 font-normal mt-1 leading-relaxed">
                Receive instant mobile device pop-up alerts for live driver location, flash discounts, and delivery milestone alerts
              </p>
            </div>

            <button
              id="toggle-mobile-notifications"
              type="button"
              role="switch"
              aria-checked={mobileAlerts}
              aria-label="Toggle Mobile push notifications"
              onClick={async () => {
                const nextState = !mobileAlerts;
                onToggleMobileAlerts(nextState);
                if (nextState) {
                  await requestPushNotificationPermission().catch(() => {});
                }
              }}
              className={`relative inline-flex h-[32px] w-[58px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                mobileAlerts
                  ? 'bg-[#00B050] shadow-[inset_0_3px_4px_rgba(0,0,0,0.22)]'
                  : 'bg-[#C8CCD0] shadow-[inset_0_3px_4px_rgba(0,0,0,0.2)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-[26px] w-[26px] rounded-full bg-[#ECEEF0] shadow-[0_2px_4px_rgba(0,0,0,0.28)] ring-0 transition-transform duration-200 ease-in-out ${
                  mobileAlerts ? 'translate-x-[29px] translate-y-[3px]' : 'translate-x-[3px] translate-y-[3px]'
                }`}
              />
            </button>
          </div>

          {/* WhatsApp Dispatch Tracking */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex-1 pr-2">
              <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">WhatsApp Dispatch Tracking</p>
              <p className="text-xs sm:text-[13px] text-slate-600 font-normal mt-1 leading-relaxed">
                Receive live rider phone number and delivery OTP on WhatsApp
              </p>
            </div>

            <button
              id="toggle-whatsapp-tracking"
              type="button"
              role="switch"
              aria-checked={whatsappAlerts}
              aria-label="Toggle WhatsApp dispatch tracking"
              onClick={() => onToggleWhatsappAlerts(!whatsappAlerts)}
              className={`relative inline-flex h-[32px] w-[58px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                whatsappAlerts
                  ? 'bg-[#00B050] shadow-[inset_0_3px_4px_rgba(0,0,0,0.22)]'
                  : 'bg-[#C8CCD0] shadow-[inset_0_3px_4px_rgba(0,0,0,0.2)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-[26px] w-[26px] rounded-full bg-[#ECEEF0] shadow-[0_2px_4px_rgba(0,0,0,0.28)] ring-0 transition-transform duration-200 ease-in-out ${
                  whatsappAlerts ? 'translate-x-[29px] translate-y-[3px]' : 'translate-x-[3px] translate-y-[3px]'
                }`}
              />
            </button>
          </div>

          {/* SMS Order Status Updates */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex-1 pr-2">
              <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">SMS Order Status Updates</p>
              <p className="text-xs sm:text-[13px] text-slate-600 font-normal mt-1 leading-relaxed">
                Get packing and out-for-delivery SMS
              </p>
            </div>

            <button
              id="toggle-sms-updates"
              type="button"
              role="switch"
              aria-checked={smsAlerts}
              aria-label="Toggle SMS order status updates"
              onClick={() => onToggleSmsAlerts(!smsAlerts)}
              className={`relative inline-flex h-[32px] w-[58px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                smsAlerts
                  ? 'bg-[#00B050] shadow-[inset_0_3px_4px_rgba(0,0,0,0.22)]'
                  : 'bg-[#C8CCD0] shadow-[inset_0_3px_4px_rgba(0,0,0,0.2)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-[26px] w-[26px] rounded-full bg-[#ECEEF0] shadow-[0_2px_4px_rgba(0,0,0,0.28)] ring-0 transition-transform duration-200 ease-in-out ${
                  smsAlerts ? 'translate-x-[29px] translate-y-[3px]' : 'translate-x-[3px] translate-y-[3px]'
                }`}
              />
            </button>
          </div>

          {/* Email Invoices & Order Summary Alerts */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex-1 pr-2">
              <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">Email Invoices &amp; Order Summaries</p>
              <p className="text-xs sm:text-[13px] text-slate-600 font-normal mt-1 leading-relaxed">
                Receive official GST invoices, order receipts, and delivery confirmations via email
              </p>
            </div>

            <button
              id="toggle-email-updates"
              type="button"
              role="switch"
              aria-checked={emailAlerts}
              aria-label="Toggle Email invoices and order summaries"
              onClick={() => onToggleEmailAlerts(!emailAlerts)}
              className={`relative inline-flex h-[32px] w-[58px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                emailAlerts
                  ? 'bg-[#00B050] shadow-[inset_0_3px_4px_rgba(0,0,0,0.22)]'
                  : 'bg-[#C8CCD0] shadow-[inset_0_3px_4px_rgba(0,0,0,0.2)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-[26px] w-[26px] rounded-full bg-[#ECEEF0] shadow-[0_2px_4px_rgba(0,0,0,0.28)] ring-0 transition-transform duration-200 ease-in-out ${
                  emailAlerts ? 'translate-x-[29px] translate-y-[3px]' : 'translate-x-[3px] translate-y-[3px]'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
