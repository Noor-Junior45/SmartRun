import { supabase } from '../lib/supabaseClient';
import { ElectricalProduct, ProductReview, FilterState, SortOption } from '../types/electrical';
import { apiUrl } from '../lib/apiBase';
import { isElectricalProduct, isConstructionProduct } from '../utils/categoryHelper';

/**
 * Transforms Supabase products to standard ElectricalProduct format
 */
export function transformToElectricalProduct(item: any): ElectricalProduct {
  const price = Number(item.price || 0);
  const mrp = Number(item.mrp || item.originalPrice || item.original_price || (price > 0 ? price * 1.15 : 0));
  const discount_percent = Number(
    item.discount_percent ||
    item.discountPercentage ||
    (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0)
  );

  let image_urls: string[] = [];
  if (Array.isArray(item.image_urls) && item.image_urls.length > 0) {
    image_urls = item.image_urls.filter((url: any) => typeof url === 'string' && url.trim().length > 0);
  } else if (typeof item.image_urls === 'string' && item.image_urls.startsWith('http')) {
    image_urls = [item.image_urls];
  }

  if (item.image && typeof item.image === 'string' && item.image.trim() && !image_urls.includes(item.image.trim())) {
    image_urls.unshift(item.image.trim());
  }

  if (image_urls.length === 0) {
    image_urls = ['https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=800&auto=format&fit=crop'];
  }

  let specifications: Record<string, any> = {};
  if (typeof item.specifications === 'object' && item.specifications !== null) {
    specifications = item.specifications;
  } else if (typeof item.specifications === 'string' && item.specifications.trim()) {
    try {
      specifications = JSON.parse(item.specifications);
    } catch {
      specifications = { "Description": item.specifications };
    }
  } else if (typeof item.specs === 'object' && item.specs !== null) {
    specifications = item.specs;
  } else if (typeof item.specs === 'string' && item.specs.trim()) {
    try {
      specifications = JSON.parse(item.specs);
    } catch {
      specifications = { "Specifications": item.specs };
    }
  }

  // Parse FAQs if stored in Supabase JSON/JSONB column
  let faqs: Array<{ question?: string; answer?: string; q?: string; a?: string }> | undefined = undefined;
  if (Array.isArray(item.faqs)) {
    faqs = item.faqs;
  } else if (Array.isArray(item.faq)) {
    faqs = item.faq;
  } else if (typeof item.faqs === 'string') {
    try {
      const parsed = JSON.parse(item.faqs);
      if (Array.isArray(parsed)) faqs = parsed;
    } catch {}
  } else if (typeof item.faq === 'string') {
    try {
      const parsed = JSON.parse(item.faq);
      if (Array.isArray(parsed)) faqs = parsed;
    } catch {}
  }

  // Parse color options & variants from database row
  let colors: any[] | undefined = undefined;
  const rawVariants = item.color_variants || item.colorVariants || item.color_options || item.colorOptions || item.colors || item.colours;

  if (Array.isArray(item.color_variants) && item.color_variants.length > 0) {
    colors = item.color_variants;
  } else if (Array.isArray(item.colorVariants) && item.colorVariants.length > 0) {
    colors = item.colorVariants;
  } else if (Array.isArray(item.color_options) && item.color_options.length > 0) {
    colors = item.color_options;
  } else if (Array.isArray(item.colors) && item.colors.length > 0) {
    colors = item.colors;
  } else if (Array.isArray(item.colours) && item.colours.length > 0) {
    colors = item.colours;
  } else if (typeof item.color_variants === 'string' && item.color_variants.trim()) {
    try {
      const parsed = JSON.parse(item.color_variants);
      if (Array.isArray(parsed)) colors = parsed;
    } catch {}
  } else if (typeof item.colors === 'string' && item.colors.trim()) {
    try {
      const parsed = JSON.parse(item.colors);
      if (Array.isArray(parsed)) {
        colors = parsed;
      } else {
        colors = item.colors.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean);
      }
    } catch {
      colors = item.colors.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean);
    }
  } else if (typeof item.colours === 'string' && item.colours.trim()) {
    try {
      const parsed = JSON.parse(item.colours);
      if (Array.isArray(parsed)) {
        colors = parsed;
      } else {
        colors = item.colours.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean);
      }
    } catch {
      colors = item.colours.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean);
    }
  } else if (typeof item.color === 'string' && item.color.trim()) {
    colors = [item.color.trim()];
  }

  const colorVariants = Array.isArray(rawVariants)
    ? rawVariants
    : typeof rawVariants === 'string' && rawVariants.startsWith('[')
    ? (() => { try { return JSON.parse(rawVariants); } catch { return undefined; } })()
    : undefined;

  return {
    id: String(item.id),
    name: item.name || 'Electrical Product',
    brand: item.brand || 'Giriraj Genuine',
    category: item.category || 'electrical',
    subcategory: item.subcategory || item.subCategory || item.sub_category || 'General',
    price,
    mrp,
    discount_percent,
    description: item.description || 'High-grade electrical material certified for heavy residential and commercial installations.',
    specifications,
    faqs,
    stock_quantity: Number(item.stock_quantity ?? item.stock_count ?? item.stockCount ?? 50),
    image_urls,
    rating_avg: Number(item.rating_avg || item.rating || 4.8),
    rating_count: Number(item.rating_count || item.reviewsCount || item.reviews_count || 32),
    colors,
    colours: colors,
    color_options: colors,
    color_variants: colorVariants,
    selectedColor: item.selectedColor || item.selected_color,
    selected_color: item.selected_color || item.selectedColor,
    created_at: item.created_at || new Date().toISOString()
  };
}

/**
 * Fetch electrical products directly and strictly from Supabase (Strict Database Mode)
 * Ensures all Supabase products (wires, pipes, conduits, switches, fans, lights, MCBs, appliances, etc.) are visible
 */
export async function fetchElectricalProducts(
  filters?: FilterState,
  sort: SortOption = 'popularity',
  searchQuery: string = ''
): Promise<{ products: ElectricalProduct[]; total: number }> {
  try {
    let rawData: any[] = [];

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        rawData = data;
      }
    } catch (sbErr) {
      console.warn('[electricalService] Supabase direct query notice:', sbErr);
    }

    // If direct Supabase query was empty or failed (e.g. RLS / native CORS), query backend API
    if (rawData.length === 0) {
      try {
        const res = await fetch(apiUrl('/api/products'), {
          headers: { 'Accept': 'application/json' },
        });
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.products) && json.products.length > 0) {
            rawData = json.products;
          }
        }
      } catch (apiErr) {
        console.warn('[electricalService] Backend API fallback notice:', apiErr);
      }
    }

    let productsList: ElectricalProduct[] = [];

    if (rawData.length > 0) {
      // Strictly include ONLY real electrical equipment and materials from Supabase
      productsList = rawData
        .filter((row) => {
          return isElectricalProduct(row) && !isConstructionProduct(row);
        })
        .map(transformToElectricalProduct);
    } else {
      productsList = [];
    }

    // Apply subcategory filters
    if (filters?.subcategories && filters.subcategories.length > 0) {
      productsList = productsList.filter((p) => {
        const pSub = (p.subcategory || '').toLowerCase();
        const pName = (p.name || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        return filters.subcategories.some((sub) => {
          const s = sub.toLowerCase().trim();
          if (s === 'all' || s === 'all electrical') return true;
          return (
            pSub.includes(s) ||
            s.includes(pSub) ||
            pCat.includes(s) ||
            s.includes(pCat) ||
            (s.includes('fan') && (pName.includes('fan') || pSub.includes('fan'))) ||
            ((s.includes('wire') || s.includes('wiring') || s.includes('cable')) && (pName.includes('wire') || pName.includes('cable') || pSub.includes('wire') || pSub.includes('cable') || pSub.includes('wiring'))) ||
            (s.includes('mcb') && (pName.includes('mcb') || pName.includes('db') || pName.includes('distribution') || pSub.includes('mcb'))) ||
            ((s.includes('switch') || s.includes('socket')) && (pName.includes('switch') || pName.includes('socket') || pSub.includes('switch') || pSub.includes('socket'))) ||
            ((s.includes('light') || s.includes('led') || s.includes('bulb')) && (pName.includes('light') || pName.includes('led') || pName.includes('bulb') || pSub.includes('light') || pSub.includes('led') || pSub.includes('lamp'))) ||
            ((s.includes('pvc') || s.includes('pipe') || s.includes('conduit') || s.includes('box')) && (pName.includes('pipe') || pName.includes('conduit') || pName.includes('pvc') || pName.includes('box') || pName.includes('dalda') || pSub.includes('pvc') || pSub.includes('pipe') || pSub.includes('conduit'))) ||
            ((s.includes('cctv') || s.includes('surveillance') || s.includes('camera') || s.includes('security')) && (pName.includes('camera') || pName.includes('cctv') || pName.includes('dvr') || pSub.includes('cctv') || pSub.includes('camera'))) ||
            ((s.includes('appliance') || s.includes('backup') || s.includes('geyser') || s.includes('inverter') || s.includes('home')) && (pName.includes('geyser') || pName.includes('inverter') || pName.includes('heater') || pSub.includes('appliance') || pSub.includes('inverter') || pSub.includes('geyser')))
          );
        });
      });
    }

    if (filters?.brands && filters.brands.length > 0) {
      productsList = productsList.filter((p) => {
        const pBrand = (p.brand || '').toLowerCase();
        const pName = (p.name || '').toLowerCase();
        return filters.brands.some((b) => {
          const brandLower = b.toLowerCase().trim();
          return pBrand.includes(brandLower) || brandLower.includes(pBrand) || pName.includes(brandLower);
        });
      });
    }

    if (filters?.minPrice !== undefined && filters.minPrice > 0) {
      productsList = productsList.filter((p) => p.price >= filters.minPrice!);
    }

    if (filters?.maxPrice !== undefined && filters.maxPrice > 0) {
      productsList = productsList.filter((p) => p.price <= filters.maxPrice!);
    }

    if (filters?.minRating !== undefined && filters.minRating > 0) {
      productsList = productsList.filter((p) => p.rating_avg >= filters.minRating!);
    }

    if (filters?.minDiscount !== undefined && filters.minDiscount > 0) {
      productsList = productsList.filter((p) => p.discount_percent >= filters.minDiscount!);
    }

    if (filters?.inStockOnly) {
      productsList = productsList.filter((p) => p.stock_quantity > 0);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const tokens = q.split(/\s+/).filter(Boolean);
      
      productsList = productsList.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const subcategory = (p.subcategory || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const specs = typeof p.specifications === 'object' ? JSON.stringify(p.specifications).toLowerCase() : '';
        const combined = `${name} ${brand} ${subcategory} ${category} ${desc} ${specs}`;
        
        // Exact substring match
        if (combined.includes(q)) return true;
        
        // Multi-token match: all words in query match combined text
        return tokens.every((token) => combined.includes(token));
      });
    }

    // Sort order
    switch (sort) {
      case 'price_asc':
        productsList.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        productsList.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        productsList.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        break;
      case 'rating':
        productsList.sort((a, b) => b.rating_avg - a.rating_avg);
        break;
      case 'popularity':
      default:
        productsList.sort((a, b) => {
          if ((b.rating_count || 0) !== (a.rating_count || 0)) {
            return (b.rating_count || 0) - (a.rating_count || 0);
          }
          // Prioritize newly listed products so they immediately show up
          return (b.created_at || '').localeCompare(a.created_at || '');
        });
        break;
    }

    return { products: productsList, total: productsList.length };
  } catch (err) {
    console.warn('Supabase electrical products query error:', err);
    return { products: [], total: 0 };
  }
}

/**
 * Fetch a single electrical product by ID directly from Supabase (Strict Database Mode)
 */
export async function fetchElectricalProductById(id: string): Promise<ElectricalProduct | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return transformToElectricalProduct(data);
    }

    // Case-insensitive ID fallback across Supabase products
    const { data: allData } = await supabase
      .from('products')
      .select('*');

    if (allData && allData.length > 0) {
      const match = allData.find((row) => String(row.id).toLowerCase() === String(id).toLowerCase());
      if (match) {
        return transformToElectricalProduct(match);
      }
    }
  } catch (err) {
    console.warn('Supabase product by id fetch error:', err);
  }

  return null;
}

/**
 * Fetch similar products by subcategory from Supabase
 */
export async function fetchSimilarElectricalProducts(
  currentProductId: string,
  subcategory: string,
  limit: number = 6
): Promise<ElectricalProduct[]> {
  const { products } = await fetchElectricalProducts();

  const sameSub = products.filter(
    (p) => String(p.id) !== String(currentProductId) && (p.subcategory || '').toLowerCase() === (subcategory || '').toLowerCase()
  );

  if (sameSub.length >= limit) {
    return sameSub.slice(0, limit);
  }

  // If fewer than limit in same subcategory, supplement with other electrical products from database
  const others = products.filter(
    (p) => String(p.id) !== String(currentProductId) && (p.subcategory || '').toLowerCase() !== (subcategory || '').toLowerCase()
  );

  return [...sameSub, ...others].slice(0, limit);
}

/**
 * Fetch reviews for a product from Supabase `reviews` table
 */
export async function fetchProductReviews(productId: string): Promise<ProductReview[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map((r) => ({
        id: r.id,
        product_id: r.product_id,
        user_id: r.user_id,
        user_name: r.user_name || 'Verified Buyer',
        rating: Number(r.rating || 5),
        title: r.title || '',
        comment: r.comment || '',
        images: r.images || [],
        created_at: r.created_at || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Supabase reviews query notice:', err);
  }

  return [];
}

/**
 * Submit a customer review to Supabase `reviews` table
 */
export async function submitProductReview(reviewData: {
  product_id: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
}): Promise<{ success: boolean; review?: ProductReview; error?: string }> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user?.id) {
      return { success: false, error: 'Please log in with Google or Phone to post your review.' };
    }

    const userId = authData.user.id;
    const userMeta = authData.user.user_metadata || {};
    const userName = userMeta.full_name || userMeta.name || authData.user.email?.split('@')[0] || 'Verified Buyer';

    const payload = {
      product_id: reviewData.product_id,
      user_id: userId,
      user_name: userName,
      rating: Math.max(1, Math.min(5, Math.round(reviewData.rating))),
      title: reviewData.title.trim(),
      comment: reviewData.comment.trim(),
      images: reviewData.images || []
    };

    const { data, error } = await supabase
      .from('reviews')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Supabase review insert error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      review: {
        id: data.id,
        product_id: data.product_id,
        user_id: data.user_id,
        user_name: data.user_name || userName,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        images: data.images || [],
        created_at: data.created_at
      }
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Review submit error:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Fetch FAQs for a product dynamically from Supabase
 * Checks `faqs` table, `product_faqs` table, or product object
 */
export async function fetchProductFaqs(productId: string, productFallback?: ElectricalProduct): Promise<Array<{ q: string; a: string }>> {
  // If product already has parsed faqs from Supabase
  if (productFallback?.faqs && Array.isArray(productFallback.faqs) && productFallback.faqs.length > 0) {
    return productFallback.faqs.map((f) => ({
      q: f.q || f.question || '',
      a: f.a || f.answer || ''
    })).filter(f => f.q && f.a);
  }

  // Try querying from a dedicated Supabase `faqs` or `product_faqs` table if created by user
  try {
    const { data, error } = await supabase
      .from('product_faqs')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(item => ({
        q: item.question || item.q || '',
        a: item.answer || item.a || ''
      })).filter(f => f.q && f.a);
    }
  } catch {
    // If table does not exist, continue to fallback
  }

  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .or(`product_id.eq.${productId},product_id.is.null`)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(item => ({
        q: item.question || item.q || '',
        a: item.answer || item.a || ''
      })).filter(f => f.q && f.a);
    }
  } catch {
    // Continue to fallback
  }

  // Standard electrical FAQ fallback
  const brand = productFallback?.brand || 'Giriraj Genuine';
  const subcategory = productFallback?.subcategory || 'Product';
  return [
    {
      q: `Is this ${brand} ${subcategory} 100% original and certified?`,
      a: `Yes, all ${brand} products sold on Giriraj Power are 100% genuine, factory-sealed, and adhere strictly to standard ISI / BIS safety certifications. We source directly from authorized brand distributors.`
    },
    {
      q: 'How does delivery work for my address in Kolkata?',
      a: 'We dispatch directly from our Giriraj Power Kasba warehouse hub in Kolkata with safe packaging and rapid delivery.'
    },
    {
      q: 'Will I receive a GST tax invoice with my order?',
      a: 'Yes, every order includes a valid GST tax invoice with proper HSN codes and breakdown that you can use for business tax input credits (ITC) and warranty verification.'
    },
    {
      q: 'Can contractors and builders place bulk coil/carton orders?',
      a: 'Yes, you can order project-scale bulk quantities directly through the store with special wholesale benefits and site delivery across Kolkata and West Bengal.'
    }
  ];
}

/**
 * Adds a new product to the catalog via the backend server API
 * (Bypasses Supabase client read-only RLS via backend Service Role)
 */
export async function addProductToBackend(productData: any): Promise<{ success: boolean; message: string; product?: any }> {
  try {
    const res = await fetch(apiUrl('/api/products'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Error in addProductToBackend:', err);
    return {
      success: false,
      message: err?.message || 'Failed to connect to backend server. Please verify network connection.',
    };
  }
}

/**
 * Deletes a product from the catalog via the backend server API
 */
export async function deleteProductFromBackend(productId: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(apiUrl(`/api/products/${productId}`), {
      method: 'DELETE',
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to backend server.',
    };
  }
}


