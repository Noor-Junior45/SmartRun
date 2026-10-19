import React from 'react';
import { useLocation } from 'react-router-dom';
import { Order } from '../../types';

interface FloatingLiveOrderButtonProps {
  order: Order | null;
  onClick: () => void;
}

export const isProfileOrSubpage = (pathname: string): boolean => {
  const p = pathname.toLowerCase();
  return (
    p.startsWith('/profile') ||
    p.startsWith('/orders') ||
    p.startsWith('/live-order') ||
    p.startsWith('/track-order') ||
    p.startsWith('/cart') ||
    p.startsWith('/faq') ||
    p.startsWith('/faqs') ||
    p.startsWith('/delete') ||
    p.startsWith('/account-deletion') ||
    p.startsWith('/how-to-use') ||
    p.startsWith('/guide') ||
    p.startsWith('/privacy') ||
    p.startsWith('/terms') ||
    p.startsWith('/refund') ||
    p.startsWith('/shipping') ||
    p.startsWith('/about') ||
    p.startsWith('/sitemap') ||
    p.startsWith('/reset-password') ||
    p.startsWith('/login') ||
    p.startsWith('/auth') ||
    p.includes('/product/')
  );
};

export const FloatingLiveOrderButton = ({
  order,
  onClick
}: FloatingLiveOrderButtonProps) => {
  const location = useLocation();

  // Condition: Only show when order exists, NOT on profile or any page opened from profile buttons, NOT on live-order or cart, and NOT yet delivered or cancelled/failed
  if (
    !order ||
    isProfileOrSubpage(location.pathname) ||
    order.status === 'delivered' ||
    order.status === 'cancelled' ||
    order.status === 'failed'
  ) {
    return null;
  }

  return (
    <div
      id="floating-live-order-tracker"
      className="fixed bottom-24 sm:bottom-26 right-4 sm:right-5 z-40 flex flex-col items-center select-none animate-in fade-in zoom-in duration-300"
    >
      {/* Compact Circular Map Path Button (White Theme with White Border) */}
      <button
        type="button"
        id="live-order-map-circle-btn"
        onClick={onClick}
        aria-label="View current live order tracking and details"
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-white border-2 border-white shadow-xl shadow-slate-900/25 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer group focus:outline-none focus:ring-4 focus:ring-slate-300/40"
      >
        {/* Delivery Scooter Rider Image (.png design) */}
        <img
          src="/delivery-scooter.png"
          alt="Live Order Tracking"
          className="w-full h-full object-cover object-center select-none pointer-events-none p-0.5"
          loading="eager"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback to SVG if needed
            (e.currentTarget as HTMLImageElement).src = '/delivery-scooter.svg';
          }}
        />
      </button>
    </div>
  );
};
