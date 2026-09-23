import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  SlidersHorizontal,
  ChevronDown,
  ShoppingCart,
  Plus,
  Minus,
  RefreshCw,
  X,
  Search,
  Check,
  ArrowUpDown
} from 'lucide-react';
import { ElectricalProduct, FilterState, SortOption } from '../../types/electrical';
import { fetchElectricalProducts } from '../../services/electricalService';
import { Product } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import {
  isWireProduct,
  isPipeProduct,
  getProductColorOptions,
  getDefaultProductColor
} from '../../data/wireColors';
import { ProductCardImage } from '../ProductCardImage';
import { hapticLight, hapticSelection } from '../../utils/haptics';
import { getFlattenedSpecifications } from '../../utils/productSpecifications';
import { getPaginationPages } from '../../utils/paginationHelper';

interface ElectricalListingPageProps {
  onAddToCart: (product: Product) => void;
  onUpdateQuantity?: (productId: string, delta: number, color?: string) => void;
  cartItems?: { product: Product; quantity: number; selectedColor?: string }[];
  onOpenCart?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const ALL_SUBCATEGORIES = [
  'Fans',
  'Wiring',
  'Switches',
  'MCBs',
  'Lights',
  'PVC Items',
  'CCTV & Surveillance',
  'Home Appliances'
];
const ALL_BRANDS = ['RR Kabel', 'Polycab', 'Havells', 'Schneider', 'Philips', 'Anchor', 'Crompton', 'Atomberg', 'Hikvision', 'Luminous', 'Finolex', 'Wipro', 'Legrand'];
const RATING_OPTIONS = [
  { label: '4★ & above', min: 4.0 },
  { label: '3★ & above', min: 3.0 },
  { label: '2★ & above', min: 2.0 }
];
const SORT_LABELS: Record<SortOption, string> = {
  popularity: 'Relevance',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  rating: 'Customer Rating',
  newest: 'Newest First'
};

export const ElectricalListingPage = ({
  onAddToCart,
  onUpdateQuantity,
  cartItems = [],
  onOpenCart,
  searchQuery: propSearchQuery,
  onSearchChange
}: ElectricalListingPageProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query Sync
  const initialSubcategory = searchParams.get('subcategory');
  const initialSearch = searchParams.get('q') || propSearchQuery || '';

  const [products, setProducts] = useState<ElectricalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    subcategories: initialSubcategory ? [initialSubcategory] : [],
    brands: [],
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined,
    minDiscount: undefined,
    inStockOnly: false
  });

  const [sortOption, setSortOption] = useState<SortOption>('popularity');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isSideFilterOpen, setIsSideFilterOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'category' | 'brand' | 'type' | 'price' | 'sort' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync searchQuery when URL param or prop changes
  useEffect(() => {
    if (propSearchQuery !== undefined) {
      setSearchQuery(propSearchQuery);
      if (!propSearchQuery && searchParams.has('q')) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('q');
        setSearchParams(nextParams, { replace: true });
      }
    } else {
      const urlQ = searchParams.get('q');
      if (urlQ !== null) {
        setSearchQuery(urlQ);
      }
    }
  }, [searchParams, propSearchQuery, setSearchParams]);

  // Listen to global clear-search-query event from header or search pills
  useEffect(() => {
    const handleGlobalClear = () => {
      setSearchQuery('');
      setCurrentPage(1);
      if (searchParams.has('q')) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('q');
        setSearchParams(nextParams, { replace: true });
      }
    };
    window.addEventListener('clear-search-query', handleGlobalClear);
    return () => window.removeEventListener('clear-search-query', handleGlobalClear);
  }, [searchParams, setSearchParams]);

  // Dynamic categories and brands from backend products + fallback standard list
  const displaySubcategories = useMemo(() => {
    const liveSubs = products.map((p) => p.subcategory).filter(Boolean);
    return Array.from(new Set([...liveSubs, ...ALL_SUBCATEGORIES]));
  }, [products]);

  const displayBrands = useMemo(() => {
    const liveBrands = products.map((p) => p.brand).filter(Boolean);
    return Array.from(new Set([...liveBrands, ...ALL_BRANDS]));
  }, [products]);

  // Listen to open-all-filters and open-sort-dropdown events from top navbar
  useEffect(() => {
    const handleOpenFilters = () => setIsSideFilterOpen(true);
    const handleOpenSort = () => setIsSortDropdownOpen(true);

    window.addEventListener('open-all-filters', handleOpenFilters);
    window.addEventListener('open-sort-dropdown', handleOpenSort);
    return () => {
      window.removeEventListener('open-all-filters', handleOpenFilters);
      window.removeEventListener('open-sort-dropdown', handleOpenSort);
    };
  }, []);

  // Prevent background body scroll when filter drawer / full page is open
  useEffect(() => {
    if (isSideFilterOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isSideFilterOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load products whenever filters/sort/search change
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadData = () => {
      fetchElectricalProducts(filters, sortOption, searchQuery)
        .then(({ products: data, total }) => {
          if (isMounted) {
            setProducts(data);
            setTotalCount(total);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error(err);
          if (isMounted) setLoading(false);
        });
    };

    loadData();

    // Supabase Real-time listener: Auto-update catalog when products change in Supabase
    const channel = supabase
      .channel('electrical_products_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [filters, sortOption, searchQuery]);

  // Sync subcategory filter if URL param changes
  useEffect(() => {
    const sub = searchParams.get('subcategory');
    if (sub) {
      setFilters((prev) => {
        if (prev.subcategories.length === 1 && prev.subcategories[0] === sub) return prev;
        return { ...prev, subcategories: [sub] };
      });
    } else {
      setFilters((prev) => {
        if (prev.subcategories.length > 0) {
          return { ...prev, subcategories: [] };
        }
        return prev;
      });
    }
    setCurrentPage(1);
  }, [searchParams]);

  // Filter Handlers
  const handleToggleSubcategory = (sub: string) => {
    hapticSelection();
    setFilters((prev) => {
      const exists = prev.subcategories.includes(sub);
      const nextSubs = exists
        ? prev.subcategories.filter((s) => s !== sub)
        : [...prev.subcategories, sub];
      return { ...prev, subcategories: nextSubs };
    });
    setCurrentPage(1);
  };

  const handleToggleBrand = (brand: string) => {
    hapticSelection();
    setFilters((prev) => {
      const exists = prev.brands.includes(brand);
      const nextBrands = exists
        ? prev.brands.filter((b) => b !== brand)
        : [...prev.brands, brand];
      return { ...prev, brands: nextBrands };
    });
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    hapticLight();
    setFilters({
      subcategories: [],
      brands: [],
      minPrice: undefined,
      maxPrice: undefined,
      minRating: undefined,
      minDiscount: undefined,
      inStockOnly: false
    });
    setSearchQuery('');
    if (onSearchChange) onSearchChange('');
    setSearchParams({});
    setCurrentPage(1);
    setActiveDropdown(null);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (onSearchChange) onSearchChange('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
    window.dispatchEvent(new CustomEvent('clear-search-query'));
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.subcategories.length > 0 ||
      filters.brands.length > 0 ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.minRating !== undefined ||
      filters.minDiscount !== undefined ||
      filters.inStockOnly ||
      searchQuery.trim() !== ''
    );
  }, [filters, searchQuery]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += filters.subcategories.length;
    count += filters.brands.length;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
    if (filters.minRating !== undefined) count += 1;
    if (filters.minDiscount !== undefined) count += 1;
    if (filters.inStockOnly) count += 1;
    return count;
  }, [filters]);

  // Helper to check cart quantity
  const getProductCartQty = (productId: string) => {
    const match = cartItems.find((i) => String(i.product.id) === String(productId));
    return match ? match.quantity : 0;
  };

  // Convert ElectricalProduct to local Product for cart handler
  const adaptToCartProduct = (ep: ElectricalProduct): Product => ({
    id: ep.id,
    name: ep.name,
    brand: ep.brand,
    category: (ep.category === 'construction' || ep.category === 'services' || ep.category === 'emergency' ? ep.category : 'electrical') as 'electrical' | 'construction' | 'services' | 'emergency',
    subCategory: ep.subcategory,
    price: ep.price,
    originalPrice: ep.mrp,
    discountPercentage: ep.discount_percent,
    unit: '1 unit',
    rating: ep.rating_avg,
    reviewsCount: ep.rating_count,
    deliveryMinutes: 60,
    image: ep.image_urls[0] || 'https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=800&auto=format&fit=crop',
    inStock: ep.stock_quantity > 0,
    stockCount: ep.stock_quantity,
    isEmergency: false,
    specs: getFlattenedSpecifications(ep.specifications, ep.brand).reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>),
    description: ep.description,
    tags: [ep.brand, ep.subcategory, 'Electrical'],
    colors: ep.colors || [],
    colours: ep.colours || ep.colors || [],
    color_options: ep.color_options,
    color_variants: ep.color_variants,
    colorVariants: ep.color_variants,
    selectedColor: ep.selectedColor || ep.selected_color
  });

  // Paginated slices
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return products.slice(start, start + itemsPerPage);
  }, [products, currentPage]);

  const totalPages = Math.ceil(products.length / itemsPerPage) || 1;

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20 font-sans">
      
      {/* ACTIVE FILTER TAGS & RESET ROW (Top navbar now houses the All Filters & Sort buttons) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-2 mb-2 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        {hasActiveFilters ? (
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-none py-1">
            {searchQuery && (
              <button
                id="clear-search-pill-btn"
                onClick={handleClearSearch}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold shrink-0 hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                title="Clear search query"
              >
                <span>Search: &ldquo;{searchQuery}&rdquo;</span>
                <X className="w-3 h-3 text-slate-300" />
              </button>
            )}
            {filters.subcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => handleToggleSubcategory(sub)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold shrink-0 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <span>{sub}</span>
                <X className="w-3 h-3 text-amber-700" />
              </button>
            ))}
            {filters.brands.map((b) => (
              <button
                key={b}
                onClick={() => handleToggleBrand(b)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold shrink-0 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <span>{b}</span>
                <X className="w-3 h-3 text-amber-700" />
              </button>
            ))}
            {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
              <button
                onClick={() => setFilters((p) => ({ ...p, minPrice: undefined, maxPrice: undefined }))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold shrink-0 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <span>
                  ₹{filters.minPrice ?? 0} - ₹{filters.maxPrice ?? 'Any'}
                </span>
                <X className="w-3 h-3 text-amber-700" />
              </button>
            )}
            {filters.minRating !== undefined && (
              <button
                onClick={() => setFilters((p) => ({ ...p, minRating: undefined }))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold shrink-0 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <span>★ {filters.minRating}+</span>
                <X className="w-3 h-3 text-amber-700" />
              </button>
            )}
            <button
              onClick={handleClearAllFilters}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline px-1.5 shrink-0 cursor-pointer"
            >
              Reset All
            </button>
          </div>
        ) : null}
      </div>

      {/* 4. PRODUCT CATALOG GRID (Borderless, 4 products in one row, reduced height) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Loading electrical catalog...</p>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="py-20 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {searchQuery ? `No electrical products match "${searchQuery}"` : 'No products found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery
                  ? 'Check for spelling or search in Construction Materials for cement, paint, pipes, hardware, etc.'
                  : 'Try adjusting your filter pills or search terms.'}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => navigate(`/construction?q=${encodeURIComponent(searchQuery)}`)}
                  className="px-4 py-2 rounded-full bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span>Search &ldquo;{searchQuery}&rdquo; in Construction</span>
                  <span>&rarr;</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="px-4 py-2 rounded-full bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-500 cursor-pointer shadow-2xs transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8">
            {paginatedProducts.map((product, index) => {
              const cartQty = getProductCartQty(product.id);
              const adapted = adaptToCartProduct(product);
              const primaryImage =
                product.image_urls[0] ||
                'https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=800&auto=format&fit=crop';

              return (
                <div
                  key={product.id}
                  className="group flex flex-col justify-between transition-all duration-200 border-0 p-1"
                >
                  {/* Clean Product Image with Floating Discount Tag */}
                  <Link
                    to={`/electrical/product/${product.id}`}
                    className="block aspect-square overflow-hidden rounded-xl bg-slate-50/60 p-3 sm:p-4 mb-2.5 flex items-center justify-center relative cursor-pointer"
                  >
                    {/* Floating discount text (no background box) */}
                    {product.discount_percent > 0 && (
                      <span className="absolute top-2 left-2.5 sm:top-2.5 sm:left-3 text-red-600 font-black text-[11px] sm:text-xs tracking-tight z-10 select-none drop-shadow-2xs">
                        {product.discount_percent}% OFF
                      </span>
                    )}

                    <ProductCardImage
                      images={product.image_urls}
                      imageUrl={primaryImage}
                      alt={product.name}
                      className="group-hover:scale-105"
                    />
                  </Link>

                  {/* Product Details */}
                  <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        to={`/electrical/product/${product.id}`}
                        className="text-xs sm:text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors line-clamp-2 leading-snug block mb-1"
                        title={product.name}
                      >
                        {product.name}
                      </Link>

                      {/* Price & MRP */}
                      <div className="flex items-baseline gap-2 pt-0.5">
                        <span className="text-base font-black text-slate-950">
                          ₹{product.price.toLocaleString('en-IN')}
                        </span>
                        {product.mrp > product.price && (
                          <span className="text-xs text-slate-400 line-through font-medium">
                            ₹{product.mrp.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      {/* Available Colours / Finishes Indicator */}
                      {getProductColorOptions(adapted).length > 0 && (
                        <div className="mt-1.5 pt-1 border-t border-dashed border-slate-100 flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-slate-500">
                            {isPipeProduct(adapted)
                              ? 'Pipe Colours:'
                              : isWireProduct(adapted)
                              ? 'IS 694 Colours:'
                              : 'Colours / Finishes:'}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            {getProductColorOptions(adapted).slice(0, 5).map((c) => (
                              <span
                                key={c.name}
                                title={`${c.name} (${c.shortRole || c.name})`}
                                className="w-2.5 h-2.5 rounded-full border border-black/20 shadow-2xs inline-block"
                                style={{ backgroundColor: c.hex }}
                              />
                            ))}
                            {getProductColorOptions(adapted).length > 5 && (
                              <span className="text-[9px] text-slate-400 font-bold">
                                +{getProductColorOptions(adapted).length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Add to Cart / Quick Quantity Controls */}
                    <div className="pt-1.5">
                      {cartQty > 0 ? (
                        <div className="flex items-center justify-between bg-yellow-400 text-slate-950 font-black rounded-lg px-2.5 py-1.5 shadow-xs border border-yellow-500/30">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (onUpdateQuantity) {
                                onUpdateQuantity(adapted.id, -1);
                              }
                            }}
                            className="p-1 hover:bg-yellow-500 rounded cursor-pointer transition-colors active:scale-95"
                            title="Decrease quantity (goes to 0)"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <span className="text-xs font-black px-2">{cartQty} in cart</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (cartQty < 100) {
                                if (onUpdateQuantity) {
                                  onUpdateQuantity(adapted.id, 1);
                                } else {
                                  const defColor = getDefaultProductColor(adapted);
                                  onAddToCart({
                                    ...adapted,
                                    selectedColor: defColor || adapted.selectedColor || undefined
                                  });
                                }
                              }
                            }}
                            disabled={cartQty >= 100}
                            className="p-1 hover:bg-yellow-500 rounded cursor-pointer transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={cartQty >= 100 ? 'Maximum limit of 100 reached' : 'Increase quantity'}
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const defColor = getDefaultProductColor(adapted);
                            onAddToCart({
                              ...adapted,
                              selectedColor: defColor || adapted.selectedColor || undefined
                            });
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shadow-xs border border-yellow-500/20"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION & LOAD MORE CONTROLS */}
        {!loading && products.length > itemsPerPage && (
          <div className="pt-10 pb-6 flex flex-col items-center gap-4">
            <p className="text-xs font-medium text-slate-500">
              Showing <span className="font-bold text-slate-900">{Math.min(products.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(products.length, currentPage * itemsPerPage)}</span> of{' '}
              <span className="font-bold text-slate-900">{products.length}</span> electrical products
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  hapticLight();
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              >
                Previous
              </button>

              {getPaginationPages(currentPage, totalPages).map((item, idx) => {
                if (typeof item === 'string') {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="w-8 h-9 flex items-center justify-center text-xs font-bold text-slate-400 select-none"
                    >
                      ...
                    </span>
                  );
                }
                const pageNum = item as number;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setCurrentPage(pageNum);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  hapticLight();
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. SIDE-TAB / FULL-PAGE FILTER (Full page on mobile, right drawer on desktop, independent scroll, stack-wise buttons) */}
      {isSideFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-white sm:bg-black/50 sm:backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop for desktop click outside */}
          <div
            onClick={() => setIsSideFilterOpen(false)}
            className="hidden sm:block fixed inset-0"
          />

          {/* Drawer Panel: 100% full screen on phone, max-w-md on desktop */}
          <div className="relative w-full h-full sm:max-w-md bg-white shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-white px-5 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900">Filters</h2>
                {(filters.subcategories.length > 0 || filters.brands.length > 0 || filters.minDiscount || filters.inStockOnly || filters.minRating || filters.minPrice || filters.maxPrice) && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black">
                    Active
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsSideFilterOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
                title="Close Filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Content: Single independent smooth scroll */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-6">
              {/* Subcategories (Stack-wise 2-column grid with differentiated pill buttons) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Category
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    {filters.subcategories.length > 0 ? `${filters.subcategories.length} selected` : 'All'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {displaySubcategories.map((sub) => {
                    const checked = filters.subcategories.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleToggleSubcategory(sub)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer border ${
                          checked
                            ? 'bg-amber-400 text-slate-950 border-amber-500 font-bold shadow-2xs'
                            : 'bg-slate-50/80 hover:bg-slate-100/90 text-slate-700 border-slate-200/80 active:bg-slate-200'
                        }`}
                      >
                        <span className="line-clamp-1 break-words">{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brands (Stack-wise 2-column grid with differentiated pill buttons) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Brand
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    {filters.brands.length > 0 ? `${filters.brands.length} selected` : 'All'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {displayBrands.map((brand) => {
                    const checked = filters.brands.includes(brand);
                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => handleToggleBrand(brand)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer border ${
                          checked
                            ? 'bg-amber-400 text-slate-950 border-amber-500 font-bold shadow-2xs'
                            : 'bg-slate-50/80 hover:bg-slate-100/90 text-slate-700 border-slate-200/80 active:bg-slate-200'
                        }`}
                      >
                        <span className="line-clamp-1 break-words">{brand}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2.5">
                <div className="border-b border-slate-100 pb-1.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Price Range (₹)
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice ?? ''}
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          minPrice: e.target.value ? Number(e.target.value) : undefined
                        }))
                      }
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-hidden"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice ?? ''}
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          maxPrice: e.target.value ? Number(e.target.value) : undefined
                        }))
                      }
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold focus:bg-white focus:border-amber-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Discount Percentage (Stack-wise pills) */}
              <div className="space-y-2.5">
                <div className="border-b border-slate-100 pb-1.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Min Discount
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[10, 20, 30, 40, 50].map((d) => {
                    const isSelected = filters.minDiscount === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setFilters((p) => ({
                            ...p,
                            minDiscount: isSelected ? undefined : d
                          }))
                        }
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-500 font-bold shadow-2xs'
                            : 'bg-slate-50/80 hover:bg-slate-100/90 text-slate-700 border-slate-200/80'
                        }`}
                      >
                        {d}% or more
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Availability (Stack-wise toggle card) */}
              <div className="space-y-2.5">
                <div className="border-b border-slate-100 pb-1.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Availability
                  </h3>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((p) => ({
                        ...p,
                        inStockOnly: !p.inStockOnly
                      }))
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer border flex items-center justify-between ${
                      filters.inStockOnly
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                        : 'bg-slate-50/80 hover:bg-slate-100/90 text-slate-700 border-slate-200/80'
                    }`}
                  >
                    <span>In Stock Only (Ready for instant dispatch)</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${filters.inStockOnly ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'}`}>
                      {filters.inStockOnly && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Customer Rating (Stack-wise pills) */}
              <div className="space-y-2.5">
                <div className="border-b border-slate-100 pb-1.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Customer Rating
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {RATING_OPTIONS.map((item) => {
                    const isSelected = filters.minRating === item.min;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() =>
                          setFilters((p) => ({
                            ...p,
                            minRating: isSelected ? undefined : item.min
                          }))
                        }
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-500 text-white border-emerald-600 font-bold shadow-2xs'
                            : 'bg-slate-50/80 hover:bg-slate-100/90 text-slate-700 border-slate-200/80'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="sticky bottom-0 z-20 bg-white px-5 py-3 sm:py-3.5 border-t border-slate-100 flex items-center justify-between gap-3 shadow-lg">
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors cursor-pointer border-0 bg-transparent px-3 py-2 rounded-lg"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsSideFilterOpen(false)}
                className="flex-1 py-2.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer border-0 text-center active:scale-98"
              >
                Apply Filters ({totalCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED PRICE / SORT DROPDOWN (Small Box in Right Side of Screen on Phone & Big Screen, Borderless Text Buttons Only) */}
      {isSortDropdownOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop for click outside */}
          <div
            className="fixed inset-0 bg-black/15 backdrop-blur-[1px] transition-opacity"
            onClick={() => setIsSortDropdownOpen(false)}
          />

          {/* Small Dropdown Box on Right Side */}
          <div className="fixed top-24 sm:top-28 right-3 sm:right-6 md:right-12 z-50 w-56 sm:w-60 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Sort By</span>
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer border-0 bg-transparent"
              >
                ✕
              </button>
            </div>

            <div className="py-1 space-y-0.5">
              {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => {
                const active = sortOption === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSortOption(key);
                      setCurrentPage(1);
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer border-0 bg-transparent rounded-lg ${
                      active
                        ? 'text-blue-600 font-bold bg-blue-50/60'
                        : 'text-slate-700 font-medium hover:text-slate-950 hover:bg-slate-50'
                    }`}
                  >
                    {SORT_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
