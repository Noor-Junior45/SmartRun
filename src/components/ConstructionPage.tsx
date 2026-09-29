import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
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
  Building2,
  HardHat,
  MessageSquare,
  PhoneCall,
  Clock,
  ShieldCheck,
  Truck,
  Sparkles,
  ArrowUpDown,
  Zap
} from 'lucide-react';
import { Product } from '../types';
import { supabase } from '../lib/supabaseClient';
import { apiUrl } from '../lib/apiBase';
import { isConstructionProduct, isElectricalProduct } from '../utils/categoryHelper';
import { ProductCardImage } from './ProductCardImage';
import { hapticLight, hapticSelection } from '../utils/haptics';
import { getFlattenedSpecifications } from '../utils/productSpecifications';
import { getPaginationPages } from '../utils/paginationHelper';

interface ConstructionPageProps {
  onAddToCart: (product: Product) => void;
  onUpdateQuantity?: (productId: string, delta: number) => void;
  cartItems?: { product: Product; quantity: number }[];
  onOpenCart?: () => void;
  onOpenProductQuickView?: (product: Product) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  products?: Product[];
}

export type SortOption = 'popularity' | 'price_asc' | 'price_desc' | 'rating' | 'newest';

export interface ConstructionFilterState {
  subcategories: string[];
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  minDiscount?: number;
  inStockOnly: boolean;
}

const ALL_CONSTRUCTION_SUBCATEGORIES = [
  'Cement & Concrete',
  'TMT & Steel',
  'Tiling & Adhesives',
  'Paints & Putty',
  'Waterproofing',
  'Plywood & Boards',
  'Adhesives & Fevicol',
  'Kitchen Sinks & Faucets',
  'Sanitary & Bath Fittings',
  'Hinges & Hardware',
  'Kitchen Systems & Accessories',
  'Wardrobe & Bed Fittings',
  'Door Locks & Hardware',
  'Plumbing & Pipes',
  'Power Tools',
  'General Hardware & Tools'
];

const ALL_CONSTRUCTION_BRANDS = [
  'UltraTech',
  'ACC',
  'Ambuja',
  'Tata Tiscon',
  'Roff',
  'Asian Paints',
  'Dr. Fixit',
  'CenturyPly',
  'Action TESA',
  'Fevicol',
  'Giriraj Genuine',
  'Jaquar',
  'Hindware',
  'Geberit',
  'Hettich',
  'Godrej',
  'Astral',
  'Supreme',
  'Bosch'
];

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

export const ConstructionPage = ({
  onAddToCart,
  onUpdateQuantity,
  cartItems = [],
  onOpenCart,
  onOpenProductQuickView,
  searchQuery: propSearchQuery,
  onSearchChange,
  products: initialProducts
}: ConstructionPageProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query Sync
  const initialSubcategory = searchParams.get('subcategory');
  const initialSearch = searchParams.get('q') || propSearchQuery || '';

  // Initial products if preloaded from App
  const preloadedConstruction = useMemo(() => {
    if (!initialProducts || initialProducts.length === 0) return [];
    return initialProducts.filter((p) => isConstructionProduct(p) && !isElectricalProduct(p));
  }, [initialProducts]);

  const [rawProducts, setRawProducts] = useState<Product[]>(() => preloadedConstruction);
  const [loading, setLoading] = useState<boolean>(() => preloadedConstruction.length === 0);

  // Filters State
  const [filters, setFilters] = useState<ConstructionFilterState>({
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
  const [activeDropdown, setActiveDropdown] = useState<'sort' | null>(null);
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

  // Listen to global clear-search-query event
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

  // Fetch Construction Products from Supabase or Backend API
  const loadConstructionProducts = async () => {
    try {
      setLoading(true);
      let rows: any[] = [];

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*');

        if (!error && Array.isArray(data) && data.length > 0) {
          rows = data;
        }
      } catch (sbErr) {
        console.warn('Direct Supabase notice:', sbErr);
      }

      // If direct Supabase query was empty or failed, fetch via backend API
      if (rows.length === 0) {
        try {
          const res = await fetch(apiUrl('/api/products'), {
            headers: { 'Accept': 'application/json' },
          });
          if (res.ok) {
            const json = await res.json();
            if (json && Array.isArray(json.products) && json.products.length > 0) {
              rows = json.products;
            }
          }
        } catch (apiErr) {
          console.warn('Backend API notice:', apiErr);
        }
      }

      if (rows.length > 0) {
        // Strictly filter real construction items only (exclude electrical equipment)
        const constructionRows = rows.filter((row) => {
          return isConstructionProduct(row) && !isElectricalProduct(row);
        });

        if (constructionRows.length > 0) {
          const parsed: Product[] = constructionRows.map((row) => {
            const price = Number(row.price || 0);
            const originalPrice = Number(row.original_price || row.originalPrice || row.mrp || (price ? price * 1.15 : 0));
            const discountPercentage = Number(
              row.discount_percentage ||
              row.discountPercentage ||
              row.discount_percent ||
              (originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0)
            );

            let imageList: string[] = [];
            if (Array.isArray(row.image_urls) && row.image_urls.length > 0) {
              imageList = row.image_urls.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
            } else if (typeof row.image_urls === 'string' && row.image_urls.startsWith('http')) {
              imageList = [row.image_urls];
            }
            if (row.image && typeof row.image === 'string' && row.image.trim() && !imageList.includes(row.image.trim())) {
              imageList.unshift(row.image.trim());
            }

            let imageUrl = imageList[0] || 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?q=80&w=800&auto=format&fit=crop';
            if (imageList.length === 0) {
              imageList = [imageUrl];
            }

            return {
              id: String(row.id),
              name: row.name || 'Construction Material',
              brand: row.brand || 'Giriraj Genuine',
              category: 'construction',
              subCategory: row.subcategory || row.sub_category || 'General Materials',
              price,
              originalPrice,
              discountPercentage,
              unit: row.unit || '1 Unit',
              rating: Number(row.rating_avg || row.rating || 4.8),
              reviewsCount: Number(row.rating_count || row.reviewsCount || 18),
              deliveryMinutes: Number(row.delivery_minutes || 60),
              image: imageUrl,
              images: imageList,
              image_urls: imageList,
              inStock: (row.stock_quantity ?? row.stock_count ?? row.stockCount ?? 10) > 0,
              stockCount: Number(row.stock_quantity ?? row.stock_count ?? row.stockCount ?? 10),
              tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? row.tags.split(',').map((t: string) => t.trim()) : [row.brand || 'Giriraj', 'Construction']),
              isEmergency: false,
              specs: getFlattenedSpecifications(row.specifications || row.specs, row.brand).reduce((acc, curr) => {
                acc[curr.key] = curr.value;
                return acc;
              }, {} as Record<string, string>),
              description: row.description || 'Premium grade certified construction supplies delivered direct to site in Kolkata.'
            };
          });

          setRawProducts(parsed);
        } else {
          setRawProducts([]);
        }
      } else {
        setRawProducts([]);
      }
    } catch (err) {
      console.warn('Error loading construction products from Supabase:', err);
      setRawProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preloadedConstruction.length > 0) {
      setRawProducts((prev) => (prev.length === 0 ? preloadedConstruction : prev));
      setLoading(false);
    }
  }, [preloadedConstruction]);

  useEffect(() => {
    loadConstructionProducts();

    // Supabase Real-time listener: Auto-update catalog when products change in Supabase
    const channel = supabase
      .channel('construction_products_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          loadConstructionProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync subcategory filter if URL param changes
  useEffect(() => {
    const sub = searchParams.get('subcategory');
    if (sub && !filters.subcategories.includes(sub)) {
      setFilters((prev) => ({ ...prev, subcategories: [sub] }));
    }
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

  const displaySubcategories = useMemo(() => {
    const liveSubs = rawProducts.map((p) => p.subCategory).filter(Boolean);
    return Array.from(new Set([...liveSubs, ...ALL_CONSTRUCTION_SUBCATEGORIES]));
  }, [rawProducts]);

  const displayBrands = useMemo(() => {
    const liveBrands = rawProducts.map((p) => p.brand).filter(Boolean);
    return Array.from(new Set([...liveBrands, ...ALL_CONSTRUCTION_BRANDS]));
  }, [rawProducts]);

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

  // Filter and Sort raw products
  const filteredAndSortedProducts = useMemo(() => {
    let list = [...rawProducts];

    // Filter subcategories
    if (filters.subcategories.length > 0) {
      list = list.filter((p) => {
        const pSub = (p.subCategory || '').toLowerCase();
        const pName = (p.name || '').toLowerCase();
        return filters.subcategories.some((sub) => {
          const s = sub.toLowerCase();
          return (
            pSub.includes(s) ||
            s.includes(pSub) ||
            (s.includes('cement') && (pName.includes('cement') || pSub.includes('cement'))) ||
            (s.includes('tiling') && (pName.includes('tile') || pSub.includes('tile') || pName.includes('grout') || pSub.includes('tiling'))) ||
            (s.includes('paint') && (pName.includes('paint') || pName.includes('putty') || pSub.includes('paint'))) ||
            (s.includes('waterproof') && (pName.includes('fixit') || pName.includes('waterproof') || pSub.includes('waterproof') || pName.includes('damp'))) ||
            ((s.includes('plywood') || s.includes('mdf')) && (pName.includes('plywood') || pName.includes('hdhmr') || pName.includes('board') || pSub.includes('plywood'))) ||
            ((s.includes('fevicol') || s.includes('adhesive')) && (pName.includes('fevicol') || pName.includes('adhesive') || pSub.includes('adhesive'))) ||
            (s.includes('sink') && (pName.includes('sink') || pName.includes('faucet') || pSub.includes('sink'))) ||
            (s.includes('sanitary') && (pName.includes('commode') || pName.includes('cistern') || pName.includes('toilet') || pSub.includes('sanitary'))) ||
            ((s.includes('hinge') || s.includes('channel') || s.includes('handle')) && (pName.includes('hinge') || pName.includes('channel') || pName.includes('slide') || pName.includes('handle') || pSub.includes('hinge'))) ||
            ((s.includes('kitchen system') || s.includes('kitchen accessory')) && (pName.includes('spice') || pName.includes('basket') || pName.includes('tandem') || pSub.includes('kitchen'))) ||
            ((s.includes('wardrobe') || s.includes('bed')) && (pName.includes('bed') || pName.includes('hydraulic') || pName.includes('wardrobe') || pSub.includes('bed'))) ||
            (s.includes('lock') && (pName.includes('lock') || pName.includes('padlock') || pSub.includes('lock'))) ||
            (s.includes('pipe') && (pName.includes('pipe') || pName.includes('tank') || pSub.includes('pipe') || pSub.includes('plumbing'))) ||
            (s.includes('tool') && (pName.includes('drill') || pName.includes('grinder') || pName.includes('tool') || pSub.includes('tool'))) ||
            (s.includes('general hardware') && (pName.includes('ladder') || pName.includes('tarpaulin') || pName.includes('hammer') || pSub.includes('general')))
          );
        });
      });
    }

    // Filter brands
    if (filters.brands.length > 0) {
      list = list.filter((p) =>
        filters.brands.some((b) => p.brand.toLowerCase().includes(b.toLowerCase()))
      );
    }

    // Min Price
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      list = list.filter((p) => p.price >= filters.minPrice!);
    }

    // Max Price
    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      list = list.filter((p) => p.price <= filters.maxPrice!);
    }

    // Min Rating
    if (filters.minRating !== undefined && filters.minRating > 0) {
      list = list.filter((p) => (p.rating || 0) >= filters.minRating!);
    }

    // In Stock Only
    if (filters.inStockOnly) {
      list = list.filter((p) => p.inStock);
    }

    // Search Query (Multi-token, specifications & description matching)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const tokens = q.split(/\s+/).filter(Boolean);
      list = list.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const sub = (p.subCategory || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const tags = (p.tags || []).map((t) => t.toLowerCase()).join(' ');
        const specs = typeof p.specs === 'object' ? JSON.stringify(p.specs).toLowerCase() : '';
        const combined = `${name} ${brand} ${sub} ${desc} ${tags} ${specs}`;
        
        if (combined.includes(q)) return true;
        return tokens.every((token) => combined.includes(token));
      });
    }

    // Sort order
    switch (sortOption) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        list.sort((a, b) => String(b.id).localeCompare(String(a.id)));
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'popularity':
      default:
        list.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
        break;
    }

    return list;
  }, [rawProducts, filters, sortOption, searchQuery]);

  // Paginated slices
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedProducts.slice(start, start + itemsPerPage);
  }, [filteredAndSortedProducts, currentPage]);

  const totalCount = filteredAndSortedProducts.length;
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage) || 1;

  // Helper to check cart quantity
  const getProductCartQty = (productId: string) => {
    const match = cartItems.find((i) => String(i.product.id) === String(productId));
    return match ? match.quantity : 0;
  };

  const hasBackendProducts = rawProducts.length > 0;

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-36 sm:pb-24 font-sans">
      
      {/* ACTIVE FILTER TAGS & RESET ROW (Top navbar houses All Filters & Sort) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-2 mb-2 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        {hasActiveFilters ? (
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-none py-1">
            {searchQuery.trim() && (
              <button
                id="clear-construction-search-pill-btn"
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
            {filters.minDiscount !== undefined && (
              <button
                onClick={() => setFilters((p) => ({ ...p, minDiscount: undefined }))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold shrink-0 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <span>{filters.minDiscount}%+ Off</span>
                <X className="w-3 h-3 text-amber-700" />
              </button>
            )}
            {filters.inStockOnly && (
              <button
                onClick={() => setFilters((p) => ({ ...p, inStockOnly: false }))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] font-bold shrink-0 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <span>In Stock Only</span>
                <X className="w-3 h-3 text-emerald-700" />
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

      {/* 2. PRODUCT CATALOG LOCATION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Loading construction catalog...</p>
          </div>
        ) : !hasBackendProducts ? (
          /* =========================================================================
             COMING SOON STATE AT PRODUCT LOCATION (When backend has no products data)
             ========================================================================= */
          <div className="py-12 sm:py-16">
            <div className="max-w-3xl mx-auto bg-slate-50/70 border border-slate-200/80 rounded-3xl p-8 sm:p-12 text-center shadow-xs space-y-6">
              
              {/* Icon Illustration */}
              <div className="relative inline-flex items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-amber-100/80 border border-amber-300/60 text-amber-700 flex items-center justify-center shadow-xs">
                  <Building2 className="w-10 h-10 stroke-[1.8]" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              {/* Header & Description */}
              <div className="space-y-2.5 max-w-lg mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 text-[11px] font-black uppercase tracking-wider">
                  <HardHat className="w-3.5 h-3.5 text-amber-700" />
                  <span>Kasba Central Depot • Kolkata</span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Construction Materials Coming Soon
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  We are currently onboarding our full wholesale catalog of UltraTech cement, Tata Tiscon TMT rebars, Astral CPVC pipes, Dr. Fixit waterproofing, and structural hardware.
                </p>
              </div>

              {/* Brands Anticipation Grid */}
              <div className="pt-2 pb-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Upcoming Wholesale Authorized Brands
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
                  {ALL_CONSTRUCTION_BRANDS.map((brand) => (
                    <span
                      key={brand}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs"
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-2 max-w-xl mx-auto text-left w-full">
                <div className="p-3 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">Direct Site Trucks</div>
                    <div className="text-[10px] text-slate-500 truncate">Unloaded at site</div>
                  </div>
                </div>
                <div className="p-3 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">100% Genuine</div>
                    <div className="text-[10px] text-slate-500 truncate">Manufacturer seals</div>
                  </div>
                </div>
                <div className="p-3 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">GST Invoices</div>
                    <div className="text-[10px] text-slate-500 truncate">Official project bills</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Direct Inquiry - Equal Size & Liquid Glossy Design */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mx-auto pt-3">
                {/* 1. WhatsApp Liquid Gloss Button */}
                <a
                  href="https://wa.me/918777400280?text=Hello%20Giriraj%20Power,%20I%20need%20a%20wholesale%20quote%20for%20construction%20materials."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group overflow-hidden w-full h-12 min-h-[48px] px-3.5 rounded-2xl bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 text-white font-bold text-xs sm:text-[13px] tracking-tight shadow-[0_8px_20px_-4px_rgba(16,185,129,0.38),inset_0_1px_1px_rgba(255,255,255,0.65),inset_0_-2px_4px_rgba(0,0,0,0.18)] border border-emerald-400/40 hover:from-emerald-400 hover:to-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/35 before:to-transparent before:pointer-events-none before:rounded-t-2xl"
                >
                  <MessageSquare className="w-4 h-4 shrink-0 drop-shadow-xs" />
                  <span className="truncate">WhatsApp Quote</span>
                </a>

                {/* 2. Call Contractor Liquid Gloss Button */}
                <a
                  href="tel:+918777400280"
                  className="relative group overflow-hidden w-full h-12 min-h-[48px] px-3.5 rounded-2xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-bold text-xs sm:text-[13px] tracking-tight shadow-[0_8px_20px_-4px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.75),inset_0_-2px_4px_rgba(0,0,0,0.12)] border border-amber-300/60 hover:from-amber-300 hover:to-amber-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/40 before:to-transparent before:pointer-events-none before:rounded-t-2xl"
                >
                  <PhoneCall className="w-4 h-4 shrink-0 drop-shadow-xs" />
                  <span className="truncate">Call Contractor</span>
                </a>

                {/* 3. Browse Electrical Store Liquid Gloss Button */}
                <Link
                  to="/electrical"
                  className="relative group overflow-hidden w-full h-12 min-h-[48px] px-3.5 rounded-2xl bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 text-white font-bold text-xs sm:text-[13px] tracking-tight shadow-[0_8px_20px_-4px_rgba(15,23,42,0.38),inset_0_1px_1px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] border border-slate-700/60 hover:from-slate-700 hover:to-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/20 before:to-transparent before:pointer-events-none before:rounded-t-2xl"
                >
                  <Zap className="w-4 h-4 shrink-0 text-amber-400 drop-shadow-xs" />
                  <span className="truncate">Electrical Store</span>
                </Link>
              </div>

            </div>
          </div>
        ) : paginatedProducts.length === 0 ? (
          /* When backend has products, but current filters/search return 0 */
          <div className="py-20 text-center space-y-4 max-w-md mx-auto px-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {searchQuery ? `No construction materials match "${searchQuery}"` : 'No products found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery
                  ? 'Looking for switches, wires, LEDs, fans, MCBs, or electrical tools?'
                  : 'Try adjusting your filter pills or search terms.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-sm mx-auto pt-3">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => navigate(`/electrical?q=${encodeURIComponent(searchQuery)}`)}
                  className="relative group overflow-hidden w-full h-11 min-h-[44px] px-3.5 rounded-2xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-[0_6px_16px_-3px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-amber-300/60 hover:from-amber-300 hover:to-amber-500 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/40 before:to-transparent before:pointer-events-none before:rounded-t-2xl"
                >
                  <span className="truncate">Search Electrical</span>
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="relative group overflow-hidden w-full h-11 min-h-[44px] px-3.5 rounded-2xl bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 text-white font-bold text-xs shadow-[0_6px_16px_-3px_rgba(15,23,42,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-slate-700/60 hover:from-slate-700 hover:to-slate-900 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/20 before:to-transparent before:pointer-events-none before:rounded-t-2xl"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             PRODUCT CATALOG GRID (Identical to Electrical Page: 4 columns, clean card)
             ========================================================================= */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8">
            {paginatedProducts.map((product) => {
              const cartQty = getProductCartQty(product.id);
              const primaryImage = product.image;

              return (
                <div
                  key={product.id}
                  className="group flex flex-col justify-between transition-all duration-200 border-0 p-1"
                >
                  {/* Clean Product Image with Floating Discount Tag */}
                  <Link
                    to={`/construction/product/${product.id}`}
                    className="block aspect-square overflow-hidden rounded-xl bg-slate-50/60 p-3 sm:p-4 mb-2.5 flex items-center justify-center relative cursor-pointer"
                  >
                    {/* Floating discount text */}
                    {product.discountPercentage > 0 && (
                      <span className="absolute top-2 left-2.5 sm:top-2.5 sm:left-3 text-red-600 font-black text-[11px] sm:text-xs tracking-tight z-10 select-none drop-shadow-2xs">
                        {product.discountPercentage}% OFF
                      </span>
                    )}

                    <ProductCardImage
                      images={product.images || product.image_urls}
                      imageUrl={primaryImage}
                      alt={product.name}
                      className="group-hover:scale-105"
                    />
                  </Link>

                  {/* Product Details */}
                  <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        to={`/construction/product/${product.id}`}
                        className="text-xs sm:text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors line-clamp-2 leading-snug block mb-1 cursor-pointer"
                        title={product.name}
                      >
                        {product.name}
                      </Link>

                      {/* Price & MRP */}
                      <div className="flex items-baseline gap-2 pt-0.5">
                        <span className="text-base font-black text-slate-950">
                          ₹{product.price.toLocaleString('en-IN')}
                        </span>
                        {product.originalPrice > product.price && (
                          <span className="text-xs text-slate-400 line-through font-medium">
                            ₹{product.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
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
                                onUpdateQuantity(product.id, -1);
                              }
                            }}
                            className="p-1 hover:bg-yellow-500 rounded cursor-pointer transition-colors active:scale-95"
                            title="Decrease quantity"
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
                                  onUpdateQuantity(product.id, 1);
                                } else {
                                  onAddToCart(product);
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
                            onAddToCart(product);
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
        {!loading && hasBackendProducts && filteredAndSortedProducts.length > itemsPerPage && (
          <div className="pt-10 pb-6 flex flex-col items-center gap-4">
            <p className="text-xs font-medium text-slate-500">
              Showing <span className="font-bold text-slate-900">{Math.min(filteredAndSortedProducts.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(filteredAndSortedProducts.length, currentPage * itemsPerPage)}</span> of{' '}
              <span className="font-bold text-slate-900">{filteredAndSortedProducts.length}</span> construction materials
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

      {/* 3. SIDE-TAB / FULL-PAGE FILTER (Full page on mobile, right drawer on desktop, independent scroll, stack-wise buttons) */}
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
                    <span>In Stock Only (Ready for bulk/site delivery)</span>
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
                Apply Filters ({hasBackendProducts ? totalCount : 'All'})
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
