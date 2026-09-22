import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  PackageCheck,
  MapPin,
  ShoppingBag,
  Phone,
  MessageSquare,
  Trash2,
  AlertTriangle,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Navigation,
  CreditCard,
  Banknote,
  Download,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Building2,
  Star,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Order, UserProfile } from '../types';
import { getOrderWhatsAppUrl } from '../services/emailService';
import { getShortOrderUuid, formatOrderDisplayId } from '../utils/cryptoHelper';
import { deleteFirestoreOrder, clearAllUserOrders, updateOrderStatusInFirestore, saveUserProfile, getUserScopeKeyFromUser, getActiveUserScope } from '../services/supabaseService';
import { supabase } from '../lib/supabaseClient';
import { initiateRazorpayRefund } from '../services/razorpayService';
import { OrderTrackingTimeline } from './OrderTrackingTimeline';
import { downloadInvoicePDF } from '../utils/invoiceGenerator';
import { PullToRefresh } from './PullToRefresh';
import { showToast } from '../utils/toast';
import {
  RiderDetailsCard,
  RiderReviewCard,
  OrderProductReviewCard
} from './orders/OrderReviewComponents';

interface OrderHistoryViewProps {
  orders: Order[];
  userProfile?: UserProfile | null;
  onOpenOrderModal?: (order: Order) => void;
  onOpenShop: () => void;
  onBack?: () => void;
  onRefresh?: () => Promise<void> | void;
}

export const OrderHistoryView = ({
  orders,
  userProfile,
  onOpenShop,
  onBack,
  onRefresh
}: OrderHistoryViewProps) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Placed by mistake');
  const [otherCancelReason, setOtherCancelReason] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  // Rider & Review State for Selected Order Detail View
  const [selectedOrderRider, setSelectedOrderRider] = useState<any | null>(null);
  const [selectedOrderRiderReview, setSelectedOrderRiderReview] = useState<any | null>(null);
  const [selectedOrderProductReview, setSelectedOrderProductReview] = useState<any | null>(null);

  // Live 1-second tick to update 2-minute cancellation countdown in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const userScope = getUserScopeKeyFromUser(userProfile) || getActiveUserScope();
  const ratingsStorageKey = userScope ? `giriraj_order_ratings_${userScope}` : 'giriraj_order_ratings_guest';

  // Ratings State with LocalStorage Persistence
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(ratingsStorageKey) || '{}');
    } catch {
      return {};
    }
  });
  const [hoverRating, setHoverRating] = useState<{ orderId: string; star: number } | null>(null);

  // Re-sync ratings if user profile or scope changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ratingsStorageKey);
      if (stored) {
        setRatings(JSON.parse(stored));
      } else {
        setRatings({});
      }
    } catch {
      setRatings({});
    }
  }, [ratingsStorageKey]);

  const getOrderDisplayNumber = (order: Order): string => {
    return getShortOrderUuid(order.id || (order as any).order_id || order.orderId || order.trackingNumber);
  };

  const handleRate = (orderId: string, star: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRatings((prev) => {
      const next = { ...prev, [orderId]: star };
      try {
        localStorage.setItem(ratingsStorageKey, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save rating:', err);
      }
      return next;
    });
  };

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Fetch rider details and reviews when an order is opened in details view
  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrderRider(null);
      setSelectedOrderRiderReview(null);
      setSelectedOrderProductReview(null);
      return;
    }

    let isMounted = true;
    const fetchRiderAndReviews = async () => {
      try {
        const [riderRes, reviewRes] = await Promise.all([
          fetch(`/api/orders/${encodeURIComponent(selectedOrderId)}/rider`),
          fetch(`/api/orders/${encodeURIComponent(selectedOrderId)}/reviews`)
        ]);

        if (riderRes.ok) {
          const rData = await riderRes.json();
          if (isMounted && rData.success && rData.assigned && rData.rider) {
            setSelectedOrderRider(rData.rider);
          } else if (isMounted && selectedOrder) {
            const raw = selectedOrder.delivery?.delivery_partner || selectedOrder.deliveryPartner;
            if (raw && raw.name) setSelectedOrderRider(raw);
          }
        }

        if (reviewRes.ok) {
          const revData = await reviewRes.json();
          if (isMounted && revData.success) {
            if (revData.riderReview) setSelectedOrderRiderReview(revData.riderReview);
            if (revData.productReview) setSelectedOrderProductReview(revData.productReview);
          }
        }
      } catch {
        if (isMounted && selectedOrder) {
          const raw = selectedOrder.delivery?.delivery_partner || selectedOrder.deliveryPartner;
          if (raw && raw.name) setSelectedOrderRider(raw);
        }
      }
    };

    fetchRiderAndReviews();
    return () => {
      isMounted = false;
    };
  }, [selectedOrderId, selectedOrder]);

  const handleDirectDownloadPDF = async (order: Order) => {
    try {
      setDownloadingInvoiceId(order.id);
      await downloadInvoicePDF(order);
    } catch (err) {
      console.error('Error generating PDF invoice:', err);
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      const isDelivered = order.status === 'delivered';
      const isCancelled = order.status === 'cancelled';
      const isActive = !isDelivered && !isCancelled;

      if (filterTab === 'active' && !isActive) return false;
      if (filterTab === 'delivered' && !isDelivered) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const shortId = getShortOrderUuid(order.id).toLowerCase();
        const matchesId =
          String(order.id).toLowerCase().includes(query) ||
          (order.orderId || '').toLowerCase().includes(query) ||
          ((order as any).order_id || '').toLowerCase().includes(query) ||
          (order.trackingNumber || '').toLowerCase().includes(query) ||
          (order.orderNumber || '').toLowerCase().includes(query) ||
          shortId.includes(query.replace(/^#/, '')) ||
          `#${shortId}`.includes(query);
        const matchesItems = order.items.some((item) =>
          (item.product?.name || '').toLowerCase().includes(query) ||
          (item.product?.brand || '').toLowerCase().includes(query)
        );
        const matchesArea = (order.area || '').toLowerCase().includes(query);
        return matchesId || matchesItems || matchesArea;
      }

      return true;
    });
  }, [orders, filterTab, searchQuery]);

  // Group filtered orders by Purchase Date for day-wise view
  const ordersByDate = useMemo(() => {
    const groups: { [dateStr: string]: Order[] } = {};
    filteredOrders.forEach((order) => {
      const dateKey = new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(order);
    });
    return groups;
  }, [filteredOrders]);

  const activeCount = useMemo(
    () => orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length,
    [orders]
  );
  const deliveredCount = useMemo(
    () => orders.filter((o) => o.status === 'delivered').length,
    [orders]
  );

  const handleDeleteSingleOrder = async (order: Order) => {
    try {
      setDeletingOrderId(order.id);
      await deleteFirestoreOrder(order.id);
      setOrderToDelete(null);
      if (selectedOrderId === order.id) {
        setSelectedOrderId(null);
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
      alert('Failed to delete the order. Please try again.');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleClearAllOrders = async () => {
    try {
      setIsClearingAll(true);
      await clearAllUserOrders();
      setConfirmClearAll(false);
      setSelectedOrderId(null);
    } catch (err) {
      console.error('Failed to clear order history:', err);
      alert('Failed to clear order history. Please try again.');
    } finally {
      setIsClearingAll(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusNorm = (status || '').toLowerCase();
    switch (statusNorm) {
      case 'delivered':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800">
            Delivered
          </span>
        );
      case 'near_destination':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-900 animate-pulse border border-emerald-200">
            Near Destination
          </span>
        );
      case 'out_for_delivery':
      case 'shipped':
      case 'picked_up':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 animate-pulse">
            Out for Delivery
          </span>
        );
      case 'packed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-900 border border-purple-200">
            Packed
          </span>
        );
      case 'packing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-900">
            Packing
          </span>
        );
      case 'confirmed':
      case 'accepted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800">
            Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-800">
            Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/60">
            Pending
          </span>
        );
    }
  };

  // 2-minute cancellation policy checker:
  // Policy rules:
  // 1. You can cancel within 2 minutes (120 seconds) of placing the order.
  // 2. If order is preparing ('packing', 'packed') or out for delivery ('out_for_delivery', 'shipped', 'near_destination') or delivered/cancelled, you cannot cancel.
  // 3. Cancel button is only visible for 2 minutes.
  const getOrderCancellationState = (order?: Order | null) => {
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
    const twoMinutesMs = 2 * 60 * 1000; // 120,000 ms
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
  };

  const handleConfirmCancelOrder = async (order: Order) => {
    try {
      setCancellingOrderId(order.id);

      // Verify policy before cancellation
      const check = getOrderCancellationState(order);
      if (!check.canCancel) {
        showToast(check.reason || 'This order can no longer be cancelled as per policy.', 'error');
        setOrderToCancel(null);
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
        showToast(error.message || 'Failed to cancel order. Please try again.', 'error');
        setOrderToCancel(null);
        return;
      }

      if (!data || data.success === false) {
        const failureReason = data?.error || 'This order can no longer be cancelled as per policy.';
        showToast(failureReason, 'error', 6000);
        setOrderToCancel(null);
        return;
      }

      // Sync local status store
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
              `Order #${getOrderDisplayNumber(order)} cancelled. 100% refund of ₹${refundAmount.toLocaleString('en-IN')} initiated directly via Razorpay back to your account! (Ref: ${refundRes.refundId || 'Processed'})`,
              'success',
              6000
            );
          } catch (refundErr: any) {
            console.warn('Razorpay direct refund dispatch error:', refundErr);
            try {
              await supabase.rpc('mark_refund_manual_processing', {
                p_order_id: order.id,
                p_error: refundErr?.message || 'Automatic refund failed'
              });
            } catch (flagErr) {
              console.warn('Failed to record refund failure flag:', flagErr);
            }
            showToast(
              'Order cancelled, but the refund could not be processed automatically -- our team will process it manually within 24 hours',
              'error',
              7000
            );
          }
        } else {
          try {
            await supabase.rpc('mark_refund_manual_processing', {
              p_order_id: order.id,
              p_error: 'No razorpay_payment_id recorded for this order'
            });
          } catch (flagErr) {
            console.warn('Failed to record missing payment id flag:', flagErr);
          }
          showToast(
            'Order cancelled, but the refund could not be processed automatically -- our team will process it manually within 24 hours',
            'error',
            7000
          );
        }
      } else {
        showToast(`Order #${getOrderDisplayNumber(order)} cancelled successfully. ₹0 charged (COD).`, 'info');
      }

      setOrderToCancel(null);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      showToast(err?.message || 'Could not cancel order. Please check your internet connection.', 'error');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Render Confirmation Modal for Order Deletion
  const renderDeleteOrderModal = () => {
    if (!orderToDelete) return null;

    const isSingleProduct = orderToDelete.items && orderToDelete.items.length === 1;
    const singleProductName = isSingleProduct
      ? orderToDelete.items[0]?.product?.name || (orderToDelete.items[0] as any)?.product_name || 'Electrical Item'
      : '';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-base font-black text-slate-900 line-clamp-2">
              {isSingleProduct
                ? `Delete "${singleProductName}"?`
                : `Delete Order #${getOrderDisplayNumber(orderToDelete)}?`}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isSingleProduct
                ? 'Are you sure you want to delete this item from your order history? This action cannot be undone.'
                : `Are you sure you want to delete this order containing ${orderToDelete.items.length} items from your history? This action cannot be undone.`}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOrderToDelete(null)}
              disabled={Boolean(deletingOrderId)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleDeleteSingleOrder(orderToDelete)}
              disabled={Boolean(deletingOrderId)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              {deletingOrderId === orderToDelete.id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete Order</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Confirmation Modal for Order Cancellation (with 2-Minute Policy & Refund Details)
  const renderCancelOrderModal = () => {
    if (!orderToCancel) return null;

    const cancelState = getOrderCancellationState(orderToCancel);
    const isPaid = orderToCancel.paymentMethod !== 'cod' || orderToCancel.paymentStatus === 'paid';
    const totalAmount = orderToCancel.totalAmount ?? orderToCancel.total ?? (orderToCancel as any).finalAmount ?? 0;

    return (
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
                  Cancel Order #{getOrderDisplayNumber(orderToCancel)}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Cancellation Policy &amp; Confirmation
                </p>
              </div>
            </div>

            {cancelState.canCancel && (
              <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg shrink-0">
                {cancelState.formattedCountdown} left
              </span>
            )}
          </div>

          {/* Policy Information */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Cancellation Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Orders can be cancelled free of charge within <strong>2 minutes</strong> of ordering, provided that packaging or rider dispatch has not started.
            </p>
          </div>

          {/* Payment & Refund Details */}
          <div className="rounded-xl p-3 border text-xs space-y-1 bg-emerald-50/70 border-emerald-200/80 text-emerald-950">
            <div className="font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {isPaid ? <CreditCard className="w-3.5 h-3.5 text-emerald-700" /> : <Banknote className="w-3.5 h-3.5 text-emerald-700" />}
                <span>{isPaid ? 'Online Payment Refund' : 'Cash on Delivery'}</span>
              </span>
              <span className="font-black text-emerald-800">
                {isPaid ? `₹${totalAmount.toLocaleString('en-IN')}` : '₹0'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              {isPaid
                ? `100% full refund of ₹${totalAmount.toLocaleString('en-IN')} will be initiated directly via Razorpay back to your original source account (UPI / Bank / Card) with ₹0 fee.`
                : 'No payment was collected for this order. It will be cancelled immediately at zero charge.'}
            </p>
          </div>

          {/* Reason for Cancellation */}
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setOrderToCancel(null)}
              disabled={Boolean(cancellingOrderId)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Keep Order
            </button>
            <button
              type="button"
              onClick={() => handleConfirmCancelOrder(orderToCancel)}
              disabled={Boolean(cancellingOrderId) || !cancelState.canCancel}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {cancellingOrderId === orderToCancel.id ? (
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
    );
  };

  // =========================================================================
  // DEDICATED ORDER DETAILS FULL PAGE VIEW (COMPACT, BORDERLESS & FLAT)
  // =========================================================================
  if (selectedOrder) {
    const isDelivered = selectedOrder.status === 'delivered';
    const isCancelled = selectedOrder.status === 'cancelled';
    const isOutForDelivery = selectedOrder.status === 'out_for_delivery';
    const isPacking = selectedOrder.status === 'packing' || selectedOrder.status === 'accepted';

    // Format Date & Time Helpers
    const formatDateTime = (ts?: string | null) => {
      if (!ts) return null;
      try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch {
        return null;
      }
    };

    const formattedPurchaseDate = formatDateTime(selectedOrder.createdAt) || 'Recent';

    const placedTimestamp = formatDateTime(selectedOrder.placed_at || selectedOrder.placedAt || selectedOrder.createdAt);
    const packedTimestamp = formatDateTime(selectedOrder.packed_at || selectedOrder.packedAt) || (isDelivered || isOutForDelivery ? placedTimestamp : null);
    const deliveredTimestamp = formatDateTime(selectedOrder.delivered_at || selectedOrder.deliveredAt || selectedOrder.delivery?.delivered_at);

    // Dynamic ETA Calculation
    const etaTimestamp = selectedOrder.delivery?.estimated_delivery_at
      ? new Date(selectedOrder.delivery.estimated_delivery_at).getTime()
      : selectedOrder.estimated_delivery_at
      ? new Date(selectedOrder.estimated_delivery_at).getTime()
      : selectedOrder.estimatedDeliveryTimestamp || (selectedOrder.createdAt ? new Date(selectedOrder.createdAt).getTime() + 3600000 : Date.now() + 3600000);

    const remainingMinutes = Math.max(0, Math.round((etaTimestamp - Date.now()) / 60000));
    const isPastEta = Date.now() > etaTimestamp;

    const etaScheduleText = isDelivered && deliveredTimestamp
      ? `Delivered on ${deliveredTimestamp}`
      : isCancelled
      ? 'Order Cancelled'
      : isPastEta
      ? 'Arriving shortly • Express delivery'
      : remainingMinutes > 0
      ? `Expected delivery in ${remainingMinutes} mins`
      : 'Arriving momentarily';

    const rawPartner = selectedOrder.delivery?.delivery_partner || selectedOrder.deliveryPartner;
    const partner = rawPartner && rawPartner.name && !rawPartner.name.toLowerCase().includes('bikash') ? rawPartner : undefined;
    const activeRider =
      selectedOrderRider ||
      partner ||
      ((selectedOrder as any)?.assignedTo
        ? {
            name: (selectedOrder as any).assignedTo,
            rating: 4.9,
            vehicleType: (selectedOrder as any).vehicleType || (selectedOrder as any).vehicle_type || 'Express Delivery Bike',
            vehicleNumber: (selectedOrder as any).vehicleNumber || (selectedOrder as any).vehicle_number || (selectedOrder as any).vehicle_no,
            avatarUrl: (selectedOrder as any).avatarUrl || (selectedOrder as any).avatar_url || null,
            phone: '+91 87774 00280'
          }
        : null);

    // Items and Financial Calculations
    const itemsSubtotal = selectedOrder.subtotal || selectedOrder.itemTotal || selectedOrder.items.reduce((sum, item) => {
      const p = item.product?.price || 0;
      return sum + (p * item.quantity);
    }, 0);

    const gstAmount = Math.round((itemsSubtotal * 18) / 118);
    const deliveryFee = selectedOrder.deliveryFee ?? 0;
    const handlingFee = selectedOrder.handlingFee ?? 0;
    const rainFee = (selectedOrder as any).rainFee ?? selectedOrder.feeBreakdown?.rainFee ?? 0;
    const surgeFee = (selectedOrder as any).surgeFee ?? selectedOrder.feeBreakdown?.surgeFee ?? 0;
    const productHandlingFee = (selectedOrder as any).productHandlingFee ?? selectedOrder.feeBreakdown?.totalProductCharges ?? 0;
    const discount = selectedOrder.discount ?? 0;

    const cancellationState = getOrderCancellationState(selectedOrder);
    const canCancel = cancellationState.canCancel;

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Top Navigation & Action Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setSelectedOrderId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-950 transition-colors cursor-pointer py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Cancel Order Button: Visible ONLY within 2 minutes of ordering AND before packing/out for delivery */}
            {canCancel && (
              <button
                type="button"
                onClick={() => {
                  setOrderToCancel(selectedOrder);
                  setCancelReason('Placed by mistake');
                  setOtherCancelReason('');
                }}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-red-200 cursor-pointer shadow-2xs group active:scale-95"
                title="Cancel this order within the 2-minute policy"
              >
                <XCircle className="w-3.5 h-3.5 text-red-600 group-hover:scale-110 transition-transform shrink-0" />
                <span>Cancel Order ({cancellationState.formattedCountdown})</span>
              </button>
            )}

            <button
              type="button"
              disabled={downloadingInvoiceId === selectedOrder.id}
              onClick={() => handleDirectDownloadPDF(selectedOrder)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Download official Invoice PDF"
            >
              {downloadingInvoiceId === selectedOrder.id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Invoice</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setOrderToDelete(selectedOrder)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete this order"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Minute Cancellation Policy Active Alert Banner */}
        {canCancel && (
          <div className="flex items-center justify-between gap-3 bg-amber-50/90 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs text-amber-900 shadow-2xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
              <div className="min-w-0 leading-snug">
                <span className="font-bold">Cancellation Window Active: </span>
                <span className="text-amber-800">
                  You can cancel within 2 minutes of ordering before store packing begins.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md text-xs">
                {cancellationState.formattedCountdown}
              </span>
              <button
                type="button"
                onClick={() => {
                  setOrderToCancel(selectedOrder);
                  setCancelReason('Placed by mistake');
                  setOtherCancelReason('');
                }}
                className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                Cancel Order
              </button>
            </div>
          </div>
        )}

        {/* Cancelled Order Notice & Refund Information */}
        {isCancelled && (
          <div className="p-3.5 bg-red-50/90 rounded-xl border border-red-200 text-xs text-red-900 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 font-bold text-red-950">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Order #{getOrderDisplayNumber(selectedOrder)} has been Cancelled</span>
            </div>
            {selectedOrder.paymentMethod !== 'cod' || selectedOrder.paymentStatus === 'paid' ? (
              <p className="text-red-800 text-[11px] leading-relaxed">
                Full refund of ₹{(selectedOrder.totalAmount ?? selectedOrder.total ?? selectedOrder.finalAmount ?? 0).toLocaleString('en-IN')} has been credited back to your Giriraj Wallet &amp; Refund balance.
              </p>
            ) : (
              <p className="text-red-700 text-[11px] leading-relaxed">
                This was a Cash on Delivery order. ₹0 was collected and no cancellation charges apply.
              </p>
            )}
          </div>
        )}

        {/* 1. Top Section: Purchased Date & Time + Order ID */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-slate-900">
                Order #{getOrderDisplayNumber(selectedOrder)}
              </span>
              {getStatusBadge(selectedOrder.status)}
            </div>
            <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Purchased on: <strong className="text-slate-800 font-semibold">{formattedPurchaseDate}</strong></span>
            </div>
          </div>
        </div>

        {/* 2. Purchased Items & Detailed Breakdown */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Purchased Items ({selectedOrder.items.length})</span>
            <span>Price</span>
          </div>

          <div className="divide-y divide-slate-100">
            {selectedOrder.items.map((item, idx) => {
              const color = item.selectedColor || item.product?.selectedColor;
              const unitPrice = item.product?.price || 0;
              const itemTotalPrice = unitPrice * item.quantity;

              return (
                <div key={idx} className="py-2.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.product?.image ? (
                      <img
                        src={item.product.image}
                        alt=""
                        className="w-12 h-12 object-contain bg-slate-50 rounded-lg p-1 shrink-0 border border-slate-100"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0 space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                        {item.product?.name || 'Electrical Item'}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                        {item.product?.brand && (
                          <span>Brand: <span className="font-semibold text-slate-700">{item.product.brand}</span></span>
                        )}
                        <span>•</span>
                        <span>Qty: <strong className="text-slate-900 font-bold">{item.quantity}</strong></span>
                        {color && (
                          <>
                            <span>•</span>
                            <span>Colour: <strong className="text-slate-800 font-semibold">{color}</strong></span>
                          </>
                        )}
                        <span>•</span>
                        <span>Unit Price: ₹{unitPrice.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">
                      ₹{itemTotalPrice.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ({item.quantity} × ₹{unitPrice.toLocaleString('en-IN')})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product / Order Review Card (Appears directly below order section when order is completed) */}
        {isDelivered && (
          <div className="pt-2 border-t border-slate-100">
            <OrderProductReviewCard
              orderId={selectedOrder.id}
              itemsCount={selectedOrder.items.length}
              items={selectedOrder.items}
              existingReview={selectedOrderProductReview}
              onReviewSubmitted={(rev) => setSelectedOrderProductReview(rev)}
            />
          </div>
        )}

        {/* 3. Financial Breakdown (Subtotal, Delivery, GST, Handling, Total Amount Paid) */}
        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Items Price:</span>
            <span className="font-semibold text-slate-900">₹{itemsSubtotal.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Delivery Charges:</span>
            <span className="font-semibold text-emerald-600">
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toLocaleString('en-IN')}`}
            </span>
          </div>

          {rainFee > 0 && (
            <div className="flex items-center justify-between text-sky-700">
              <span className="flex items-center gap-1">
                <span>🌧️</span>
                <span>Rain / Weather Surcharge:</span>
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
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-1">
                <span>📦</span>
                <span>Special Product Charges:</span>
              </span>
              <span className="font-semibold">₹{productHandlingFee.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span>GST (18% Included):</span>
            <span className="font-semibold text-slate-700">₹{gstAmount.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Handling Charges:</span>
            <span className="font-semibold text-emerald-600">
              {handlingFee === 0 ? 'FREE (₹0)' : `₹${handlingFee}`}
            </span>
          </div>

          {discount > 0 && (
            <div className="flex items-center justify-between text-emerald-600">
              <span>Promotional Discount:</span>
              <span className="font-semibold">-₹{discount.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-950">
            <span>Total Amount Paid:</span>
            <span className="text-base text-slate-950">₹{selectedOrder.totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* 4. Payment Info & Delivery Schedule */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Info</div>
            <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
              {selectedOrder.paymentMethod === 'cod' ? (
                <>
                  <Banknote className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cash on Delivery (COD)</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Online Payment (Paid)</span>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivery Schedule</div>
            <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{etaScheduleText}</span>
            </div>
          </div>
        </div>

        {/* Assigned Delivery Rider (if assigned by delivery app) */}
        {partner && partner.name && !isCancelled && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">{partner.name}</span>
                  {partner.rating && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      <span>{partner.rating}</span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Assigned Rider {partner.vehicleNumber || partner.vehicle_number ? `• ${partner.vehicleNumber || partner.vehicle_number}` : ''}
                </div>
              </div>
            </div>

            {partner.phone && (
              <a
                href={`tel:${partner.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 active:scale-95 transition-all shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Partner</span>
              </a>
            )}
          </div>
        )}

        {/* 5. Process of Delivery with Time & Date Stamp */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Process of Delivery
          </div>

          {isCancelled ? (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Order was cancelled on {placedTimestamp || formattedPurchaseDate}</span>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {/* Step 1: Placed */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-900">Order Placed &amp; Confirmed</span>
                </div>
                {placedTimestamp && (
                  <span className="text-[11px] font-medium text-slate-500">
                    {placedTimestamp}
                  </span>
                )}
              </div>

              {/* Step 2: Packed */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isDelivered || isOutForDelivery || isPacking ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <span className={isDelivered || isOutForDelivery || isPacking ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                    Items Packed &amp; Verified
                  </span>
                </div>
                {packedTimestamp ? (
                  <span className="text-[11px] font-medium text-slate-500">
                    {packedTimestamp}
                  </span>
                ) : isPacking ? (
                  <span className="text-[11px] font-bold text-amber-600">In Progress</span>
                ) : (
                  <span className="text-[11px] text-slate-300">Pending</span>
                )}
              </div>

              {/* Step 3: Out for Delivery */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isDelivered || isOutForDelivery ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <span className={isDelivered || isOutForDelivery ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                    Out for Express Delivery
                  </span>
                </div>
                {isDelivered ? (
                  <span className="text-[11px] font-medium text-slate-500">
                    {deliveredTimestamp || 'Completed'}
                  </span>
                ) : isOutForDelivery ? (
                  <span className="text-[11px] font-bold text-blue-600 animate-pulse">Rider on the way</span>
                ) : (
                  <span className="text-[11px] text-slate-300">Pending</span>
                )}
              </div>

              {/* Step 4: Delivered */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isDelivered ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <span className={isDelivered ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                    {isDelivered ? 'Delivered at Doorstep' : 'Doorstep Handover'}
                  </span>
                </div>
                {isDelivered && deliveredTimestamp ? (
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {deliveredTimestamp}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-300">Pending</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 5.5. Assigned Rider Details & Rider Review Card (Above Delivery Address Box) */}
        {activeRider && (
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <RiderDetailsCard rider={activeRider} />
            {isDelivered && (
              <RiderReviewCard
                orderId={selectedOrder.id}
                riderName={activeRider.name}
                existingReview={selectedOrderRiderReview}
                onReviewSubmitted={(rev) => setSelectedOrderRiderReview(rev)}
              />
            )}
          </div>
        )}

        {/* 6. Delivery Address & Contact Details */}
        <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Delivery Address &amp; Contact Details</span>
          </div>

          <div className="text-slate-700 space-y-0.5 pl-5">
            <div className="font-bold text-slate-950 text-xs sm:text-sm">
              {selectedOrder.customerName}
            </div>
            <div className="font-medium text-slate-800">
              Phone: +91 {selectedOrder.phone}
            </div>
            <div>{selectedOrder.address}</div>
            {selectedOrder.landmark && (
              <div className="text-slate-500">Landmark: {selectedOrder.landmark}</div>
            )}
            <div className="font-semibold text-slate-900">
              {selectedOrder.area}, Kolkata – {selectedOrder.pincode}
            </div>
            {selectedOrder.notes && (
              <div className="text-[11px] text-slate-500 italic pt-0.5">
                Notes: {selectedOrder.notes}
              </div>
            )}
          </div>
        </div>

        {/* 7. Help Button with this Order */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-900">
              Need help with this order?
            </div>
            <div className="text-[11px] text-slate-500">
              Contact our 24/7 customer support team for any queries or assistance.
            </div>
          </div>

          <a
            href="tel:+918777400280"
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>Get Help</span>
          </a>
        </div>

        {/* Confirmation Modal for Order Deletion & Cancellation */}
        {renderDeleteOrderModal()}
        {renderCancelOrderModal()}
      </div>
    );
  }

  // =========================================================================
  // MAIN ORDER HISTORY LIST (OUTSIDE VIEW WITH PRODUCT IMAGE & DATE ROWS)
  // =========================================================================
  return (
    <PullToRefresh onRefresh={onRefresh || (() => {})} refreshingText="Syncing real-time order status...">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Orders
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {orders.length}
            </span>
          </div>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'active'
                  ? 'bg-white text-amber-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {activeCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
              <span>In-Transit ({activeCount})</span>
            </button>
            <button
              onClick={() => setFilterTab('delivered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'delivered'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Delivered ({deliveredCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-8 pr-3 py-1.5 bg-white rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden shadow-2xs transition-all"
            />
          </div>
        </div>
      )}

      {/* Orders List Container */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
            No orders found
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
            Your placed orders and 60-minute express delivery tracking will appear right here.
          </p>

          <button
            onClick={onOpenShop}
            className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Browse Products
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-2xs">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No matching orders</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            No orders found matching your current filter or search criteria.
          </p>
          <button
            onClick={() => {
              setFilterTab('all');
              setSearchQuery('');
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Day-Wise Grouped Order History (Borderless with Horizontal Separators) */
        <div className="space-y-6">
          {Object.entries(ordersByDate).map(([dateStr, dateOrders]) => (
            <div key={dateStr} className="space-y-2">
              {/* Date Row Header with Horizontal Line */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-2 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                    {dateStr}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    ({dateOrders.length} {dateOrders.length === 1 ? 'order' : 'orders'})
                  </span>
                </div>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* Day Orders Stack with Horizontal Line Separation */}
              <div className="divide-y divide-slate-200">
                {dateOrders.map((order) => {
                  const isDelivered = order.status === 'delivered';
                  const isCancelled = order.status === 'cancelled';
                  const isDeleting = deletingOrderId === order.id;

                  const firstItem = order.items[0];
                  const totalItemsCount = order.items.reduce((acc, it) => acc + (it.quantity || 1), 0);
                  const itemsName = order.items
                    .map((i) => i.product?.name || 'Electrical Item')
                    .filter(Boolean)
                    .join(', ');

                  const deliveredDateStr = order.delivered_at || order.deliveredAt
                    ? new Date(order.delivered_at || order.deliveredAt!).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : null;

                  const currentRating =
                    hoverRating?.orderId === order.id
                      ? hoverRating.star
                      : ratings[order.id] || 0;

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`py-4 sm:py-4.5 hover:bg-slate-100/60 rounded-xl px-2 sm:px-3 transition-colors cursor-pointer select-none space-y-3 group ${
                        isDeleting ? 'opacity-40 pointer-events-none' : ''
                      }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedOrderId(order.id);
                        }
                      }}
                    >
                      {/* Top Row: Product Image + Product Name + Delivery/Cancelled Msg + Tailless Arrow */}
                      <div className="flex items-center justify-between gap-3.5">
                        {/* Left: Product Image & Details */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Product Image Thumbnail */}
                          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 overflow-hidden relative border border-slate-100 shadow-2xs">
                            {firstItem?.product?.image ? (
                              <img
                                src={firstItem.product.image}
                                alt={itemsName}
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Package className="w-7 h-7 text-slate-400" />
                            )}
                            {order.items.length > 1 && (
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.2 bg-slate-900/80 text-white text-[9px] font-black rounded">
                                +{order.items.length - 1}
                              </span>
                            )}
                          </div>

                          {/* Beside Product Image: Product Name & Delivered Date / Canceled Message (NO PRICE) */}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                              {itemsName || `Order #${getOrderDisplayNumber(order)}`}
                            </h3>

                            {/* Delivered date or canceled message or in-transit status */}
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              {isDelivered ? (
                                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>
                                    Delivered {deliveredDateStr ? `on ${deliveredDateStr}` : 'to Kasba, Kolkata'}
                                  </span>
                                </span>
                              ) : isCancelled ? (
                                <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                  <span>Cancelled</span>
                                </span>
                              ) : (() => {
                                const rawSt = (order.status || 'pending').toLowerCase();
                                const delivSt解决 = (order.delivery?.status || '').toLowerCase();

                                if (rawSt === 'near_destination' || delivSt解决 === 'near_destination') {
                                  return (
                                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                                      <Navigation className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                                      <span>Near Destination</span>
                                    </span>
                                  );
                                }
                                if (
                                  rawSt === 'out_for_delivery' ||
                                  rawSt === 'shipped' ||
                                  delivSt解决 === 'out_for_delivery' ||
                                  delivSt解决 === 'picked_up'
                                ) {
                                  return (
                                    <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                      <Truck className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
                                      <span>Out for Delivery</span>
                                    </span>
                                  );
                                }
                                if (rawSt === 'packed' || Boolean(order.packed_at || order.packedAt)) {
                                  return (
                                    <span className="text-xs font-bold text-purple-800 flex items-center gap-1">
                                      <PackageCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                      <span>Packed</span>
                                    </span>
                                  );
                                }
                                if (rawSt === 'packing') {
                                  return (
                                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                                      <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span>Packing</span>
                                    </span>
                                  );
                                }
                                if (rawSt === 'confirmed' || rawSt === 'accepted') {
                                  return (
                                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                      <span>Confirmed</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span>Pending</span>
                                  </span>
                                );
                              })()}

                              {order.items.length > 1 && (
                                <span className="text-[11px] text-slate-400 font-semibold">
                                  • {totalItemsCount} items
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Tailless Arrow */}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all shrink-0">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Below Delivered Products: Rate & Review and 5 Stars */}
                      {isDelivered && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-[11px] font-bold text-slate-500">
                            {ratings[order.id] ? `Rated ${ratings[order.id]}/5 ⭐ (Thank you!)` : 'Rate & Review Product'}
                          </span>

                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isYellow = currentRating >= star;
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  onMouseEnter={() => setHoverRating({ orderId: order.id, star })}
                                  onMouseLeave={() => setHoverRating(null)}
                                  onClick={(e) => handleRate(order.id, star, e)}
                                  className="p-1 cursor-pointer transition-transform active:scale-125 focus:outline-hidden"
                                  aria-label={`Rate ${star} star`}
                                >
                                  <Star
                                    className={`w-4 h-4 transition-colors ${
                                      isYellow
                                        ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_2px_rgba(251,191,36,0.8)]'
                                        : 'text-slate-300 fill-none hover:text-amber-300'
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal: Delete Single Order */}
      {renderDeleteOrderModal()}

      {/* Confirmation Modal: Clear All Orders */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Clear All Order History?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will permanently remove all {orders.length} order record
                {orders.length > 1 ? 's' : ''} from your account history.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                disabled={isClearingAll}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllOrders}
                disabled={isClearingAll}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isClearingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <span>Clear All</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Order Cancellation Modal */}
      {renderCancelOrderModal()}
    </div>
  </PullToRefresh>
  );
};
