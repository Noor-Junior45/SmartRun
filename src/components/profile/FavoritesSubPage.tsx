import React from 'react';
import { ChevronLeft, Heart, ShoppingBag, ShoppingCart } from 'lucide-react';
import { Product, CartItem } from '../../types';
import { SwipeableItem } from '../SwipeableItem';
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack';

interface FavoritesSubPageProps {
  favoriteProducts: Product[];
  onBack: () => void;
  onOpenShop: () => void;
  onClearAllFavorites: () => void;
  onToggleFavorite: (productId: string) => void;
  onAddToCart?: (product: Product) => void;
  onReorder: (items: CartItem[]) => void;
}

export const FavoritesSubPage = ({
  favoriteProducts,
  onBack,
  onOpenShop,
  onClearAllFavorites,
  onToggleFavorite,
  onAddToCart,
  onReorder
}: FavoritesSubPageProps) => {
  // Mobile Edge Swipe Back Gesture
  useEdgeSwipeBack({
    onBack
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 animate-in fade-in duration-200">
      {/* Sticky Header with Back Arrow Button */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-2xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 -ml-1 rounded-full hover:bg-slate-100 text-slate-800 hover:text-black transition-colors cursor-pointer"
            title="Back to Profile"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Favourites</span>
              <Heart className="w-5 h-5 fill-pink-500 text-pink-500" />
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {favoriteProducts.length} {favoriteProducts.length === 1 ? 'item' : 'items'} saved for quick ordering
            </p>
          </div>
        </div>

        {favoriteProducts.length > 0 && (
          <button
            type="button"
            onClick={onClearAllFavorites}
            className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-red-50"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Content Container */}
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        {favoriteProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-2xs space-y-3">
            <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-500 mx-auto flex items-center justify-center border border-pink-100">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">No favourites yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Save electrical supplies, tools, switches, and wiring materials to your favourites for instant 1-click reordering anytime.
            </p>
            <div className="pt-3">
              <button
                type="button"
                onClick={onOpenShop}
                className="px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-sm cursor-pointer inline-flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Explore Catalog</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {favoriteProducts.map((product) => (
              <SwipeableItem
                key={product.id}
                onDelete={() => onToggleFavorite(product.id)}
                deleteLabel="Remove"
                className="rounded-2xl"
              >
                <div
                  className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 hover:border-slate-300 shadow-2xs flex items-center gap-3 sm:gap-4 transition-all"
                >
                  {/* Product Thumbnail */}
                  <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-slate-50 border border-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {product.brand && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold tracking-tight">
                        {product.brand}
                      </span>
                    )}
                  </div>

                  {/* Product Info & Action Row */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {product.discountPercentage > 0 && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-yellow-400 text-slate-950 text-[10px] font-black leading-tight">
                          {product.discountPercentage}% OFF
                        </span>
                      </div>
                    )}

                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      Unit: {product.unit} • <span className="text-amber-600 font-bold">★ {product.rating.toFixed(1)}</span>
                    </p>

                    {/* Price & Action Buttons inline row */}
                    <div className="flex items-center justify-between gap-2 mt-1.5 pt-0.5">
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-sm sm:text-base font-black text-slate-950">
                          ₹{product.price.toLocaleString('en-IN')}
                        </span>
                        {product.originalPrice > product.price && (
                          <span className="text-[11px] sm:text-xs text-slate-400 line-through">
                            ₹{product.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleFavorite(product.id);
                          }}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/80 hover:bg-white backdrop-blur-md border border-rose-200/70 shadow-[0_2px_8px_rgba(244,63,94,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] active:scale-95 text-rose-500 hover:text-rose-600 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
                          title="Remove from Favourites"
                          aria-label="Remove from Favourites"
                        >
                          <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-rose-500 text-rose-500 drop-shadow-xs" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onAddToCart) {
                              onAddToCart(product);
                            } else {
                              onReorder([{ product, quantity: 1 }]);
                            }
                          }}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-emerald-500/90 to-emerald-600/95 hover:from-emerald-500 hover:to-emerald-600 backdrop-blur-md border border-emerald-300/40 shadow-[0_3px_10px_rgba(16,185,129,0.22),inset_0_1px_1.5px_rgba(255,255,255,0.4)] active:scale-95 text-white transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer"
                          title="Add to Cart"
                          aria-label="Add to Cart"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow-xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SwipeableItem>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
