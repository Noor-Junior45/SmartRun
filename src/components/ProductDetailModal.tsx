import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Star, Check, Plus, Minus, Heart, RotateCcw, HelpCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle2, Palette, Share2, MapPin, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import { isProductFavorite, toggleProductFavorite } from '../services/favorites';
import {
  isWireProduct,
  isPipeProduct,
  getProductColorOptions,
  getDefaultProductColor
} from '../data/wireColors';
import { checkKolkataDeliveryService } from '../data/kolkataAreas';
import { trackProductView } from '../utils/analytics';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { shareProductDetails } from '../utils/shareProduct';
import { ZoomableImage } from './ZoomableImage';
import { useBottomSheetDismiss } from '../hooks/useBottomSheetDismiss';
import { getFlattenedSpecifications } from '../utils/productSpecifications';

import { ProductReviewsSection } from './ProductReviewsSection';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number, color?: string) => void;
  onOpenAuth?: () => void;
}

export const ProductDetailModal = ({
  product,
  onClose,
  quantityInCart,
  onAddToCart,
  onUpdateQuantity,
  onOpenAuth
}: ProductDetailModalProps) => {
  const [isFav, setIsFav] = useState(() => (product ? isProductFavorite(product.id) : false));
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const isWire = product ? isWireProduct(product) : false;
  const isPipe = product ? isPipeProduct(product) : false;
  const colorOptions = product ? getProductColorOptions(product) : [];
  const hasColorOptions = colorOptions.length > 0;
  const [selectedWireColor, setSelectedWireColor] = useState<string>(
    product?.selectedColor || (product ? getDefaultProductColor(product) : '')
  );
  const [pincode, setPincode] = useState('700091');
  const [pincodeChecked, setPincodeChecked] = useState(true);

  const formattedSpecs = useMemo(() => {
    if (!product) return [];
    const raw = (product as any).specifications || product.specs;
    return getFlattenedSpecifications(raw, product.brand);
  }, [product?.specs, (product as any)?.specifications, product?.brand]);

  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  const activeColorObj = useMemo(() => {
    if (!hasColorOptions) return null;
    return colorOptions.find((c) => c.name.toLowerCase() === (selectedWireColor || '').toLowerCase()) || colorOptions[0] || null;
  }, [colorOptions, selectedWireColor, hasColorOptions]);

  const effectivePrice = useMemo(() => {
    if (activeColorObj && typeof activeColorObj.price === 'number' && activeColorObj.price > 0) {
      return activeColorObj.price;
    }
    return product?.price || 0;
  }, [activeColorObj, product?.price]);

  const effectiveOriginalPrice = useMemo(() => {
    if (activeColorObj && typeof activeColorObj.mrp === 'number' && activeColorObj.mrp > 0) {
      return activeColorObj.mrp;
    }
    return product?.originalPrice || 0;
  }, [activeColorObj, product?.originalPrice]);

  const effectiveDiscountPercentage = useMemo(() => {
    if (activeColorObj && typeof activeColorObj.discount_percent === 'number') {
      return activeColorObj.discount_percent;
    }
    if (effectiveOriginalPrice > effectivePrice) {
      return Math.round(((effectiveOriginalPrice - effectivePrice) / effectiveOriginalPrice) * 100);
    }
    return product?.discountPercentage || 0;
  }, [activeColorObj, effectivePrice, effectiveOriginalPrice, product?.discountPercentage]);

  const allImages = useMemo(() => {
    if (!product) return [];
    const baseImages = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : Array.isArray(product.image_urls) && product.image_urls.length > 0
      ? product.image_urls
      : [product.image];

    if (activeColorObj) {
      const variantImages: string[] = [];
      if (Array.isArray(activeColorObj.image_urls) && activeColorObj.image_urls.length > 0) {
        variantImages.push(...activeColorObj.image_urls.filter(Boolean));
      } else if (Array.isArray(activeColorObj.images) && activeColorObj.images.length > 0) {
        variantImages.push(...activeColorObj.images.filter(Boolean));
      } else if (activeColorObj.image_url) {
        variantImages.push(activeColorObj.image_url);
      } else if (activeColorObj.imageUrl) {
        variantImages.push(activeColorObj.imageUrl);
      }

      if (variantImages.length > 0) {
        return [...variantImages, ...baseImages.filter((img) => !variantImages.includes(img))].filter(Boolean);
      }
    }

    return baseImages;
  }, [product, activeColorObj]);

  useEffect(() => {
    if (product) {
      setIsFav(isProductFavorite(product.id));
      setSelectedWireColor(product.selectedColor || getDefaultProductColor(product));
      setSelectedImageIndex(0);
      trackProductView(product);
    }
  }, [product]);

  const handleSelectColor = (colorName: string) => {
    setSelectedWireColor(colorName);
    setSelectedImageIndex(0);
  };

  if (!product) return null;

  const scrollThumbnails = (direction: 'prev' | 'next') => {
    if (!thumbnailContainerRef.current) return;
    const scrollAmount = 140;
    thumbnailContainerRef.current.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleToggleFav = () => {
    hapticLight();
    const updated = toggleProductFavorite(product.id);
    setIsFav(updated);
  };

  const handleShare = async () => {
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
      setShareToast(res.method === 'clipboard' ? 'Link copied!' : 'Shared!');
      setTimeout(() => {
        setCopiedLink(false);
        setShareToast(null);
      }, 2500);
    }
  };

  const handleAdd = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    hapticMedium();
    onAddToCart({
      ...product,
      price: effectivePrice,
      originalPrice: effectiveOriginalPrice,
      discountPercentage: effectiveDiscountPercentage,
      image: allImages[0] || product.image,
      images: allImages,
      selectedColor: hasColorOptions ? selectedWireColor : undefined
    });
  };

  const currentImage = allImages[selectedImageIndex] || allImages[0] || product.image;

  // Mobile Bottom Sheet Drag-to-Dismiss Gesture
  const {
    handleTouchStart: handleSheetTouchStart,
    handleTouchMove: handleSheetTouchMove,
    handleTouchEnd: handleSheetTouchEnd,
    dragStyle
  } = useBottomSheetDismiss({
    onClose
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        style={dragStyle}
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
      >
        {/* Mobile Drag Down Dismiss Bar */}
        <div
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          className="w-full flex flex-col items-center justify-center pt-0 pb-3 sm:hidden cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-12 h-1.5 bg-slate-300 rounded-full hover:bg-slate-400 transition-colors" />
          <span className="text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Swipe down to close</span>
        </div>
        
        {/* Actions Top Right: Wishlist Heart, Share & Close Button */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
          {/* Wishlist Heart Button */}
          <button
            type="button"
            onClick={handleToggleFav}
            className={`p-2 rounded-full transition-all cursor-pointer border active:scale-90 flex items-center justify-center ${
              isFav
                ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 shadow-xs'
                : 'bg-slate-100/80 border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
            }`}
            title={isFav ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-label={isFav ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`w-4 h-4 transition-transform ${isFav ? 'fill-rose-500 text-rose-500 scale-110' : ''}`} />
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-full bg-slate-100/80 hover:bg-yellow-400 hover:text-slate-950 text-slate-500 border border-slate-200 transition-all cursor-pointer active:scale-90 flex items-center justify-center relative"
            title={copiedLink ? "Link copied!" : "Share product"}
            aria-label="Share product"
          >
            {copiedLink ? (
              <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {shareToast && (
              <span className="absolute -top-7 right-0 px-2 py-0.5 rounded-lg bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold whitespace-nowrap shadow-lg border border-slate-700/50 z-30 animate-in fade-in zoom-in-95">
                {shareToast}
              </span>
            )}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-500 border border-slate-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Image & Quick Guarantee */}
          <div>
            <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 aspect-square group select-none">
              <ZoomableImage
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-contain p-2"
                containerClassName="w-full h-full"
                onSwipeLeft={() => {
                  if (allImages.length > 1) {
                    setSelectedImageIndex((prev) => (prev + 1) % allImages.length);
                  }
                }}
                onSwipeRight={() => {
                  if (allImages.length > 1) {
                    setSelectedImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
                  }
                }}
              />

              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md border border-slate-200 cursor-pointer active:scale-90 transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedImageIndex((prev) => (prev + 1) % allImages.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md border border-slate-200 cursor-pointer active:scale-90 transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="Next image"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <div className="absolute bottom-2 right-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs z-10">
                    {selectedImageIndex + 1} / {allImages.length}
                  </div>
                </>
              )}

              {(!product.inStock || (product.stockCount !== undefined && product.stockCount <= 0)) && (
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-red-600 text-white text-xs font-black flex items-center gap-1 shadow-sm">
                  <span>OUT OF STOCK</span>
                </span>
              )}
            </div>

            {/* Thumbnail Strip with Scroll Arrows when 5+ images */}
            {allImages.length > 1 && (
              <div className="mt-3 relative flex items-center">
                {allImages.length >= 5 && (
                  <button
                    type="button"
                    onClick={() => scrollThumbnails('prev')}
                    className="absolute left-0 z-10 p-1 rounded-full bg-white/95 text-slate-700 hover:bg-yellow-400 hover:text-slate-950 border border-slate-200 shadow-md transition-all cursor-pointer -translate-x-2 active:scale-90"
                    title="Scroll left"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}

                <div
                  ref={thumbnailContainerRef}
                  className={`flex gap-2 overflow-x-auto py-1 scrollbar-none scroll-smooth w-full ${allImages.length >= 5 ? 'px-6' : ''}`}
                >
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-12 h-12 rounded-lg border p-0.5 bg-slate-50 shrink-0 transition-all cursor-pointer relative ${
                        selectedImageIndex === idx
                          ? 'border-yellow-500 ring-2 ring-yellow-300 shadow-xs'
                          : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                      }`}
                      title={`Photo ${idx + 1}`}
                    >
                      <img
                        src={img}
                        alt={`thumb-${idx}`}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>

                {allImages.length >= 5 && (
                  <button
                    type="button"
                    onClick={() => scrollThumbnails('next')}
                    className="absolute right-0 z-10 p-1 rounded-full bg-white/95 text-slate-700 hover:bg-yellow-400 hover:text-slate-950 border border-slate-200 shadow-md transition-all cursor-pointer translate-x-2 active:scale-90"
                    title="Scroll right"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Details & Specs */}
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="text-xs font-extrabold text-green-700 uppercase tracking-wider mb-1">
                {product.brand} • {product.subCategory}
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug mb-2">
                {product.name}
              </h2>

              {/* Rating Display (if rated) */}
              {product.rating > 0 && (
                <div className="flex items-center gap-1.5 mb-3 text-xs">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-extrabold">
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.floor(product.rating)
                              ? 'fill-amber-400 text-amber-500'
                              : i < product.rating
                              ? 'fill-amber-300 text-amber-400'
                              : 'text-slate-300 fill-slate-100'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-1 text-xs">{product.rating.toFixed(1)} / 5.0</span>
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="p-3.5 rounded-xl bg-yellow-50/70 border border-yellow-200 mb-4">
                <div className="text-xs font-semibold text-slate-600">Special Quick-Commerce Price:</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-950">
                    ₹{effectivePrice.toLocaleString('en-IN')}
                  </span>
                  {effectiveOriginalPrice > effectivePrice && (
                    <span className="text-sm text-slate-400 line-through">
                      ₹{effectiveOriginalPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                  {effectiveDiscountPercentage > 0 && (
                    <span className="text-xs font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                      Save {effectiveDiscountPercentage}%
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 mt-1 font-semibold">
                  Packaging: <span className="font-bold text-slate-900">{product.unit}</span>
                </div>
              </div>

              {/* Colour Selection */}
              {hasColorOptions && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-blue-600" />
                      {isPipe
                        ? 'Select Pipe Colour'
                        : isWire
                        ? 'Select Wire Colour (IS 694 Indian Standard)'
                        : 'Select Colour Option'}
                    </span>
                    <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedWireColor}
                    </span>
                  </div>

                  {/* Swatches Row */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2.5">
                    {colorOptions.map((opt) => {
                      const isSelected = selectedWireColor === opt.name;
                      return (
                        <button
                          key={opt.name}
                          type="button"
                          onClick={() => handleSelectColor(opt.name)}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'border-slate-900 bg-white ring-2 ring-slate-900 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center border shadow-2xs ${
                              isSelected ? 'border-white ring-1 ring-slate-900 scale-105' : 'border-black/20'
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
                          <span className="text-[10px] font-bold text-slate-900 leading-tight">
                            {opt.name}
                          </span>
                          {typeof opt.price === 'number' && opt.price > 0 ? (
                            <span className="text-[10px] font-black text-emerald-700 leading-tight">
                              ₹{opt.price.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-slate-500 line-clamp-1">
                              {opt.shortRole}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Standard Role Explanation */}
                  {activeColorObj && (
                    <div className="p-2 rounded-lg bg-white border border-slate-200/80 text-[11px] text-slate-700 flex items-start gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 border border-black/20"
                        style={{ backgroundColor: activeColorObj.hex }}
                      />
                      <div>
                        <strong className="text-slate-900">{activeColorObj.label}:</strong> {activeColorObj.description}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                {product.description}
              </p>

              {/* Specifications Table */}
              {formattedSpecs.length > 0 && (
                <div className="mb-5">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Product Specifications:
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden text-xs divide-y divide-slate-100">
                    {formattedSpecs.map((item, idx) => (
                      <div
                        key={item.key + idx}
                        className={`flex items-center justify-between gap-3 p-2.5 sm:px-3.5 ${
                          idx % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'
                        }`}
                      >
                        <span className="font-semibold text-slate-600 text-xs shrink-0">{item.key}</span>
                        <span className="font-bold text-slate-900 text-xs text-right break-words">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery & Pincode Checker */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white mb-5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Delivery &amp; Service Availability</span>
                  </div>
                  <div className="flex items-center gap-1.5">
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
                      placeholder="6-digit PIN"
                      className="w-28 px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setPincodeChecked(true)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs"
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
                        <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-0.5 text-xs animate-in fade-in duration-150">
                          <div className="flex items-center gap-1 text-emerald-800 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Express Delivery Available in {check.areaName} ({pincode})</span>
                          </div>
                          <p className="text-[10px] text-emerald-700 pl-4.5">
                            Dispatched from {check.hub} • Free delivery on orders above ₹499
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="p-2.5 bg-rose-50/90 border border-rose-200 rounded-lg space-y-1 text-xs animate-in fade-in duration-150">
                        <div className="flex items-start gap-1 text-rose-800 font-bold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span>Delivery Not Available for PIN: {pincode || 'Entered Area'}</span>
                            <p className="text-[10px] font-normal text-rose-700 mt-0.5 leading-relaxed">
                              Giriraj Power provides delivery services <strong>exclusively within Kolkata &amp; Howrah region</strong> (PIN 700001–700160 &amp; 711101–711106).
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Return Policy Section */}
              <div className="space-y-2 bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 mb-5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-950 font-black">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Return &amp; Replacement Policy</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-900 bg-amber-100 px-1 rounded text-[10px]">Non-Refundable</span>
                    <span>All electrical products are non-refundable once sold.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>7-Day Replacement Only:</strong> Free replacement for transit damage or defects.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Condition:</strong> Uninstalled in original packaging with intact brand seals.</span>
                  </div>
                </div>
              </div>

              {/* FAQ Accordion */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    Frequently Asked Questions
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white text-xs">
                  {[
                    {
                      q: `Is this ${product.brand} product 100% genuine?`,
                      a: `Yes, all ${product.brand} products on Giriraj Power are 100% original, brand-sealed, and ISI / BIS certified.`
                    },
                    {
                      q: 'How fast is dispatch in Kolkata?',
                      a: 'Dispatched directly from Giriraj Power Kasba warehouse hub within minimum 60 minutes or maximum 7 days.'
                    },
                    {
                      q: 'Do I get a valid GST invoice?',
                      a: 'Yes, every order includes a full GST invoice with tax breakdown and ITC compliance.'
                    }
                  ].map((faq, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div key={idx}>
                        <button
                          onClick={() => setOpenFaq(isOpen ? null : idx)}
                          className="w-full p-2.5 text-left flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer font-bold text-[11px] text-slate-900"
                        >
                          <span>{faq.q}</span>
                          {isOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-2.5 pb-2.5 pt-0.5 text-[11px] text-slate-600 bg-slate-50/70 border-t border-slate-100 leading-relaxed">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ratings & Customer Reviews with Supabase Integration */}
              <div className="pt-4 border-t border-slate-200">
                <ProductReviewsSection
                  productId={product.id}
                  productName={product.name}
                  onOpenAuth={onOpenAuth}
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
              >
                Close
              </button>

              {(!product.inStock || (product.stockCount !== undefined && product.stockCount <= 0)) ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-3 px-6 rounded-xl bg-slate-200 text-slate-500 font-black text-sm flex items-center justify-center cursor-not-allowed border border-slate-300 shadow-none"
                >
                  <span>Out of Stock</span>
                </button>
              ) : quantityInCart === 0 ? (
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex-1 py-3 px-6 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-yellow-500/30 active:scale-98"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add to Cart {isWire && selectedWireColor ? `(${selectedWireColor})` : ''} • ₹{product.price.toLocaleString('en-IN')}</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-yellow-400 text-slate-950 font-black rounded-xl px-4 py-2 shadow-md border border-yellow-500/40">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUpdateQuantity(product.id, -1, hasColorOptions ? selectedWireColor : undefined);
                    }}
                    className="p-1 hover:bg-yellow-500 rounded transition-colors cursor-pointer active:scale-95"
                    title="Decrease (reduces to 0)"
                  >
                    <Minus className="w-4 h-4 stroke-[3]" />
                  </button>
                  <span className="text-sm font-black min-w-[30px] text-center">
                    {quantityInCart} in Cart
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (quantityInCart < 100) {
                        onUpdateQuantity(product.id, 1, hasColorOptions ? selectedWireColor : undefined);
                      }
                    }}
                    disabled={quantityInCart >= 100}
                    className="p-1 hover:bg-yellow-500 rounded transition-colors cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={quantityInCart >= 100 ? 'Maximum 100 reached' : 'Increase'}
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
