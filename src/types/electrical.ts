export interface ElectricalProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string; // 'Fans', 'Wiring', 'Switches', 'MCBs', 'Lights', 'PVC Items', 'Pipes', etc.
  price: number;
  mrp: number;
  discount_percent: number;
  description: string;
  specifications: Record<string, any>;
  stock_quantity: number;
  image_urls: string[];
  rating_avg: number;
  rating_count: number;
  faqs?: Array<{ question?: string; answer?: string; q?: string; a?: string }>;
  colors?: string[];
  colours?: string[];
  color_options?: any[];
  color_variants?: any[];
  selectedColor?: string;
  selected_color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  user_name?: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  images?: string[];
  created_at: string;
  updated_at?: string;
}

export interface FilterState {
  subcategories: string[];
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  minDiscount?: number;
  inStockOnly?: boolean;
}

export type SortOption =
  | 'popularity'
  | 'price_asc'
  | 'price_desc'
  | 'newest'
  | 'rating';
