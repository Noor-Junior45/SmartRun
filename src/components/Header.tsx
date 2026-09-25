import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, ShoppingBag, User, ChevronDown, Home, Briefcase, Building2, MapPin, Wrench, Search, X, SlidersHorizontal, ArrowUpDown, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { KolkataArea, SavedAddress, UserProfile, Product } from '../types';
import { detectQueryCategory, searchAllProducts } from '../utils/searchHelper';
import { isConstructionProduct } from '../utils/categoryHelper';
import { hapticLight, hapticSelection } from '../utils/haptics';

interface HeaderProps {
  currentArea: KolkataArea;
  activeAddress?: SavedAddress | null;
  onOpenLocationModal: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  allProducts?: Product[];
  cartCount?: number;
  cartTotal?: number;
  onOpenCart?: () => void;
  userPhone: string | null;
  userName?: string;
  userPhoto?: string;
  userProfile?: UserProfile | null;
  onOpenAuth: () => void;
  onOpenAiAssistant?: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  onOpenWishlist?: () => void;
  onOpenInstallApp?: () => void;
}

function getHeaderDisplayLocation(currentArea: KolkataArea | null, activeAddress?: SavedAddress | null): { houseNameOnly: string; tag?: string } {
  if (activeAddress && activeAddress.houseName) {
    return {
      houseNameOnly: activeAddress.houseName,
      tag: activeAddress.tag
    };
  }

  if (activeAddress && activeAddress.houseFlat) {
    return {
      houseNameOnly: activeAddress.houseFlat,
      tag: activeAddress.tag
    };
  }

  if (!currentArea || !currentArea.name) {
    return { houseNameOnly: 'Select Location' };
  }

  const shortName = currentArea.exactStreet || currentArea.name.split('/')[0].split('(')[0].trim();
  return {
    houseNameOnly: shortName
  };
}

export const Header = ({
  currentArea,
  activeAddress,
  onOpenLocationModal,
  searchQuery = '',
  onSearchChange,
  allProducts = [],
  cartCount = 0,
  cartTotal = 0,
  onOpenCart,
  userPhone,
  userName,
  userPhoto,
  userProfile,
  onOpenAuth,
  activeTab,
  onTabChange,
  activeCategory,
  onSelectCategory,
  onOpenInstallApp
}: HeaderProps) => {
  const [imgError, setImgError] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchDropdownRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const locationInfo = getHeaderDisplayLocation(currentArea, activeAddress);

  // Show All Filters button strictly on Electrical, Construction, and Technicians pages (Hidden on Home and others)
  const currentPath = location.pathname.toLowerCase();
  const isProductDetailPage = currentPath.includes('/product/');
  const isConstructionDetailPage =
    isProductDetailPage && currentPath.includes('/construction');

  // Track window scroll to collapse brand/location/avatar row when viewing product details
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled(scrolled);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleProductBack = () => {
    hapticLight();
    // 1. If user arrived from within our app history, go back to previous screen
    if (typeof window !== 'undefined' && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
      return;
    }
    // 2. Otherwise (e.g. opened directly from shared WhatsApp/SMS/native link), navigate to the corresponding store
    const fallbackPath = isConstructionDetailPage ? '/construction' : '/electrical';
    navigate(fallbackPath);
  };

  const handleFilterClick = () => {
    hapticSelection();
    if (isProductDetailPage) {
      const fallbackPath = isConstructionDetailPage ? '/construction' : '/electrical';
      navigate(fallbackPath);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-all-filters'));
      }, 120);
    } else {
      window.dispatchEvent(new CustomEvent('open-all-filters'));
    }
  };

  const handleSortClick = () => {
    hapticSelection();
    if (isProductDetailPage) {
      const fallbackPath = isConstructionDetailPage ? '/construction' : '/electrical';
      navigate(fallbackPath);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-sort-dropdown'));
      }, 120);
    } else {
      window.dispatchEvent(new CustomEvent('open-sort-dropdown'));
    }
  };

  const isTechniciansPage =
    activeTab === 'technicians' ||
    activeTab === 'technician' ||
    currentPath.startsWith('/technicians');

  const showFilterBtn =
    activeTab === 'electrical' ||
    activeTab === 'construction' ||
    isTechniciansPage ||
    currentPath.startsWith('/electrical') ||
    currentPath.startsWith('/construction') ||
    isProductDetailPage;

  // Close live search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live matching products across the entire database (excluding demo items)
  const searchResultsData = useMemo(() => {
    const q = (searchQuery || '').trim();
    if (!q || isTechniciansPage) {
      return { results: [], electricalCount: 0, constructionCount: 0, suggestedCategory: 'electrical' as const };
    }
    const filteredCatalog = (allProducts || []).filter((p) => {
      const name = String(p.name || '').trim().toLowerCase();
      const brand = String(p.brand || '').trim().toLowerCase();
      return name !== 'demo' && !name.includes('demo product') && brand !== 'demo';
    });
    return searchAllProducts(q, filteredCatalog, 6);
  }, [searchQuery, allProducts, isTechniciansPage]);

  // Instant Enter key handler for search input - navigates directly without delay
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const q = (searchQuery || '').trim();

    if (isTechniciansPage) {
      setIsSearchFocused(false);
      hapticSelection();
      navigate(`/technicians${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      return;
    }

    if (!q) return;

    // Detect target store category (electrical or construction) from whole database
    const targetCategory = detectQueryCategory(q, allProducts, activeCategory);
    const targetPath = targetCategory === 'construction' ? '/construction' : '/electrical';
    const targetUrl = `${targetPath}?q=${encodeURIComponent(q)}`;

    // Close live dropdown
    setIsSearchFocused(false);

    // Sync active category & close mobile search
    hapticSelection();
    onSelectCategory(targetCategory);
    onTabChange(targetCategory);
    setIsMobileSearchOpen(false);

    // Direct instant navigation to targeted store page
    navigate(targetUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const handleClearSearch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hapticLight();
    setIsSearchFocused(false);

    if (onSearchChange) {
      onSearchChange('');
    }

    const params = new URLSearchParams(location.search);
    if (params.has('q')) {
      params.delete('q');
      const nextQ = params.toString();
      navigate(`${location.pathname}${nextQ ? `?${nextQ}` : ''}`, { replace: true });
    }

    const el = document.getElementById('universal-search-input') as HTMLInputElement | null;
    if (el) {
      el.value = '';
      el.focus();
    }

    window.dispatchEvent(new CustomEvent('clear-search-query'));
  };

  // Check login state from profile, phone, name, email or photo
  const effectiveName = userProfile?.name || userName || '';
  const effectiveEmail = userProfile?.email || '';
  const effectivePhone = userProfile?.phone || userPhone || '';
  const effectivePhoto = userProfile?.photoURL || userPhoto || '';

  const isLoggedIn = Boolean(
    userProfile?.id ||
    userProfile?.email ||
    userProfile?.phone ||
    effectivePhone ||
    (effectiveName && effectiveName !== 'Kolkata Customer' && effectiveName.trim() !== '') ||
    effectiveEmail ||
    effectivePhoto
  );

  const getInitials = (name?: string, phone?: string | null, email?: string) => {
    if (name && name !== 'Kolkata Customer' && name !== 'Customer' && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email && email.trim()) {
      return email.slice(0, 2).toUpperCase();
    }
    if (phone && phone.trim()) {
      return phone.replace(/\D/g, '').slice(-2);
    }
    return 'BN';
  };

  const handleCartClick = () => {
    if (onOpenCart) {
      onOpenCart();
    } else {
      onTabChange('cart');
    }
  };

  const accountDisplayLabel = effectiveName || effectiveEmail || effectivePhone || 'Account';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-2xs">
      {/* Main Brand & Action Bar (collapses smoothly on product detail page scroll) */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isProductDetailPage && isScrolled
            ? 'max-h-0 opacity-0 pointer-events-none py-0'
            : 'max-h-24 opacity-100 py-2 sm:py-2.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand Title & Location Header */}
          <div className="flex items-center shrink-0">
            {/* Brand Title & Below-Logo Exact Location Selector */}
            <div className="flex flex-col justify-center text-left">
              <button
                onClick={() => onTabChange('home')}
                className="text-lg sm:text-xl font-black tracking-tight leading-none flex items-center text-left cursor-pointer focus:outline-none font-sf-pro"
                title="SmartRun - Home"
              >
                <span className="text-black">Smart</span>
                <span className="text-[#00875a]">Run</span>
              </button>

              {/* Saved Address House Name Only / Location Selector */}
              <button
                onClick={onOpenLocationModal}
                className="flex items-center gap-1.5 text-xs font-normal text-slate-700 hover:text-black transition-colors text-left cursor-pointer group leading-none mt-1 focus:outline-none max-w-[200px] sm:max-w-[320px] truncate"
                title="View full address or change location"
              >
                {activeAddress?.tag === 'home' && (
                  <Home className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                )}
                {activeAddress?.tag === 'work' && (
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                )}
                {activeAddress?.tag === 'hotel' && (
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                {!activeAddress && (
                  <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
                <span className="truncate text-slate-700 group-hover:text-slate-900 font-normal text-[12px] sm:text-[13px]">
                  {locationInfo.houseNameOnly}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 transition-transform group-hover:translate-y-0.5" />
              </button>
            </div>
          </div>

          {/* Right Action Icons: Cart Button, Profile Button */}
          <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
            {/* Cart Button (Borderless, icon only with badge, no circular/oval background) */}
            <button
              id="top-navbar-cart-btn"
              onClick={handleCartClick}
              className={`relative p-1.5 sm:p-2 flex items-center justify-center transition-colors cursor-pointer border-0 bg-transparent ${
                activeTab === 'cart'
                  ? 'text-amber-600'
                  : 'text-slate-800 hover:text-amber-600'
              }`}
              title="View Cart"
              aria-label="Shopping Cart"
            >
              <div className="relative">
                <ShoppingBag className="w-6 h-6 sm:w-6.5 sm:h-6.5" strokeWidth={2.2} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-black min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
            </button>

            {/* User Profile / Login Button */}
            <button
              id="user-profile-avatar-btn"
              onClick={() => {
                if (isLoggedIn) {
                  onTabChange('profile');
                } else {
                  onOpenAuth();
                }
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 transition-all hover:shadow-2xs active:scale-95 cursor-pointer overflow-hidden relative"
              title={isLoggedIn ? `Account: ${accountDisplayLabel} (Click to open Profile)` : 'Sign in / Sign up'}
              aria-label={isLoggedIn ? `Profile: ${accountDisplayLabel}` : 'Sign in'}
            >
              {isLoggedIn ? (
                effectivePhoto && !imgError ? (
                  <img
                    src={effectivePhoto}
                    alt={accountDisplayLabel}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xs font-black text-amber-950 bg-amber-400 w-full h-full rounded-full flex items-center justify-center border border-amber-500 shadow-inner">
                    {getInitials(effectiveName, effectivePhone, effectiveEmail)}
                  </span>
                )
              ) : (
                <User className="w-5 h-5 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Row 2: Fixed Liquid Glass Search Bar + Right-side All Filters Button (Visible strictly on Electrical, Construction & Wiring, NOT on Home) */}
      <div className="border-t border-slate-100/80 bg-gradient-to-b from-white/80 to-white/95 backdrop-blur-md px-3 sm:px-6 py-2 sm:py-2.5">
        <div className="max-w-3xl mx-auto w-full flex items-center gap-2 sm:gap-3">
          {/* Back Button beside search bar when viewing product details - only arrow and nothing */}
          {isProductDetailPage && (
            <button
              id="header-product-back-btn"
              type="button"
              onClick={handleProductBack}
              className="p-1.5 sm:p-2 -ml-1 text-slate-800 hover:text-black hover:bg-slate-100 active:bg-slate-200 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0 active:scale-90"
              title={isConstructionDetailPage ? 'Back to Construction Store' : 'Back to Electrical Store'}
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.5]" />
            </button>
          )}

          {/* Reduced Search Bar */}
          <form
            ref={searchDropdownRef}
            onSubmit={handleSearchSubmit}
            className="relative flex-1 group"
            role="search"
          >
            <div className="relative flex items-center w-full rounded-full backdrop-blur-xl bg-slate-100/80 hover:bg-slate-100/95 focus-within:bg-white border border-slate-200/80 focus-within:border-[#00875a]/50 focus-within:ring-2 focus-within:ring-[#00875a]/20 shadow-[0_2px_12px_rgba(0,0,0,0.03)] focus-within:shadow-[0_4px_20px_rgba(0,135,90,0.12)] transition-all duration-200">
              {/* Google-style Magnifying Glass Icon */}
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00875a] pointer-events-none transition-colors">
                <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" strokeWidth={2.2} />
              </div>

              <input
                id="universal-search-input"
                type="text"
                inputMode="search"
                value={searchQuery || ''}
                onChange={(e) => {
                  if (onSearchChange) onSearchChange(e.target.value);
                  if (!isSearchFocused) setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isTechniciansPage
                    ? 'Search technician, skill (e.g. Solar, Switchgear)...'
                    : 'Search products, cement, TMT, cables, switches, brands...'
                }
                className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm pl-9 sm:pl-10 pr-9 sm:pr-10 py-1.5 sm:py-2 rounded-full focus:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />

              {Boolean(searchQuery && searchQuery.length > 0) && (
                <button
                  id="header-clear-search-btn"
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200/90 hover:bg-slate-300 active:bg-slate-400 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer z-10"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Database Search Results Dropdown */}
            {isSearchFocused && Boolean((searchQuery || '').trim().length > 0) && !isTechniciansPage && (
              <div
                id="header-live-search-dropdown"
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* Header Summary */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Matching Products</span>
                  <span className="text-[11px] text-slate-400">
                    {searchResultsData.results.length > 0 ? `${searchResultsData.results.length} found` : 'Press Enter to search'}
                  </span>
                </div>

                {/* Product List */}
                {searchResultsData.results.length > 0 ? (
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {searchResultsData.results.map((product) => {
                      const isConst = isConstructionProduct(product);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            hapticSelection();
                            setIsSearchFocused(false);
                            if (isConst) {
                              onSelectCategory('construction');
                              onTabChange('construction');
                              navigate(`/construction?q=${encodeURIComponent(product.name)}`);
                            } else {
                              onSelectCategory('electrical');
                              onTabChange('electrical');
                              navigate(`/electrical?q=${encodeURIComponent(product.name)}`);
                            }
                          }}
                          className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left group"
                        >
                          <img
                            src={product.image || (product.images && product.images[0]) || ''}
                            alt={product.name}
                            className="w-10 h-10 object-contain rounded-lg bg-slate-50 border border-slate-200/80 p-0.5 shrink-0 group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate group-hover:text-[#00875a] transition-colors">
                              {product.name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {product.brand} • {product.subCategory}
                            </p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 pl-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              ₹{product.price}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-center text-xs text-slate-500">
                    Press <span className="font-semibold text-slate-700">Enter</span> to search the full database for "{searchQuery}"
                  </div>
                )}

                {/* Bottom Search Action */}
                <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit()}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs text-center transition-colors"
                  >
                    View all results for "{searchQuery}" →
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Right Side: All Filters Button & Sort / Relevance Button */}
          {isTechniciansPage ? (
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {/* Technician Specialist Filters Button (Sector, License, Experience, Emergency, Equipment - Side Menu on Laptop / Full Page on Mobile) */}
              <button
                id="top-navbar-technician-filters-btn"
                type="button"
                onClick={() => {
                  hapticSelection();
                  window.dispatchEvent(new CustomEvent('open-technician-filters'));
                }}
                className="p-1.5 sm:p-2 flex items-center justify-center text-slate-700 hover:text-indigo-600 border-0 bg-transparent transition-colors active:scale-95 cursor-pointer relative"
                title="All Specialist Filters (Sector, License, Experience, Tools, Area)"
                aria-label="All Specialist Filters"
              >
                <SlidersHorizontal className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-indigo-600 hover:text-indigo-700 shrink-0" strokeWidth={2.2} />
              </button>

              {/* Technician Price & Quick Sort Button (Short & Small Dropdown Box) */}
              <button
                id="top-navbar-technician-sort-btn"
                type="button"
                onClick={() => {
                  hapticSelection();
                  window.dispatchEvent(new CustomEvent('open-technician-sort'));
                }}
                className="p-1.5 sm:p-2 flex items-center justify-center text-slate-700 hover:text-blue-600 border-0 bg-transparent transition-colors active:scale-95 cursor-pointer"
                title="Price & Quick Sort (Low to High, High to Low, Top Rated, Nearest)"
                aria-label="Price and Quick Sort"
              >
                <ArrowUpDown className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-blue-600 hover:text-blue-700 shrink-0" strokeWidth={2.2} />
              </button>
            </div>
          ) : showFilterBtn ? (
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {/* All Filters Button (Borderless, icon only, no circular/oval background) */}
              <button
                id="top-navbar-all-filters-btn"
                type="button"
                onClick={handleFilterClick}
                className="p-1.5 sm:p-2 flex items-center justify-center text-slate-700 hover:text-amber-600 border-0 bg-transparent transition-colors active:scale-95 cursor-pointer"
                title="All Filters"
                aria-label="All Filters"
              >
                <SlidersHorizontal className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-amber-600 hover:text-amber-700 shrink-0" strokeWidth={2.2} />
              </button>

              {/* Sort / Relevance Button (Borderless, icon only, no circular/oval background) */}
              <button
                id="top-navbar-relevance-sort-btn"
                type="button"
                onClick={handleSortClick}
                className="p-1.5 sm:p-2 flex items-center justify-center text-slate-700 hover:text-blue-600 border-0 bg-transparent transition-colors active:scale-95 cursor-pointer"
                title="Sort & Relevance"
                aria-label="Sort and Relevance"
              >
                <ArrowUpDown className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-blue-600 hover:text-blue-700 shrink-0" strokeWidth={2.2} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
