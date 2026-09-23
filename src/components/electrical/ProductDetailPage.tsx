import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  Zap,
  ShoppingCart,
  RotateCcw,
  Tag,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  MapPin,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  X,
  Share2,
  Check,
  HelpCircle,
  Palette,
  Heart
} from 'lucide-react';
import { ElectricalProduct, ProductReview } from '../../types/electrical';
import {
  fetchElectricalProductById,
  fetchSimilarElectricalProducts,
  fetchProductReviews,
  submitProductReview,
  fetchProductFaqs
} from '../../services/electricalService';
import { isProductFavorite, toggleProductFavorite } from '../../services/favorites';
import { Product, UserProfile } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { isConstructionProduct } from '../../utils/categoryHelper';
import { ProductCardImage } from '../ProductCardImage';
import {
  isWireProduct,
  isPipeProduct,
  getProductColorOptions,
  getDefaultProductColor
} from '../../data/wireColors';
import { checkKolkataDeliveryService } from '../../data/kolkataAreas';
import { trackProductView } from '../../utils/analytics';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { SEOHead } from '../SEOHead';
import { shareProductDetails } from '../../utils/shareProduct';
import { ZoomableImage } from '../ZoomableImage';
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack';
import { formatProductSpecifications, getFlattenedSpecifications } from '../../utils/productSpecifications';

interface ProductDetailPageProps {
  onAddToCart: (product: Product) => void;
  cartItems?: { product: Product; quantity: number }[];
  onOpenCart: () => void;
  userProfile: UserProfile | null;
  onOpenAuth: () => void;
}

export const ProductDetailPage = ({
  onAddToCart,
  cartItems = [],
  onOpenCart,
  userProfile,
  onOpenAuth
}: ProductDetailPageProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ElectricalProduct | null>(null);
  const [similarProducts, setSimilarProducts] = useState<ElectricalProduct[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedWireColor, setSelectedWireColor] = useState<string>('Red');

  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  const scrollThumbnails = (direction: 'prev' | 'next') => {
    if (!thumbnailContainerRef.current) return;
    const isMobile = window.innerWidth < 640;
    const scrollAmount = isMobile ? 160 : 150;
    if (isMobile) {
      thumbnailContainerRef.current.scrollBy({
        left: direction === 'next' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    } else {
      thumbnailContainerRef.current.scrollBy({
        top: direction === 'next' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Delivery Pincode Check State
  const [pincode, setPincode] = useState('700091');
  const [pincodeChecked, setPincodeChecked] = useState(true);

  // Specifications Accordion State
  const [isSpecsExpanded, setIsSpecsExpanded] = useState(true);

  // Normalized Specifications (Handles Supabase JSON, {key, value} pairs, numeric indices, nested groups)
  const specGroups = useMemo(() => {
    if (!product) return [];
    return formatProductSpecifications(product.specifications, product.brand);
  }, [product?.specifications, product?.brand]);

  // Review Form State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Reviews Pagination State
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(4);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistToast, setWishlistToast] = useState<string | null>(null);

  // FAQ Accordion State (first item open by default)
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqs, setFaqs] = useState<Array<{ q: string; a: string }>>([]);

  const reviewsSectionRef = useRef<HTMLDivElement>(null);

  // Sync wishlist status
  useEffect(() => {
    if (product?.id) {
      setIsWishlisted(isProductFavorite(String(product.id)));
    }
  }, [product?.id]);

  useEffect(() => {
    const handleFavChange = () => {
      if (product?.id) {
        setIsWishlisted(isProductFavorite(String(product.id)));
      }
    };
    window.addEventListener('giriraj_favorites_changed', handleFavChange);
    return () => window.removeEventListener('giriraj_favorites_changed', handleFavChange);
  }, [product?.id]);

  const handleToggleWishlist = () => {
    if (!product) return;
    hapticLight();
    const newState = toggleProductFavorite(String(product.id));
    setIsWishlisted(newState);
    setWishlistToast(newState ? 'Added to wishlist!' : 'Removed from wishlist');
    setTimeout(() => setWishlistToast(null), 2200);
  };

  // Fetch product, reviews, and similar items
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    fetchElectricalProductById(id)
      .then((data) => {
        if (!isMounted) return;
        setProduct(data);
        setSelectedImageIndex(0);
        setLoading(false);

        if (data) {
          // Track Product View for GA4
          trackProductView(data);

          // Fetch dynamic FAQs from Supabase or fallback
          fetchProductFaqs(data.id, data)
            .then((loadedFaqs) => {
              if (isMounted) setFaqs(loadedFaqs);
            })
            .catch(console.warn);

          // Fetch similar products
          fetchSimilarElectricalProducts(data.id, data.subcategory)
            .then((sim) => {
              if (isMounted) setSimilarProducts(sim);
            })
            .catch(console.warn);

          // Fetch reviews
          fetchProductReviews(data.id)
            .then((revs) => {
              if (isMounted) setReviews(revs);
            })
            .catch(console.warn);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const isWire = product ? isWireProduct(product) : false;
  const isPipe = product ? isPipeProduct(product) : false;
  const colorOptions = useMemo(() => (product ? getProductColorOptions(product) : []), [product]);
  const hasColorOptions = colorOptions.length > 0;

  // Active selected color option details (may include custom variant price, mrp, and image_url)
  const activeColorOption = useMemo(() => {
    if (!hasColorOptions) return null;
    return colorOptions.find((c) => c.name.toLowerCase() === (selectedWireColor || '').toLowerCase()) || colorOptions[0] || null;
  }, [colorOptions, selectedWireColor, hasColorOptions]);

  // Dynamic price & MRP based on selected colour variant if specified
  const effectivePrice = useMemo(() => {
    if (activeColorOption && typeof activeColorOption.price === 'number' && activeColorOption.price > 0) {
      return activeColorOption.price;
    }
    return product?.price || 0;
  }, [activeColorOption, product?.price]);

  const effectiveMrp = useMemo(() => {
    if (activeColorOption && typeof activeColorOption.mrp === 'number' && activeColorOption.mrp > 0) {
      return activeColorOption.mrp;
    }
    return product?.mrp || 0;
  }, [activeColorOption, product?.mrp]);

  const effectiveDiscountPercent = useMemo(() => {
    if (activeColorOption && typeof activeColorOption.discount_percent === 'number') {
      return activeColorOption.discount_percent;
    }
    if (effectiveMrp > effectivePrice) {
      return Math.round(((effectiveMrp - effectivePrice) / effectiveMrp) * 100);
    }
    return product?.discount_percent || 0;
  }, [activeColorOption, effectivePrice, effectiveMrp, product?.discount_percent]);

  // Dynamic gallery images: if selected color has linked photo(s), prioritize them in gallery
  const effectiveImageUrls = useMemo(() => {
    if (!product) return [];
    const baseImages = Array.isArray(product.image_urls) && product.image_urls.length > 0 ? product.image_urls : [];
    
    // If the active color has its own image or image_urls
    if (activeColorOption) {
      const variantImages: string[] = [];
      if (Array.isArray(activeColorOption.image_urls) && activeColorOption.image_urls.length > 0) {
        variantImages.push(...activeColorOption.image_urls.filter(Boolean));
      } else if (Array.isArray(activeColorOption.images) && activeColorOption.images.length > 0) {
        variantImages.push(...activeColorOption.images.filter(Boolean));
      } else if (activeColorOption.image_url) {
        variantImages.push(activeColorOption.image_url);
      } else if (activeColorOption.imageUrl) {
        variantImages.push(activeColorOption.imageUrl);
      }

      if (variantImages.length > 0) {
        // Return variant image(s) first, then other base images (excluding duplicates)
        const combined = [...variantImages, ...baseImages.filter((img) => !variantImages.includes(img))];
        return combined.filter(Boolean);
      }
    }

    return baseImages.length > 0
      ? baseImages
      : ['https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=800&auto=format&fit=crop'];
  }, [product, activeColorOption]);

  // Set default color when product changes
  useEffect(() => {
    if (product) {
      const def = getDefaultProductColor(product);
      if (def) setSelectedWireColor(def);
      setSelectedImageIndex(0);
    }
  }, [product]);

  // Reset selected image index when user switches colour variant
  const handleSelectColor = (colorName: string) => {
    setSelectedWireColor(colorName);
    setSelectedImageIndex(0);
  };

  // Adapt for App's Cart system
  const adaptToCartProduct = (ep: ElectricalProduct): Product => ({
    id: ep.id,
    name: ep.name,
    brand: ep.brand,
    category: isPipe ? 'construction' : 'electrical',
    subCategory: ep.subcategory,
    price: effectivePrice,
    originalPrice: effectiveMrp,
    discountPercentage: effectiveDiscountPercent,
    unit: '1 unit',
    rating: ep.rating_avg,
    reviewsCount: ep.rating_count,
    deliveryMinutes: 60,
    image: effectiveImageUrls[0] || ep.image_urls[0] || 'https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=800&auto=format&fit=crop',
    images: effectiveImageUrls,
    image_urls: effectiveImageUrls,
    inStock: ep.stock_quantity > 0,
    stockCount: ep.stock_quantity,
    isEmergency: false,
    specs: getFlattenedSpecifications(ep.specifications, ep.brand).reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>),
    description: ep.description,
    tags: [ep.brand, ep.subcategory, isPipe ? 'Pipes' : 'Electrical'],
    colors: ep.colors || [],
    colours: ep.colours || ep.colors || [],
    color_options: ep.color_options,
    color_variants: ep.color_variants,
    selectedColor: hasColorOptions ? selectedWireColor : undefined
  });

  const cartQty = product
    ? cartItems
        .filter((i) => String(i.product.id) === String(product.id))
        .reduce((acc, it) => acc + (it.quantity || 0), 0)
    : 0;

  // Zoom Handler
  const scrollToReviews = () => {
    reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleShareProduct = async () => {
    if (!product) return;
    const res = await shareProductDetails({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      category: product.category
    });

    if (res.success) {
      setCopiedLink(true);
      setShareToast(res.method === 'clipboard' ? 'Link copied to clipboard!' : 'Shared!');
      setTimeout(() => {
        setCopiedLink(false);
        setShareToast(null);
      }, 2500);
    }
  };

  // Submit Review Handler
  const handleOpenReviewModal = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      onOpenAuth();
      return;
    }
    setReviewError(null);
    setReviewSuccess(false);
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      setReviewError('Please provide both a review title and comment.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);

    const res = await submitProductReview({
      product_id: product.id,
      rating: reviewRating,
      title: reviewTitle,
      comment: reviewComment
    });

    setIsSubmittingReview(false);

    if (res.success && res.review) {
      setReviews((prev) => [res.review!, ...prev]);
      setReviewSuccess(true);
      setReviewTitle('');
      setReviewComment('');
      setTimeout(() => {
        setIsReviewModalOpen(false);
        setReviewSuccess(false);
      }, 1500);
    } else {
      setReviewError(res.error || 'Failed to submit review. Please try again.');
    }
  };

  // Calculate Ratings Distribution (5-star down to 1-star) from real reviews only
  const ratingsDistribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Math.round(r.rating) === stars).length;
    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { stars, count, percentage };
  });

  const averageRating = useMemo(() => {
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      return Number((sum / reviews.length).toFixed(1));
    }
    return product ? Number(product.rating_avg || 0) : 0;
  }, [reviews, product]);

  const isConstructionCategory = product ? isConstructionProduct(product) : false;
  const catalogBackRoute = isConstructionCategory ? '/construction' : '/electrical';
  const catalogBackTitle = isConstructionCategory ? 'Back to Construction Store' : 'Back to Electrical Store';

  // Mobile edge swipe back gesture (declared before any early returns to satisfy React Hook rules)
  useEdgeSwipeBack({
    onBack: () => navigate(catalogBackRoute),
    disabled: loading || !product
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f3f6] flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-800">Loading Product Details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f1f3f6] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-xl border border-slate-200 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Product Not Found</h2>
          <p className="text-xs text-slate-500">
            The product you are looking for does not exist or has been removed from our catalog.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/electrical"
              className="inline-block px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-xs font-bold rounded-md transition-colors"
            >
              Electrical Store
            </Link>
            <Link
              to="/construction"
              className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-md transition-colors"
            >
              Construction Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentImage =
    effectiveImageUrls[selectedImageIndex] ||
    effectiveImageUrls[0] ||
    'https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=800&auto=format&fit=crop';

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-slate-900 pb-32 sm:pb-36 font-sans relative">
      <SEOHead
        title={`${product.name} - Buy Online at Best Price in Kolkata | Giriraj Power`}
        description={`Buy authentic ${product.brand} ${product.subcategory}, ₹${effectivePrice} in Kolkata. Fast 60-min delivery, genuine manufacturer warranty, and certified quality from Giriraj Power.`}
        keywords={`${product.name}, ${product.brand}, ${product.subcategory}, buy ${product.name} Kolkata, wholesale electrical shop near me`}
        image={currentImage}
        productData={{
          name: product.name,
          description: product.description,
          price: effectivePrice,
          brand: product.brand,
          image: currentImage,
          inStock: product.stock_quantity > 0,
          rating: 4.8,
          reviewsCount: reviews.length || 24
        }}
      />
      
      {/* Floating Back Button to easily go back to Store catalog from anywhere */}
      <button
        type="button"
        onClick={() => navigate(catalogBackRoute)}
        className="fixed top-4 sm:top-5 left-4 sm:left-6 z-50 p-2.5 sm:p-3 rounded-full bg-white text-slate-800 hover:bg-yellow-400 hover:text-slate-950 shadow-xl hover:shadow-2xl transition-all border border-slate-300 backdrop-blur-md cursor-pointer active:scale-90 flex items-center justify-center group"
        title={catalogBackTitle}
        aria-label={catalogBackTitle}
      >
        <ArrowLeft className="w-5 h-5 stroke-[2.5] group-hover:-translate-x-0.5 transition-transform" />
      </button>

      {/* Main Two-Column Layout */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-5">
        <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: IMAGE GALLERY WITH ZOOM + FLOATING BOTTOM ACTION BAR */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 flex flex-col gap-4 self-start lg:sticky lg:top-6">
            
            {/* Gallery Image Display */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              
              {/* Thumbnail Strip with Up/Down and Left/Right Scroll Arrows */}
              {effectiveImageUrls.length > 1 && (
                <div className="flex sm:flex-col items-center justify-center relative select-none">
                  {/* Desktop Up Scroll Button (shown when 5+ images) */}
                  {effectiveImageUrls.length >= 5 && (
                    <button
                      type="button"
                      onClick={() => scrollThumbnails('prev')}
                      className="hidden sm:flex mb-1 p-1 rounded-full bg-white hover:bg-yellow-400 hover:text-slate-950 text-slate-600 border border-slate-200 shadow-xs transition-all cursor-pointer items-center justify-center z-10 active:scale-90"
                      title="Scroll previous thumbnails"
                      aria-label="Scroll previous thumbnails"
                    >
                      <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}

                  {/* Mobile Left Scroll Button (shown when 5+ images) */}
                  {effectiveImageUrls.length >= 5 && (
                    <button
                      type="button"
                      onClick={() => scrollThumbnails('prev')}
                      className="sm:hidden absolute left-0 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/95 text-slate-800 border border-slate-200 shadow-md transition-all cursor-pointer z-20 active:scale-90 hover:bg-yellow-400"
                      title="Scroll left"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}

                  {/* Scrollable Thumbnails List */}
                  <div
                    ref={thumbnailContainerRef}
                    className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-96 px-6 sm:px-0 py-0.5 sm:py-1 scrollbar-none scroll-smooth"
                  >
                    {effectiveImageUrls.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        onMouseEnter={() => setSelectedImageIndex(idx)}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg border p-1 bg-slate-50 shrink-0 transition-all cursor-pointer relative ${
                          selectedImageIndex === idx
                            ? 'border-yellow-500 ring-2 ring-yellow-300 shadow-xs'
                            : 'border-slate-200 hover:border-slate-400 opacity-85 hover:opacity-100'
                        }`}
                        title={`View photo ${idx + 1}`}
                      >
                        <img
                          src={imgUrl}
                          alt={`thumbnail-${idx}`}
                          className="w-full h-full object-contain"
                        />
                      </button>
                    ))}
                  </div>

                  {/* Desktop Down Scroll Button (shown when 5+ images) */}
                  {effectiveImageUrls.length >= 5 && (
                    <button
                      type="button"
                      onClick={() => scrollThumbnails('next')}
                      className="hidden sm:flex mt-1 p-1 rounded-full bg-white hover:bg-yellow-400 hover:text-slate-950 text-slate-600 border border-slate-200 shadow-xs transition-all cursor-pointer items-center justify-center z-10 active:scale-90"
                      title="Scroll next thumbnails"
                      aria-label="Scroll next thumbnails"
                    >
                      <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}

                  {/* Mobile Right Scroll Button (shown when 5+ images) */}
                  {effectiveImageUrls.length >= 5 && (
                    <button
                      type="button"
                      onClick={() => scrollThumbnails('next')}
                      className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/95 text-slate-800 border border-slate-200 shadow-md transition-all cursor-pointer z-20 active:scale-90 hover:bg-yellow-400"
                      title="Scroll right"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              )}

              {/* Main Product Image (Clean display with zoom gestures and on-hover navigation arrows) */}
              <div
                className="flex-1 aspect-square relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-2 group select-none"
              >
                <ZoomableImage
                  src={currentImage}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  containerClassName="w-full h-full"
                  onSwipeLeft={() => {
                    if (effectiveImageUrls.length > 1) {
                      setSelectedImageIndex((prev) => (prev + 1) % effectiveImageUrls.length);
                    }
                  }}
                  onSwipeRight={() => {
                    if (effectiveImageUrls.length > 1) {
                      setSelectedImageIndex((prev) => (prev === 0 ? effectiveImageUrls.length - 1 : prev - 1));
                    }
                  }}
                />

                {/* Left & Right on-image navigation buttons if multiple images exist */}
                {effectiveImageUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedImageIndex((prev) => (prev === 0 ? effectiveImageUrls.length - 1 : prev - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md border border-slate-200 cursor-pointer active:scale-90 transition-all opacity-0 group-hover:opacity-100 z-10"
                      title="Previous image"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedImageIndex((prev) => (prev + 1) % effectiveImageUrls.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md border border-slate-200 cursor-pointer active:scale-90 transition-all opacity-0 group-hover:opacity-100 z-10"
                      title="Next image"
                    >
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    {/* Image indicator pill */}
                    <div className="absolute bottom-2 right-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs z-10">
                      {selectedImageIndex + 1} / {effectiveImageUrls.length}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Floating Action Buttons at Bottom of Screen */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] py-3 px-4 sm:px-6">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
                
                {/* Left Product Quick Info (Shown on tablets and desktop) */}
                <div className="hidden sm:flex items-center gap-3 min-w-0">
                  <img
                    src={effectiveImageUrls[0] || currentImage}
                    alt={product.name}
                    className="w-11 h-11 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate max-w-xs md:max-w-sm">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-black text-sm text-slate-950">
                        ₹{effectivePrice.toLocaleString('en-IN')}
                      </span>
                      {effectiveMrp > effectivePrice && (
                        <span className="text-[11px] text-slate-400 line-through">
                          ₹{effectiveMrp.toLocaleString('en-IN')}
                        </span>
                      )}
                      <span className={`text-[11px] font-bold ${product.stock_quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {product.stock_quantity > 0 ? 'In Stock • Kasba Hub Dispatch' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating Action Buttons: Shows Add to Cart & Buy Now if in stock; Single Out of Stock button if out of stock */}
                {product.stock_quantity > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full sm:w-auto sm:min-w-[360px] md:min-w-[400px]">
                    <button
                      onClick={() => {
                        hapticMedium();
                        onAddToCart(adaptToCartProduct(product));
                      }}
                      className="h-11 sm:h-12 px-2 sm:px-4 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-tight flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-all cursor-pointer active:scale-98 border border-yellow-500/40 whitespace-nowrap"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="whitespace-nowrap">Add to Cart {cartQty > 0 ? `(${cartQty})` : ''}</span>
                    </button>

                    <button
                      onClick={() => {
                        hapticMedium();
                        if (cartQty === 0) {
                          onAddToCart(adaptToCartProduct(product));
                        }
                        onOpenCart();
                      }}
                      className="h-11 sm:h-12 px-2 sm:px-4 rounded-xl bg-[#fb641b] hover:bg-[#e85b17] text-white font-black text-[11px] sm:text-xs uppercase tracking-tight flex items-center justify-center shadow-sm transition-all cursor-pointer active:scale-98 whitespace-nowrap"
                    >
                      <span className="whitespace-nowrap">{cartQty > 0 ? 'Go to Cart' : 'Buy Now'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="w-full sm:w-auto sm:min-w-[360px] md:min-w-[400px]">
                    <button
                      disabled
                      className="w-full h-11 sm:h-12 px-6 rounded-xl bg-slate-200 text-slate-500 font-black text-[11px] sm:text-xs uppercase tracking-wide flex items-center justify-center gap-2 cursor-not-allowed border border-slate-300 shadow-none whitespace-nowrap"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>Out of Stock</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: PRODUCT DETAILS & REVIEWS */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Title, Brand & Telegram-Style Share Button */}
            <div>
              {product.brand && (
                <p className="text-xs font-black text-amber-600 uppercase tracking-wider mb-1">
                  {product.brand}
                </p>
              )}
              
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight flex-1">
                  {product.name}
                </h1>

                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  {/* Wishlist / Heart Button */}
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className={`p-2 sm:p-2.5 rounded-full transition-all cursor-pointer shadow-xs border active:scale-90 flex items-center justify-center relative ${
                      isWishlisted
                        ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 shadow-rose-100'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                    }`}
                    title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isWishlisted ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-700 hover:text-rose-600'
                      }`}
                    />
                    {wishlistToast && (
                      <span className="absolute -top-7 right-0 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold whitespace-nowrap shadow-md z-30">
                        {wishlistToast}
                      </span>
                    )}
                  </button>

                  {/* Share Button */}
                  <button
                    type="button"
                    onClick={handleShareProduct}
                    className="p-2 sm:p-2.5 rounded-full bg-slate-100 hover:bg-yellow-400 hover:text-slate-950 text-slate-700 transition-all cursor-pointer shadow-xs border border-slate-200 active:scale-90 flex items-center justify-center relative"
                    title={copiedLink ? "Link copied!" : "Share product link"}
                    aria-label="Share product link"
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    ) : (
                      <Share2 className="w-4 h-4 text-slate-700" />
                    )}
                    {shareToast && (
                      <span className="absolute -top-7 right-0 px-2 py-0.5 rounded-lg bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold whitespace-nowrap shadow-lg border border-slate-700/50 z-30 animate-in fade-in zoom-in-95">
                        {shareToast}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Real Rating & Reviews Count (Cleaned without Giriraj Assured tag) */}
              <div className="flex items-center gap-3 mt-2">
                {reviews.length > 0 ? (
                  <>
                    <button
                      onClick={scrollToReviews}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#388e3c] text-white text-xs font-black tracking-tight shadow-2xs hover:bg-green-700 transition-colors cursor-pointer"
                    >
                      {averageRating.toFixed(1)}
                      <Star className="w-3 h-3 fill-white" />
                    </button>
                    <button
                      onClick={scrollToReviews}
                      className="text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
                    >
                      {reviews.length} {reviews.length === 1 ? 'Customer Review' : 'Customer Reviews'}
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">
                    No ratings yet
                  </span>
                )}
              </div>
            </div>

            {/* Price Block */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ₹{effectivePrice.toLocaleString('en-IN')}
                </span>
                {effectiveMrp > effectivePrice && (
                  <span className="text-sm text-slate-400 line-through font-semibold">
                    ₹{effectiveMrp.toLocaleString('en-IN')}
                  </span>
                )}
                {effectiveDiscountPercent > 0 && (
                  <span className="text-sm font-black text-[#388e3c]">
                    {effectiveDiscountPercent}% off
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Inclusive of all taxes • GST invoice available on checkout
              </p>
            </div>

            {/* Colour Options (IS 694 Indian Standards / Conduit Standards) */}
            {hasColorOptions && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Palette className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                    {isPipe ? 'Select Pipe Colour' : isWire ? 'Select Wire Colour' : 'Select Colour Option'}
                  </h3>
                </div>

                {/* Interactive Colour Swatches Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {colorOptions.map((opt) => {
                    const isSelected = selectedWireColor === opt.name;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => handleSelectColor(opt.name)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center relative ${
                          isSelected
                            ? 'border-slate-900 bg-white ring-2 ring-slate-900 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/80 shadow-2xs'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border transition-transform ${
                            isSelected ? 'border-white ring-2 ring-slate-900 scale-105 shadow-xs' : 'border-black/20'
                          }`}
                          style={{ backgroundColor: opt.hex }}
                        >
                          {isSelected && (
                            <Check
                              className={`w-3.5 h-3.5 stroke-[3] ${
                                opt.name === 'White' || opt.name === 'Ivory / Off-White' ? 'text-slate-900' : 'text-white'
                              }`}
                            />
                          )}
                        </div>
                        <div className="min-w-0 w-full px-0.5">
                          <span className="block text-[11px] font-black text-slate-900 leading-tight truncate">
                            {opt.name}
                          </span>
                          {typeof opt.price === 'number' && opt.price > 0 ? (
                            <span className="block text-[10px] font-black text-emerald-700 truncate">
                              ₹{opt.price.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="block text-[9px] font-semibold text-slate-500 truncate">
                              {opt.shortRole}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Color Purpose Banner */}
                {(() => {
                  const activeColor = colorOptions.find((c) => c.name === selectedWireColor);
                  if (!activeColor) return null;
                  return (
                    <div className="p-2 sm:p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] sm:text-xs text-slate-700 flex items-center gap-2 shadow-2xs">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                        style={{ backgroundColor: activeColor.hex }}
                      />
                      <span className="font-extrabold text-slate-900 shrink-0">{activeColor.name}:</span>
                      <span className="text-slate-600 truncate">{activeColor.shortRole || activeColor.description}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Available Offers */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Available Offers
              </h3>
              <div className="space-y-2 text-xs text-slate-700">
                {effectiveDiscountPercent > 0 ? (
                  <>
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong className="font-bold text-slate-900">Special Product Discount:</strong> {effectiveDiscountPercent}% instant off on MRP ₹{effectiveMrp.toLocaleString('en-IN')}. You save ₹{(effectiveMrp - effectivePrice).toLocaleString('en-IN')} per unit.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong className="font-bold text-slate-900">Wholesale Direct Price:</strong> Buy at ₹{effectivePrice.toLocaleString('en-IN')} with manufacturer standard warranty &amp; authentic tax invoice.
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-2">
                    <Tag className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-bold text-slate-900">Best Direct Price:</strong> Genuine manufacturer-direct price of ₹{effectivePrice.toLocaleString('en-IN')} with GST invoice.
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-bold text-slate-900">Express Delivery:</strong> Rapid dispatch from Giriraj Power Kasba Kolkata warehouse hub for eligible orders.
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery & Pincode Checker */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Delivery &amp; Service Availability</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setPincode(val);
                      if (val.length === 6) {
                        setPincodeChecked(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setPincodeChecked(true);
                      }
                    }}
                    placeholder="Enter 6-digit Pincode"
                    className="w-36 px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setPincodeChecked(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs"
                  >
                    Check
                  </button>
                </div>
              </div>

              {pincodeChecked && (
                (() => {
                  const check = checkKolkataDeliveryService(pincode);
                  if (check.isServiceable) {
                    return (
                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-1 text-xs animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Express Delivery Available in {check.areaName} ({pincode})</span>
                        </div>
                        <p className="text-[11px] text-emerald-700/90 pl-5 leading-relaxed">
                          Dispatched directly from <strong className="font-semibold text-emerald-950">{check.hub}</strong> • Free delivery on orders above ₹499
                        </p>
                        <div className="flex items-center gap-2 pl-5 pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            <Zap className="w-3 h-3 fill-emerald-700" />
                            Kolkata Express Service Hub
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-lg space-y-1.5 text-xs animate-in fade-in duration-150">
                      <div className="flex items-start gap-1.5 text-rose-800 font-bold">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span>Delivery Not Available for PIN: {pincode || 'Entered Area'}</span>
                          <p className="text-[11px] font-normal text-rose-700 mt-0.5 leading-relaxed">
                            Giriraj Power currently delivers <strong>exclusively to Kolkata &amp; Howrah region</strong> (PIN 700001–700160 &amp; 711101–711106). We do not deliver to other states or outside Kolkata at this time.
                          </p>
                        </div>
                      </div>
                      <div className="pl-5 pt-1 border-t border-rose-200/60 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-rose-600">Try Kolkata Pincode:</span>
                        {[
                          { code: '700091', label: 'Salt Lake' },
                          { code: '700001', label: 'Central' },
                          { code: '700019', label: 'Ballygunge' },
                          { code: '700156', label: 'New Town' }
                        ].map((sample) => (
                          <button
                            key={sample.code}
                            type="button"
                            onClick={() => {
                              setPincode(sample.code);
                              setPincodeChecked(true);
                            }}
                            className="px-1.5 py-0.5 bg-white hover:bg-rose-100/70 border border-rose-300 text-rose-900 rounded text-[10px] font-mono font-bold cursor-pointer transition"
                          >
                            {sample.code} ({sample.label})
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>


            {/* Stock Status (Only show warning if Out of Stock) */}
            {product.stock_quantity <= 0 && (
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-800 text-xs font-extrabold border border-red-200">
                  Currently Out of Stock
                </span>
              </div>
            )}

            {/* Specifications Table - Renders Clean Key - Value Pairs */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setIsSpecsExpanded(!isSpecsExpanded)}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-black text-sm text-slate-900 cursor-pointer transition-colors"
              >
                <span>Product Specifications</span>
                {isSpecsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isSpecsExpanded && (
                <div className="p-4 sm:p-6 text-xs space-y-4">
                  {specGroups.length > 0 ? (
                    specGroups.map((group, gIdx) => (
                      <div key={group.groupName || gIdx} className="space-y-2">
                        {group.groupName && (
                          <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider pb-1 border-b border-slate-100">
                            {group.groupName}
                          </h4>
                        )}
                        <div className="rounded-xl border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
                          {group.items.map((item, iIdx) => (
                            <div
                              key={item.key + iIdx}
                              className={`grid grid-cols-12 gap-3 p-3 sm:px-4 sm:py-2.5 items-center transition-colors ${
                                iIdx % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'
                              }`}
                            >
                              <span className="col-span-5 sm:col-span-4 text-slate-600 font-semibold text-xs">
                                {item.key}
                              </span>
                              <span className="col-span-7 sm:col-span-8 text-slate-900 font-bold text-xs text-right sm:text-left break-words">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic py-2">
                      Standard certified specifications as per manufacturer datasheet.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Product Description
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {product.description}
              </p>
            </div>

            {/* Return Policy Section */}
            <div className="space-y-3 bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 text-slate-950 font-black text-sm">
                <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Return &amp; Replacement Policy</span>
              </div>
              <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-bold text-slate-900">Non-Refundable:</strong> All electrical supplies, wires, switches, and components are non-refundable once purchased.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-bold text-slate-900">7-Day Replacement Only:</strong> Free instant replacement within 7 days if the product is received damaged, broken, or defective during transit.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-bold text-slate-900">Return Eligibility:</strong> The item must be uninstalled, unused, and in its original manufacturer packaging with all seals, labels, and warranty cards intact.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-bold text-slate-900">Manufacturer Warranty:</strong> Post-installation defects are fully covered under standard {product.brand} brand warranty support across authorized service centers.
                  </span>
                </div>
              </div>
            </div>

            {/* Frequently Asked Questions (FAQ) - Loaded Dynamically from Supabase */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  Frequently Asked Questions
                </h3>
                <span className="text-[11px] text-slate-400 font-semibold">{faqs.length} Questions</span>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div key={idx} className="transition-colors">
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer font-bold text-xs text-slate-900 transition-colors"
                      >
                        <span className="flex-1">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-3.5 sm:px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed bg-slate-50/70 border-t border-slate-100 animate-in fade-in">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RATINGS & REVIEWS SECTION */}
            {/* ========================================================================= */}
            <div ref={reviewsSectionRef} className="pt-6 border-t border-slate-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Ratings &amp; Customer Reviews
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verified feedback from real customers
                  </p>
                </div>

                <button
                  onClick={handleOpenReviewModal}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-md shadow-xs transition-colors cursor-pointer self-start sm:self-auto border border-yellow-500/30"
                >
                  Write a Review
                </button>
              </div>

              {reviews.length > 0 ? (
                /* Rating Summary Breakdown Box (from real reviews) */
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 p-5 bg-slate-50 rounded-xl border border-slate-200 items-center">
                  
                  {/* Overall Score */}
                  <div className="sm:col-span-4 text-center sm:text-left space-y-1 sm:border-r sm:border-slate-200 sm:pr-6">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-3xl font-black text-slate-900">
                        {averageRating.toFixed(1)}
                      </span>
                      <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-600">
                      {reviews.length} {reviews.length === 1 ? 'Customer Rating &' : 'Customer Ratings &'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {reviews.length} Verified {reviews.length === 1 ? 'Review' : 'Reviews'}
                    </p>
                  </div>

                  {/* Rating Distribution Progress Bars */}
                  <div className="sm:col-span-8 space-y-1.5 text-xs">
                    {ratingsDistribution.map((item) => (
                      <div key={item.stars} className="flex items-center gap-3">
                        <span className="w-8 font-bold text-slate-700 flex items-center gap-0.5">
                          {item.stars} <Star className="w-2.5 h-2.5 fill-slate-500 text-slate-500" />
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.stars >= 4
                                ? 'bg-[#388e3c]'
                                : item.stars === 3
                                ? 'bg-amber-400'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-[10px] text-slate-500 font-semibold">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">No customer reviews yet</p>
                  <p className="text-[11px] text-slate-500">
                    Be the first to rate and review this genuine electrical product.
                  </p>
                  <button
                    onClick={handleOpenReviewModal}
                    className="inline-block mt-2 px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-md shadow-xs transition-colors cursor-pointer border border-yellow-500/30"
                  >
                    Be the first to rate
                  </button>
                </div>
              )}

              {/* Reviews List */}
              {reviews.length > 0 && (
                <div className="space-y-4">
                  {reviews.slice(0, visibleReviewsCount).map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#388e3c] text-white text-[11px] font-black">
                            {rev.rating} <Star className="w-2.5 h-2.5 fill-white" />
                          </span>
                          <span className="font-black text-slate-900 text-xs">
                            {rev.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(rev.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <p className="text-slate-700 leading-relaxed text-xs">
                        {rev.comment}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-1 text-slate-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {rev.user_name || 'Verified Buyer'}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">Verified Purchase</span>
                      </div>
                    </div>
                  ))}

                  {reviews.length > visibleReviewsCount && (
                    <button
                      onClick={() => setVisibleReviewsCount((p) => p + 4)}
                      className="w-full py-2.5 rounded-lg border border-slate-300 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      Load More Reviews ({reviews.length - visibleReviewsCount} remaining)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SIMILAR PRODUCTS CAROUSEL / ROW */}
        {/* ========================================================================= */}
        {similarProducts.length > 0 && (
          <div className="mt-8 bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">
                Similar Products in {product.subcategory}
              </h2>
              <Link
                to={`/electrical?subcategory=${encodeURIComponent(product.subcategory)}`}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 overflow-x-auto pb-2 scrollbar-none">
              {similarProducts.map((sp) => (
                <Link
                  key={sp.id}
                  to={`/electrical/product/${sp.id}`}
                  className="group bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="aspect-square bg-slate-50 rounded-md p-2 mb-2 flex items-center justify-center overflow-hidden relative">
                    <ProductCardImage
                      images={sp.image_urls}
                      imageUrl={sp.image_urls[0]}
                      alt={sp.name}
                      className="group-hover:scale-105"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {sp.name}
                    </h4>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xs font-black text-slate-900">
                        ₹{sp.price.toLocaleString('en-IN')}
                      </span>
                      {sp.mrp > sp.price && (
                        <span className="text-[10px] text-slate-400 line-through">
                          ₹{sp.mrp.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* WRITE A REVIEW MODAL */}
      {/* ========================================================================= */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Write Product Review
              </h3>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-5 space-y-4 text-xs">
              {reviewSuccess ? (
                <div className="p-6 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                  <h4 className="text-sm font-black text-slate-900">Review Submitted!</h4>
                  <p className="text-xs text-slate-500">
                    Thank you for sharing your genuine feedback with Kolkata customers.
                  </p>
                </div>
              ) : (
                <>
                  {reviewError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 font-semibold">
                      {reviewError}
                    </div>
                  )}

                  {/* Star Rating Picker */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Overall Rating
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1 rounded hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-7 h-7 ${
                              star <= reviewRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-600 ml-2">
                        {reviewRating === 5
                          ? 'Excellent (5★)'
                          : reviewRating === 4
                          ? 'Very Good (4★)'
                          : reviewRating === 3
                          ? 'Good (3★)'
                          : reviewRating === 2
                          ? 'Fair (2★)'
                          : 'Poor (1★)'}
                      </span>
                    </div>
                  </div>

                  {/* Review Title */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Review Title / Summary
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Excellent 100% Copper Quality & Fast Delivery"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                    />
                  </div>

                  {/* Review Comment */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Detailed Review
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe your installation experience, insulation quality, brand authenticity, or delivery speed..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-hidden font-medium resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsReviewModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
