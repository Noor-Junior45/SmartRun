import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  User,
  Phone,
  Package,
  Clock,
  MapPin,
  Warehouse,
  Home,
  CheckCircle2,
  ShoppingBag,
  XCircle,
  AlertCircle,
  CreditCard,
  Banknote,
  Loader2
} from 'lucide-react';
import { Order } from '../../types';
import { KOLKATA_AREAS } from '../../data/kolkataAreas';
import { LiveOrderRealMap } from './LiveOrderRealMap';
import { supabase } from '../../lib/supabaseClient';
import { updateOrderStatusInFirestore, saveUserProfile } from '../../services/supabaseService';
import { getShortOrderUuid } from '../../utils/cryptoHelper';
import { initiateRazorpayRefund } from '../../services/razorpayService';
import { showToast } from '../../utils/toast';
import {
  RiderDetailsCard,
  RiderReviewCard,
  OrderProductReviewCard
} from './OrderReviewComponents';

// Giriraj Power Kasba Central Warehouse Exact Coordinates
const WAREHOUSE_LOCATION = {
  name: 'Giriraj Power Warehouse',
  area: 'Kasba Industrial Estate, Kolkata',
  lat: 22.5186,
  lng: 88.3832
};

interface LiveOrderPageProps {
  order?: Order | null;
  orders?: Order[];
  onBack?: () => void;
}

export const LiveOrderPage = ({
  order: propOrder,
  orders = [],
  onBack
}: LiveOrderPageProps) => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId?: string }>();

  // Resolve target order:
  // 1. By URL param orderId
  // 2. From propOrder
  // 3. From first active order in orders
  const order = useMemo(() => {
    if (orderId && orders.length > 0) {
      const found = orders.find(
        (o) => o.id === orderId || o.id?.toLowerCase().endsWith(orderId.toLowerCase())
      );
      if (found) return found;
    }
    if (propOrder) return propOrder;
    if (orders.length > 0) {
      const active = orders.filter(
        (o) => o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'failed'
      );
      if (active.length > 0) {
        return [...active].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )[0];
      }
      return orders[0];
    }
    return null;
  }, [orderId, propOrder, orders]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // If history exists, go back, else home
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/orders');
      }
    }
  };

  // Determine stage progression:
  const status = (order?.status || 'pending').toLowerCase();
  const rawPartner = (order as any)?.delivery?.delivery_partner || (order as any)?.deliveryPartner;
  const isConfirmed = Boolean(order);
  const isPartnerAssigned =
    Boolean(rawPartner?.name || rawPartner) ||
    status === 'out_for_delivery' ||
    status === 'shipped' ||
    status === 'near_destination' ||
    status === 'delivered';
  const isOutForDelivery =
    status === 'out_for_delivery' ||
    status === 'near_destination' ||
    status === 'delivered';

  // Extract Exact User Delivery Coordinates from order / area / address
  const userLocation = useMemo(() => {
    if (!order) {
      return {
        name: 'Kolkata',
        area: 'Kolkata Delivery Point',
        lat: 22.5744,
        lng: 88.3547
      };
    }

    // 1. Coordinates explicitly stored on order
    if ((order as any).lat && (order as any).lng) {
      return {
        name: order.area || 'User Location',
        area: order.area || 'Delivery Destination',
        lat: Number((order as any).lat),
        lng: Number((order as any).lng)
      };
    }
    if ((order as any).shippingAddress?.lat && (order as any).shippingAddress?.lng) {
      return {
        name: order.area || 'User Location',
        area: order.area || 'Delivery Destination',
        lat: Number((order as any).shippingAddress.lat),
        lng: Number((order as any).shippingAddress.lng)
      };
    }

    // 2. Match by exact or partial Kolkata Area name
    if (order.area) {
      const match = KOLKATA_AREAS.find(
        (a) =>
          a.name.toLowerCase().includes(order.area!.toLowerCase()) ||
          order.area!.toLowerCase().includes(a.name.toLowerCase().split('/')[0].trim())
      );
      if (match) {
        return {
          name: match.name.split('/')[0].trim(),
          area: match.exactStreet || match.name,
          lat: match.lat,
          lng: match.lng
        };
      }
    }

    // 3. Match by address text against known areas
    if (order.address) {
      const addrLower = order.address.toLowerCase();
      const match = KOLKATA_AREAS.find((a) => {
        const parts = a.name.toLowerCase().split('/');
        return parts.some((p) => addrLower.includes(p.trim()));
      });
      if (match) {
        return {
          name: match.name.split('/')[0].trim(),
          area: match.exactStreet || match.name,
          lat: match.lat,
          lng: match.lng
        };
      }

      // 4. Match by 6-digit PIN code in address
      const pinMatch = order.address.match(/\b(700\d{3}|711\d{3})\b/);
      if (pinMatch) {
        const pinArea = KOLKATA_AREAS.find((a) => a.pincode === pinMatch[1]);
        if (pinArea) {
          return {
            name: pinArea.name.split('/')[0].trim(),
            area: pinArea.exactStreet || pinArea.name,
            lat: pinArea.lat,
            lng: pinArea.lng
          };
        }
      }
    }

    // Default Fallback: Central Kolkata
    return {
      name: order.area || 'Kolkata',
      area: 'Kolkata Delivery Point',
      lat: 22.5744,
      lng: 88.3547
    };
  }, [order]);

  // Compute distance between Warehouse and User Location (Haversine formula in KM)
  const deliveryDistanceKm = useMemo(() => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(userLocation.lat - WAREHOUSE_LOCATION.lat);
    const dLng = toRad(userLocation.lng - WAREHOUSE_LOCATION.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(WAREHOUSE_LOCATION.lat)) *
        Math.cos(toRad(userLocation.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(1.2, Math.round(6371 * c * 10) / 10);
  }, [userLocation]);

  const mapDestination = useMemo(() => ({
    lat: userLocation.lat,
    lng: userLocation.lng,
    name: userLocation.name,
    area: order?.area || userLocation.name
  }), [userLocation.lat, userLocation.lng, userLocation.name, order?.area]);

  // Subtotal & Financial calculations
  const itemsSubtotal = order
    ? order.subtotal ||
      order.itemTotal ||
      (order.items || []).reduce((sum, item) => {
        const price = item.product?.price || 0;
        return sum + price * (item.quantity || 1);
      }, 0)
    : 0;

  const deliveryFee = order?.deliveryFee ?? 0;
  const handlingFee = order?.handlingFee ?? 0;
  const rainFee = (order as any)?.rainFee ?? order?.feeBreakdown?.rainFee ?? 0;
  const surgeFee = (order as any)?.surgeFee ?? order?.feeBreakdown?.surgeFee ?? 0;
  const productHandlingFee = (order as any)?.productHandlingFee ?? order?.feeBreakdown?.totalProductCharges ?? 0;
  const discount = order?.discount ?? ((order as any)?.discountAmount ?? 0);
  const totalAmount = order?.totalAmount || itemsSubtotal + deliveryFee + handlingFee + rainFee + surgeFee + productHandlingFee - discount;

  const orderNumber = getShortOrderUuid(
    order?.id ||
    order?.orderId ||
    (order as any)?.order_id ||
    order?.trackingNumber
  );

  // Delivery partner name extracted directly from backend order
  const deliveryPartnerName = useMemo(() => {
    return (
      (order as any)?.delivery?.delivery_partner?.name ||
      (order as any)?.deliveryPartner?.name ||
      (order as any)?.delivery_partner_name ||
      (order as any)?.assignedTo ||
      ''
    );
  }, [order]);

  // Extract initial rider GPS coordinates from backend order payload if present
  const initialRiderLocation = useMemo(() => {
    if (!order) return null;
    if (order.riderLocation && typeof order.riderLocation.lat === 'number') {
      return order.riderLocation;
    }
    const anyOrder = order as any;
    if (anyOrder.rider_location && typeof anyOrder.rider_location.lat === 'number') {
      return anyOrder.rider_location;
    }
    if (anyOrder.delivery?.rider_location && typeof anyOrder.delivery.rider_location.lat === 'number') {
      return anyOrder.delivery.rider_location;
    }
    if (anyOrder.delivery?.current_location && typeof anyOrder.delivery.current_location.lat === 'number') {
      return anyOrder.delivery.current_location;
    }
    if (anyOrder.deliveryPartner?.current_location && typeof anyOrder.deliveryPartner.current_location.lat === 'number') {
      return anyOrder.deliveryPartner.current_location;
    }
    if (typeof anyOrder.deliveryPartner?.lat === 'number' && typeof anyOrder.deliveryPartner?.lng === 'number') {
      return { lat: anyOrder.deliveryPartner.lat, lng: anyOrder.deliveryPartner.lng };
    }
    return null;
  }, [order]);

  const [liveRiderLocation, setLiveRiderLocation] = useState<{
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    updatedAt?: string;
  } | null>(initialRiderLocation);

  // Rider & Reviews State from Backend
  const [backendRider, setBackendRider] = useState<any | null>(null);
  const [riderReview, setRiderReview] = useState<any | null>(null);
  const [productReview, setProductReview] = useState<any | null>(null);

  // Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('Placed by mistake');
  const [otherCancelReason, setOtherCancelReason] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Live timer for 2-minute cancellation countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Synchronize when initial order data updates
  useEffect(() => {
    if (initialRiderLocation) {
      setLiveRiderLocation(initialRiderLocation);
    }
  }, [initialRiderLocation]);

  // 2-Minute Cancellation Policy Checker
  const cancellationState = useMemo(() => {
    if (!order) return { canCancel: false, remainingSeconds: 0, formattedCountdown: '0:00', reason: 'No order' };

    const st = (order.status || 'pending').toLowerCase();
    const forbiddenStatuses = ['packing', 'packed', 'shipped', 'out_for_delivery', 'near_destination', 'delivered', 'cancelled', 'failed'];
    if (forbiddenStatuses.includes(st)) {
      let reason = 'Order is already being processed';
      if (st === 'cancelled') reason = 'Order is already cancelled';
      else if (st === 'delivered') reason = 'Order is already delivered';
      else if (st === 'packing' || st === 'packed') reason = 'Order is currently being packed';
      else if (st === 'out_for_delivery' || st === 'shipped' || st === 'near_destination') reason = 'Order is already out for delivery';
      return { canCancel: false, remainingSeconds: 0, formattedCountdown: '0:00', reason };
    }

    const placedTimeStr = order.placed_at || order.placedAt || order.createdAt;
    const placedTime = placedTimeStr ? new Date(placedTimeStr).getTime() : 0;
    if (!placedTime || isNaN(placedTime)) {
      return { canCancel: false, remainingSeconds: 0, formattedCountdown: '0:00', reason: 'Invalid order time' };
    }

    const elapsedMs = currentTime - placedTime;
    const twoMinutesMs = 2 * 60 * 1000;
    const remainingMs = twoMinutesMs - elapsedMs;
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

    if (remainingSeconds <= 0) {
      return { canCancel: false, remainingSeconds: 0, formattedCountdown: '0:00', reason: '2-minute cancellation window expired' };
    }

    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;

    return {
      canCancel: true,
      remainingSeconds,
      formattedCountdown: `${mins}:${secs.toString().padStart(2, '0')}`,
      reason: ''
    };
  }, [order, currentTime]);

  const handleConfirmCancelOrder = async () => {
    if (!order) return;
    try {
      setIsCancelling(true);
      if (!cancellationState.canCancel) {
        showToast(cancellationState.reason || 'This order cannot be cancelled anymore as per policy.', 'error');
        setShowCancelModal(false);
        return;
      }

      const finalReason =
        cancelReason === 'Other reason' && otherCancelReason.trim()
          ? otherCancelReason.trim()
          : cancelReason || 'Customer requested 2-minute cancellation';

      // 1. Authoritative cancellation via secure database function
      const { data, error } = await supabase.rpc('customer_cancel_order', {
        p_order_id: order.id,
        p_reason: finalReason
      });

      if (error) {
        showToast(error.message || 'Could not cancel order. Please try again.', 'error');
        setShowCancelModal(false);
        return;
      }

      if (!data || data.success === false) {
        const failureReason = data?.error || 'This order can no longer be cancelled as per policy.';
        showToast(failureReason, 'error', 6000);
        setShowCancelModal(false);
        return;
      }

      // Sync local order status cache and notify listeners
      await updateOrderStatusInFirestore(order.id, 'cancelled', finalReason);

      // 2. Decide refund using authoritative response data
      const returnedMethod = String(data?.payment_method || order.paymentMethod || '').toLowerCase();
      const returnedStatus = String(data?.payment_status || order.paymentStatus || '').toLowerCase();
      const isPaid = (returnedMethod !== 'cod' && returnedMethod !== '') || returnedStatus === 'paid';
      const refundAmount =
        typeof data?.total_amount === 'number' && data.total_amount > 0
          ? data.total_amount
          : (order.totalAmount ?? order.total ?? (order as any).finalAmount ?? 0);
      const razorpayPaymentId =
        data?.razorpay_payment_id ||
        (order as any).razorpay_payment_id ||
        order.paymentId ||
        order.razorpayPaymentId ||
        (order as any).payment_id ||
        '';
      const razorpayOrderId =
        data?.razorpay_order_id ||
        order.razorpayOrderId ||
        (order as any).razorpay_order_id ||
        '';

      if (isPaid && refundAmount > 0) {
        if (razorpayPaymentId || razorpayOrderId) {
          try {
            const refundRes = await initiateRazorpayRefund(
              razorpayPaymentId || '',
              refundAmount,
              razorpayOrderId || order.id,
              finalReason
            );
            showToast(
              `Order cancelled. 100% refund of ₹${refundAmount.toLocaleString('en-IN')} initiated directly via Razorpay back to your source account! (Ref: ${refundRes.refundId || 'Processed'})`,
              'success',
              6000
            );
          } catch (err: any) {
            console.warn('Razorpay refund error:', err);
            // Flag this state on order for support follow-up
            try {
              await supabase.rpc('mark_refund_manual_processing', {
                p_order_id: order.id,
                p_error: err?.message || 'Automatic refund failed'
              });
            } catch (auditErr) {
              console.warn('Failed to record refund failure flag:', auditErr);
            }
            showToast(
              'Order cancelled, but the refund could not be processed automatically -- our team will process it manually within 24 hours',
              'error',
              7000
            );
          }
        } else {
          // No valid payment id found
          try {
            await supabase.rpc('mark_refund_manual_processing', {
              p_order_id: order.id,
              p_error: 'No payment identifier recorded for this order'
            });
          } catch (auditErr) {
            console.warn('Failed to record missing payment id flag:', auditErr);
          }
          showToast(
            'Order cancelled, but the refund could not be processed automatically -- our team will process it manually within 24 hours',
            'error',
            7000
          );
        }
      } else {
        showToast('Order cancelled successfully. ₹0 charged (COD).', 'info');
      }

      setShowCancelModal(false);
      navigate('/orders');
    } catch (err: any) {
      console.error('Cancel error:', err);
      showToast(err?.message || 'Could not cancel order. Please check your network connection.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  // Real-time backend GPS fetching: polls the backend endpoint for live coordinates
  useEffect(() => {
    if (!order?.id) return;
    const isFinished = order.status === 'delivered' || order.status === 'cancelled' || order.status === 'failed';
    if (isFinished) return;

    let isMounted = true;
    const fetchBackendRiderLocation = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/rider-location`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data && data.success && data.location && typeof data.location.lat === 'number') {
          setLiveRiderLocation(data.location);
        }
      } catch {
        // Silent background polling
      }
    };

    fetchBackendRiderLocation();

    // Poll every 7 seconds while active
    const pollTimer = setInterval(fetchBackendRiderLocation, 7000);
    return () => {
      isMounted = false;
      clearInterval(pollTimer);
    };
  }, [order?.id, order?.status]);

  // Fetch assigned rider details from backend (/api/orders/:id/rider)
  useEffect(() => {
    if (!order?.id) return;
    let isMounted = true;
    const fetchBackendRider = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/rider`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && data.assigned && data.rider) {
          setBackendRider(data.rider);
        } else if (isMounted && !data.assigned) {
          const localPartner = (order as any)?.delivery?.delivery_partner || (order as any)?.deliveryPartner;
          if (localPartner && localPartner.name) {
            setBackendRider(localPartner);
          }
        }
      } catch {
        const localPartner = (order as any)?.delivery?.delivery_partner || (order as any)?.deliveryPartner;
        if (isMounted && localPartner && localPartner.name) {
          setBackendRider(localPartner);
        }
      }
    };

    fetchBackendRider();

    const isFinished = order.status === 'delivered' || order.status === 'cancelled' || order.status === 'failed';
    let pollTimer: any = null;
    if (!isFinished) {
      pollTimer = setInterval(fetchBackendRider, 7000);
    }
    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [order?.id, order?.status, (order as any)?.deliveryPartner, (order as any)?.delivery]);

  // Fetch submitted reviews for this order from backend (/api/orders/:id/reviews)
  useEffect(() => {
    if (!order?.id) return;
    let isMounted = true;
    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/reviews`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success) {
          if (data.riderReview) setRiderReview(data.riderReview);
          if (data.productReview) setProductReview(data.productReview);
        }
      } catch {
        // silent
      }
    };
    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [order?.id]);

  // Authoritative Assigned Delivery Partner
  const assignedRider = useMemo(() => {
    if (backendRider && backendRider.name) return backendRider;
    const localPartner = (order as any)?.delivery?.delivery_partner || (order as any)?.deliveryPartner;
    if (localPartner && localPartner.name) return localPartner;
    if (deliveryPartnerName && deliveryPartnerName !== 'Delivery Partner') {
      const fallbackPartner = (order as any)?.deliveryPartner || (order as any)?.delivery?.delivery_partner;
      return {
        name: deliveryPartnerName,
        rating: fallbackPartner?.rating || 4.9,
        vehicleType: fallbackPartner?.vehicleType || fallbackPartner?.vehicle_type || 'Express Delivery Bike',
        vehicleNumber: fallbackPartner?.vehicleNumber || fallbackPartner?.vehicle_number || fallbackPartner?.vehicle_no,
        avatarUrl: fallbackPartner?.avatarUrl || fallbackPartner?.avatar_url || null,
        phone: fallbackPartner?.phone || '+91 87774 00280'
      };
    }
    return null;
  }, [backendRider, order, deliveryPartnerName]);

  const isDelivered = (order?.status || '').toLowerCase() === 'delivered';

  // Single Status Pill display above the map (driven directly by backend order status)
  const statusPill = useMemo(() => {
    if (!order) {
      return {
        label: 'Order Processing',
        bgClass: 'bg-emerald-50 text-emerald-800',
        borderClass: 'border-emerald-200',
        dotClass: 'bg-emerald-600',
        hasPulse: true
      };
    }

    const st = (order.status || 'pending').toLowerCase();
    const partnerName = deliveryPartnerName;

    if (st === 'delivered') {
      return {
        label: 'Order Delivered',
        bgClass: 'bg-emerald-100 text-emerald-900',
        borderClass: 'border-emerald-300',
        dotClass: 'bg-emerald-600',
        hasPulse: false
      };
    }

    if (st === 'cancelled' || st === 'failed') {
      return {
        label: 'Order Cancelled',
        bgClass: 'bg-rose-100 text-rose-900',
        borderClass: 'border-rose-300',
        dotClass: 'bg-rose-600',
        hasPulse: false
      };
    }

    if (st === 'out_for_delivery' || st === 'near_destination') {
      return {
        label: partnerName ? `Out for Delivery (${partnerName})` : 'Out for Delivery',
        bgClass: 'bg-emerald-600 text-white',
        borderClass: 'border-emerald-700',
        dotClass: 'bg-white',
        hasPulse: true
      };
    }

    if (isPartnerAssigned || (order as any)?.delivery?.status === 'assigned') {
      return {
        label: partnerName ? `Delivery Boy Assigned (${partnerName})` : 'Delivery Boy Assigned',
        bgClass: 'bg-blue-600 text-white',
        borderClass: 'border-blue-700',
        dotClass: 'bg-white',
        hasPulse: true
      };
    }

    if (
      st === 'packing' ||
      st === 'packed' ||
      st === 'packaging' ||
      order.packed_at ||
      (order as any).packedAt
    ) {
      return {
        label: 'Order Packaging',
        bgClass: 'bg-amber-500 text-white',
        borderClass: 'border-amber-600',
        dotClass: 'bg-white',
        hasPulse: true
      };
    }

    if (st === 'confirmed' || st === 'accepted' || order.confirmed_at || (order as any).confirmedAt) {
      return {
        label: 'Order Confirmed',
        bgClass: 'bg-indigo-600 text-white',
        borderClass: 'border-indigo-700',
        dotClass: 'bg-white',
        hasPulse: true
      };
    }

    return {
      label: 'Order Placed',
      bgClass: 'bg-slate-800 text-white',
      borderClass: 'border-slate-900',
      dotClass: 'bg-emerald-400',
      hasPulse: true
    };
  }, [order, isPartnerAssigned]);

  // Empty state if no order is found
  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
        <div className="sticky top-0 z-30 bg-white px-4 py-3 sm:py-4 flex items-center justify-between shadow-xs">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-base font-black text-slate-900">Order</h1>
          <div className="w-16" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-2">No Active Live Order</h2>
          <p className="text-sm text-slate-500 mb-6">
            You don't have an order currently in transit. Placed orders with express delivery will appear here live.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => navigate('/orders')}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              View Order History
            </button>
            <button
              onClick={() => navigate('/electrical')}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Catalog</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Sticky Header for Order Page (Borderless, Renamed to Order) */}
      <div className="sticky top-0 z-30 bg-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Order
              </h1>
              <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                #{orderNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Real-time delivery progress &amp; route
            </p>
          </div>
        </div>

        {/* Cancel Order Button: visible only for 2 minutes and before packing/out for delivery */}
        {cancellationState.canCancel && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-red-200 cursor-pointer shadow-2xs group active:scale-95"
            title="Cancel this order within 2 minutes of ordering"
          >
            <XCircle className="w-3.5 h-3.5 text-red-600 group-hover:scale-110 transition-transform shrink-0" />
            <span>Cancel ({cancellationState.formattedCountdown})</span>
          </button>
        )}
      </div>

      {/* 2-Minute Cancellation Notice Banner */}
      {cancellationState.canCancel && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
            <span className="truncate">
              <strong>Cancellation active:</strong> You can cancel within 2 minutes before packing begins.
            </span>
          </div>
          <span className="font-mono font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md shrink-0">
            {cancellationState.formattedCountdown}
          </span>
        </div>
      )}

      {/* Status Pill Display (Only one pill, centered in the middle of display above map, showing packaging, delivery boy assigned, etc. from backend) */}
      <div className="w-full flex justify-center items-center py-2.5 sm:py-3 px-4 bg-slate-50 border-b border-slate-200/60">
        <div
          className={`inline-flex items-center gap-2 px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-xs transition-all duration-300 ${statusPill.bgClass} border ${statusPill.borderClass}`}
        >
          {statusPill.hasPulse && (
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusPill.dotClass}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusPill.dotClass}`} />
            </span>
          )}
          <span>{statusPill.label}</span>
        </div>
      </div>

      {/* Borderless Real Map touching both sides of the screen edge-to-edge */}
      <div className="w-full border-b border-slate-200/80 overflow-hidden bg-slate-100">
        <LiveOrderRealMap
          warehouse={WAREHOUSE_LOCATION}
          destination={mapDestination}
          distanceKm={deliveryDistanceKm}
          isOutForDelivery={isOutForDelivery}
          isPartnerAssigned={isPartnerAssigned}
          riderLocation={liveRiderLocation}
          deliveryPartnerName={deliveryPartnerName}
        />
      </div>

      {/* Main Page Body (Clean separate section layout, no double box nesting) */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-4 sm:p-6 pb-20 sm:pb-12">
        {/* Container identified with live-order-details-modal for seamless targeting */}
        <div id="live-order-details-modal" className="space-y-4 sm:space-y-5">
          {/* 1. RIDER DETAILS (Directly above Delivery Destination box when delivery partner is assigned) */}
          {assignedRider && (
            <div className="space-y-3">
              <RiderDetailsCard rider={assignedRider} />
              {/* Rider Review Card (Appears directly below rider section when order is completed) */}
              {isDelivered && (
                <RiderReviewCard
                  orderId={order.id}
                  riderName={assignedRider.name}
                  existingReview={riderReview}
                  onReviewSubmitted={(rev) => setRiderReview(rev)}
                />
              )}
            </div>
          )}

          {/* Delivery Destination Box (Moved below map and above order items) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black shrink-0">
                <Bike className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Delivery Destination
                </span>
                <span className="text-sm font-black text-slate-900">
                  {order.area || userLocation.name}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 font-medium block">ETA Window</span>
              <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1 justify-end">
                <Clock className="w-3.5 h-3.5" />
                30-60 Mins Express
              </span>
            </div>
          </div>

          {/* 2. ORDER DETAILS (Items list directly in clean card) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Order Items ({order.items?.length || 0})
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Price
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => {
                  const unitPrice = item.product?.price || 0;
                  const itemTotalPrice = unitPrice * (item.quantity || 1);
                  const color = item.selectedColor || (item.product as any)?.selectedColor;

                  return (
                    <div
                      key={idx}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.product?.image ? (
                          <img
                            src={item.product.image}
                            alt=""
                            className="w-11 h-11 object-contain bg-slate-50 rounded-lg p-1 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                            {item.product?.name || 'Electrical Item'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span>
                              Qty: <strong className="text-slate-800">{item.quantity}</strong>
                            </span>
                            <span>•</span>
                            <span>₹{unitPrice.toLocaleString('en-IN')} each</span>
                            {color && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{color}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          ₹{itemTotalPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-3 text-xs text-slate-500">
                  No items listed for this order.
                </div>
              )}
            </div>
          </div>

          {/* Order / Products Review (Appears directly below order items section when order is completed) */}
          {isDelivered && (
            <OrderProductReviewCard
              orderId={order.id}
              itemsCount={order.items?.length || 0}
              items={order.items || []}
              existingReview={productReview}
              onReviewSubmitted={(rev) => setProductReview(rev)}
            />
          )}

          {/* 3. CUSTOMER DETAILS (Separate Card) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Customer Details
            </span>

            <div className="space-y-3">
              {/* Customer Name */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Customer Name
                  </span>
                  <span className="font-black text-slate-900 text-sm truncate block">
                    {(order as any).userName || order.customerName || order.recipientName || 'Customer'}
                  </span>
                </div>
              </div>

              {/* Customer Phone Number */}
              <div className="flex items-center gap-3 pt-2.5 border-t border-slate-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Contact Number
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                    {(order as any).userPhone || order.phone || order.recipientPhone || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. PRICE SUMMARY (Separate Card) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Price Summary
            </span>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-slate-900">
                  ₹{itemsSubtotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Express Delivery Fee:</span>
                <span className="font-semibold text-emerald-700">
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toLocaleString('en-IN')}`}
                </span>
              </div>

              {rainFee > 0 && (
                <div className="flex items-center justify-between text-sky-700">
                  <span className="flex items-center gap-1">
                    <span>🌧️</span>
                    <span>Rain / Weather Fee:</span>
                  </span>
                  <span className="font-semibold">₹{rainFee.toLocaleString('en-IN')}</span>
                </div>
              )}

              {surgeFee > 0 && (
                <div className="flex items-center justify-between text-amber-700">
                  <span className="flex items-center gap-1">
                    <span>⚡</span>
                    <span>Peak Surge Fee:</span>
                  </span>
                  <span className="font-semibold">₹{surgeFee.toLocaleString('en-IN')}</span>
                </div>
              )}

              {productHandlingFee > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <span>📦</span>
                    <span>Special Product Charges:</span>
                  </span>
                  <span className="font-semibold text-slate-900">₹{productHandlingFee.toLocaleString('en-IN')}</span>
                </div>
              )}

              {handlingFee > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Handling &amp; Packaging:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{handlingFee.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Coupon / Discount:</span>
                  <span className="font-semibold">
                    -₹{discount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between font-black text-slate-900 text-sm sm:text-base">
                <span>Grand Total:</span>
                <span className="text-emerald-700">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal for Order Cancellation */}
      {showCancelModal && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Cancel Order #{orderNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    2-Minute Cancellation Window
                  </p>
                </div>
              </div>

              {cancellationState.canCancel && (
                <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg shrink-0">
                  {cancellationState.formattedCountdown} left
                </span>
              )}
            </div>

            {/* Policy Info */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Cancellation Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                You can cancel within <strong>2 minutes</strong> of placing your order as long as packing or rider dispatch has not begun.
              </p>
            </div>

            {/* Refund Details */}
            <div className="rounded-xl p-3 border text-xs space-y-1 bg-emerald-50/70 border-emerald-200/80 text-emerald-950">
              <div className="font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {order.paymentMethod !== 'cod' || order.paymentStatus === 'paid' ? (
                    <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                  )}
                  <span>
                    {order.paymentMethod !== 'cod' || order.paymentStatus === 'paid'
                      ? 'Prepaid Refund'
                      : 'Cash on Delivery'}
                  </span>
                </span>
                <span className="font-black text-emerald-800">
                  {order.paymentMethod !== 'cod' || order.paymentStatus === 'paid'
                    ? `₹${totalAmount.toLocaleString('en-IN')}`
                    : '₹0'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {order.paymentMethod !== 'cod' || order.paymentStatus === 'paid'
                  ? `Full 100% refund of ₹${totalAmount.toLocaleString('en-IN')} will be initiated directly via Razorpay back to your original source account (UPI / Bank / Card) with ₹0 deduction.`
                  : 'This was a Cash on Delivery order. ₹0 was charged and cancellation is free.'}
              </p>
            </div>

            {/* Reasons */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Reason for Cancellation <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  'Placed by mistake',
                  'Incorrect delivery address or contact number',
                  'Need to modify items or order details',
                  'Changed payment method',
                  'Other reason'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`px-3 py-2 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between border cursor-pointer ${
                      cancelReason === reason
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-semibold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{reason}</span>
                    {cancelReason === reason && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>

              {cancelReason === 'Other reason' && (
                <input
                  type="text"
                  value={otherCancelReason}
                  onChange={(e) => setOtherCancelReason(e.target.value)}
                  placeholder="Tell us why you are cancelling..."
                  className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-slate-400"
                />
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                disabled={isCancelling || !cancellationState.canCancel}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancel</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
