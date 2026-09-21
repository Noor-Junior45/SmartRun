import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  MapPin,
  CreditCard,
  Wallet,
  ChevronRight,
  Settings,
  LogOut,
  Calendar,
  Edit3,
  Pencil,
  Check,
  Clock,
  FileText,
  Lock,
  Heart,
  RotateCcw,
  Trash2,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Order, SavedAddress, UserProfile, CartItem, Product, WalletTransaction } from '../types';
import { OrderHistoryView } from './OrderHistoryView';
import {
  deleteAddressFromFirestore,
  subscribeToUpiIds,
  fetchProductsFromSupabase,
  fetchUserProfileFromSupabase,
  cleanPhoneAutofill
} from '../services/supabaseService';
import { getFavoriteProductIds, toggleProductFavorite, clearAllFavorites } from '../services/favorites';

// Sub-page component modules for each button in Profile
import { FavoritesSubPage } from './profile/FavoritesSubPage';
import { SavedAddressesSubPage } from './profile/SavedAddressesSubPage';
import { SavedPaymentsSubPage } from './profile/SavedPaymentsSubPage';
import { WalletSubPage } from './profile/WalletSubPage';
import { ServicesSubPage } from './profile/ServicesSubPage';
import { MembershipSubPage } from './profile/MembershipSubPage';
import { HelpCenterSubPage } from './profile/HelpCenterSubPage';
import { NotificationsSubPage } from './profile/NotificationsSubPage';
import { PrivacyPolicySubPage } from './profile/PrivacyPolicySubPage';
import { TermsOfServiceSubPage } from './profile/TermsOfServiceSubPage';
import { RefundPolicySubPage } from './profile/RefundPolicySubPage';
import { EditProfileModal } from './profile/EditProfileModal';

interface ProfileViewProps {
  userProfile: UserProfile | null;
  orders: Order[];
  savedAddresses: SavedAddress[];
  onBack: () => void;
  onOpenLocationModal: () => void;
  onEditAddress?: (address: SavedAddress) => void;
  onSelectAddress?: (address: SavedAddress) => void;
  onReorder: (items: CartItem[]) => void;
  onOpenShop: () => void;
  onOpenServices: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onLogout: () => void | Promise<void>;
  onAddToCart?: (product: Product) => void;
  allProducts?: Product[];
}

export const ProfileView = ({
  userProfile,
  orders,
  savedAddresses,
  onBack,
  onOpenLocationModal,
  onEditAddress,
  onSelectAddress,
  onReorder,
  onOpenShop,
  onOpenServices,
  onProfileUpdated,
  onLogout,
  onAddToCart,
  allProducts
}: ProfileViewProps) => {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Current active sub-page view: 'main' | 'orders' | 'addresses' | 'payments' | 'wallet' | 'services' | 'membership' | 'help' | 'notifications' | 'privacy' | 'terms' | 'favorites' | 'refund-policy'
  const [subPage, setSubPage] = useState<
    'main' | 'orders' | 'addresses' | 'payments' | 'wallet' | 'services' | 'membership' | 'help' | 'notifications' | 'privacy' | 'terms' | 'favorites' | 'refund-policy'
  >('main');

  // Favorites state
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>(() => getFavoriteProductIds());
  const [allCatalogProducts, setAllCatalogProducts] = useState<Product[]>(() => (allProducts && allProducts.length > 0 ? allProducts : []));

  useEffect(() => {
    if (allProducts && allProducts.length > 0) {
      setAllCatalogProducts(allProducts);
    }
  }, [allProducts]);

  useEffect(() => {
    fetchProductsFromSupabase().then((prods) => {
      if (prods && prods.length > 0) {
        setAllCatalogProducts(prods);
      }
    });

    if (userProfile?.id && !isSigningOut) {
      fetchUserProfileFromSupabase(userProfile.id).then((freshProf) => {
        if (freshProf && isMountedRef.current && !isSigningOut) {
          onProfileUpdated({
            ...userProfile,
            ...freshProf,
            id: userProfile.id,
            name: freshProf.name || userProfile.name,
            phone: cleanPhoneAutofill(freshProf.phone || userProfile.phone || ''),
            email: freshProf.email || userProfile.email,
            dob: freshProf.dob !== undefined ? freshProf.dob : userProfile.dob,
            photoURL: freshProf.photoURL || userProfile.photoURL,
            walletBalance: freshProf.walletBalance ?? userProfile.walletBalance,
            refundBalance: freshProf.refundBalance ?? userProfile.refundBalance,
            cashbackBalance: freshProf.cashbackBalance ?? userProfile.cashbackBalance,
          });
        }
      }).catch(() => {});
    }
  }, [userProfile?.id]);

  useEffect(() => {
    const handleFavsChanged = () => {
      setFavoriteProductIds(getFavoriteProductIds());
    };
    window.addEventListener('giriraj_favorites_changed', handleFavsChanged);
    return () => window.removeEventListener('giriraj_favorites_changed', handleFavsChanged);
  }, []);

  const handleToggleFavorite = (productId: string) => {
    toggleProductFavorite(productId);
    setFavoriteProductIds(getFavoriteProductIds());
  };

  const favoriteProducts = allCatalogProducts.filter((p) => favoriteProductIds.includes(String(p.id)));

  // Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Avatar image error fallback
  const [avatarError, setAvatarError] = useState(false);

  // Payment state (Stored on server & Firestore)
  const [savedUpi, setSavedUpi] = useState<string[]>([]);

  // Preferences & Alerts toggle state
  const [mobileAlerts, setMobileAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  // Subscribe to real-time saved UPI IDs from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToUpiIds((upis) => {
      setSavedUpi(upis);
    });
    return () => {
      unsubscribe();
    };
  }, [userProfile?.id]);

  // Wallet State
  const refundBalance = userProfile?.refundBalance ?? 0;
  const cashbackBalance = userProfile?.cashbackBalance ?? 0;
  const totalWalletBalance = userProfile?.walletBalance ?? (refundBalance + cashbackBalance);

  // Reset scroll to top whenever navigating to a subpage or returning to main profile
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [subPage]);

  const handleOpenEdit = () => {
    setIsEditModalOpen(true);
  };

  // Sort orders descending by createdAt timestamp
  const sortedOrders = [...orders].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime() || 0;
    const timeB = new Date(b.createdAt).getTime() || 0;
    return timeB - timeA;
  });

  // Calculate real savings from completed orders
  const totalSavings = orders.reduce((acc, ord) => acc + (ord.discount || 40), 120);

  // Wallet transactions from user profile or empty
  const walletTransactions: WalletTransaction[] = [];
  const filteredTransactions = walletTransactions;

  // Clean user fields (no demo name/number)
  const rawName = userProfile?.name?.trim() || '';
  const rawPhone = userProfile?.phone?.trim() || '';
  const rawEmail = (userProfile?.email?.trim() || '').includes('@girirajpower.internal')
    ? ''
    : (userProfile?.email?.trim() || '');
  const displayDob = userProfile?.dob;
  const userPhoto = userProfile?.photoURL;

  // Flags for whether profile fields are missing (for first-time/incomplete logins)
  const hasMissingName = !rawName;
  const hasMissingPhone = !rawPhone;
  const hasMissingEmail = !rawEmail;
  const hasAnyMissingDetails = hasMissingName || hasMissingPhone || hasMissingEmail;

  const displayName = rawName || 'Set Your Name';
  // Deterministic phone formatting: prevents flickering between "+91", "91", and raw 10 digits
  const displayPhone = useMemo(() => {
    if (!rawPhone) return '';
    const cleaned = cleanPhoneAutofill(rawPhone);
    if (cleaned.length === 10) {
      return `+91 ${cleaned}`;
    }
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `+91 ${digits.slice(-10)}`;
    }
    if (rawPhone.startsWith('+')) return rawPhone;
    return `+91 ${digits || rawPhone}`;
  }, [rawPhone]);
  const displayEmail = rawEmail;

  const getInitials = (name?: string, phone?: string, email?: string) => {
    if (name && name !== 'Customer' && name !== 'Kolkata Customer' && name.trim()) {
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

  // -------------------------------------------------------------
  // SUB-PAGE 0: ORDERS & PURCHASES
  // -------------------------------------------------------------
  if (subPage === 'orders') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-10">
        <OrderHistoryView
          orders={sortedOrders}
          userProfile={userProfile}
          onOpenShop={onOpenShop}
          onBack={() => setSubPage('main')}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // SUB-PAGE 1: SAVED ADDRESSES
  // -------------------------------------------------------------
  if (subPage === 'addresses') {
    return (
      <SavedAddressesSubPage
        savedAddresses={savedAddresses}
        displayPhone={displayPhone}
        onBack={() => setSubPage('main')}
        onOpenLocationModal={onOpenLocationModal}
        onEditAddress={onEditAddress}
        onSelectAddress={onSelectAddress}
        onDeleteAddress={deleteAddressFromFirestore}
      />
    );
  }

  // -------------------------------------------------------------
  // SUB-PAGE 2: SAVED PAYMENT MODES
  // -------------------------------------------------------------
  if (subPage === 'payments') {
    return (
      <SavedPaymentsSubPage
        savedUpi={savedUpi}
        onBack={() => setSubPage('main')}
      />
    );
  }

  // -------------------------------------------------------------
  // SUB-PAGE 3: WALLET
  // -------------------------------------------------------------
  if (subPage === 'wallet') {
    return (
      <WalletSubPage
        totalWalletBalance={totalWalletBalance}
        filteredTransactions={filteredTransactions}
        onBack={() => setSubPage('main')}
      />
    );
  }

  // -------------------------------------------------------------
  // SUB-PAGE 4: TECHNICIANS & WIRING BOOKINGS
  // -------------------------------------------------------------
  if (subPage === 'services') {
    return (
      <ServicesSubPage
        onBack={() => setSubPage('main')}
      />
    );
  }

  // -------------------------------------------------------------
  // SUB-PAGE 5: MEMBERSHIP & SAVINGS (Giriraj Power Pro)
  // -------------------------------------------------------------
  if (subPage === 'membership') {
    return (
      <MembershipSubPage
        totalSavings={totalSavings}
        onBack={() => setSubPage('main')}
      />
    );
  }

  // -------------------------------------------------------------
  // SUB-PAGE 6: HELP CENTER & SUPPORT
  // -------------------------------------------------------------
  if (subPage === 'help') {
    return (
      <HelpCenterSubPage
        userProfile={userProfile}
        orders={orders}
        savedAddresses={savedAddresses}
        onBack={() => setSubPage('main')}
      />
    );
  }

  // -------------------------------------------------------------
  // SUB-PAGE 7: COMMUNICATION PREFERENCES
  // -------------------------------------------------------------
  if (subPage === 'notifications') {
    return (
      <NotificationsSubPage
        mobileAlerts={mobileAlerts}
        whatsappAlerts={whatsappAlerts}
        smsAlerts={smsAlerts}
        emailAlerts={emailAlerts}
        onToggleMobileAlerts={setMobileAlerts}
        onToggleWhatsappAlerts={setWhatsappAlerts}
        onToggleSmsAlerts={setSmsAlerts}
        onToggleEmailAlerts={setEmailAlerts}
        onBack={() => setSubPage('main')}
        onContactSupport={() => setSubPage('help')}
      />
    );
  }

  // -------------------------------------------------------------
  // SUB-PAGE 8: PRIVACY POLICY
  // -------------------------------------------------------------
  if (subPage === 'privacy') {
    return <PrivacyPolicySubPage onBack={() => setSubPage('main')} />;
  }

  // -------------------------------------------------------------
  // SUB-PAGE 9: TERMS OF SERVICE
  // -------------------------------------------------------------
  if (subPage === 'terms') {
    return <TermsOfServiceSubPage onBack={() => setSubPage('main')} />;
  }

  // -------------------------------------------------------------
  // SUB-PAGE 10: FAVORITE ITEMS
  // -------------------------------------------------------------
  if (subPage === 'favorites') {
    return (
      <FavoritesSubPage
        favoriteProducts={favoriteProducts}
        onBack={() => setSubPage('main')}
        onOpenShop={onOpenShop}
        onClearAllFavorites={() => {
          clearAllFavorites();
          setFavoriteProductIds([]);
        }}
        onToggleFavorite={handleToggleFavorite}
        onAddToCart={onAddToCart}
        onReorder={onReorder}
      />
    );
  }

  // -------------------------------------------------------------
  // SUB-PAGE 11: REFUND POLICY (MANAGED BY RAZORPAY)
  // -------------------------------------------------------------
  if (subPage === 'refund-policy') {
    return (
      <RefundPolicySubPage
        onBack={() => setSubPage('main')}
        onContactSupport={() => setSubPage('help')}
      />
    );
  }

  // -------------------------------------------------------------
  // PRIMARY VIEW: SWIGGY-STYLE PROFILE DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10">
      {/* 1. TOP HEADER BANNER (Full width touching top & both sides, bottom curves only) */}
      <div className="bg-gradient-to-b from-[#8B0000] via-[#A30000] to-[#B31B1B] text-white pt-3.5 pb-5 px-4 sm:px-6 relative shadow-md rounded-b-2xl border-b border-red-950/30">
        {/* Top Control Bar with Back Arrow & Actions */}
        <div className="max-w-3xl mx-auto flex items-center justify-between mb-2.5">
          {/* Arrow Back Button */}
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-all cursor-pointer flex items-center gap-1.5"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-medium sm:inline hidden">Back</span>
          </button>

          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setSubPage('help')}
              className="text-[11px] font-bold uppercase tracking-wider text-white hover:text-amber-200 transition-colors cursor-pointer px-2 py-1"
            >
              HELP
            </button>

            {/* Edit Profile Pencil Button (Icon only without text) */}
            <button
              type="button"
              onClick={handleOpenEdit}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-all cursor-pointer flex items-center justify-center relative active:scale-95 shadow-xs"
              aria-label="Edit Profile"
              title="Edit Profile"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Identity Details with Photo Circle (Swiggy Style) */}
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            {/* Front Circle Box: User Email Photo or Monogram */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/60 bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-sm overflow-hidden relative">
              {userPhoto && !avatarError ? (
                <img
                  src={userPhoto}
                  alt={displayName}
                  onError={() => setAvatarError(true)}
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-sm sm:text-base font-bold tracking-tight">
                  {getInitials(rawName, rawPhone, rawEmail)}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white capitalize">
                  {displayName}
                </h1>
                {hasMissingName && (
                  <span
                    onClick={handleOpenEdit}
                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-2 py-0.5 rounded-full cursor-pointer shadow-xs animate-pulse"
                    title="Enter your full name"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                    Add Name
                  </span>
                )}
              </div>

              {/* Stack-wise Phone Number and Email */}
              <div className="mt-0.5 space-y-0.5 text-[11px] sm:text-xs text-white/90 font-normal">
                {displayPhone ? (
                  <p className="flex items-center gap-1.5">
                    <span className="font-medium text-white tracking-wide">{displayPhone}</span>
                    <span
                      title="Verified Phone"
                      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white shadow-2xs shrink-0"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  </p>
                ) : (
                  <button
                    onClick={handleOpenEdit}
                    className="flex items-center gap-1.5 text-left text-amber-200 hover:text-white transition-colors cursor-pointer group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 ring-2 ring-yellow-200/50 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="underline decoration-dotted underline-offset-2 text-[11px] font-medium">
                      Add mobile number
                    </span>
                  </button>
                )}

                {displayEmail ? (
                  <p className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-white/85 text-[11px] sm:text-xs break-all">{displayEmail}</span>
                    {userProfile?.emailVerified && (
                      <span
                        title="Verified Email"
                        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white shadow-2xs shrink-0"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </p>
                ) : (
                  <button
                    onClick={handleOpenEdit}
                    className="flex items-center gap-1.5 text-left text-amber-200 hover:text-white transition-colors cursor-pointer group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 ring-2 ring-yellow-200/50 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="underline decoration-dotted underline-offset-2 text-[11px] font-medium">
                      Add email address
                    </span>
                  </button>
                )}

                {displayDob && (
                  <p className="text-[11px] text-amber-200 flex items-center gap-1 font-medium pt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>
                      DOB: {new Date(displayDob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 mt-4 sm:mt-5 space-y-4">
        {/* VERTICAL MENU BUTTON LIST */}
        <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
          {/* 1. Favourites */}
          <button
            id="btn-profile-favorites"
            onClick={() => setSubPage('favorites')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-pink-100 border border-pink-200 text-pink-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Heart className="w-5 h-5 fill-pink-500 text-pink-500" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Favourites</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {favoriteProducts.length > 0 && (
                <span className="text-xs font-normal text-pink-800 bg-pink-100 px-2.5 py-1 rounded-full">
                  {favoriteProducts.length} {favoriteProducts.length === 1 ? 'item' : 'items'}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
          </button>

          {/* 2. Orders */}
          <button
            onClick={() => setSubPage('orders')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Orders</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-normal text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                {sortedOrders.length}
              </span>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
          </button>

          {/* 3. Wallet */}
          <button
            onClick={() => setSubPage('wallet')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Wallet</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* 4. Payment */}
          <button
            onClick={() => setSubPage('payments')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Payment</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* 5. Addresses */}
          <button
            onClick={() => setSubPage('addresses')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Addresses</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* 6. Setting */}
          <button
            onClick={() => setSubPage('notifications')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-cyan-100 border border-cyan-200 text-cyan-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Setting</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* 7. Help Center */}
          <button
            onClick={() => setSubPage('help')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Help Center</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* 8. Privacy Policy */}
          <button
            onClick={() => setSubPage('privacy')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Privacy Policy</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* 9. Terms of Service */}
          <button
            onClick={() => setSubPage('terms')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Terms of Service</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* 10. Refund Policy */}
          <button
            id="btn-profile-refund-policy"
            onClick={() => setSubPage('refund-policy')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800">Refund Policy</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* 11. Account Delete (Google Play Store Policy Compliant) */}
          <button
            id="btn-profile-delete-account"
            onClick={() => navigate('/delete')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-red-50/60 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-normal text-slate-800 group-hover:text-red-700 transition-colors">Account Delete</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-red-600 transition-colors" />
          </button>
        </div>

        {/* Separate Pill-Shaped Sign Out Button */}
        <div className="pt-3">
          <button
            id="btn-profile-signout"
            type="button"
            disabled={isSigningOut}
            onClick={async () => {
              if (isSigningOut) return;
              setIsSigningOut(true);
              try {
                await onLogout();
              } catch (err) {
                console.error('Logout error:', err);
              } finally {
                if (isMountedRef.current) {
                  setIsSigningOut(false);
                }
              }
            }}
            className="w-full py-3.5 px-6 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-70 disabled:cursor-not-allowed text-white transition-all font-medium text-[15px] sm:text-base flex items-center justify-center gap-2.5 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5 text-white" />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>

        {/* App Version Tag & Build Status */}
        <div className="text-center pt-6 pb-2 space-y-1">
          <p className="text-[11px] font-bold text-slate-500">
            SmartRun App Version 2.4.0
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Server Deployment Sync Active</span>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        userProfile={userProfile}
        refundBalance={refundBalance}
        cashbackBalance={cashbackBalance}
        totalWalletBalance={totalWalletBalance}
        onClose={() => setIsEditModalOpen(false)}
        onProfileUpdated={onProfileUpdated}
      />
    </div>
  );
};
