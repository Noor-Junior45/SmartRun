import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap,
  Building2,
  Layers,
  Truck,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Plus,
  Minus,
  MessageSquare,
  TrendingUp,
  FileText,
  Award,
  RotateCcw,
  ShoppingCart,
  Info,
  Package,
  Wrench,
  Lock,
  MapPin,
  Navigation,
  Clock,
  Phone
} from 'lucide-react';
import { Product, CartItem } from '../types';
import { supabase } from '../lib/supabaseClient';
import { fetchProductsFromSupabase } from '../services/supabaseService';
import { OFFICIAL_BRANDS } from './BrandLogos';
import { ProductCardImage } from './ProductCardImage';
import { hapticLight, hapticSelection } from '../utils/haptics';
import { PullToRefresh } from './PullToRefresh';
import { isElectricalProduct, isConstructionProduct } from '../utils/categoryHelper';
import { SEOHead } from './SEOHead';

export interface HomePageProps {
  onAddToCart: (product: Product) => void;
  onUpdateQuantity?: (productId: string, delta: number) => void;
  cartItems?: CartItem[];
  onNavigateCategory: (categoryName: string) => void;
  onOpenBulkQuoteModal?: () => void;
  onOpenProductQuickView?: (product: Product) => void;
  products?: Product[];
  onRefresh?: () => Promise<void> | void;
}

// ---------------------------------------------------------------------------
// 24 Visual Categories for Row 2 (Electrical Categories First, followed by Construction)
// ---------------------------------------------------------------------------
export const REFERENCE_CATEGORIES = [
  // --- ELECTRICAL CATEGORIES (FIRST) ---
  {
    id: 'cat-wires-house',
    name: 'Wires & House Cables',
    badge: 'IS 694 Certified',
    image: 'https://i.imgur.com/sG7lW2b.jpeg',
    targetRoute: '/electrical?subcategory=Wiring'
  },
  {
    id: 'cat-mcb-distribution',
    name: 'MCBs & Distribution Boards',
    badge: 'Top Protection',
    image: 'https://i.imgur.com/4rthrow.jpeg',
    targetRoute: '/electrical?subcategory=MCBs'
  },
  {
    id: 'cat-switches',
    name: 'Switches & Sockets',
    image: 'https://i.imgur.com/K4vzOY8.jpeg',
    targetRoute: '/electrical?subcategory=Switches'
  },
  {
    id: 'cat-conduits-gi',
    name: 'Conduits, Dalda Pipes & Boxes',
    image: 'https://i.imgur.com/G9LIx1R.jpeg',
    targetRoute: '/electrical?subcategory=PVC%20Items'
  },
  {
    id: 'cat-lighting',
    name: 'Lighting & Fixtures',
    image: 'https://i.imgur.com/QhdLqOq.jpeg',
    targetRoute: '/electrical?subcategory=Lights'
  },
  {
    id: 'cat-fans-exhaust',
    name: 'Ceiling Fans & Exhaust',
    image: 'https://i.imgur.com/iirlNS3.png',
    targetRoute: '/electrical?subcategory=Fans'
  },
  {
    id: 'cat-cctv',
    name: 'CCTV & Surveillance',
    image: 'https://i.imgur.com/SQXJ1g6.jpeg',
    targetRoute: '/electrical?subcategory=CCTV%20%26%20Surveillance'
  },
  {
    id: 'cat-appliances-power',
    name: 'Home Appliances & Inverters',
    image: 'https://i.imgur.com/Kz3Hn96.jpeg',
    targetRoute: '/electrical?subcategory=Home%20Appliances'
  },

  // --- CONSTRUCTION CATEGORIES (FOLLOWING ELECTRICAL) ---
  {
    id: 'cat-cement',
    name: 'Cement',
    badge: 'Bulk Prices',
    image: 'https://i.imgur.com/u0PYh6L.png',
    targetRoute: '/construction?subcategory=Cement%20%26%20Concrete'
  },
  {
    id: 'cat-tiling',
    name: 'Tiling',
    badge: 'Bulk Prices',
    image: 'https://i.imgur.com/WwkWGNa.jpeg',
    targetRoute: '/construction?subcategory=Tiling%20%26%20Adhesives'
  },
  {
    id: 'cat-painting',
    name: 'Painting',
    image: 'https://i.imgur.com/PZgJwqo.png',
    targetRoute: '/construction?subcategory=Paints%20%26%20Putty'
  },
  {
    id: 'cat-waterproofing',
    name: 'Water Proofing',
    image: 'https://i.imgur.com/PmoHsyt.png',
    targetRoute: '/construction?subcategory=Waterproofing'
  },
  {
    id: 'cat-plywood',
    name: 'Plywood, MDF & HDHMR',
    image: 'https://i.imgur.com/Ej3lEg6.jpeg',
    targetRoute: '/construction?subcategory=Plywood%20%26%20Boards'
  },
  {
    id: 'cat-fevicol',
    name: 'Fevicol',
    image: 'https://i.imgur.com/fuzbLCY.png',
    targetRoute: '/construction?subcategory=Adhesives%20%26%20Fevicol'
  },
  {
    id: 'cat-cpvc-tanks',
    name: 'CPVC Pipes & Overhead Tanks',
    image: 'https://i.imgur.com/UOMAmSr.png',
    targetRoute: '/construction?subcategory=Plumbing%20%26%20Pipes'
  },
  {
    id: 'cat-sanitary',
    name: 'Sanitary & Bath Fittings',
    image: 'https://i.imgur.com/cPcIuQX.jpeg',
    targetRoute: '/construction?subcategory=Sanitary%20%26%20Bath%20Fittings'
  },
  {
    id: 'cat-kitchen-sinks',
    name: 'Kitchen Sinks & Faucets',
    image: 'https://i.imgur.com/3jGz1Lk.jpeg',
    targetRoute: '/construction?subcategory=Kitchen%20Sinks%20%26%20Faucets'
  },
  {
    id: 'cat-kitchen-systems',
    name: 'Kitchen Systems & Accessories',
    image: 'https://i.imgur.com/DYdlXEY.jpeg',
    targetRoute: '/construction?subcategory=Kitchen%20Systems%20%26%20Accessories'
  },
  {
    id: 'cat-hinges-hardware',
    name: 'Hinges, Channels & Handles',
    image: 'https://i.imgur.com/mnLdVng.jpeg',
    targetRoute: '/construction?subcategory=Hinges%20%26%20Hardware'
  },
  {
    id: 'cat-wardrobe-fittings',
    name: 'Wardrobe & Bed Fittings',
    image: 'https://i.imgur.com/E3cKauk.jpeg',
    targetRoute: '/construction?subcategory=Wardrobe%20%26%20Bed%20Fittings'
  },
  {
    id: 'cat-door-locks',
    name: 'Door Locks & Hardware',
    image: 'https://i.imgur.com/pGZFUb9.jpeg',
    targetRoute: '/construction?subcategory=Door%20Locks%20%26%20Hardware'
  },
  {
    id: 'cat-power-tools',
    name: 'Power Tools & Accessories',
    image: 'https://i.imgur.com/41cqlhr.jpeg',
    targetRoute: '/construction?subcategory=Power%20Tools'
  },
  {
    id: 'cat-general-hardware',
    name: 'General Hardware & Tools',
    image: 'https://i.imgur.com/TiRmlFp.jpeg',
    targetRoute: '/construction?subcategory=General%20Hardware%20%26%20Tools'
  }
];

// ---------------------------------------------------------------------------
// Row 1: Posters / Hero Promotional Banners (10 Curated Trade Ads, Builder Quotes, Solid Color & Painting Aesthetics)
// ---------------------------------------------------------------------------
const HERO_POSTERS = [
  {
    id: 'p-1',
    styleMode: 'solid',
    type: 'ad',
    tagline: 'Kolkata Wholesale Depot',
    title: 'Electrical & Industrial Supplies at Direct Wholesale Rates',
    subtitle: 'RR Kabel, Polycab, Schneider switchgear & Havells lighting dispatched direct to your site across Greater Kolkata.',
    ctaText: 'Explore Electricals',
    link: '/electrical',
    bgGradient: 'from-amber-600 via-amber-700 to-amber-900',
    solidPattern: 'circuit'
  },
  {
    id: 'p-2',
    styleMode: 'painting',
    type: 'quote',
    quoteAuthor: 'Master Builders Philosophy',
    title: '"Quality is the unseen heartbeat of every secure building."',
    subtitle: 'From 100% pure electrolytic copper wiring to ISI-certified fire-retardant conduits, we power lasting safety.',
    ctaText: 'View Wiring Materials',
    link: '/electrical',
    bgGradient: 'from-blue-950/90 via-slate-900/90 to-indigo-950/95',
    paintingImage: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'p-3',
    styleMode: 'solid',
    type: 'ad',
    tagline: 'Factory Direct Bulk Supply',
    title: 'UltraTech Cement & Tata Tiscon 550D TMT Rebars',
    subtitle: 'Calibrated weight guarantee, computerized GST billing & prompt heavy truck dispatch to your job site.',
    ctaText: 'View Construction Catalog',
    link: '/construction',
    bgGradient: 'from-slate-900 via-slate-800 to-amber-950',
    solidPattern: 'blueprint'
  },
  {
    id: 'p-4',
    styleMode: 'painting',
    type: 'quote',
    quoteAuthor: 'Civil Engineering Proverb',
    title: '"A building is only as timeless as the integrity of its foundation."',
    subtitle: 'Build with the strongest materials. Genuine UltraTech, Birla A1, Tata Tiscon and Jindal Panther steel.',
    ctaText: 'Explore Structural Supplies',
    link: '/construction',
    bgGradient: 'from-amber-950/90 via-yellow-950/85 to-stone-950/95',
    paintingImage: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'p-5',
    styleMode: 'solid',
    type: 'ad',
    tagline: 'Monsoon Waterproofing Hub',
    title: 'Monsoon Waterproofing & Heavy CPVC Plumbing Hub',
    subtitle: 'Dr. Fixit 101 LW+, Astral CPVC pipes & Asian Paints wall putty with standard GST tax invoices.',
    ctaText: 'Order Waterproofing',
    link: '/construction',
    bgGradient: 'from-emerald-800 via-teal-900 to-slate-900',
    solidPattern: 'waterproof'
  },
  {
    id: 'p-6',
    styleMode: 'painting',
    type: 'quote',
    quoteAuthor: 'Architectural Vision',
    title: '"Good architecture begins where compromise ends."',
    subtitle: 'CenturyPly 710 Club Prime waterproof marine plywood, Godrej digital locks and German-spec soft-close hardware.',
    ctaText: 'Explore Hardware & Plywood',
    link: '/construction',
    bgGradient: 'from-stone-900/90 via-amber-950/90 to-stone-950/95',
    paintingImage: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'p-7',
    styleMode: 'solid',
    type: 'ad',
    tagline: 'Architectural Luminaire Depots',
    title: 'Modern LED Panels, COB Spotlights & BLDC Smart Fans',
    subtitle: 'Havells, Polycab & Atomberg energy-efficient fans and ambient lighting solutions for luxury interiors.',
    ctaText: 'Explore Lighting & Fans',
    link: '/electrical',
    bgGradient: 'from-indigo-950 via-slate-900 to-blue-900',
    solidPattern: 'lighting'
  },
  {
    id: 'p-8',
    styleMode: 'painting',
    type: 'ad',
    tagline: 'Turnkey Execution',
    title: 'Certified Wiring Services & Material Estimation',
    subtitle: 'Book verified master electricians and transparent turnkey project support in Kolkata.',
    ctaText: 'Book Wiring Service',
    link: '/services',
    bgGradient: 'from-amber-900/90 via-slate-900/90 to-red-950/95',
    paintingImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'p-9',
    styleMode: 'solid',
    type: 'ad',
    tagline: 'Precision Woodcraft',
    title: 'CenturyPly 710 Marine Plywood & Modular Fittings',
    subtitle: 'CenturyPly 710 Club Prime, MDF boards, Godrej locks, soft-close hinges, and German-spec drawer channels.',
    ctaText: 'Explore Plywood & Hardware',
    link: '/construction',
    bgGradient: 'from-amber-950 via-stone-900 to-amber-900',
    solidPattern: 'woodwork'
  },
  {
    id: 'p-10',
    styleMode: 'solid',
    type: 'quote',
    quoteAuthor: 'Electrical Safety Standard',
    title: '"Safety is not an option, it is our first principle."',
    subtitle: 'We only stock 100% genuine IS 694 certified flame-retardant wiring, Type C MCBs & double-pole isolators.',
    ctaText: 'Shop Certified Wiring',
    link: '/electrical',
    bgGradient: 'from-red-950 via-slate-900 to-amber-950',
    solidPattern: 'circuit'
  }
];

// ---------------------------------------------------------------------------
// Row 7: Authorized Brand Names We Sell
// ---------------------------------------------------------------------------
const PARTNER_BRANDS = [
  { name: 'RR Kabel', segment: 'Wires & Cables', badge: 'Authorized Partner' },
  { name: 'Polycab', segment: 'Cables & Fans', badge: 'Direct Wholesale' },
  { name: 'Schneider Electric', segment: 'Modular Switches', badge: 'OEM Partner' },
  { name: 'Havells', segment: 'Lighting & MCBs', badge: '100% Genuine' },
  { name: 'Anchor by Panasonic', segment: 'Wiring Accessories', badge: 'Authorized' },
  { name: 'Finolex', segment: 'Copper Wires', badge: 'Direct Supply' },
  { name: 'UltraTech Cement', segment: 'OPC 53 & Concrete', badge: 'Factory Depot' },
  { name: 'Tata Tiscon', segment: '550D TMT Rebars', badge: 'Authorized' },
  { name: 'Astral Pipes', segment: 'CPVC & UPVC Pipes', badge: 'Distributor' },
  { name: 'Dr. Fixit', segment: 'Waterproofing', badge: 'Official Stockist' },
  { name: 'Asian Paints', segment: 'Paints & Wall Putty', badge: 'Direct Rates' },
  { name: 'CenturyPly', segment: 'Plywood & Boards', badge: 'ISI Certified' },
  { name: 'Bosch', segment: 'Power Tools', badge: 'Original Tools' },
  { name: 'Supreme', segment: 'Plumbing & Drainage', badge: 'Heavy Duty' }
];

export const HomePage = ({
  onAddToCart,
  onUpdateQuantity,
  cartItems = [],
  onNavigateCategory,
  onOpenBulkQuoteModal,
  onOpenProductQuickView,
  products,
  onRefresh
}: HomePageProps) => {
  const navigate = useNavigate();
  const [activePosterIndex, setActivePosterIndex] = useState(0);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const electricalScrollRef = useRef<HTMLDivElement>(null);
  const constructionScrollRef = useRef<HTMLDivElement>(null);

  const handleRefresh = async () => {
    try {
      const data = await fetchProductsFromSupabase();
      if (data && data.length > 0) {
        setDbProducts(data);
      }
    } catch (err) {
      console.warn('Error refreshing products in homepage:', err);
    }
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (err) {
        console.warn('Error in parent onRefresh:', err);
      }
    }
  };

  // Fetch live products directly from backend Supabase database
  useEffect(() => {
    let isMounted = true;
    setIsLoadingProducts(true);

    fetchProductsFromSupabase()
      .then((data) => {
        if (isMounted && data) {
          setDbProducts(data);
        }
      })
      .catch((err) => {
        console.warn('Error fetching homepage products from database:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingProducts(false);
      });

    // Real-time listener: updates automatically whenever products table changes
    const channel = supabase
      .channel('homepage_products_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchProductsFromSupabase()
            .then((data) => {
              if (isMounted && data) {
                setDbProducts(data);
              }
            })
            .catch(console.warn);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Compute live products source of truth
  const liveProducts = useMemo(() => {
    if (products && products.length > 0) return products;
    return dbProducts;
  }, [products, dbProducts]);

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, offset: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Auto-advance posters
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePosterIndex((prev) => (prev + 1) % HERO_POSTERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Helper to check cart quantity
  const getProductCartQty = (productId: string) => {
    const match = cartItems.find((i) => String(i.product.id) === String(productId));
    return match ? match.quantity : 0;
  };

  // -------------------------------------------------------------------------
  // ROW 3: Restocked / Refilled items (Strictly from real backend database)
  // -------------------------------------------------------------------------
  const restockedProducts = useMemo(() => {
    return liveProducts.filter((p) => p.inStock !== false).slice(0, 8);
  }, [liveProducts]);

  // -------------------------------------------------------------------------
  // ROW 4: Newly Launched Electrical Products (Strictly electrical only)
  // -------------------------------------------------------------------------
  const newlyLaunchedElectrical = useMemo(() => {
    return liveProducts
      .filter((p) => isElectricalProduct(p) && !isConstructionProduct(p))
      .slice(0, 10);
  }, [liveProducts]);

  // -------------------------------------------------------------------------
  // ROW 5: Newly Launched Construction Products (Strictly construction only)
  // -------------------------------------------------------------------------
  const newlyLaunchedConstruction = useMemo(() => {
    return liveProducts
      .filter((p) => isConstructionProduct(p) && !isElectricalProduct(p))
      .slice(0, 10);
  }, [liveProducts]);

  // -------------------------------------------------------------------------
  // ROW 10: Review / Video Reels placeholder flag
  // -------------------------------------------------------------------------
  const SHOW_VIDEO_REELS_ROW = false; // Kept in code space as requested, hidden from UI

  // Standard Product Card Rendering matching Electrical & Construction pages with uniform heights and alignment
  const renderProductCard = (product: Product) => {
    const cartQty = getProductCartQty(product.id);
    const discount = product.discountPercentage ||
      (product.originalPrice && product.originalPrice > product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0);

    const isElectrical =
      (product.category || '').toLowerCase().includes('electrical') ||
      (product.category || '').toLowerCase().includes('wire') ||
      (product.category || '').toLowerCase().includes('switch') ||
      (product.category || '').toLowerCase().includes('cable');
    const detailLink = isElectrical
      ? `/electrical/product/${product.id}`
      : `/construction/product/${product.id}`;

    return (
      <div
        key={product.id}
        className="group h-full flex flex-col justify-between transition-all duration-200 border border-slate-100/80 rounded-2xl bg-white p-2 sm:p-2.5 font-sans shadow-2xs hover:shadow-sm hover:border-slate-200"
      >
        {/* Top Segment: Image + Product Info with locked heights */}
        <div className="flex flex-col">
          {/* Clean Product Image Container with Floating Discount Tag */}
          <Link
            to={detailLink}
            className="block aspect-square w-full overflow-hidden rounded-xl bg-slate-50/80 p-3 sm:p-4 mb-2 relative flex items-center justify-center cursor-pointer group-hover:bg-slate-100/80 transition-colors"
          >
            {discount > 0 && (
              <span className="absolute top-2 left-2.5 sm:top-2.5 sm:left-3 text-red-600 font-black text-[11px] sm:text-xs tracking-tight z-10 select-none drop-shadow-2xs">
                {discount}% OFF
              </span>
            )}

            <ProductCardImage
              images={product.images || product.image_urls}
              imageUrl={product.image}
              alt={product.name}
              className="group-hover:scale-105"
            />
          </Link>

          {/* Brand & Unit Badge */}
          <div className="flex items-center gap-1.5 mb-1 h-5 overflow-hidden">
            <span className="text-[10px] font-extrabold uppercase text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 truncate max-w-[110px]">
              {product.brand || 'ISI Brand'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium truncate">
              {product.unit || '1 unit'}
            </span>
          </div>

          {/* Product Name with locked min-height (2-line clamp) */}
          <Link
            to={detailLink}
            className="text-xs sm:text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors line-clamp-2 leading-snug block h-9 sm:h-10 mb-1"
            title={product.name}
          >
            {product.name}
          </Link>

          {/* Price & MRP */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-sm sm:text-base font-black text-slate-950">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-[#52657a] font-semibold line-through">
                ₹{product.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Segment: Add to Cart / Quick Quantity Controls (Always aligned in identical sequence) */}
        <div className="pt-2.5 mt-auto">
          {cartQty > 0 ? (
            <div className="flex items-center justify-between bg-yellow-400 text-slate-950 font-black rounded-lg px-2.5 h-8 shadow-xs border border-yellow-500/40">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onUpdateQuantity) {
                    onUpdateQuantity(product.id, -1);
                  }
                }}
                className="p-1 hover:bg-yellow-500 rounded cursor-pointer transition-colors active:scale-95 flex items-center justify-center"
                title="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <span className="text-xs font-black px-1 select-none">{cartQty} in cart</span>
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
                className="p-1 hover:bg-yellow-500 rounded cursor-pointer transition-colors active:scale-95 flex items-center justify-center"
                title="Increase quantity"
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
              className="w-full h-8 px-3 bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-slate-950 font-black text-xs rounded-lg transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5 cursor-pointer select-none"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Add to Cart</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <SEOHead
        title="SmartRun | Buy Electrical Goods, Construction Materials & Wiring Services Kolkata"
        description="Shop genuine electrical goods, Polycab & RR Kabel wires, switches, cement, TMT rebars, and book licensed electrician wiring services in Kolkata with 60-min express delivery."
        keywords="SmartRun, smartrun, smartrun kolkata, smartrun electricals, electrical shop near me, buy electrical goods online Kolkata, house wiring contractor, electrical wiring services, modular switches, Polycab wire, Havells cables, Finolex wire, Schneider MCB, distribution board, LED lighting, construction materials Kolkata, cement delivery, UltraTech cement, ACC cement, TMT steel bars, Tata Tiscon rebars, waterproofing chemicals, real estate electrification, licensed electrician Kolkata, Kasba electrical shop, wholesale electrical market Kolkata, B2B building materials procurement, direct depot Kolkata"
      />
      <div className="min-h-screen bg-white text-slate-900 pb-4 sm:pb-6 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16 pt-3 sm:pt-4">

        {/* =====================================================================
            ROW 1: POSTERS (Hero Banner Carousel - Uniform Sleek Rectangular Size & Seamless Motion)
            ===================================================================== */}
        <section id="row-1-posters" className="relative space-y-4">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs border border-slate-200 h-56 sm:h-64 md:h-72 w-full">
            {HERO_POSTERS.map((poster, index) => {
              const isActive = index === activePosterIndex;
              return (
                <div
                  key={poster.id}
                  className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  } bg-gradient-to-r ${poster.bgGradient} text-white px-6 sm:px-10 md:px-12 py-5 sm:py-7 overflow-hidden flex flex-col justify-center`}
                >
                  {/* Background Layer: Real-Life Painting or Solid Architectural Vectors */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                    {poster.styleMode === 'painting' && poster.paintingImage ? (
                      <>
                        {/* Realistic Architectural / Oil Art Background Layer */}
                        <img
                          src={poster.paintingImage}
                          alt="Artistic Backdrop"
                          className="absolute inset-0 w-full h-full object-cover object-center opacity-30 mix-blend-luminosity scale-105 transition-transform duration-10000 ease-out"
                        />

                        {/* Canvas Texture Scrim & Ambient Color Glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/40" />
                        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-400/15 blur-3xl" />
                        <div className="absolute -bottom-24 right-1/4 w-72 h-72 rounded-full bg-red-600/10 blur-3xl" />

                        {/* Fine Canvas Stippled Mesh Pattern */}
                        <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
                          <filter id={`noise-${poster.id}`}>
                            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
                            <feColorMatrix type="saturate" values="0" />
                          </filter>
                          <rect width="100%" height="100%" filter={`url(#noise-${poster.id})`} opacity="0.3" />
                        </svg>

                        {/* Subtle Architectural Stroke Lines */}
                        <svg className="absolute right-0 top-0 h-full w-1/2 opacity-20 text-amber-300 pointer-events-none" viewBox="0 0 400 300" fill="none">
                          <path d="M50 280 L350 40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
                          <circle cx="350" cy="40" r="4" fill="currentColor" />
                          <circle cx="50" cy="280" r="3" fill="currentColor" />
                        </svg>
                      </>
                    ) : (
                      <>
                        {/* Normal Solid/Gradient Ambient Glow Spheres */}
                        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
                        <div className="absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl" />

                        {/* Normal Solid Design 1: Circuit Vectors */}
                        {poster.solidPattern === 'circuit' && (
                          <svg className="absolute right-0 top-0 h-full w-2/3 opacity-20 text-amber-300" viewBox="0 0 600 400" fill="none">
                            <path d="M100,50 H300 L350,100 H550" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
                            <path d="M50,150 H250 L300,200 H600" stroke="currentColor" strokeWidth="2.5" />
                            <path d="M150,280 H350 L400,330 H580" stroke="currentColor" strokeWidth="1.5" />
                            <circle cx="350" cy="100" r="6" fill="currentColor" />
                            <circle cx="300" cy="200" r="8" fill="currentColor" />
                            <circle cx="400" cy="330" r="5" fill="currentColor" />
                            <circle cx="550" cy="100" r="4" fill="currentColor" />
                            <rect x="420" y="80" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="2" fill="none" />
                            <rect x="220" y="240" width="60" height="30" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          </svg>
                        )}

                        {/* Normal Solid Design 2: Structural Blueprint Grid & Truss */}
                        {poster.solidPattern === 'blueprint' && (
                          <svg className="absolute right-0 top-0 h-full w-2/3 opacity-20 text-amber-400" viewBox="0 0 600 400" fill="none">
                            <line x1="100" y1="380" x2="500" y2="40" stroke="currentColor" strokeWidth="2" />
                            <line x1="180" y1="380" x2="580" y2="40" stroke="currentColor" strokeWidth="2" />
                            <line x1="100" y1="380" x2="180" y2="380" stroke="currentColor" strokeWidth="2" />
                            <line x1="200" y1="300" x2="280" y2="300" stroke="currentColor" strokeWidth="1.5" />
                            <line x1="300" y1="210" x2="380" y2="210" stroke="currentColor" strokeWidth="1.5" />
                            <line x1="400" y1="130" x2="480" y2="130" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M50 50h500M50 120h500M50 190h500M50 260h500M50 330h500" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4 4" />
                            <path d="M120 20v360M240 20v360M360 20v360M480 20v360" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4 4" />
                          </svg>
                        )}

                        {/* Normal Solid Design 3: Waterproof Shield Waves */}
                        {poster.solidPattern === 'waterproof' && (
                          <svg className="absolute right-0 top-0 h-full w-2/3 opacity-25 text-emerald-300" viewBox="0 0 600 400" fill="none">
                            <path d="M0,200 C150,150 250,280 400,220 C500,180 550,260 600,240" stroke="currentColor" strokeWidth="3" />
                            <path d="M0,240 C120,200 280,320 420,260 C520,220 570,300 600,280" stroke="currentColor" strokeWidth="2" strokeDasharray="8 6" />
                            <polygon points="450,80 490,105 490,150 450,175 410,150 410,105" stroke="currentColor" strokeWidth="2" fill="none" />
                            <polygon points="530,130 570,155 570,200 530,225 490,200 490,155" stroke="currentColor" strokeWidth="1.5" fill="none" />
                            <polygon points="370,130 410,155 410,200 370,225 330,200 330,155" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          </svg>
                        )}

                        {/* Normal Solid Design 4: Lighting Halos */}
                        {poster.solidPattern === 'lighting' && (
                          <svg className="absolute right-0 top-0 h-full w-2/3 opacity-25 text-indigo-300" viewBox="0 0 600 400" fill="none">
                            <circle cx="480" cy="120" r="140" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                            <circle cx="480" cy="120" r="90" stroke="currentColor" strokeWidth="1.5" />
                            <circle cx="480" cy="120" r="40" stroke="currentColor" strokeWidth="2" />
                            <circle cx="480" cy="120" r="12" fill="currentColor" />
                            <path d="M480 120 L250 380" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
                            <path d="M480 120 L580 380" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
                          </svg>
                        )}

                        {/* Normal Solid Design 5: Woodworking Caliper & Grain */}
                        {poster.solidPattern === 'woodwork' && (
                          <svg className="absolute right-0 top-0 h-full w-2/3 opacity-20 text-amber-300" viewBox="0 0 600 400" fill="none">
                            <path d="M200 50 Q450 150 480 380" stroke="currentColor" strokeWidth="2" />
                            <path d="M250 50 Q480 170 510 380" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M300 50 Q510 190 540 380" stroke="currentColor" strokeWidth="1.5" />
                            <rect x="380" y="100" width="80" height="120" rx="10" stroke="currentColor" strokeWidth="2" fill="none" />
                            <circle cx="400" cy="125" r="4" fill="currentColor" />
                            <circle cx="400" cy="195" r="4" fill="currentColor" />
                          </svg>
                        )}
                      </>
                    )}
                  </div>

                  {/* Poster Content */}
                  <div className="relative z-10 max-w-2xl sm:max-w-3xl space-y-2 sm:space-y-3">
                    {/* Header Tagline or Author Indicator */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide text-amber-300/95">
                      {poster.type === 'quote' ? (
                        <span className="italic">✦ {poster.quoteAuthor}</span>
                      ) : (
                        <span>● {poster.tagline}</span>
                      )}
                    </div>

                    <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight drop-shadow-sm font-serif line-clamp-2">
                      {poster.title}
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base text-slate-100/90 max-w-xl sm:max-w-2xl leading-relaxed font-medium line-clamp-2">
                      {poster.subtitle}
                    </p>
                    <div className="pt-1.5 sm:pt-2 flex flex-wrap items-center gap-3">
                      <Link
                        to={poster.link}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/40 shadow-xs hover:shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
                      >
                        {poster.ctaText}
                        <ChevronRight className="w-4 h-4 text-amber-300" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =====================================================================
            ROW 2: PRODUCTS CATEGORY (Compact Grid - 6 Per Row, Centered Last Row)
            ===================================================================== */}
        <section id="row-2-categories" className="pt-0">
          {/* 6-Column Category Grid - Compact & Centered */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {REFERENCE_CATEGORIES.map((cat) => {
              return (
                <div
                  key={cat.id}
                  id={`cat-card-${cat.id}`}
                  onClick={() => {
                    hapticLight();
                    navigate(cat.targetRoute);
                  }}
                  className="w-[calc((100%-1rem)/3)] sm:w-[calc((100%-3.75rem)/6)] group flex flex-col items-center cursor-pointer select-none"
                >
                  {/* Apple Liquid Glass Depth Card with Seamless Image Integration */}
                  <div className="w-full aspect-square relative flex items-center justify-center rounded-xl sm:rounded-2xl p-1.5 sm:p-2 bg-gradient-to-b from-white/95 via-[#e6f2fb]/85 to-[#d1e8f8]/90 backdrop-blur-md border border-white/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),inset_0_-2px_6px_rgba(14,116,144,0.12),0_4px_14px_rgba(14,116,144,0.12)] hover:shadow-[inset_0_2px_6px_rgba(255,255,255,1),inset_0_-2px_6px_rgba(14,116,144,0.18),0_8px_20px_rgba(14,116,144,0.2)] transition-all duration-300 hover:-translate-y-1 overflow-hidden group-hover:border-white">
                    {/* Apple-style Top Specular Liquid Glass Highlight */}
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/75 via-white/25 to-transparent rounded-t-xl sm:rounded-t-2xl z-1" />

                    {/* Bottom Glass Refraction Sheen */}
                    <span className="pointer-events-none absolute inset-x-2 bottom-0 h-[30%] bg-gradient-to-t from-sky-400/20 via-sky-300/5 to-transparent rounded-b-xl sm:rounded-b-2xl blur-[1px]" />

                    {cat.badge && (
                      <span className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 bg-gradient-to-b from-amber-300 to-amber-400 text-slate-950 font-black text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.12)] border border-amber-200/80 z-10 select-none leading-none">
                        {cat.badge}
                      </span>
                    )}

                    {/* Blended / Merged Product Image container */}
                    <div className="w-full h-full relative z-2 flex items-center justify-center rounded-lg sm:rounded-xl overflow-hidden">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain mix-blend-multiply drop-shadow-[0_4px_8px_rgba(15,23,42,0.12)] group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Category Name below the card */}
                  <span className="text-center font-semibold text-[11px] sm:text-xs text-slate-800 group-hover:text-amber-800 group-hover:font-bold transition-colors mt-1 sm:mt-1.5 leading-tight line-clamp-2 px-0.5">
                    {cat.name}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* =====================================================================
            ROW 3: RESTOCKED ITEMS (Refilled after out of stock - From Backend Database)
            ===================================================================== */}
        {restockedProducts.length > 0 && (
          <section id="row-3-restocked" className="space-y-3 pt-1">
            <div className="border-b border-slate-100 pb-1.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Back in Stock
              </h2>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8">
              {restockedProducts.map(renderProductCard)}
            </div>
          </section>
        )}

        {/* =====================================================================
            ROW 4: NEWLY LAUNCHED / ELECTRICAL SEGMENT
            ===================================================================== */}
        {newlyLaunchedElectrical.length > 0 && (
          <section id="row-4-new-electrical" className="space-y-3 pt-1">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                New Launched
              </h2>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mt-1">
                <h3 className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wider">
                  Electrical
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => scrollRow(electricalScrollRef, -320)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollRow(electricalScrollRef, 320)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Horizontal Product Scroll Row */}
            <div
              ref={electricalScrollRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-4 px-4 sm:mx-0 sm:px-0 items-stretch"
            >
              {newlyLaunchedElectrical.map((p) => (
                <div key={p.id} className="w-44 sm:w-56 shrink-0 flex flex-col">
                  {renderProductCard(p)}
                </div>
              ))}
              {/* See All Card at end of scroll */}
              <div className="w-36 sm:w-44 shrink-0 flex flex-col">
                <Link
                  to="/electrical"
                  className="h-full min-h-[250px] flex flex-col items-center justify-center rounded-2xl border border-slate-100/80 bg-white p-4 shadow-2xs hover:shadow-sm hover:border-blue-300 group transition-all cursor-pointer text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-2 transition-colors">
                    <ChevronRight className="w-5 h-5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                    See All
                  </span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            ROW 5: NEWLY LAUNCHED / CONSTRUCTION SEGMENT
            (Hidden when no construction products exist in database, auto-appears when products added)
            ===================================================================== */}
        {newlyLaunchedConstruction.length > 0 && (
          <section id="row-5-new-construction" className="space-y-3 pt-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wider">
                Construction
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollRow(constructionScrollRef, -320)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollRow(constructionScrollRef, 320)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Product Scroll Row */}
            <div
              ref={constructionScrollRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-4 px-4 sm:mx-0 sm:px-0 items-stretch"
            >
              {newlyLaunchedConstruction.map((p) => (
                <div key={p.id} className="w-44 sm:w-56 shrink-0 flex flex-col">
                  {renderProductCard(p)}
                </div>
              ))}
              {/* See All Card at end of scroll */}
              <div className="w-36 sm:w-44 shrink-0 flex flex-col">
                <Link
                  to="/construction"
                  className="h-full min-h-[250px] flex flex-col items-center justify-center rounded-2xl border border-slate-100/80 bg-white p-4 shadow-2xs hover:shadow-sm hover:border-blue-300 group transition-all cursor-pointer text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-2 transition-colors">
                    <ChevronRight className="w-5 h-5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                    See All
                  </span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            ROW 6: BRAND NAMES WE ARE SELLING (Official Logos & Liquid Glass Showcase)
            ===================================================================== */}
        <section id="row-7-brands" className="space-y-4 sm:space-y-6 pt-2">
          {/* Centered Heading & Subtitle */}
          <div className="text-center max-w-2xl mx-auto space-y-2 px-2">
            {/* Header Badge */}
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 text-amber-900 border border-amber-300/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>100% Authorized OEM Sourcing</span>
            </div>

            <h2 className="text-xl sm:text-3xl lg:text-4xl font-black font-sf-pro text-[#0F1B2D] tracking-tight leading-tight">
              Brands Available on Our Platform
            </h2>
            <p className="text-xs sm:text-sm text-[#5F6B7A] font-medium leading-relaxed">
              Direct factory depot rates &amp; genuine manufacturer warranty for Kolkata Builders, Electricians &amp; Contractors.
            </p>
          </div>

          {/* Borderless Compact Brand Cards Grid - Clean & Minimal Space on Mobile */}
          <div className="grid grid-cols-3 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 sm:gap-2.5">
            {OFFICIAL_BRANDS.map((brand) => (
              <Link
                key={`grid-${brand.id}`}
                to={brand.targetRoute}
                className="group p-2 sm:p-2.5 rounded-xl bg-white/70 hover:bg-white hover:shadow-sm transition-all duration-200 active:scale-95 flex flex-col items-center justify-center text-center cursor-pointer border-0 shadow-none min-h-[48px]"
                aria-label={`Explore official ${brand.name} products`}
              >
                {/* Official Logo Display */}
                <div className="h-8 sm:h-9 w-full max-w-[100px] sm:max-w-[120px] flex items-center justify-center group-hover:scale-105 transition-transform duration-200 px-0.5">
                  {brand.renderLogo()}
                </div>

                {/* Brand Name Only */}
                <p className="mt-1 text-[11px] sm:text-xs font-bold text-slate-800 truncate w-full text-center group-hover:text-amber-800 transition-colors leading-tight">
                  {brand.name}
                </p>
              </Link>
            ))}
          </div>

          {/* Continuous Slow-Moving Logo Carousel with Liquid Glass Border & Sheen (Decorative marquee hidden from screen readers/tab order to prevent focus trap) */}
          <div
            className="-mx-4 sm:-mx-6 relative overflow-hidden py-3 sm:py-3.5 bg-gradient-to-r from-white/95 via-amber-50/30 to-white/95 backdrop-blur-md rounded-none border-y border-x-0 border-amber-200/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.03)]"
            aria-hidden="true"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/60 to-transparent z-5" />
            <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

            <div className="animate-marquee-slow flex items-center gap-6 sm:gap-8 whitespace-nowrap">
              {OFFICIAL_BRANDS.map((brand) => (
                <Link
                  key={`marquee-1-${brand.id}`}
                  to={brand.targetRoute}
                  tabIndex={-1}
                  className="inline-flex items-center gap-3 px-3 py-1 hover:opacity-80 transition-opacity cursor-pointer select-none shrink-0"
                >
                  <div className="shrink-0 flex items-center justify-center max-w-[110px] sm:max-w-[130px]">
                    {brand.renderLogo()}
                  </div>
                </Link>
              ))}

              {/* Duplicate array for continuous infinite scroll */}
              {OFFICIAL_BRANDS.map((brand) => (
                <Link
                  key={`marquee-2-${brand.id}`}
                  to={brand.targetRoute}
                  tabIndex={-1}
                  className="inline-flex items-center gap-3 px-3 py-1 hover:opacity-80 transition-opacity cursor-pointer select-none shrink-0"
                >
                  <div className="shrink-0 flex items-center justify-center max-w-[110px] sm:max-w-[130px]">
                    {brand.renderLogo()}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================================
            ROW 9: POSTERS (Secondary Promo Banners)
            ===================================================================== */}
        <section id="row-9-posters" className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Banner 1: Bulk Contractor Project */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-white flex flex-col justify-between space-y-4 border border-amber-400/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_6px_rgba(0,0,0,0.3),0_6px_20px_rgba(180,83,9,0.25)] transition-all duration-300 hover:shadow-[inset_0_2px_6px_rgba(255,255,255,0.5),inset_0_-2px_6px_rgba(0,0,0,0.35),0_10px_26px_rgba(180,83,9,0.35)]">
            {/* Top Specular Liquid Glass Sheen */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/35 via-white/10 to-transparent rounded-t-2xl z-1" />

            {/* Subtle Watermark Symbol in Background */}
            <div className="pointer-events-none absolute -right-6 -bottom-6 w-44 h-44 text-white/10 flex items-center justify-center select-none rotate-12 z-0">
              <Building2 className="w-full h-full stroke-[1.2]" />
            </div>

            <div className="relative z-10 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full inline-block border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                Contractor Desk
              </span>
              <h3 className="text-xl font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                Executing a Commercial Project in Kolkata?
              </h3>
              <p className="text-xs text-amber-100/90 leading-relaxed font-medium">
                Direct factory rate billing for electrical cables, switchboards, cement, and TMT rebars with scheduled on-site truck dispatch.
              </p>
            </div>

            <div className="relative z-10 pt-1">
              <a
                href="https://wa.me/918777400280?text=Hi%20SmartRun,%20I%20have%20a%20contractor%20bulk%20inquiry."
                target="_blank"
                rel="noreferrer"
                className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-white via-slate-100 to-slate-200 hover:from-white hover:via-amber-50 hover:to-amber-100 text-slate-950 font-black font-sf-pro text-xs transition-all duration-200 cursor-pointer active:scale-98 border border-white/90 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.2)]"
              >
                {/* Apple-style Top Specular Liquid Glass Sheen */}
                <span className="pointer-events-none absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/70 to-transparent rounded-t-[10px]" />
                <span className="relative z-10">Chat with Project Desk</span>
                <ChevronRight className="w-3.5 h-3.5 relative z-10 text-slate-900" />
              </a>
            </div>
          </div>

          {/* Banner 2: Licensed Electrician Service */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white flex flex-col justify-between space-y-4 border border-slate-700/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-2px_6px_rgba(0,0,0,0.5),0_6px_20px_rgba(0,0,0,0.35)] transition-all duration-300 hover:shadow-[inset_0_2px_6px_rgba(255,255,255,0.25),inset_0_-2px_6px_rgba(0,0,0,0.6),0_10px_26px_rgba(0,0,0,0.45)]">
            {/* Top Specular Liquid Glass Sheen */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-t-2xl z-1" />

            {/* Subtle Watermark Symbol in Background */}
            <div className="pointer-events-none absolute -right-6 -bottom-6 w-44 h-44 text-emerald-400/10 flex items-center justify-center select-none rotate-12 z-0">
              <Zap className="w-full h-full stroke-[1.2]" />
            </div>

            <div className="relative z-10 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md px-2.5 py-1 rounded-full inline-block shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                Certified Technicians
              </span>
              <h3 className="text-xl font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                Need a Licensed Electrician for Wiring?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Book verified electrical technicians for home diagnostics, short circuit troubleshooting, switchboard installations, and full site wiring.
              </p>
            </div>

            <div className="relative z-10 pt-1">
              <button
                onClick={() => navigate('/services')}
                className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#FDE047] via-[#FBBF24] to-[#F59E0B] hover:from-[#FEF08A] hover:via-[#FCD34D] hover:to-[#FBBF24] text-slate-950 font-black font-sf-pro text-xs transition-all duration-200 cursor-pointer active:scale-98 border border-yellow-100/80 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.85),inset_0_-2px_4px_rgba(180,83,9,0.25),0_4px_14px_rgba(245,158,11,0.32)]"
              >
                {/* Apple-style Top Specular Liquid Glass Sheen */}
                <span className="pointer-events-none absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/60 to-transparent rounded-t-[10px]" />
                <span className="relative z-10">Book Certified Electrician</span>
                <ChevronRight className="w-3.5 h-3.5 relative z-10 text-slate-950" />
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================================
            ROW 11: CENTRAL DEPOT & WAREHOUSE LOCATION (Active Google Maps Showcase)
            ===================================================================== */}
        <section id="row-11-store-map" className="space-y-4 pt-2">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-1.5 px-2">
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-300/60 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Central Depot &amp; Express Dispatch Hub</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black font-sf-pro text-[#0F1B2D] tracking-tight">
              Visit Our Kolkata Central Warehouse
            </h2>
            <p className="text-xs sm:text-sm text-[#5F6B7A] font-medium leading-relaxed">
              Direct trade pick-up counter, material inspections &amp; 60-minute dispatch hub for all Kolkata electrical &amp; construction orders.
            </p>
          </div>

          {/* Map + Location Details Card Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden p-3 sm:p-4">
            {/* Interactive Google Maps Iframe Container */}
            <div className="lg:col-span-7 h-[260px] sm:h-[320px] rounded-xl overflow-hidden border border-slate-200/90 relative bg-slate-100 shadow-inner">
              <iframe
                title="SmartRun Kasba Central Warehouse and Depot Location Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3685.589886361847!2d88.38562517601614!3d22.51450003491415!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a027137f6a27e7b%3A0xb3bc87e5b61ec055!2sKasba%2C%20Kolkata%2C%20West%20Bengal!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full block"
              />
            </div>

            {/* Warehouse Information & Quick Actions */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4 p-1 sm:p-2">
              <div className="space-y-3.5">
                {/* Physical Address */}
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-300/40 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Warehouse Address</h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                      SmartRun Kasba Hub, Bediadanga 1st Lane, Nator Park, Kasba, Kolkata, West Bengal 700039
                    </p>
                    <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Primary Kolkata Operating Depot
                    </span>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-300/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Operating Hours</h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                      8:00 AM – 9:30 PM
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Open 7 Days a Week (Dispatch &amp; Pick-up Counter)
                    </p>
                  </div>
                </div>

                {/* Direct Helpline */}
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-300/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Hub &amp; Dispatch Desk</h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                      +91 8777400280
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Voice call &amp; WhatsApp instant contractor support
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <a
                  href="https://maps.google.com/?q=22.5145,88.3882"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[38px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 text-center"
                  aria-label="Open warehouse location in Google Maps"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Get Directions</span>
                </a>

                <a
                  href="tel:+918777400280"
                  className="min-h-[38px] px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 text-center border border-amber-500/40"
                  aria-label="Call Kasba Warehouse Desk"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>Call Hub Desk</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            ROW 10: REVIEW / VIDEO REELS (Code preserved, hidden from UI)
            ===================================================================== */}
        {SHOW_VIDEO_REELS_ROW && (
          <section id="row-10-video-reels" className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-lg font-black text-slate-900">Customer Reviews &amp; Site Video Reels</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Space reserved for video reel embed cards when user provides assets */}
              <div className="aspect-9/16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center p-4 text-center">
                <span className="text-xs text-slate-400 font-bold">Video Reel Placeholder</span>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  </PullToRefresh>
  );
};
