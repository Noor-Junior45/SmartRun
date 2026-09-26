import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle2, AlertCircle, Send, LogIn, ThumbsUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ProductReview } from '../types/electrical';
import { submitProductReview, fetchProductReviews } from '../services/electricalService';

interface ProductReviewsSectionProps {
  productId: string;
  productName?: string;
  onOpenAuth?: () => void;
  className?: string;
}

export const ProductReviewsSection = ({
  productId,
  productName,
  onOpenAuth,
  className = ''
}: ProductReviewsSectionProps) => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showInputForm, setShowInputForm] = useState(false);

  // Check auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Fetch reviews for this product
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetchProductReviews(productId)
      .then((data) => {
        setReviews(data);
      })
      .catch((err) => {
        console.warn('Error fetching reviews:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId]);

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviews.length
    : 5.0;

  const ratingCounts = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Math.round(Number(r.rating)) === stars).length;
    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { stars, count, pct };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanComment = comment.trim();
    const cleanTitle = cleanComment ? cleanComment.slice(0, 50) : `${rating} Star Rating`;

    const result = await submitProductReview({
      product_id: productId,
      rating,
      title: cleanTitle,
      comment: cleanComment
    });

    setIsSubmitting(false);

    if (result.success && result.review) {
      setReviews((prev) => [result.review!, ...prev.filter((r) => r.id !== result.review!.id)]);
      setSuccessMsg('Thank you! Your review and rating have been posted.');
      setTitle('');
      setComment('');
      setRating(5);
      setTimeout(() => {
        setSuccessMsg(null);
        setShowInputForm(false);
      }, 2500);
    } else {
      setErrorMsg(result.error || 'Failed to submit review. Please try again.');
    }
  };

  return (
    <div id="product-reviews-section" className={`space-y-4 ${className}`}>
      {/* Header & Write Review CTA */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            Customer Ratings &amp; Reviews
          </h3>
          <p className="text-[11px] text-slate-500">
            {reviews.length > 0
              ? `Based on ${reviews.length} customer ${reviews.length === 1 ? 'review' : 'reviews'}`
              : 'Verified reviews from Kolkata buyers'}
          </p>
        </div>

        {!showInputForm && (
          <button
            type="button"
            onClick={() => {
              if (!currentUser && onOpenAuth) {
                onOpenAuth();
              } else {
                setShowInputForm(true);
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs transition shadow-xs cursor-pointer border border-yellow-500/30 flex items-center gap-1"
          >
            <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            <span>Rate &amp; Review</span>
          </button>
        )}
      </div>

      {/* Rating Breakdown & Stats */}
      {reviews.length > 0 && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4 text-center sm:text-left sm:border-r sm:border-slate-200 sm:pr-3 space-y-0.5">
            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <span className="text-2xl font-black text-slate-900">
                {averageRating.toFixed(1)}
              </span>
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-600">
              {reviews.length} Verified {reviews.length === 1 ? 'Rating' : 'Ratings'}
            </p>
          </div>

          <div className="sm:col-span-8 space-y-1">
            {ratingCounts.map((rc) => (
              <div key={rc.stars} className="flex items-center gap-2 text-[10px]">
                <span className="w-6 font-bold text-slate-700 flex items-center gap-0.5">
                  {rc.stars}★
                </span>
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      rc.stars >= 4 ? 'bg-emerald-600' : rc.stars === 3 ? 'bg-amber-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${rc.pct}%` }}
                  />
                </div>
                <span className="w-6 text-right font-medium text-slate-500">{rc.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Submission Input Card */}
      {showInputForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-white border-2 border-yellow-400 rounded-xl space-y-3 shadow-xs animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              Write Review {productName ? `for ${productName}` : ''}
            </h4>
            <button
              type="button"
              onClick={() => setShowInputForm(false)}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-bold"
            >
              Cancel
            </button>
          </div>

          {/* Feedback message */}
          {errorMsg && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Star Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Select Your Rating
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 rounded hover:scale-110 transition-transform cursor-pointer"
                  title={`${star} Star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-slate-700 ml-2">
                {(hoverRating || rating) === 5
                  ? '5★ Excellent'
                  : (hoverRating || rating) === 4
                  ? '4★ Very Good'
                  : (hoverRating || rating) === 3
                  ? '3★ Good'
                  : (hoverRating || rating) === 2
                  ? '2★ Fair'
                  : '1★ Poor'}
              </span>
            </div>
          </div>

          {/* Review (Optional) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Review (Optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your review here (optional)..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none font-medium text-slate-900 resize-none"
              maxLength={1000}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {!currentUser ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in to submit
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium">
                Posting as <strong className="text-slate-800">{currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Customer'}</strong>
              </span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowInputForm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs transition shadow-xs cursor-pointer border border-yellow-500/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Posting...' : 'Submit Review'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Review List */}
      {loading ? (
        <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
          Loading verified reviews...
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-2.5">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-black">
                    {rev.rating} <Star className="w-2.5 h-2.5 fill-white" />
                  </span>
                  {rev.title && !rev.title.endsWith('Star Rating') && (
                    <span className="font-bold text-slate-900 text-xs">
                      {rev.title}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(rev.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {rev.comment && rev.comment.trim() && (
                <p className="text-slate-700 leading-relaxed text-[11px]">
                  {rev.comment}
                </p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                <div className="flex items-center gap-1 text-slate-700 font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{rev.user_name || 'Verified Buyer'}</span>
                  <span className="text-emerald-700 font-bold ml-1">• Verified Purchase</span>
                </div>
                <span className="text-slate-400 flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" /> Helpful
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
          <MessageSquare className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-800">No customer reviews yet</p>
          <p className="text-[11px] text-slate-500">
            Be the first customer to share feedback on genuine quality &amp; performance.
          </p>
        </div>
      )}
    </div>
  );
};
