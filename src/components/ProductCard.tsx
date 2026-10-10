import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Star, Eye, Heart, Check, ShoppingCart } from 'lucide-react';
import { Product } from '../types';
import { isProductFavorite, toggleProductFavorite } from '../services/favorites';
import {
  getProductColorOptions,
  getDefaultProductColor,
  isWireProduct,
  isPipeProduct,
  resolveColorPreviewImage
} from '../data/wireColors';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { NEUTRAL_PRODUCT_PLACEHOLDER } from '../data/productColorImages';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onOpenQuickView: (product: Product) => void;
}

export const ProductCard = ({
  product,
  quantityInCart,
  onAddToCart,
  onUpdateQuantity,
  onOpenQuickView
}: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFav, setIsFav] = useState(() => isProductFavorite(product.id));
  const isWire = isWireProduct(product);
  const isPipe = isPipeProduct(product);
  const colorOptions = useMemo(() => getProductColorOptions(product), [product]);
  const hasColorOptions = colorOptions.length > 0;
  const [selectedColor, setSelectedColor] = useState<string>(
    () => product.selectedColor || getDefaultProductColor(product)
  );

  useEffect(() => {
    const def = product.selectedColor || getDefaultProductColor(product);
    if (def) setSelectedColor(def);
  }, [product]);

  const activeColorOption = useMemo(() => {
    if (!hasColorOptions) return null;
    return (
      colorOptions.find(
        (c) => c.name.toLowerCase().trim() === (selectedColor || '').toLowerCase().trim()
      ) ||
      colorOptions[0] ||
      null
    );
  }, [colorOptions, selectedColor, hasColorOptions]);

  const displayImage = useMemo(() => {
    if (activeColorOption) {
      const varImg =
        activeColorOption.image_url ||
        activeColorOption.imageUrl ||
        (activeColorOption as any).image ||
        (Array.isArray(activeColorOption.image_urls) && activeColorOption.image_urls[0]) ||
        (Array.isArray(activeColorOption.images) && activeColorOption.images[0]);
      if (varImg) return varImg;

      const baseList = (
        Array.isArray(product.images) && product.images.length > 0
          ? product.images
          : Array.isArray(product.image_urls) && product.image_urls.length > 0
          ? product.image_urls
          : []
      ).filter((u): u is string => typeof u === 'string' && u.trim().length > 0);

      if (colorOptions.length > 1 && baseList.length >= colorOptions.length) {
        const idx = colorOptions.findIndex(
          (c) => c.name.toLowerCase().trim() === (selectedColor || '').toLowerCase().trim()
        );
        if (idx >= 0 && baseList[idx]) return baseList[idx];
      }

      const colorImg = resolveColorPreviewImage(activeColorOption, product);
      if (colorImg && colorImg !== NEUTRAL_PRODUCT_PLACEHOLDER) return colorImg;
    }

    return (
      product.image ||
      (Array.isArray(product.images) && product.images[0]) ||
      (Array.isArray(product.image_urls) && product.image_urls[0]) ||
      NEUTRAL_PRODUCT_PLACEHOLDER
    );
  }, [activeColorOption, colorOptions, selectedColor, product]);

  useEffect(() => {
    const handleFavChange = () => {
      setIsFav(isProductFavorite(product.id));
    };
    window.addEventListener('giriraj_favorites_changed', handleFavChange);
    return () => window.removeEventListener('giriraj_favorites_changed', handleFavChange);
  }, [product.id]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLight();
    const updatedState = toggleProductFavorite(product.id);
    setIsFav(updatedState);
  };

  const handleAdd = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    hapticMedium();
    onAddToCart({
      ...product,
      image: displayImage,
      selectedColor: hasColorOptions ? selectedColor : undefined
    });
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white rounded-2xl border border-slate-200 hover:border-yellow-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col justify-between overflow-hidden relative group p-3 sm:p-4"
    >
      {/* Top Badges: Discount & Favorite Heart */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1">
          {product.discountPercentage > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-yellow-400 text-slate-950 text-[10px] sm:text-[11px] font-extrabold shadow-2xs">
              {product.discountPercentage}% OFF
            </span>
          )}
          {(!product.inStock || (product.stockCount !== undefined && product.stockCount <= 0)) && (
            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] sm:text-[11px] font-extrabold border border-red-200">
              Out of Stock
            </span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className={`p-1.5 rounded-full transition-all cursor-pointer active:scale-90 ${
            isFav
              ? 'bg-pink-50 text-pink-600 hover:bg-pink-100 shadow-2xs'
              : 'text-slate-400 hover:text-pink-600 hover:bg-slate-100'
          }`}
          title={isFav ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart className={`w-4 h-4 transition-transform ${isFav ? 'fill-pink-500 text-pink-500 scale-110' : ''}`} />
        </button>
      </div>

      {/* Image Container with Quick View overlay */}
      <div
        onClick={() => onOpenQuickView({ ...product, selectedColor: hasColorOptions ? selectedColor : undefined, image: displayImage })}
        className="relative w-full aspect-square bg-slate-50 rounded-xl overflow-hidden mb-3 cursor-pointer flex items-center justify-center"
      >
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = NEUTRAL_PRODUCT_PLACEHOLDER;
          }}
        />

        {/* Brand Tag Pill */}
        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold shadow-2xs">
          {product.brand}
        </span>

        {/* Quick View Button on Hover */}
        <div className={`absolute inset-0 bg-black/15 backdrop-blur-[1px] flex items-center justify-center transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <span className="px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-900 text-xs font-bold shadow-md flex items-center gap-1 transition-transform group-hover:scale-105 active:scale-95">
            <Eye className="w-3.5 h-3.5" />
            <span>Specs</span>
          </span>
        </div>
      </div>

      {/* Product Information */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Rating Display (only if rated) */}
          {product.rating > 0 && (
            <div className="flex items-center gap-1 mb-1.5">
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-amber-900 font-extrabold text-[11px]">
                <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                <span>{product.rating.toFixed(1)}</span>
              </div>
            </div>
          )}

          {/* Product Title */}
          <h4
            onClick={() => onOpenQuickView({ ...product, selectedColor: hasColorOptions ? selectedColor : undefined })}
            className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug hover:text-green-700 transition-colors cursor-pointer mb-1"
            title={product.name}
          >
            {product.name}
          </h4>

          {/* Unit / Packaging Details */}
          <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
            Unit: <span className="text-slate-800">{product.unit}</span>
          </div>

          {/* Colour / Finish Options Swatches */}
          {hasColorOptions && (
            <div className="mb-2.5 pt-1 border-t border-dashed border-slate-100">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1.5">
                <span>
                  {isWire ? 'Wire Colour (IS 694):' : isPipe ? 'Pipe Colour:' : 'Colour / Finish:'}
                </span>
                <span className="font-extrabold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded truncate max-w-[120px]">
                  {selectedColor || colorOptions[0]?.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {colorOptions.map((opt) => {
                  const isSelected = (selectedColor || colorOptions[0]?.name) === opt.name;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedColor(opt.name);
                      }}
                      title={`${opt.label || opt.name} - ${opt.shortRole || opt.name}`}
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-slate-900 scale-110 shadow-xs border-white'
                          : 'border-black/20 hover:scale-105 opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: opt.hex }}
                    >
                      {isSelected && (
                        <Check
                          className={`w-3 h-3 stroke-[3] ${
                            opt.name === 'White' ||
                            opt.name === 'Ivory / Off-White' ||
                            opt.hex.toLowerCase() === '#ffffff'
                              ? 'text-slate-900'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Price & Add to Cart Stepper */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-950">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>

          {/* Quantity Controls / Out of Stock */}
          <div>
            {!product.inStock || (product.stockCount !== undefined && product.stockCount <= 0) ? (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 font-bold text-[11px] border border-slate-200 cursor-not-allowed">
                Out of Stock
              </span>
            ) : quantityInCart === 0 ? (
              <button
                type="button"
                onClick={handleAdd}
                className="px-3 sm:px-4 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wide transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border border-yellow-500/30"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>ADD</span>
              </button>
            ) : (
              <div className="flex items-center bg-yellow-400 text-slate-950 font-black rounded-xl overflow-hidden shadow-xs border border-yellow-500/40">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUpdateQuantity(product.id, -1);
                  }}
                  className="px-2.5 py-1.5 hover:bg-yellow-500 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
                  title="Decrease (reduces to 0)"
                >
                  <Minus className="w-3 h-3 stroke-[3]" />
                </button>
                <span className="px-2 text-xs font-black min-w-[20px] text-center">
                  {quantityInCart}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (quantityInCart < 100) {
                      onUpdateQuantity(product.id, 1);
                    }
                  }}
                  disabled={quantityInCart >= 100}
                  className="px-2.5 py-1.5 hover:bg-yellow-500 transition-colors flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={quantityInCart >= 100 ? 'Max 100 reached' : 'Increase'}
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

