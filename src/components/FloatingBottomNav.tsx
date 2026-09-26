import React from 'react';
import { Home, Zap, Building2, ShoppingBag } from 'lucide-react';
import { hapticSelection } from '../utils/haptics';

interface FloatingBottomNavProps {
  activeTab: string;
  activeCategory: string;
  onTabChange: (tab: string) => void;
  onSelectCategory: (category: string) => void;
  cartCount?: number;
  cartTotal?: number;
  onOpenCart?: () => void;
}

// Person Logo Component based strictly on user's reference logo (1.jpeg)
const PersonNavIcon = ({
  isActive,
  className = 'w-5.5 h-5.5 sm:w-6 sm:h-6 mb-1'
}: { isActive: boolean; className?: string }) => {
  if (isActive) {
    return (
      <svg
        className={`${className} transition-all`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        {/* Circular Head */}
        <circle cx="12" cy="7" r="4.25" />
        {/* Curved Shoulder/Body Base */}
        <path d="M4 20.2C4 16.2 7.58 13 12 13C16.42 13 20 16.2 20 20.2C20 20.64 19.64 21 19.2 21H4.8C4.36 21 4 20.64 4 20.2Z" />
      </svg>
    );
  }
  return (
    <svg
      className={`${className} transition-all`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Circular Head */}
      <circle cx="12" cy="7" r="4.25" />
      {/* Curved Shoulder/Body Base */}
      <path d="M4.5 20.5C4.5 16.63 7.86 13.5 12 13.5C16.14 13.5 19.5 16.63 19.5 20.5" />
    </svg>
  );
};

export const FloatingBottomNav = ({
  activeTab,
  activeCategory,
  onTabChange,
  onSelectCategory,
  cartCount = 0,
  cartTotal = 0,
  onOpenCart
}: FloatingBottomNavProps) => {
  const isHomeActive = activeTab === 'home' || (activeTab === 'catalog' && activeCategory === 'all');
  const isElectricalActive = activeTab === 'electrical' || (activeTab === 'catalog' && activeCategory === 'electrical');
  const isConstructionActive = activeTab === 'construction' || (activeTab === 'catalog' && activeCategory === 'construction');
  const isTechnicianActive = activeTab === 'technicians' || activeTab === 'technician';
  const isCartActive = activeTab === 'cart';

  return (
    <nav
      id="floating-liquid-bottom-navbar"
      aria-label="Bottom Navigation"
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[84vw] max-w-[315px] sm:max-w-[330px]"
    >
      {/* Increased vertical height, compact side-by-side with zero gap */}
      <div className="flex items-center justify-between gap-0 px-1 py-2 sm:py-2.5 rounded-full bg-white/80 backdrop-blur-2xl backdrop-saturate-200 border border-white/80 shadow-[0_16px_40px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.06),inset_0_1.5px_2px_rgba(255,255,255,0.85),inset_0_-1px_2px_rgba(0,0,0,0.02)] ring-1 ring-black/5 transition-all duration-300">
        {/* 1. Home Button */}
        <button
          id="floating-nav-home"
          type="button"
          onClick={() => {
            hapticSelection();
            onTabChange('home');
            onSelectCategory('all');
          }}
          title="Home"
          aria-label="Home"
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 sm:py-2 px-0 rounded-full transition-all duration-200 cursor-pointer bg-transparent border-0 outline-none ${
            isHomeActive
              ? 'text-emerald-600 font-bold scale-[1.05]'
              : 'text-slate-700 hover:text-emerald-600 active:scale-95 font-medium'
          }`}
        >
          <Home className={`w-5.5 h-5.5 sm:w-6 sm:h-6 mb-1 transition-all ${isHomeActive ? 'stroke-[2.6] text-emerald-600' : 'stroke-[2]'}`} />
          <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight whitespace-nowrap font-medium">Home</span>
        </button>

        {/* 2. Electrical Button */}
        <button
          id="floating-nav-electrical"
          type="button"
          onClick={() => {
            hapticSelection();
            onTabChange('electrical');
            onSelectCategory('electrical');
          }}
          title="Electrical Supplies"
          aria-label="Electrical Supplies"
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 sm:py-2 px-0 rounded-full transition-all duration-200 cursor-pointer bg-transparent border-0 outline-none ${
            isElectricalActive
              ? 'text-blue-600 font-bold scale-[1.05]'
              : 'text-slate-700 hover:text-blue-600 active:scale-95 font-medium'
          }`}
        >
          <Zap
            className={`w-5.5 h-5.5 sm:w-6 sm:h-6 mb-1 transition-all ${isElectricalActive ? 'stroke-[2.6] fill-blue-500 text-blue-600' : 'stroke-[2]'}`}
          />
          <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight whitespace-nowrap font-medium">Electrical</span>
        </button>

        {/* 3. Construction Button */}
        <button
          id="floating-nav-construction"
          type="button"
          onClick={() => {
            hapticSelection();
            onTabChange('construction');
            onSelectCategory('construction');
          }}
          title="Construction Materials"
          aria-label="Construction Materials"
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 sm:py-2 px-0 rounded-full transition-all duration-200 cursor-pointer bg-transparent border-0 outline-none ${
            isConstructionActive
              ? 'text-amber-600 font-bold scale-[1.05]'
              : 'text-slate-700 hover:text-amber-600 active:scale-95 font-medium'
          }`}
        >
          <Building2 className={`w-5.5 h-5.5 sm:w-6 sm:h-6 mb-1 transition-all ${isConstructionActive ? 'stroke-[2.6] text-amber-600' : 'stroke-[2]'}`} />
          <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight whitespace-nowrap font-medium">Materials</span>
        </button>

        {/* 4. Technician Tab */}
        <button
          id="floating-nav-technician"
          type="button"
          onClick={() => {
            hapticSelection();
            onTabChange('technicians');
          }}
          title="Certified Technicians & Specialists"
          aria-label="Technicians"
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 sm:py-2 px-0 rounded-full transition-all duration-200 cursor-pointer bg-transparent border-0 outline-none ${
            isTechnicianActive
              ? 'text-indigo-600 font-bold scale-[1.05]'
              : 'text-slate-700 hover:text-indigo-600 active:scale-95 font-medium'
          }`}
        >
          <PersonNavIcon
            isActive={isTechnicianActive}
            className={`w-5.5 h-5.5 sm:w-6 sm:h-6 mb-1 ${isTechnicianActive ? 'text-indigo-600' : 'text-slate-700'}`}
          />
          <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight whitespace-nowrap font-medium">Technician</span>
        </button>

        {/* 5. Cart Tab (Primary interaction for mobile app thumb zone) */}
        <button
          id="floating-nav-cart"
          type="button"
          onClick={() => {
            hapticSelection();
            if (onOpenCart) {
              onOpenCart();
            } else {
              onTabChange('cart');
            }
          }}
          title={cartCount > 0 ? `Cart (${cartCount} items)` : 'View Cart'}
          aria-label="Shopping Cart"
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 sm:py-2 px-0 rounded-full transition-all duration-200 cursor-pointer bg-transparent border-0 outline-none relative ${
            isCartActive
              ? 'text-emerald-600 font-bold scale-[1.05]'
              : cartCount > 0
              ? 'text-slate-900 hover:text-emerald-600 active:scale-95 font-semibold'
              : 'text-slate-700 hover:text-emerald-600 active:scale-95 font-medium'
          }`}
        >
          <div className="relative">
            <ShoppingBag
              className={`w-5.5 h-5.5 sm:w-6 sm:h-6 mb-1 transition-all ${
                isCartActive
                  ? 'stroke-[2.6] text-emerald-600'
                  : cartCount > 0
                  ? 'stroke-[2.3] text-slate-900'
                  : 'stroke-[2]'
              }`}
            />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-red-600 text-white text-[9px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center border-1.5 border-white shadow-xs animate-in zoom-in-50 duration-150">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight whitespace-nowrap font-medium">
            Cart
          </span>
        </button>
      </div>
    </nav>
  );
};
