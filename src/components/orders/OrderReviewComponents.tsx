import React, { useState } from 'react';
import {
  Bike,
  Phone,
  Star,
  CheckCircle2,
  Package,
  Send,
  Loader2
} from 'lucide-react';
import { DeliveryPartner } from '../../types';

// ============================================================================
// 1. RIDER DETAILS CARD (Simple, uncluttered interface with heading & star rating)
// ============================================================================
export interface RiderDetailsCardProps {
  rider: DeliveryPartner | {
    id?: string;
    name: string;
    phone?: string;
    rating?: number;
    vehicleType?: string;
    vehicleNumber?: string;
    vehicle_type?: string;
    vehicle_number?: string;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    totalDeliveries?: number;
    total_completed?: number;
  };
}

export const RiderDetailsCard: React.FC<RiderDetailsCardProps> = ({ rider }) => {
  const [avatarError, setAvatarError] = useState(false);
  const ratingVal = typeof rider.rating === 'number' ? rider.rating : 4.8;
  const cleanPhone = (rider.phone || '').trim();
  const rawAvatar = (rider as any).avatar_url || (rider as any).avatarUrl;
  const avatar = typeof rawAvatar === 'string' && rawAvatar.trim() && !avatarError ? rawAvatar.trim() : null;

  const bikeNumber =
    (rider as any).vehicle_number ||
    (rider as any).vehicleNumber ||
    (rider as any).vehicle_no ||
    (rider as any).vehicleNo;

  const vehicleType =
    (rider as any).vehicle_type ||
    (rider as any).vehicleType ||
    'Express Delivery Bike';

  return (
    <div
      id="assigned-rider-details-card"
      className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-100 flex items-center justify-between transition-all"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Rider Avatar / Bike Icon fallback */}
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0 border border-amber-200/90 overflow-hidden shadow-2xs">
          {avatar ? (
            <img
              src={avatar}
              alt={rider.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <Bike className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-amber-600" />
          )}
        </div>

        {/* Heading, Bike Number & Rider Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Delivery Partner
            </span>
            {bikeNumber && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold font-mono tracking-wider bg-slate-100 text-slate-800 border border-slate-200 uppercase shadow-2xs whitespace-nowrap">
                {bikeNumber}
              </span>
            )}
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
            {rider.name}
          </h3>

          {/* Star rating of rider & Vehicle Details */}
          <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
            <div className="flex items-center">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline" />
            </div>
            <span className="text-xs font-black text-slate-800">
              {ratingVal.toFixed(1)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              • Express Dispatch
            </span>
            {vehicleType && (
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                • {vehicleType}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Direct Call Action */}
      {cleanPhone && (
        <a
          href={`tel:${cleanPhone}`}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors border border-emerald-200/80 shrink-0 cursor-pointer shadow-2xs ml-3"
          title={`Call ${rider.name}`}
          aria-label={`Call ${rider.name}`}
        >
          <Phone className="w-4 h-4" />
        </a>
      )}
    </div>
  );
};

// ============================================================================
// 2. RIDER REVIEW CARD (Appears below rider section when order is completed)
// ============================================================================
export interface RiderReviewCardProps {
  orderId: string;
  riderName: string;
  existingReview?: {
    rating: number;
    comment?: string;
    tags?: string[];
    createdAt?: string;
  } | null;
  onReviewSubmitted?: (review: any) => void;
}

const RIDER_QUICK_TAGS = [
  'Polite & Helpful',
  'On-time Delivery',
  'Careful Handling',
  'Quick Service'
];

export const RiderReviewCard: React.FC<RiderReviewCardProps> = ({
  orderId,
  riderName,
  existingReview,
  onReviewSubmitted
}) => {
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(existingReview?.tags || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<any | null>(existingReview || null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/rider-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment,
          tags: selectedTags,
          riderName
        })
      });
      const data = await res.json();
      if (data.success && data.review) {
        setSubmittedReview(data.review);
        if (onReviewSubmitted) onReviewSubmitted(data.review);
      }
    } catch (err) {
      console.error('Failed to submit rider review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedReview) {
    return (
      <div className="bg-amber-50/70 rounded-2xl p-4 sm:p-4.5 border border-amber-200/80 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Thank you for rating {riderName}!</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              {submittedReview.rating}/5 Stars
            </span>
            {submittedReview.tags && submittedReview.tags.length > 0 && (
              <span className="text-[11px] text-amber-800">
                • {submittedReview.tags.join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[11px] font-bold text-amber-700 bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">
            Feedback Saved
          </span>
        </div>
      </div>
    );
  }

  const activeStars = hoverRating || rating;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-100 space-y-3.5 transition-all"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Rate Delivery Experience
          </span>
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
            How was your delivery with {riderName}?
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
          Rider Review
        </span>
      </div>

      {/* 5-Star interactive buttons */}
      <div className="flex items-center gap-1.5 pt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 cursor-pointer transition-transform hover:scale-115 active:scale-95 focus:outline-hidden"
            aria-label={`Rate ${star} star`}
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                activeStars >= star
                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_2px_rgba(251,191,36,0.6)]'
                  : 'text-slate-200 fill-none hover:text-amber-300'
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-xs font-bold text-slate-700 ml-2">
            {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : 'Needs improvement'}
          </span>
        )}
      </div>

      {/* Quick feedback chips */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {RIDER_QUICK_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Optional feedback note */}
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add an optional comment for the rider..."
        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-amber-400 focus:bg-white transition-colors"
      />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={rating === 0 || isSubmitting}
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          rating > 0 && !isSubmitting
            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs active:scale-98'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Submitting Review...</span>
          </>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            <span>Submit Rider Review</span>
          </>
        )}
      </button>
    </form>
  );
};

// ============================================================================
// 3. ORDER / PRODUCT REVIEW CARD (Appears below order section when order is completed)
// ============================================================================
export interface OrderProductReviewCardProps {
  orderId: string;
  itemsCount: number;
  items?: any[];
  existingReview?: {
    rating: number;
    comment?: string;
    tags?: string[];
    createdAt?: string;
  } | null;
  onReviewSubmitted?: (review: any) => void;
}

const PRODUCT_QUICK_TAGS = [
  'High Quality',
  'Genuine Materials',
  'Well Packed',
  'Exact Match'
];

export const OrderProductReviewCard: React.FC<OrderProductReviewCardProps> = ({
  orderId,
  itemsCount,
  items = [],
  existingReview,
  onReviewSubmitted
}) => {
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(existingReview?.tags || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<any | null>(existingReview || null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/product-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment,
          tags: selectedTags,
          items
        })
      });
      const data = await res.json();
      if (data.success && data.review) {
        setSubmittedReview(data.review);
        if (onReviewSubmitted) onReviewSubmitted(data.review);
      }
    } catch (err) {
      console.error('Failed to submit product review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedReview) {
    return (
      <div className="bg-emerald-50/70 rounded-2xl p-4 sm:p-4.5 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-emerald-950">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Thank you for reviewing your products!</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
              <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
              {submittedReview.rating}/5 Stars
            </span>
            {submittedReview.tags && submittedReview.tags.length > 0 && (
              <span className="text-[11px] text-emerald-800">
                • {submittedReview.tags.join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[11px] font-bold text-emerald-700 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
            Review Submitted
          </span>
        </div>
      </div>
    );
  }

  const activeStars = hoverRating || rating;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-100 space-y-3.5 transition-all"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Rate Products &amp; Packaging
          </span>
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
            How were the items in your order?
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
          Order Review ({itemsCount} {itemsCount === 1 ? 'item' : 'items'})
        </span>
      </div>

      {/* 5-Star interactive buttons */}
      <div className="flex items-center gap-1.5 pt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 cursor-pointer transition-transform hover:scale-115 active:scale-95 focus:outline-hidden"
            aria-label={`Rate ${star} star`}
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                activeStars >= star
                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_2px_rgba(251,191,36,0.6)]'
                  : 'text-slate-200 fill-none hover:text-amber-300'
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-xs font-bold text-slate-700 ml-2">
            {rating === 5 ? 'Excellent quality!' : rating === 4 ? 'Good materials' : rating === 3 ? 'Satisfactory' : 'Needs attention'}
          </span>
        )}
      </div>

      {/* Quick feedback chips */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {PRODUCT_QUICK_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Optional feedback note */}
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write comments about products, packaging, or brand (optional)..."
        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
      />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={rating === 0 || isSubmitting}
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          rating > 0 && !isSubmitting
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-98'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Submitting Review...</span>
          </>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            <span>Submit Product Review</span>
          </>
        )}
      </button>
    </form>
  );
};
