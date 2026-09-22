import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Trash2,
  Bookmark,
  Plus,
  Minus,
  MapPin,
  ShoppingBag,
  ShieldCheck,
  Tag,
  CheckCircle2,
  ArrowLeft,
  Truck,
  CreditCard,
  Smartphone,
  Banknote,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  AlertCircle,
  Sparkles,
  LogIn,
  Compass,
  Check,
  Phone,
  PhoneCall,
  FileText,
  Clock,
  Edit2,
  Receipt,
  X,
  Building2,
  Lock
} from 'lucide-react';
import { CartItem, KolkataArea, Order, SavedAddress, Product, UserProfile, FeePolicySettings } from '../types';
import { SwipeableItem } from './SwipeableItem';
import { createFirestoreOrder, getStoredAddresses, cleanPhoneAutofill, generateUUID, ACTIVE_SAVED_ADDRESS_KEY, getActiveAddressStorageKey, safeGetItem } from '../services/supabaseService';
import { generateSecureOrderNumber } from '../utils/cryptoHelper';
import { notifyOrderPlaced } from '../services/emailService';
import { getFeeSettings, calculateOrderFees, DEFAULT_FEE_SETTINGS } from '../services/feeService';
import { INDIAN_STANDARD_WIRE_COLORS, PIPE_COLOR_OPTIONS, getProductColorOptions } from '../data/wireColors';
import { trackBeginCheckout, trackPurchase } from '../utils/analytics';
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
  hapticWarning,
  hapticError,
  hapticSelection
} from '../utils/haptics';
import {
  Offer,
  validateAndCalculateCoupon,
  fetchActiveStorefrontOffers,
  getCachedOffers
} from '../services/offerService';
import {
  syncCartItemToSupabase,
  removeCartItemFromSupabase,
  clearCartInSupabase,
  saveItemForLater,
  removeSavedItem,
  fetchSavedItemsFromSupabase,
  SavedItemRecord
} from '../services/cartService';
import { launchRazorpayCheckout } from '../services/razorpayService';
import confetti from 'canvas-confetti';

interface CartViewProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number, color?: string) => void;
  onUpdateItemColor?: (productId: string, oldColor: string | undefined, newColor: string) => void;
  onRemoveItem: (productId: string, color?: string) => void;
  onClearCart: () => void;
  currentArea: KolkataArea;
  activeAddress?: SavedAddress | null;
  savedAddresses?: SavedAddress[];
  onOpenLocationModal: () => void;
  userPhone: string | null;
  userProfile?: UserProfile | null;
  onOpenAuth?: () => void;
  onOrderPlaced: (order: Order) => void;
  onContinueShopping: () => void;
  onAddToCart?: (product: Product) => void;
}

// Official Payment Badges compliant with NPCI & RBI regulations
const RazorpayLogoBadge = () => (
  <div className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white flex items-center gap-1.5 shadow-2xs select-none">
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M4 3h16l-7 18H7l4-10H5L4 3z" fill="#0C2340" />
      <path d="M12.5 11l-3 7.5h2.5l2.2-5.5h-1.7z" fill="#0284C7" />
    </svg>
    <span className="text-xs font-black tracking-tight text-[#0C2340]">Razorpay</span>
  </div>
);

const NpciVerifiedBadge = () => (
  <div className="h-6 px-2 rounded-md bg-emerald-50 border border-emerald-200/80 flex items-center gap-1 select-none">
    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2]" />
    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">NPCI Certified</span>
  </div>
);

const CodBadge = () => (
  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 select-none shadow-2xs">
    <Banknote className="w-4.5 h-4.5 text-emerald-700 stroke-[1.8]" />
  </div>
);

export const CartView = ({
  items,
  onUpdateQuantity,
  onUpdateItemColor,
  onRemoveItem,
  onClearCart,
  currentArea,
  activeAddress,
  savedAddresses = [],
  onOpenLocationModal,
  userPhone,
  userProfile,
  onOpenAuth,
  onOrderPlaced,
  onContinueShopping,
  onAddToCart
}) => {
  const navigate = useNavigate();
  // Active Category Filter Tab
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Saved for Later List
  const [savedItems, setSavedItems] = useState<SavedItemRecord[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Price details expandable toggles
  const [isFeesExpanded, setIsFeesExpanded] = useState(false);
  const [isDiscountsExpanded, setIsDiscountsExpanded] = useState(false);
  const [showPriceInfoTooltip, setShowPriceInfoTooltip] = useState(false);
  const [isBillDropdownOpen, setIsBillDropdownOpen] = useState(true);

  // Quick edit modals for contact, instructions, and scheduling
  const [isEditingContactModal, setIsEditingContactModal] = useState(false);
  const [isEditingInstructionsModal, setIsEditingInstructionsModal] = useState(false);
  const [isSchedulingModal, setIsSchedulingModal] = useState(false);
  const [selectedScheduleSlot, setSelectedScheduleSlot] = useState('Earliest Delivery (Within 1 Day)');
  const [deliveryPartnerInstructions, setDeliveryPartnerInstructions] = useState('');

  // Verification Prompt Modals before Checkout
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [showAddressRequiredModal, setShowAddressRequiredModal] = useState(false);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'all' | 'single'>('all');
  const [singleCheckoutItem, setSingleCheckoutItem] = useState<CartItem | null>(null);
  const [feeSettings, setFeeSettings] = useState<FeePolicySettings>(DEFAULT_FEE_SETTINGS);

  // Fetch dynamic fee policy from backend on mount
  useEffect(() => {
    getFeeSettings().then((res) => {
      if (res) setFeeSettings(res);
    });
  }, []);

  // Derive the active/effective saved address
  const effectiveAddress = useMemo(() => {
    if (activeAddress) return activeAddress;
    if (savedAddresses && savedAddresses.length > 0) return savedAddresses[0];
    const stored = getStoredAddresses();
    if (stored.length > 0) return stored[0];
    return null;
  }, [activeAddress, savedAddresses]);

  // Formatted confirmed 1-line address string
  const confirmedAddressOneLine = useMemo(() => {
    if (effectiveAddress) {
      const parts = [
        effectiveAddress.receiverName || (userProfile?.name && userProfile.name.toLowerCase() !== 'customer' ? userProfile.name : ''),
        effectiveAddress.houseFlat,
        effectiveAddress.houseName,
        effectiveAddress.buildingRoad,
        effectiveAddress.area?.name || currentArea.name,
        effectiveAddress.area?.pincode ? `PIN ${effectiveAddress.area.pincode}` : `PIN ${currentArea.pincode}`
      ].filter(Boolean);
      return parts.join(', ');
    }
    return `${currentArea.exactStreet || currentArea.name}, Kolkata - ${currentArea.pincode}`;
  }, [effectiveAddress, currentArea, userProfile]);

  // Checkout Form Details
  const [customerName, setCustomerName] = useState(() => {
    if (userProfile?.name && userProfile.name.toLowerCase() !== 'customer') return userProfile.name;
    if (effectiveAddress?.receiverName) return effectiveAddress.receiverName;
    return '';
  });
  const [phone, setPhone] = useState(() => {
    return userProfile?.phone || userPhone || effectiveAddress?.receiverPhone || '';
  });
  const [email, setEmail] = useState(() => {
    return userProfile?.email || '';
  });
  const [address, setAddress] = useState(() => {
    if (effectiveAddress) {
      return [effectiveAddress.houseFlat, effectiveAddress.houseName, effectiveAddress.buildingRoad].filter(Boolean).join(', ');
    }
    return '';
  });
  const [landmark, setLandmark] = useState(() => {
    return effectiveAddress?.landmark || '';
  });
  // Payment method: 'cash' (Cash on Delivery), 'online' (UPI / NetBanking), or 'card' (Debit / Credit Cards)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'card'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(0);
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  // Synchronize address updates if effectiveAddress or userProfile prop changes
  useEffect(() => {
    if (effectiveAddress) {
      if (effectiveAddress.receiverName) setCustomerName(effectiveAddress.receiverName);
      if (effectiveAddress.receiverPhone) setPhone(effectiveAddress.receiverPhone);
      const full = [effectiveAddress.houseFlat, effectiveAddress.houseName, effectiveAddress.buildingRoad].filter(Boolean).join(', ');
      if (full) setAddress(full);
      if (effectiveAddress.landmark) setLandmark(effectiveAddress.landmark);
    } else if (userProfile) {
      if (userProfile.name && !customerName) setCustomerName(userProfile.name);
      if (userProfile.phone && !phone) setPhone(userProfile.phone);
      if (userProfile.email && !email) setEmail(userProfile.email);
    }
  }, [effectiveAddress, userProfile]);

  // Load Saved for Later items
  useEffect(() => {
    let isMounted = true;
    setLoadingSaved(true);
    fetchSavedItemsFromSupabase()
      .then((data) => {
        if (isMounted) setSavedItems(data);
      })
      .finally(() => {
        if (isMounted) setLoadingSaved(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute Categories present in Cart
  const categoriesInCart = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      const cat = item.product.category || 'electrical';
      map.set(cat, (map.get(cat) || 0) + item.quantity);
    });
    return Array.from(map.entries()).map(([cat, count]) => ({
      key: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      count
    }));
  }, [items]);

  const hasMultipleCategories = categoriesInCart.length > 1;

  // Filtered items based on active category tab
  const displayedItems = useMemo(() => {
    if (selectedCategory === 'all') return items;
    return items.filter((item) => (item.product.category || 'electrical') === selectedCategory);
  }, [items, selectedCategory]);

  // Price Calculations (Computed dynamically)
  const activeItemsForBill = checkoutMode === 'single' && singleCheckoutItem ? [singleCheckoutItem] : items;

  const totalMRP = useMemo(() => {
    return activeItemsForBill.reduce((acc, curr) => {
      const mrp = Number(curr.product.originalPrice || curr.product.price || 0);
      return acc + mrp * curr.quantity;
    }, 0);
  }, [activeItemsForBill]);

  const totalSellingPrice = useMemo(() => {
    return activeItemsForBill.reduce((acc, curr) => {
      return acc + Number(curr.product.price || 0) * curr.quantity;
    }, 0);
  }, [activeItemsForBill]);

  const totalProductDiscount = Math.max(0, totalMRP - totalSellingPrice);
  const feeBreakdown = useMemo(() => {
    return calculateOrderFees(activeItemsForBill, feeSettings);
  }, [activeItemsForBill, feeSettings]);

  const deliveryFee = feeBreakdown.deliveryFee;
  const handlingFee = feeBreakdown.handlingFee;
  const rainFee = feeBreakdown.rainFee;
  const surgeFee = feeBreakdown.surgeFee;
  const productHandlingFee = feeBreakdown.totalProductCharges;
  const fees = feeBreakdown.totalFees;
  const totalSavings = totalProductDiscount + discountApplied;
  const finalTotalAmount = Math.max(0, totalSellingPrice + fees - discountApplied);

  // Track Begin Checkout
  useEffect(() => {
    if (items.length > 0) {
      trackBeginCheckout(items, finalTotalAmount);
    }
  }, []);

  // Handle Save for Later
  const handleSaveForLater = async (product: Product) => {
    hapticWarning();
    const updated = await saveItemForLater(product);
    setSavedItems(updated);
    onRemoveItem(product.id, product.selectedColor);
  };

  // Move from Saved to Cart
  const handleMoveToCart = async (saved: SavedItemRecord) => {
    hapticMedium();
    if (onAddToCart) {
      onAddToCart(saved.product);
    } else {
      onUpdateQuantity(saved.product.id, 1);
    }
    const updated = await removeSavedItem(saved.productId);
    setSavedItems(updated);
  };

  // Delete Saved Item
  const handleDeleteSavedItem = async (productId: string) => {
    hapticWarning();
    const updated = await removeSavedItem(productId);
    setSavedItems(updated);
  };

  // Handle Single Item "Buy this now"
  const handleBuyThisNow = (item: CartItem) => {
    hapticMedium();
    // 1. Gated: Must be logged in first
    const isLoggedIn = Boolean(
      userProfile?.id ||
      userProfile?.phone ||
      userProfile?.email ||
      userPhone
    );

    if (!isLoggedIn) {
      hapticError();
      setShowLoginRequiredModal(true);
      return;
    }

    // 2. Gated: Check delivery address availability
    const hasAddress = Boolean(
      effectiveAddress ||
      (address && address.trim().length >= 3) ||
      (savedAddresses && savedAddresses.length > 0) ||
      getStoredAddresses().length > 0 ||
      safeGetItem(getActiveAddressStorageKey(userProfile)) ||
      safeGetItem(ACTIVE_SAVED_ADDRESS_KEY)
    );

    if (!hasAddress) {
      hapticError();
      setShowAddressRequiredModal(true);
      return;
    }

    setSingleCheckoutItem(item);
    setCheckoutMode('single');
    setPaymentMethod('cash'); // Default to cash
    setIsCheckoutOpen(true);
  };

  // Handle Full Cart "Place Order"
  const handleOpenFullCheckout = () => {
    if (items.length === 0) return;

    // 1. Gated: Must be logged in first
    const isLoggedIn = Boolean(
      userProfile?.id ||
      userProfile?.phone ||
      userProfile?.email ||
      userPhone
    );

    if (!isLoggedIn) {
      hapticError();
      setShowLoginRequiredModal(true);
      return;
    }

    // 2. Gated: Check delivery address availability
    const hasAddress = Boolean(
      effectiveAddress ||
      (address && address.trim().length >= 3) ||
      (savedAddresses && savedAddresses.length > 0) ||
      getStoredAddresses().length > 0 ||
      safeGetItem(getActiveAddressStorageKey(userProfile)) ||
      safeGetItem(ACTIVE_SAVED_ADDRESS_KEY)
    );

    if (!hasAddress) {
      hapticError();
      setShowAddressRequiredModal(true);
      return;
    }

    hapticMedium();
    setCheckoutMode('all');
    setSingleCheckoutItem(null);
    setPaymentMethod('cash'); // Default to cash
    setIsCheckoutOpen(true);
  };

  // Apply Dynamic Promo Coupon fresh from store at the moment of submission
  const handleApplyPromo = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);
    const code = (customCode !== undefined ? customCode : promoCode).trim().toUpperCase();
    if (!code) {
      hapticError();
      setCouponError('Please enter a coupon code.');
      return;
    }

    setIsApplyingPromo(true);
    try {
      // 1. Fetch fresh active offers directly from database at submit time (not relying on stale state)
      const freshOffersData = await fetchActiveStorefrontOffers();

      // 2. Validate and calculate discount with fresh offers
      const orderItems = checkoutMode === 'single' && singleCheckoutItem ? [singleCheckoutItem] : items;
      const result = validateAndCalculateCoupon(
        code,
        orderItems,
        totalSellingPrice,
        freshOffersData.offers,
        freshOffersData.offerProducts
      );

      if (!result.success) {
        hapticError();
        setCouponError(result.message || 'Invalid coupon code or not applicable to items in cart.');
        setDiscountApplied(0);
        setAppliedOffer(null);
      } else {
        hapticSuccess();
        setPromoCode(code);
        setDiscountApplied(result.discountAmount);
        setAppliedOffer(result.offer || null);
        setCouponSuccess(result.message || `Coupon ${code} applied successfully! Saved ₹${result.discountAmount}.`);
      }
    } catch (err) {
      hapticError();
      console.error('Error validating coupon with fresh storefront offers:', err);
      setCouponError('Unable to validate coupon at this moment. Please try again.');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemoveCoupon = () => {
    hapticWarning();
    setDiscountApplied(0);
    setAppliedOffer(null);
    setPromoCode('');
    setCouponSuccess(null);
    setCouponError(null);
  };

  const finishOrderCreation = async (
    orderToCreate: Order
  ) => {
    const orderItems = checkoutMode === 'single' && singleCheckoutItem ? [singleCheckoutItem] : items;
    try {
      setIsSubmitting(true);

      // Step 1: Insert order and order_items into Supabase
      const created = await createFirestoreOrder(orderToCreate);

      // Step 3: Only after successful insertion of both order & all order_items, clear cart
      if (checkoutMode === 'all') {
        try {
          await clearCartInSupabase();
        } catch (clearErr) {
          console.warn('Supabase cart clear note:', clearErr);
        }
        onClearCart();
      } else if (singleCheckoutItem) {
        try {
          await removeCartItemFromSupabase(singleCheckoutItem.product.id);
        } catch (removeErr) {
          console.warn('Supabase remove item note:', removeErr);
        }
        onRemoveItem(singleCheckoutItem.product.id, singleCheckoutItem.selectedColor);
      }

      // Track GA4 Purchase Event
      trackPurchase(created, orderItems, orderToCreate.totalAmount, deliveryFee);

      // Trigger backend automated Admin Alert (Email + WhatsApp) & Customer Invoice
      notifyOrderPlaced(created, email.trim()).catch((e) =>
        console.warn('Backend order notification notice:', e)
      );

      // Celebrate with confetti & haptics
      hapticSuccess();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // Safe fallback
      }

      setIsCheckoutOpen(false);
      onOrderPlaced(created);
    } catch (err: any) {
      hapticError();
      console.error('Failed to place order:', err);
      setCheckoutError(err?.message || 'An error occurred while placing your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Place Order Submission
  const handlePlaceOrder = async (e?: React.FormEvent, overrideOption?: typeof paymentMethod) => {
    if (e && e.preventDefault) e.preventDefault();
    const activeOption = overrideOption || paymentMethod;
    const orderItems = checkoutMode === 'single' && singleCheckoutItem ? [singleCheckoutItem] : items;
    if (orderItems.length === 0) return;

    const resolvedAddress =
      address.trim() ||
      (effectiveAddress ? [effectiveAddress.houseFlat, effectiveAddress.houseName, effectiveAddress.buildingRoad].filter(Boolean).join(', ') : '') ||
      (() => {
        const stored = safeGetItem(getActiveAddressStorageKey(userProfile)) || safeGetItem(ACTIVE_SAVED_ADDRESS_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (typeof parsed === 'string') return parsed;
            return [parsed.houseFlat, parsed.houseName, parsed.buildingRoad].filter(Boolean).join(', ') || parsed.formattedExactAddress || '';
          } catch {
            return stored;
          }
        }
        return '';
      })() ||
      currentArea.name;
    const resolvedPhone =
      phone.trim() ||
      userProfile?.phone ||
      userPhone ||
      effectiveAddress?.receiverPhone ||
      '';
    const resolvedName =
      customerName.trim() ||
      effectiveAddress?.receiverName ||
      userProfile?.name ||
      'Customer';

    setCheckoutError(null);
    if (!resolvedPhone || !resolvedName || !resolvedAddress) {
      hapticError();
      setCheckoutError('Please provide your name, 10-digit mobile phone number, and delivery address.');
      return;
    }

    setIsSubmitting(true);

    const recipientName = resolvedName;
    const recipientPhone = resolvedPhone.startsWith('+91') ? resolvedPhone : `+91 ${resolvedPhone}`;
    const recipientEmail = email.trim() || userProfile?.email || undefined;
    const addressLine1 = effectiveAddress?.houseFlat
      ? [effectiveAddress.houseFlat, effectiveAddress.houseName].filter(Boolean).join(', ')
      : resolvedAddress;
    const addressLine2 = effectiveAddress?.buildingRoad || currentArea.name || 'Kolkata';
    const city = effectiveAddress?.area?.name ? 'Kolkata' : (currentArea.name || 'Kolkata');
    const state = 'West Bengal';
    const pincode = currentArea.pincode || effectiveAddress?.area?.pincode || '700042';
    const addressLabel = effectiveAddress?.tagLabel || (effectiveAddress?.tag ? effectiveAddress.tag.toUpperCase() : 'Home');
    const deliveryNotes = landmark.trim() || effectiveAddress?.landmark || undefined;
    const subtotal = totalSellingPrice;
    const discountAmount = discountApplied;
    const fees = deliveryFee + handlingFee;
    const couponCode = promoCode.trim() ? promoCode.trim().toUpperCase() : null;

    const orderUuid = generateUUID();
    const humanOrderNumber = generateSecureOrderNumber();

    let paymentId: string | undefined = undefined;
    let razorpayOrderId: string | undefined = undefined;
    let razorpaySignature: string | undefined = undefined;
    let isPaymentVerified = false;

    const isCod = activeOption === 'cash' || (activeOption as any) === 'cod';
    const normalizedPaymentMethod: 'cod' | 'upi' | 'card' = isCod
      ? 'cod'
      : activeOption === 'card'
      ? 'card'
      : 'upi';

    // If online or card payment, launch Razorpay standard checkout
    if (!isCod) {
      try {
        const paymentRes = await launchRazorpayCheckout({
          amount: finalTotalAmount,
          customerName: recipientName,
          customerPhone: resolvedPhone.replace(/[^0-9]/g, '').slice(-10),
          customerEmail: recipientEmail,
          description: `Order ${humanOrderNumber} (${orderItems.length} items)`,
          preferredMethod: activeOption === 'card' ? 'card' : undefined
        });
        paymentId = paymentRes.paymentId;
        razorpayOrderId = paymentRes.orderId;
        razorpaySignature = paymentRes.signature;
        isPaymentVerified = Boolean(paymentRes.verified);
      } catch (payErr: any) {
        hapticError();
        setIsSubmitting(false);
        setCheckoutError(
          payErr?.message || 'Razorpay checkout could not be opened or payment was cancelled. Please check your network and Razorpay configuration, or select Cash on Delivery.'
        );
        return;
      }
    }

    const newOrder: Order = {
      id: orderUuid,
      userId: userProfile?.id || undefined,
      user_id: userProfile?.id || undefined,
      trackingNumber: humanOrderNumber,
      customerName: recipientName,
      recipientName,
      phone: recipientPhone,
      recipientPhone,
      customerEmail: recipientEmail,
      recipientEmail,
      address: [addressLine1, addressLine2, landmark.trim()].filter(Boolean).join(', '),
      addressLine1,
      addressLine2,
      city,
      state,
      area: currentArea.name,
      pincode,
      addressLabel,
      landmark: deliveryNotes,
      deliveryNotes,
      items: [...orderItems],
      itemTotal: subtotal,
      subtotal,
      deliveryFee,
      handlingFee,
      rainFee,
      surgeFee,
      productHandlingFee,
      fees,
      feeBreakdown,
      discount: discountAmount,
      discountAmount,
      couponCode,
      totalAmount: finalTotalAmount,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: !isCod && isPaymentVerified ? 'paid' : 'pending',
      paymentId,
      razorpayPaymentId: paymentId,
      razorpayOrderId,
      razorpaySignature,
      razorpay_payment_id: paymentId,
      razorpay_order_id: razorpayOrderId,
      razorpay_signature: razorpaySignature,
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedDeliveryTimestamp: Date.now() + currentArea.deliveryMinutes * 60 * 1000,
      deliveryPartner: undefined
    };

    await finishOrderCreation(newOrder);
  };

  // ==========================================================================
  // EMPTY CART STATE
  // ==========================================================================
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-16">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-6">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  onContinueShopping();
                }
              }}
              className="p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Cart
            </h1>
          </div>

          <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-8">
            <div className="max-w-md w-full text-center p-4 sm:p-6">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-amber-100 shadow-inner">
                <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Your cart is empty</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto">
                <button
                  onClick={onContinueShopping}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black py-3 px-4 rounded-xl shadow-xs transition active:scale-98 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer border border-amber-500/30 whitespace-nowrap"
                >
                  <Zap className="w-4 h-4 fill-slate-950 shrink-0" />
                  <span>Electrical Items</span>
                </button>
                <button
                  onClick={() => navigate('/construction')}
                  className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl shadow-2xs transition active:scale-98 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer border border-slate-200 whitespace-nowrap"
                >
                  <Building2 className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>Construction Items</span>
                </button>
              </div>
            </div>

            {/* Saved for Later in Empty State */}
            {savedItems.length > 0 && (
              <div className="max-w-2xl w-full mt-10 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <Bookmark className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-black text-slate-900">Saved for Later ({savedItems.length})</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {savedItems.map((saved) => (
                    <div key={saved.id} className="py-3.5 flex items-center gap-4 justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={saved.product.image || 'https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=200&auto=format&fit=crop'}
                          alt={saved.product.name}
                          className="w-14 h-14 object-contain rounded-xl bg-slate-50 border border-slate-100 p-1"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{saved.product.name}</h4>
                          <p className="text-xs text-slate-400">{saved.product.brand}</p>
                          <p className="text-sm font-black text-slate-900 mt-0.5">₹{saved.product.price}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMoveToCart(saved)}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                        >
                          Move to Cart
                        </button>
                        <button
                          onClick={() => handleDeleteSavedItem(saved.productId)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // FULL CART VIEW LAYOUT
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-36 font-sans">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        
        {/* 1. HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  onContinueShopping();
                }
              }}
              className="p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Cart
            </h1>
            <span className="text-xs font-black bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
              {items.reduce((sum, i) => sum + i.quantity, 0)} Items
            </span>
          </div>

          <button
            onClick={onClearCart}
            className="text-xs font-bold text-slate-400 hover:text-rose-600 transition px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
          >
            Clear All
          </button>
        </div>

        {/* 2. CATEGORY TABS (Shown only if more than 1 category exists in the cart) */}
        {hasMultipleCategories && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
            <button
              onClick={() => {
                hapticSelection();
                setSelectedCategory('all');
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer border ${
                selectedCategory === 'all'
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              All Items ({items.reduce((s, i) => s + i.quantity, 0)})
            </button>
            {categoriesInCart.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  hapticSelection();
                  setSelectedCategory(cat.key);
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer border ${
                  selectedCategory === cat.key
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>
        )}

        {/* 3.1 OUT OF STOCK INVENTORY NOTICE (Shown if any estimated/custom item is out of stock) */}
        {items.some(
          (i) => i.product.inStock === false || (i.product.stockCount !== undefined && i.product.stockCount <= 0)
        ) && (
          <div className="mb-4 p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-2xl flex items-start justify-between gap-3 text-xs text-rose-950 shadow-2xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-rose-900">Items Out of Local Stock</p>
                <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                  One or more estimated materials are not present in our immediate depot inventory. You can place your order for in-stock items or inquire on WhatsApp for same-day factory procurement.
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/918777400280?text=Hi%20Giriraj%20Power%20Kasba%20Depot,%20I%20have%20materials%20in%20my%20cart%20that%20need%20custom%20factory%20procurement."
              target="_blank"
              rel="noreferrer"
              className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-2xs transition active:scale-95"
            >
              WhatsApp
            </a>
          </div>
        )}

        {/* 4. CART ITEM LIST - Consolidated Single Box */}
        {stockWarning && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold text-amber-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{stockWarning}</span>
            </div>
            <button
              onClick={() => setStockWarning(null)}
              className="text-amber-700 hover:text-amber-900 p-1 font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 mb-5 overflow-hidden">
          {displayedItems.map((item) => {
            const product = item.product;
            const mrp = Number(product.originalPrice || product.price || 0);
            const price = Number(product.price || 0);
            const discountPct =
              product.discountPercentage || (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
            const isOutOfStock = product.inStock === false || (product.stockCount !== undefined && product.stockCount <= 0);
            const stockQty = isOutOfStock ? 0 : Number(product.stockCount || 50);
            const isLowStock = !isOutOfStock && stockQty > 0 && stockQty <= 5;

            // Compute available color options for this product
            const availableColors = getProductColorOptions(product);
            const hasColorOptions = availableColors.length > 0;
            const currentColor = item.selectedColor || product.selectedColor || (hasColorOptions ? availableColors[0].name : undefined);
            const currentColorObj = hasColorOptions ? availableColors.find((c) => c.name === currentColor) || availableColors[0] : null;

            return (
              <SwipeableItem
                key={`${product.id}-${item.selectedColor || 'default'}`}
                onDelete={() => {
                  onRemoveItem(product.id, item.selectedColor);
                  removeCartItemFromSupabase(product.id);
                }}
                deleteLabel="Remove"
              >
                <div
                  className="p-3 sm:p-4 flex flex-col gap-2 transition-colors hover:bg-slate-50/50"
                >
                {/* Main Product Info Row */}
                <div className="flex items-start gap-2.5 sm:gap-4">
                  {/* Thumbnail Image */}
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0 flex items-center justify-center overflow-hidden relative">
                    <img
                      src={product.image || 'https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=400&auto=format&fit=crop'}
                      alt={product.name}
                      className={`w-full h-full object-contain mix-blend-multiply ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}
                      loading="lazy"
                    />
                    {isOutOfStock && (
                      <span className="absolute inset-x-0 bottom-0 bg-rose-600 text-white text-[8px] sm:text-[9px] font-black uppercase text-center py-0.5 tracking-wider">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xs sm:text-base text-slate-900 line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                      Brand: <span className="text-slate-600 font-semibold">{product.brand || 'Giriraj Genuine'}</span>
                    </p>

                    {/* Price Row with Green Discount Badge */}
                    <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1 flex-wrap">
                      {discountPct > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          ↓{discountPct}% off
                        </span>
                      )}
                      {mrp > price && (
                        <span className="text-[11px] sm:text-sm text-slate-400 line-through">
                          ₹{mrp.toLocaleString('en-IN')}
                        </span>
                      )}
                      <span className="text-sm sm:text-lg font-black text-slate-900">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Stock Status Badge */}
                    {isOutOfStock ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Out of Stock</span>
                        </span>
                        <a
                          href={`https://wa.me/918777400280?text=${encodeURIComponent(
                            `Hi Giriraj Power Kasba Hub, I want to inquire about procuring "${product.name}" (Qty: ${item.quantity} ${product.unit || 'units'}), which is currently out of stock.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition cursor-pointer"
                        >
                          <span>Inquire on WhatsApp</span>
                        </a>
                      </div>
                    ) : isLowStock ? (
                      <p className="text-[11px] sm:text-xs font-bold text-rose-600 mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Only {stockQty} left in stock!
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Stepper + Single Color Selector + Bottom Action Row */}
                <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between flex-wrap gap-2">
                  {/* Left Controls: Quantity Stepper + Single Color Dropdown */}
                  <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] sm:text-xs font-bold text-slate-500">Qty:</span>
                      <div className="flex items-center border border-slate-200 rounded-lg sm:rounded-xl bg-slate-50 overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateQuantity(product.id, -1, item.selectedColor);
                          }}
                          className="p-1 sm:p-1.5 hover:bg-slate-200 text-slate-700 transition cursor-pointer active:bg-slate-300"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                        <span className="px-2 sm:px-3 py-0.5 text-xs font-black text-slate-900 bg-white min-w-[24px] sm:min-w-[28px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isOutOfStock) {
                              setStockWarning('This item is currently out of stock in local inventory.');
                              hapticWarning();
                            } else if (item.quantity < stockQty) {
                              setStockWarning(null);
                              onUpdateQuantity(product.id, 1, item.selectedColor);
                            } else {
                              setStockWarning(`Maximum available stock for ${product.name} is ${stockQty} units.`);
                              hapticWarning();
                            }
                          }}
                          disabled={isOutOfStock || item.quantity >= stockQty}
                          className="p-1 sm:p-1.5 hover:bg-slate-200 text-slate-700 transition cursor-pointer active:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={isOutOfStock ? 'Out of stock' : 'Increase quantity'}
                        >
                          <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Single Colour Selector Dropdown (Shown only when colour options are available) */}
                    {hasColorOptions && (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] sm:text-xs font-bold text-slate-500">Colour:</span>
                        <div className="relative inline-flex items-center">
                          <select
                            id={`cart-color-select-${product.id}`}
                            value={currentColor || availableColors[0]?.name}
                            onChange={(e) => {
                              const newCol = e.target.value;
                              if (newCol && newCol !== currentColor) {
                                if (onUpdateItemColor) {
                                  onUpdateItemColor(product.id, item.selectedColor, newCol);
                                } else {
                                  // Fallback: Remove old and add new
                                  onRemoveItem(product.id, item.selectedColor);
                                  syncCartItemToSupabase(product.id, item.quantity, newCol);
                                }
                              }
                            }}
                            className="appearance-none pl-6 pr-6 sm:pl-7 sm:pr-8 py-0.5 sm:py-1 bg-white border border-slate-200 hover:border-blue-400 focus:border-blue-600 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold text-slate-800 shadow-2xs focus:outline-hidden cursor-pointer transition-colors max-w-[130px] sm:max-w-none truncate"
                          >
                            {availableColors.map((col) => (
                              <option key={col.name} value={col.name}>
                                {col.name} {col.shortRole ? `(${col.shortRole})` : ''}
                              </option>
                            ))}
                          </select>

                          {/* Color Dot Visual Indicator */}
                          <span
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-slate-300 absolute left-2 pointer-events-none shadow-2xs"
                            style={{
                              backgroundColor: currentColorObj?.hex || '#94A3B8'
                            }}
                          />

                          {/* Dropdown Chevron */}
                          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 absolute right-1.5 sm:right-2.5 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions: Remove, Save for Later */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onRemoveItem(product.id, item.selectedColor);
                        removeCartItemFromSupabase(product.id);
                      }}
                      className="px-2 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Remove</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveForLater(product)}
                      className="px-2 py-1 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Save for later"
                    >
                      <Bookmark className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">Save for later</span>
                      <span className="sm:hidden">Save</span>
                    </button>
                  </div>
                </div>
              </div>
            </SwipeableItem>
          );
        })}
        </div>

        {/* 5. SAVED FOR LATER SECTION (if any items exist) */}
        {savedItems.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs mb-5">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <Bookmark className="w-4 h-4 text-amber-500" />
              <h3 className="font-black text-sm text-slate-900">Saved For Later ({savedItems.length})</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {savedItems.map((saved) => (
                <div key={saved.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={saved.product.image || 'https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=200&auto=format&fit=crop'}
                      alt={saved.product.name}
                      className="w-12 h-12 object-contain rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{saved.product.name}</h4>
                      <p className="text-xs font-black text-slate-900 mt-0.5">₹{saved.product.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleMoveToCart(saved)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                      Move to Cart
                    </button>
                    <button
                      onClick={() => handleDeleteSavedItem(saved.productId)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. REFERENCE STYLE INFO & BILL CARD (Delivery time, address, name/phone, expandable bill) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden mb-4 divide-y divide-slate-100">
          
          {/* 1. DELIVERY TIME */}
          <div className="p-3.5 sm:p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                <Zap className="w-4 h-4 fill-emerald-600 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-semibold text-slate-800">
                  Delivery in <span className="font-black text-emerald-700">60 min</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSchedulingModal(true)}
                  className="text-xs text-slate-500 hover:text-slate-900 font-medium underline decoration-dashed underline-offset-2 mt-0.5 cursor-pointer text-left block"
                >
                  {selectedScheduleSlot === 'Earliest Delivery (Within 1 Day)' ? 'Change delivery date or time slot' : `Scheduled: ${selectedScheduleSlot}`}
                </button>
              </div>
            </div>
          </div>

          {/* 2. DELIVERY ADDRESS */}
          <div 
            onClick={onOpenLocationModal}
            className="p-3.5 sm:p-4 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg shrink-0 mt-0.5 group-hover:bg-amber-100 group-hover:text-amber-700 transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-900">
                  Delivery at {effectiveAddress?.tagLabel || (effectiveAddress?.tag ? effectiveAddress.tag.charAt(0).toUpperCase() + effectiveAddress.tag.slice(1) : 'Home')}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5 max-w-[280px] sm:max-w-md">
                  {confirmedAddressOneLine}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingInstructionsModal(true);
                  }}
                  className="text-xs text-slate-700 hover:text-black font-semibold underline decoration-dashed underline-offset-2 mt-1 cursor-pointer block text-left"
                >
                  {deliveryPartnerInstructions ? `Note: ${deliveryPartnerInstructions}` : 'Add instructions for delivery partner'}
                </button>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 shrink-0 mt-1" />
          </div>

          {/* 3. NAME & NUMBER */}
          <div
            onClick={() => setIsEditingContactModal(true)}
            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block">
                  {customerName || userProfile?.name || 'Md Noor Hassan'}, {phone || userPhone || '+91-9798881368'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 shrink-0" />
          </div>
        </div>

        {/* 7. TOTAL BILL / BILL DETAILS SECTION (ZOMATO-STYLE ORDER BILL RECEIPT) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs relative overflow-hidden mb-4">
          
          {/* Receipt Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    Order Bill Receipt
                  </h3>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-sans">
                    TAX INVOICE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  SmartRun Express · Doorstep Dispatch
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-600 block">
                {activeItemsForBill.length} {activeItemsForBill.length === 1 ? 'Item' : 'Items'}
              </span>
              <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase">
                Verified
              </span>
            </div>
          </div>

          {/* Itemized Items Breakdown (Zomato Style) */}
          <div className="py-3 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Itemized Order List
            </span>
            {activeItemsForBill.map((item, idx) => {
              const itemPrice = Number(item.product.price || 0);
              const itemMrp = Number(item.product.originalPrice || item.product.price || 0);
              const lineTotal = itemPrice * item.quantity;
              const lineMrpTotal = itemMrp * item.quantity;

              return (
                <div key={item.product.id + (item.selectedColor || '') + idx} className="flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    {/* Zomato-style green indicator square */}
                    <div className="w-3.5 h-3.5 border border-emerald-600 rounded flex items-center justify-center shrink-0 mt-0.5 p-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 leading-snug truncate">
                        {item.product.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">Qty: {item.quantity}</span>
                        {item.selectedColor && (
                          <span className="text-slate-500">· {item.selectedColor}</span>
                        )}
                        {itemMrp > itemPrice && (
                          <span className="line-through text-slate-400">
                            ₹{lineMrpTotal.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 block">
                      ₹{lineTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dashed separator */}
          <div className="border-b border-dashed border-slate-200 my-2" />

          {/* Zomato Cost Breakdown / Bill Details */}
          <div className="py-2 space-y-2 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Bill Details
            </span>

            <div className="flex items-center justify-between text-slate-700">
              <span>Item Total (Subtotal)</span>
              <span className="font-semibold text-slate-900">₹{totalSellingPrice.toLocaleString('en-IN')}</span>
            </div>

            {totalProductDiscount > 0 && (
              <div className="flex items-center justify-between text-emerald-700 font-semibold">
                <span>Item Discount Savings</span>
                <span>-₹{totalProductDiscount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-700">
              <span>Delivery Partner Fee</span>
              {deliveryFee === 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="line-through text-slate-400">₹40</span>
                  <span className="text-emerald-700 font-bold">FREE</span>
                </div>
              ) : (
                <span className="font-semibold text-slate-900">₹{deliveryFee}</span>
              )}
            </div>

            {rainFee > 0 && (
              <div className="flex items-center justify-between text-sky-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <span>🌧️</span>
                  <span>{feeSettings.rainFee?.label || 'Rain Weather Fee'}</span>
                </span>
                <span className="font-semibold">₹{rainFee}</span>
              </div>
            )}

            {surgeFee > 0 && (
              <div className="flex items-center justify-between text-amber-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>{feeSettings.surgeFee?.label || 'Peak Surge Fee'}</span>
                </span>
                <span className="font-semibold">₹{surgeFee}</span>
              </div>
            )}

            {productHandlingFee > 0 && (
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span>📦</span>
                  <span>Special Product Charges</span>
                </span>
                <span className="font-semibold text-slate-800">₹{productHandlingFee}</span>
              </div>
            )}

            {feeBreakdown.customFees.map((cf) => (
              <div key={cf.id} className="flex items-center justify-between text-slate-700">
                <span>{cf.label}</span>
                <span className="font-semibold text-slate-800">₹{cf.amount}</span>
              </div>
            ))}

            <div className="flex items-center justify-between text-slate-700">
              <span>Platform &amp; Packaging Charge</span>
              <div className="flex items-center gap-1.5">
                <span className="line-through text-slate-400">₹15</span>
                <span className="text-emerald-700 font-bold">FREE (Waived)</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span>Handling Charges</span>
              <span className="font-semibold text-slate-800">
                {handlingFee === 0 ? (
                  <span className="text-emerald-700 font-bold uppercase">FREE</span>
                ) : (
                  `₹${handlingFee}`
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span>Govt. Taxes &amp; GST</span>
              <span className="text-slate-500 font-medium">Included in MRP (18%)</span>
            </div>

            {discountApplied > 0 && (
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span>Coupon / Promotional Discount ({appliedOffer?.code || promoCode})</span>
                <span>-₹{discountApplied.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Zomato Perforation Cutout Effect */}
          <div className="relative my-3 -mx-4 sm:-mx-5 flex items-center">
            <div className="w-3.5 h-4 -ml-0.5 rounded-r-full bg-slate-100 border-r border-y border-slate-200" />
            <div className="flex-1 border-b border-dashed border-slate-300 mx-1" />
            <div className="w-3.5 h-4 -mr-0.5 rounded-l-full bg-slate-100 border-l border-y border-slate-200" />
          </div>

          {/* Grand Total (Total Bill) */}
          <div className="pt-1 flex items-baseline justify-between">
            <div>
              <span className="text-xs sm:text-sm font-black uppercase text-slate-900 block">
                Total Bill
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Final payable amount (incl. taxes)
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-slate-950">
                ₹{finalTotalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Total Savings Banner */}
          {totalSavings > 0 && (
            <div className="mt-3.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-bold">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hurray! You save ₹{totalSavings.toLocaleString('en-IN')} on this order</span>
              </div>
            </div>
          )}
        </div>

        {/* 7. CANCELLATION POLICY (Matching reference photo) */}
        <div className="px-4 py-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 mb-6 text-left">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
            CANCELLATION POLICY
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            A 100% cancellation charge will apply once dispatched. This helps compensate our delivery partner for transit.
          </p>
        </div>

        {/* 8. TRUST BADGE ROW */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-3 text-center mb-6">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Safe and secure payments. Easy returns. 100% Authentic products.</span>
        </div>

      </div>

      {/* 9. STICKY BOTTOM BAR (Clean single Place Order button with Total Price) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 px-4 py-3 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-tight">
              Total Payable
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-950 leading-tight">
              ₹{finalTotalAmount.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Proceed to Bill & Pay Button */}
          <button
            type="button"
            onClick={handleOpenFullCheckout}
            className="bg-[#ff3252] hover:bg-[#e6203f] active:scale-[0.98] transition-all text-white font-black py-3 px-6 sm:px-9 rounded-xl shadow-md cursor-pointer text-sm sm:text-base shrink-0 flex items-center gap-1.5"
          >
            <span>Proceed to Pay</span>
            <ChevronRight className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* ========================================================================== */}
      {/* ORDER PAYMENT CHECKOUT PAGE */}
      {/* ========================================================================== */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-[#f4f5f8] overflow-y-auto flex flex-col animate-in fade-in duration-150">
          
          {/* Top Sticky Header: Back Button + Pay + Price */}
          <div className="sticky top-0 z-20 bg-white border-b border-slate-200/90 px-4 py-3 shadow-2xs">
            <div className="max-w-md mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  id="checkout-back-btn"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="p-1 -ml-1 text-slate-800 hover:text-black rounded-full hover:bg-slate-100 cursor-pointer flex items-center justify-center transition-colors shrink-0"
                  title="Back to cart"
                  aria-label="Back to cart"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
                </button>
                <div className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                  Pay
                </div>
              </div>

              {/* Price prominently shown at top header */}
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-0.5">
                  Total Price
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-950 leading-tight">
                  ₹{finalTotalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content Area - Payment Choice Only */}
          <div className="max-w-md mx-auto w-full px-3.5 py-4 space-y-4 pb-28">

            {/* Error banner if any */}
            {checkoutError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Select Payment Option
              </div>

              <div className="space-y-2.5">
                {/* 1. Cash on Delivery */}
                <div
                  id="payment-option-cash"
                  onClick={() => {
                    hapticSelection();
                    setPaymentMethod('cash');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 bg-white shadow-2xs ${
                    paymentMethod === 'cash'
                      ? 'border-[#ff3252] ring-1.5 ring-[#ff3252]/30 bg-red-50/15'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        paymentMethod === 'cash'
                          ? 'border-[#ff3252]'
                          : 'border-slate-300'
                      }`}
                    >
                      {paymentMethod === 'cash' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff3252]" />
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 leading-tight">
                        Cash on Delivery
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Pay with cash or UPI QR at your doorstep
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Online Payment (UPI / NetBanking) */}
                <div
                  id="payment-option-online"
                  onClick={() => {
                    hapticSelection();
                    setPaymentMethod('online');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 bg-white shadow-2xs ${
                    paymentMethod === 'online'
                      ? 'border-[#ff3252] ring-1.5 ring-[#ff3252]/30 bg-red-50/15'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        paymentMethod === 'online'
                          ? 'border-[#ff3252]'
                          : 'border-slate-300'
                      }`}
                    >
                      {paymentMethod === 'online' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff3252]" />
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 leading-tight">
                        Online Payment (UPI)
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Instant UPI (GPay, PhonePe, Paytm), QR Code &amp; NetBanking
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Card (Debit / Credit Cards) */}
                <div
                  id="payment-option-card"
                  onClick={() => {
                    hapticSelection();
                    setPaymentMethod('card');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 bg-white shadow-2xs ${
                    paymentMethod === 'card'
                      ? 'border-[#ff3252] ring-1.5 ring-[#ff3252]/30 bg-red-50/15'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        paymentMethod === 'card'
                          ? 'border-[#ff3252]'
                          : 'border-slate-300'
                      }`}
                    >
                      {paymentMethod === 'card' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff3252]" />
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 leading-tight">
                        Credit / Debit Card
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Visa, Mastercard, RuPay &amp; Maestro
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Simple Sticky Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 px-4 py-3 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]">
            <div className="max-w-md mx-auto">
              <button
                type="button"
                id="pay-submit-order-btn"
                onClick={() => handlePlaceOrder()}
                disabled={isSubmitting}
                className="w-full bg-[#ff3252] hover:bg-[#e6203f] active:scale-[0.99] transition-all text-white font-bold py-3.5 px-6 rounded-xl shadow-sm cursor-pointer text-base flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span>
                    {paymentMethod === 'cash'
                      ? `Place Order • ₹${finalTotalAmount.toLocaleString('en-IN')}`
                      : `Pay ₹${finalTotalAmount.toLocaleString('en-IN')}`}
                  </span>
                )}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================== */}
      {/* QUICK MODALS: CONTACT EDIT, INSTRUCTIONS, SCHEDULING */}
      {/* ========================================================================== */}
      
      {/* Contact Name & Phone Edit Modal */}
      {isEditingContactModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Receiver Details</h3>
              <button
                type="button"
                onClick={() => setIsEditingContactModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Receiver Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number</label>
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(cleanPhoneAutofill(e.target.value))}
                placeholder="Mobile number"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsEditingContactModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Save Contact Details
            </button>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {isEditingInstructionsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Delivery Instructions</h3>
              <button
                type="button"
                onClick={() => setIsEditingInstructionsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Instructions for Rider</label>
              <textarea
                rows={3}
                value={deliveryPartnerInstructions}
                onChange={(e) => setDeliveryPartnerInstructions(e.target.value)}
                placeholder="e.g. Ring bell, leave package with security guard, landmark near school..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none resize-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsEditingInstructionsModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Save Instructions
            </button>
          </div>
        </div>
      )}

      {/* Schedule Delivery Modal */}
      {isSchedulingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Select Delivery Schedule</h3>
              <button
                type="button"
                onClick={() => setIsSchedulingModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {[
                { label: 'Earliest Delivery (Within 1 Day)', tag: 'Fastest' },
                { label: 'Tomorrow Morning (8:00 AM - 12:00 PM)', tag: 'Tomorrow' },
                { label: 'Tomorrow Afternoon (12:00 PM - 4:00 PM)', tag: 'Tomorrow' },
                { label: 'Tomorrow Evening (4:00 PM - 8:00 PM)', tag: 'Tomorrow' },
                { label: 'Day After Tomorrow (Anytime 9 AM - 7 PM)', tag: 'Standard' },
                { label: 'Weekend Delivery (Saturday / Sunday)', tag: 'Weekend' }
              ].map((slotObj) => (
                <div
                  key={slotObj.label}
                  onClick={() => setSelectedScheduleSlot(slotObj.label)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                    selectedScheduleSlot === slotObj.label
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="block truncate">{slotObj.label}</span>
                    <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">{slotObj.tag}</span>
                  </div>
                  {selectedScheduleSlot === slotObj.label && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsSchedulingModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer mt-2"
            >
              Confirm Schedule
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================== */}
      {/* 1. LOGIN REQUIRED MODAL (Gated Checkout) */}
      {/* ========================================================================== */}
      {showLoginRequiredModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col text-center border border-slate-100">
            <div className="w-16 h-16 bg-amber-50 border-2 border-amber-200 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <LogIn className="w-8 h-8 stroke-[2.2]" />
            </div>

            <span className="text-xs font-black uppercase tracking-wider text-amber-600 mb-1">
              Step 1 of 2 • Authentication Required
            </span>
            <h3 className="text-xl font-black text-slate-900 mb-2">
              Please Log In to Place Order
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              To ensure safe delivery, live tracking, and GST tax invoice generation, please sign in or register with your mobile number or account.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowLoginRequiredModal(false);
                  if (onOpenAuth) {
                    onOpenAuth();
                  } else {
                    navigate('/login');
                  }
                }}
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black py-3.5 px-6 rounded-2xl shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>Log In / Sign In Now</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLoginRequiredModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-2xl transition cursor-pointer text-sm"
              >
                Back to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================== */}
      {/* 2. CHOOSE DELIVERY ADDRESS MODAL (Gated Checkout) */}
      {/* ========================================================================== */}
      {showAddressRequiredModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col text-center border border-slate-100">
            <div className="w-16 h-16 bg-blue-50 border-2 border-blue-200 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <MapPin className="w-8 h-8 stroke-[2.2]" />
            </div>

            <span className="text-xs font-black uppercase tracking-wider text-blue-600 mb-1">
              Step 2 of 2 • Delivery Address
            </span>
            <h3 className="text-xl font-black text-slate-900 mb-2">
              Choose Your Delivery Address
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Please select or enter your delivery address (Flat, Building, Street in Kolkata) so our express dispatch rider can reach your doorstep.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowAddressRequiredModal(false);
                  onOpenLocationModal();
                }}
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black py-3.5 px-6 rounded-2xl shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
              >
                <Compass className="w-4 h-4 stroke-[2.5]" />
                <span>Select / Add Delivery Address</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddressRequiredModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-2xl transition cursor-pointer text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
