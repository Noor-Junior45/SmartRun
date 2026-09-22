export interface Product {
  id: string;
  name: string;
  brand: string;
  category: 'electrical' | 'services' | 'construction' | 'emergency';
  subCategory: string;
  price: number;
  originalPrice: number;
  discountPercentage: number;
  unit: string;
  rating: number;
  reviewsCount: number;
  deliveryMinutes: number;
  image: string;
  images?: string[];
  image_urls?: string[];
  inStock: boolean;
  stockCount: number;
  isEmergency: boolean;
  isBestSeller?: boolean;
  specs: { [key: string]: string };
  description: string;
  tags: string[];
  colors?: string[];
  colours?: string[];
  color_options?: any[];
  selectedColor?: string;
  deliveryCharge?: number;
  handlingCharge?: number;
}

export interface FeePolicySettings {
  freeDeliveryThreshold: number; // e.g. 499 (>= threshold => free delivery)
  baseDeliveryFee: number; // e.g. 49 (< threshold => base fee)
  handlingFee: number; // e.g. 9
  rainFee: {
    enabled: boolean;
    amount: number; // e.g. 20
    label?: string;
  };
  surgeFee: {
    enabled: boolean;
    amount: number; // e.g. 15
    label?: string;
  };
  customFees?: Array<{
    id: string;
    label: string;
    amount: number;
    enabled: boolean;
  }>;
  productCharges?: Record<string, number>; // productId -> charge
  productChargeMode?: 'per_item' | 'per_unique_product';
  updatedAt?: string;
  updatedBy?: string;
}

export interface ProductChargeDetail {
  productId: string;
  name: string;
  unitCharge: number;
  quantity: number;
  totalCharge: number;
}

export interface OrderFeeBreakdown {
  subtotal: number;
  isFreeDelivery: boolean;
  freeDeliveryThreshold: number;
  deliveryFee: number;
  baseDeliveryFee: number;
  handlingFee: number;
  rainFee: number;
  rainFeeActive: boolean;
  surgeFee: number;
  surgeFeeActive: boolean;
  productCharges: ProductChargeDetail[];
  totalProductCharges: number;
  customFees: Array<{ id: string; label: string; amount: number }>;
  totalCustomFees: number;
  totalFees: number;
  grandTotal: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
}

export interface WiringServiceBooking {
  id: string;
  serviceTitle: string;
  serviceCategory: string;
  projectType: '1BHK' | '2BHK' | '3BHK' | '4BHK / Villa' | 'Commercial Office' | 'Real Estate Complex' | 'Custom Industrial';
  approxAreaSqFt: number;
  preferredDate: string;
  preferredTimeSlot: string;
  siteAddress: string;
  area: string;
  pincode: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  estimatedPrice: number;
  wireGrade: string;
  notes?: string;
  status: 'requested' | 'confirmed' | 'technician_assigned' | 'completed';
  createdAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'accepted'
  | 'packing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'near_destination'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type DeliveryStatus =
  | 'unassigned'
  | 'assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'near_destination'
  | 'delivered'
  | 'failed'
  | 'returned';

export interface DeliveryPartner {
  id?: string;
  name: string;
  phone: string;
  vehicle_type?: 'bike' | 'scooter' | 'van' | 'tempo' | 'auto' | string;
  vehicleType?: string;
  vehicle_number?: string;
  vehicleNumber?: string;
  rating?: number;
  total_completed?: number;
  totalCompleted?: number;
  is_active?: boolean;
  avatar_url?: string | null;
  currentHub?: string;
  lat?: number;
  lng?: number;
  current_location?: { lat: number; lng: number; heading?: number; speed?: number; updatedAt?: string };
}

export interface ProofOfDelivery {
  method?: 'otp' | 'photo' | 'signature' | 'recipient_name' | 'contactless' | string;
  recipient_name?: string;
  otp_code?: string;
  photo_url?: string;
  signature_note?: string;
  notes?: string;
  collected_at?: string;
}

export interface DeliveryRecord {
  id?: string;
  order_id?: string;
  delivery_partner_id?: string | null;
  status?: DeliveryStatus;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  out_for_delivery_at?: string | null;
  near_destination_at?: string | null;
  delivered_at?: string | null;
  estimated_delivery_at?: string | null;
  delivery_notes?: string | null;
  proof_of_delivery?: ProofOfDelivery | null;
  delivery_partner?: DeliveryPartner | null;
  rider_location?: { lat: number; lng: number; heading?: number; speed?: number; updatedAt?: string } | null;
  current_lat?: number;
  current_lng?: number;
}

export interface DeliveryTrackingEvent {
  id: string;
  order_id: string;
  delivery_id?: string;
  stage: string;
  title: string;
  description?: string;
  customer_message?: string;
  actor?: 'admin' | 'delivery_partner' | 'system' | string;
  location_name?: string;
  created_at: string;
}

export interface Order {
  id: string;
  orderId?: string;
  order_id?: string;
  userId?: string;
  user_id?: string;
  customerName: string;
  recipientName?: string;
  phone: string;
  recipientPhone?: string;
  customerEmail?: string;
  recipientEmail?: string;
  address: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  area: string;
  pincode: string;
  addressLabel?: string;
  landmark?: string;
  deliveryNotes?: string;
  items: CartItem[];
  services?: WiringServiceBooking[];
  itemTotal: number;
  subtotal?: number;
  deliveryFee: number;
  handlingFee: number;
  rainFee?: number;
  surgeFee?: number;
  productHandlingFee?: number;
  fees?: number;
  feeBreakdown?: OrderFeeBreakdown;
  discount: number;
  discountAmount?: number;
  couponCode?: string | null;
  totalAmount: number;
  total?: number;
  finalAmount?: number;
  paymentMethod: 'cod' | 'upi' | 'card';
  paymentStatus: 'paid' | 'pending';
  paymentId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  refund_id?: string;
  refundId?: string;
  refund_status?: string;
  refund_error?: string;
  status: OrderStatus;
  createdAt: string;
  placed_at?: string;
  confirmed_at?: string;
  packed_at?: string;
  shipped_at?: string;
  out_for_delivery_at?: string;
  near_destination_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  cancellation_reason?: string;
  placedAt?: string;
  confirmedAt?: string;
  packedAt?: string;
  shippedAt?: string;
  outForDeliveryAt?: string;
  nearDestinationAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  estimated_delivery_at?: string;
  estimatedDeliveryTimestamp: number;
  deliveryPartner?: DeliveryPartner;
  delivery?: DeliveryRecord;
  trackingEvents?: DeliveryTrackingEvent[];
  riderLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    updatedAt?: string;
  } | null;
  notes?: string;
  trackingNumber?: string;
  orderNumber?: string;
}

export interface KolkataArea {
  name: string;
  pincode: string;
  zone: 'Central' | 'North' | 'South' | 'East' | 'West';
  hub: string;
  deliveryMinutes: number;
  serviceable: boolean;
  lat?: number;
  lng?: number;
  exactStreet?: string;
}

export interface SavedAddress {
  id: string;
  tag: 'home' | 'work' | 'hotel' | 'other';
  tagLabel?: string;
  houseName: string; // e.g. "Greenfield Heights", "Shanti Niwas", "Godrej Genesis"
  houseFlat: string; // e.g. "Flat 4B, 3rd Floor"
  buildingRoad: string; // e.g. "EP Block, Street No. 12"
  landmark?: string;
  area: KolkataArea;
  lat?: number;
  lng?: number;
  formattedExactAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
  createdAt?: string;
}

export interface UserReview {
  id: string;
  userName: string;
  userArea: string;
  rating: number;
  date: string;
  comment: string;
  productOrService: string;
  verifiedPurchase: boolean;
}

export interface WalletTransaction {
  id: string;
  type: 'refund' | 'cashback' | 'redemption' | 'deposit';
  title: string;
  description: string;
  amount: number;
  date: string;
  orderId?: string;
  status: 'credited' | 'debited' | 'pending';
}

export interface UserProfile {
  id?: string;
  name: string;
  phone: string;
  phoneVerified?: boolean;
  email?: string;
  emailVerified?: boolean;
  photoURL?: string;
  dob?: string;
  walletBalance?: number;
  refundBalance?: number;
  cashbackBalance?: number;
  savedUpiIds?: string[];
  transactions?: WalletTransaction[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReceivedEmail {
  id: string;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  receivedAt: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  category: 'quote' | 'support' | 'contractor' | 'inbound_webhook' | 'general';
  phone?: string;
  orderId?: string;
  headers?: Record<string, string>;
  attachmentsCount?: number;
  replySent?: {
    subject: string;
    sentAt: string;
    text: string;
  };
}

export type { Offer, OfferProduct, ProductOfferEvaluation } from './services/offerService';
export type { ProductReview } from './types/electrical';
export type {
  Technician,
  TechnicianReview,
  TechnicianCertification,
  TechnicianSkill
} from './types/technician';

