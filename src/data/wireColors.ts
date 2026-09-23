export interface ProductColorOption {
  name: string;
  label: string;
  shortRole: string;
  hex: string;
  twBg: string;
  twRing: string;
  description: string;
  standard?: string;
  price?: number;
  mrp?: number;
  discount_percent?: number;
  image_url?: string;
  imageUrl?: string;
  images?: string[];
  image_urls?: string[];
}

export type WireColorOption = ProductColorOption;

// Indian Standard Wire Colors (IS 694 / IS 732)
export const INDIAN_STANDARD_WIRE_COLORS: ProductColorOption[] = [
  {
    name: 'Red',
    label: 'Red (Live / Phase R)',
    shortRole: 'Phase (R)',
    hex: '#DC2626',
    twBg: 'bg-red-600',
    twRing: 'ring-red-600',
    description: 'IS 694 Standard: Live / Phase conductor in single-phase & 3-phase circuits.',
    standard: 'IS 694'
  },
  {
    name: 'Black',
    label: 'Black (Neutral N)',
    shortRole: 'Neutral (N)',
    hex: '#0F172A',
    twBg: 'bg-slate-950',
    twRing: 'ring-slate-950',
    description: 'IS 694 Standard: Neutral return conductor for AC electrical circuits.',
    standard: 'IS 694'
  },
  {
    name: 'Green',
    label: 'Green (Earth / Ground E)',
    shortRole: 'Earth (E)',
    hex: '#16A34A',
    twBg: 'bg-green-600',
    twRing: 'ring-green-600',
    description: 'IS 694 Standard: Safety protective earth grounding conductor.',
    standard: 'IS 694'
  },
  {
    name: 'Yellow',
    label: 'Yellow (Phase Y)',
    shortRole: 'Phase (Y)',
    hex: '#EAB308',
    twBg: 'bg-yellow-500',
    twRing: 'ring-yellow-500',
    description: 'IS 694 Standard: Y-Phase in 3-phase wiring & secondary switch live loops.',
    standard: 'IS 694'
  },
  {
    name: 'Blue',
    label: 'Blue (Phase B)',
    shortRole: 'Phase (B)',
    hex: '#2563EB',
    twBg: 'bg-blue-600',
    twRing: 'ring-blue-600',
    description: 'IS 694 Standard: B-Phase in 3-phase wiring & dedicated lighting loops.',
    standard: 'IS 694'
  },
  {
    name: 'White',
    label: 'White / Grey (Inverter / UPS)',
    shortRole: 'Inverter / UPS',
    hex: '#F1F5F9',
    twBg: 'bg-slate-200',
    twRing: 'ring-slate-400',
    description: 'Indian Residential Standard: Dedicated Inverter / UPS emergency backup phase.',
    standard: 'IS 732'
  }
];

// Indian Standard & Commercial Pipe / Conduit Colors
export const PIPE_COLOR_OPTIONS: ProductColorOption[] = [
  {
    name: 'Ivory / White',
    label: 'Ivory / White (Standard Clean Conduit)',
    shortRole: 'Standard (White)',
    hex: '#F8FAFC',
    twBg: 'bg-slate-100',
    twRing: 'ring-slate-400',
    description: 'Standard residential & commercial concealed or exposed conduit wiring (IS 9537 Part 3).',
    standard: 'IS 9537'
  },
  {
    name: 'Black',
    label: 'Black (UV Resistant / Heavy Duty)',
    shortRole: 'UV Proof (Black)',
    hex: '#0F172A',
    twBg: 'bg-slate-950',
    twRing: 'ring-slate-950',
    description: 'Outdoor weather-proof, industrial slab casting & high UV sunlight-resistant conduit.',
    standard: 'IS 9537'
  },
  {
    name: 'Grey',
    label: 'Grey (Medium / Heavy Slab Casting)',
    shortRole: 'Casting (Grey)',
    hex: '#64748B',
    twBg: 'bg-slate-500',
    twRing: 'ring-slate-600',
    description: 'High impact resistance for RCC concrete ceiling slab embedding and wall chasing.',
    standard: 'IS 9537'
  },
  {
    name: 'Blue',
    label: 'Blue (Data / Low Voltage)',
    shortRole: 'Data/Telecom (Blue)',
    hex: '#2563EB',
    twBg: 'bg-blue-600',
    twRing: 'ring-blue-600',
    description: 'Dedicated identification conduit for CAT6 internet, telephone, and CCTV cabling.',
    standard: 'Commercial'
  },
  {
    name: 'Red / Orange',
    label: 'Red / Orange (Fire Safety & Alarm)',
    shortRole: 'Fire Alarm (Red)',
    hex: '#EA580C',
    twBg: 'bg-orange-600',
    twRing: 'ring-orange-600',
    description: 'Mandatory color-coded conduit pathway for fire alarm systems and emergency backup power.',
    standard: 'Fire Code'
  },
  {
    name: 'Yellow',
    label: 'Yellow (Solar DC / Alert Pathways)',
    shortRole: 'Solar / Alert (Yellow)',
    hex: '#EAB308',
    twBg: 'bg-yellow-500',
    twRing: 'ring-yellow-500',
    description: 'Solar rooftop DC cable protection and caution safety conduit routes.',
    standard: 'MNRE Std'
  }
];

export function isWireProduct(product?: {
  name?: string;
  subCategory?: string;
  subcategory?: string;
  category?: string;
  tags?: string[];
}): boolean {
  if (!product) return false;
  const name = (product.name || '').toLowerCase();
  const sub = (product.subCategory || product.subcategory || '').toLowerCase();
  const tags = (product.tags || []).map((t) => t.toLowerCase());

  return (
    sub === 'wire' ||
    sub === 'wiring' ||
    sub === 'cables' ||
    sub.includes('wire') ||
    sub.includes('cable') ||
    name.includes('wire') ||
    name.includes('frls') ||
    name.includes('fr ls') ||
    name.includes('sqmm') ||
    name.includes('cable') ||
    tags.includes('wire') ||
    tags.includes('cable')
  );
}

export function isPipeProduct(product?: {
  name?: string;
  subCategory?: string;
  subcategory?: string;
  category?: string;
  tags?: string[];
  specs?: Record<string, any>;
  specifications?: Record<string, any>;
}): boolean {
  if (!product) return false;
  const name = (product.name || '').toLowerCase();
  const sub = (product.subCategory || product.subcategory || '').toLowerCase();
  const tags = (product.tags || []).map((t) => t.toLowerCase());

  return (
    sub.includes('pipe') ||
    sub.includes('conduit') ||
    sub.includes('plumbing') ||
    name.includes('pipe') ||
    name.includes('conduit') ||
    name.includes('casing') ||
    name.includes('dalda') ||
    name.includes('dada') ||
    name.includes('cpvc') ||
    name.includes('upvc') ||
    name.includes('pvc pipe') ||
    tags.includes('pipe') ||
    tags.includes('conduit') ||
    tags.includes('dalda') ||
    tags.includes('dalda pipe') ||
    tags.includes('dada')
  );
}

// Dictionary of known finishes, wire standards, switch architectural metals, and pipe colors
const COLOR_FINISH_DICTIONARY: Record<
  string,
  { hex: string; twBg: string; twRing: string; shortRole?: string; description?: string; standard?: string }
> = {
  // Gold & Metallic Finishes (e.g. Schneider Avatar switches, regulators)
  'hairline gold': {
    hex: '#D4AF37',
    twBg: 'bg-amber-400',
    twRing: 'ring-amber-500',
    shortRole: 'Hairline Gold',
    description: 'Brushed metallic hairline gold luxury architectural finish'
  },
  'metal gold hairline': {
    hex: '#C5A059',
    twBg: 'bg-yellow-600',
    twRing: 'ring-yellow-600',
    shortRole: 'Metal Gold',
    description: 'Premium metallic hairline gold finish with subtle brush texture'
  },
  'gold': {
    hex: '#EAB308',
    twBg: 'bg-yellow-500',
    twRing: 'ring-yellow-500',
    shortRole: 'Gold',
    description: 'Lustrous classic gold finish'
  },
  'rose gold': {
    hex: '#B76E79',
    twBg: 'bg-rose-300',
    twRing: 'ring-rose-400',
    shortRole: 'Rose Gold',
    description: 'Contemporary metallic rose gold finish'
  },
  'champagne': {
    hex: '#F7E7CE',
    twBg: 'bg-amber-100',
    twRing: 'ring-amber-300',
    shortRole: 'Champagne',
    description: 'Subtle champagne metallic luster'
  },
  'champagne gold': {
    hex: '#F7E7CE',
    twBg: 'bg-amber-100',
    twRing: 'ring-amber-300',
    shortRole: 'Champagne Gold',
    description: 'Subtle champagne gold metallic finish'
  },

  // Monochrome & Architectural Finishes (e.g. Legrand, Schneider, Anchor)
  'white': {
    hex: '#FFFFFF',
    twBg: 'bg-white',
    twRing: 'ring-slate-300',
    shortRole: 'White',
    description: 'Clean glossy pristine white finish'
  },
  'pure white': {
    hex: '#FFFFFF',
    twBg: 'bg-white',
    twRing: 'ring-slate-300',
    shortRole: 'Pure White',
    description: 'High-gloss pure white finish'
  },
  'ivory': {
    hex: '#FFFFF0',
    twBg: 'bg-amber-50',
    twRing: 'ring-amber-200',
    shortRole: 'Ivory',
    description: 'Warm architectural ivory finish'
  },
  'ivory / white': {
    hex: '#FFFFF0',
    twBg: 'bg-amber-50',
    twRing: 'ring-amber-200',
    shortRole: 'Ivory / White',
    description: 'Standard ivory / off-white finish'
  },
  'off-white': {
    hex: '#F8FAFC',
    twBg: 'bg-slate-50',
    twRing: 'ring-slate-200',
    shortRole: 'Off-White',
    description: 'Subtle off-white architectural finish'
  },
  'cream': {
    hex: '#FEF3C7',
    twBg: 'bg-amber-100',
    twRing: 'ring-amber-200',
    shortRole: 'Cream',
    description: 'Warm cream architectural finish'
  },
  'black': {
    hex: '#0F172A',
    twBg: 'bg-slate-900',
    twRing: 'ring-slate-950',
    shortRole: 'Black',
    description: 'Sleek modern black finish'
  },
  'matte black': {
    hex: '#1E293B',
    twBg: 'bg-slate-800',
    twRing: 'ring-slate-900',
    shortRole: 'Matte Black',
    description: 'Anti-glare architectural matte black finish'
  },
  'jet black': {
    hex: '#020617',
    twBg: 'bg-slate-950',
    twRing: 'ring-black',
    shortRole: 'Jet Black',
    description: 'Deep obsidian jet black finish'
  },
  'charcoal': {
    hex: '#334155',
    twBg: 'bg-slate-700',
    twRing: 'ring-slate-800',
    shortRole: 'Charcoal',
    description: 'Modern charcoal dark grey finish'
  },
  'anthracite': {
    hex: '#1E293B',
    twBg: 'bg-slate-800',
    twRing: 'ring-slate-900',
    shortRole: 'Anthracite',
    description: 'Contemporary anthracite dark metallic finish'
  },
  'grey': {
    hex: '#64748B',
    twBg: 'bg-slate-500',
    twRing: 'ring-slate-600',
    shortRole: 'Grey',
    description: 'Neutral high-impact industrial / architectural grey'
  },
  'gray': {
    hex: '#64748B',
    twBg: 'bg-slate-500',
    twRing: 'ring-slate-600',
    shortRole: 'Gray',
    description: 'Neutral high-impact industrial / architectural gray'
  },
  'dark grey': {
    hex: '#475569',
    twBg: 'bg-slate-600',
    twRing: 'ring-slate-700',
    shortRole: 'Dark Grey',
    description: 'Refined deep slate grey finish'
  },
  'light grey': {
    hex: '#CBD5E1',
    twBg: 'bg-slate-300',
    twRing: 'ring-slate-400',
    shortRole: 'Light Grey',
    description: 'Airy light silver grey finish'
  },
  'silver': {
    hex: '#CBD5E1',
    twBg: 'bg-slate-300',
    twRing: 'ring-slate-400',
    shortRole: 'Silver',
    description: 'Brushed metallic silver finish'
  },
  'metal silver': {
    hex: '#CBD5E1',
    twBg: 'bg-slate-300',
    twRing: 'ring-slate-400',
    shortRole: 'Metal Silver',
    description: 'Polished metal silver finish'
  },
  'chrome': {
    hex: '#E2E8F0',
    twBg: 'bg-slate-200',
    twRing: 'ring-slate-400',
    shortRole: 'Chrome',
    description: 'Mirror chrome metallic finish'
  },
  'graphite': {
    hex: '#374151',
    twBg: 'bg-gray-700',
    twRing: 'ring-gray-800',
    shortRole: 'Graphite',
    description: 'Dark graphite metallic finish'
  },

  // Warm & Earthy Metals
  'bronze': {
    hex: '#B45309',
    twBg: 'bg-amber-700',
    twRing: 'ring-amber-800',
    shortRole: 'Bronze',
    description: 'Vintage brushed bronze finish'
  },
  'antique bronze': {
    hex: '#92400E',
    twBg: 'bg-amber-800',
    twRing: 'ring-amber-900',
    shortRole: 'Antique Bronze',
    description: 'Classic aged antique bronze finish'
  },
  'copper': {
    hex: '#B87333',
    twBg: 'bg-orange-700',
    twRing: 'ring-orange-800',
    shortRole: 'Copper',
    description: 'Luminous metallic copper finish'
  },
  'brass': {
    hex: '#CA8A04',
    twBg: 'bg-yellow-600',
    twRing: 'ring-yellow-700',
    shortRole: 'Brass',
    description: 'Traditional brushed brass finish'
  },
  'antique brass': {
    hex: '#854D0E',
    twBg: 'bg-yellow-800',
    twRing: 'ring-yellow-900',
    shortRole: 'Antique Brass',
    description: 'Heritage antique brass finish'
  },
  'wood': {
    hex: '#78350F',
    twBg: 'bg-amber-900',
    twRing: 'ring-amber-950',
    shortRole: 'Wood',
    description: 'Natural architectural wood texture finish'
  },
  'brown': {
    hex: '#78350F',
    twBg: 'bg-amber-900',
    twRing: 'ring-amber-950',
    shortRole: 'Brown',
    description: 'Warm brown architectural finish'
  },
  'teak': {
    hex: '#854D0E',
    twBg: 'bg-amber-800',
    twRing: 'ring-amber-900',
    shortRole: 'Teak Wood',
    description: 'Natural teak grain texture finish'
  },
  'walnut': {
    hex: '#582F0E',
    twBg: 'bg-amber-950',
    twRing: 'ring-amber-950',
    shortRole: 'Walnut',
    description: 'Deep walnut wood grain finish'
  },

  // Standard Indian Standard Wire & Conduit Colors
  'red': {
    hex: '#DC2626',
    twBg: 'bg-red-600',
    twRing: 'ring-red-600',
    shortRole: 'Live / Phase (R)',
    description: 'IS 694 Standard: Live / Phase conductor in single-phase & 3-phase circuits.',
    standard: 'IS 694'
  },
  'blue': {
    hex: '#2563EB',
    twBg: 'bg-blue-600',
    twRing: 'ring-blue-600',
    shortRole: 'Phase (B) / Data',
    description: 'IS 694 Standard: 3-phase circuits Phase B or dedicated low-voltage data pathway.',
    standard: 'IS 694'
  },
  'green': {
    hex: '#16A34A',
    twBg: 'bg-green-600',
    twRing: 'ring-green-600',
    shortRole: 'Earth / Ground (E)',
    description: 'IS 694 Standard: Dedicated earth / ground fault protection conductor.',
    standard: 'IS 694'
  },
  'yellow': {
    hex: '#EAB308',
    twBg: 'bg-yellow-500',
    twRing: 'ring-yellow-500',
    shortRole: 'Phase (Y) / Solar',
    description: 'IS 694 Standard: Phase Y conductor or solar rooftop DC protection pathway.',
    standard: 'IS 694'
  },
  'orange': {
    hex: '#EA580C',
    twBg: 'bg-orange-600',
    twRing: 'ring-orange-600',
    shortRole: 'Fire Alarm / Safety',
    description: 'Mandatory color-coded pathway for fire alarm systems and emergency power.',
    standard: 'Fire Code'
  }
};

/**
 * Resolves any raw color string or object into a complete ProductColorOption
 */
export function resolveColorOption(rawName: string | any): ProductColorOption {
  if (typeof rawName === 'object' && rawName !== null) {
    const name = rawName.name || rawName.label || rawName.color || 'Custom';
    const price = typeof rawName.price === 'number' && !isNaN(rawName.price) ? rawName.price : undefined;
    const mrp = typeof rawName.mrp === 'number' && !isNaN(rawName.mrp) ? rawName.mrp : undefined;
    const discount_percent = typeof rawName.discount_percent === 'number'
      ? rawName.discount_percent
      : (price && mrp && mrp > price)
      ? Math.round(((mrp - price) / mrp) * 100)
      : undefined;

    const imageUrl = rawName.image_url || rawName.imageUrl || rawName.image || (Array.isArray(rawName.images) ? rawName.images[0] : undefined);
    const imageUrls = Array.isArray(rawName.image_urls) ? rawName.image_urls : (Array.isArray(rawName.images) ? rawName.images : (imageUrl ? [imageUrl] : undefined));

    return {
      name,
      label: rawName.label || name,
      shortRole: rawName.shortRole || name,
      hex: rawName.hex || (rawName.twBg ? '#64748B' : resolveColorOption(name).hex),
      twBg: rawName.twBg || 'bg-slate-200',
      twRing: rawName.twRing || 'ring-slate-400',
      description: rawName.description || `${name} finish`,
      standard: rawName.standard,
      price,
      mrp,
      discount_percent,
      image_url: imageUrl,
      imageUrl,
      images: imageUrls,
      image_urls: imageUrls
    };
  }

  const name = String(rawName || '').trim();
  if (!name) {
    return {
      name: 'Default',
      label: 'Default',
      shortRole: 'Default',
      hex: '#64748B',
      twBg: 'bg-slate-400',
      twRing: 'ring-slate-500',
      description: 'Standard manufacturer finish'
    };
  }

  const key = name.toLowerCase().trim();

  // 1. Direct dictionary match
  if (COLOR_FINISH_DICTIONARY[key]) {
    const entry = COLOR_FINISH_DICTIONARY[key];
    return {
      name,
      label: name,
      shortRole: entry.shortRole || name,
      hex: entry.hex,
      twBg: entry.twBg,
      twRing: entry.twRing,
      description: entry.description || `${name} finish`
    };
  }

  // 2. Partial dictionary match (e.g. "Hairline Gold Finish" matches "hairline gold")
  const foundKey = Object.keys(COLOR_FINISH_DICTIONARY).find(
    (k) => key.includes(k) || k.includes(key)
  );
  if (foundKey) {
    const entry = COLOR_FINISH_DICTIONARY[foundKey];
    return {
      name,
      label: name,
      shortRole: entry.shortRole || name,
      hex: entry.hex,
      twBg: entry.twBg,
      twRing: entry.twRing,
      description: entry.description || `${name} finish`
    };
  }

  // 3. Match from standard wire or pipe sets
  const matched = [...INDIAN_STANDARD_WIRE_COLORS, ...PIPE_COLOR_OPTIONS].find(
    (c) =>
      c.name.toLowerCase() === key ||
      c.name.toLowerCase().includes(key) ||
      key.includes(c.name.toLowerCase())
  );
  if (matched) {
    return { ...matched, name };
  }

  // 4. Heuristic inference
  let hex = '#94A3B8';
  let twBg = 'bg-slate-300';
  let twRing = 'ring-slate-400';

  if (key.includes('gold')) {
    hex = '#D4AF37';
    twBg = 'bg-amber-400';
    twRing = 'ring-amber-500';
  } else if (key.includes('silver') || key.includes('chrome') || key.includes('steel')) {
    hex = '#CBD5E1';
    twBg = 'bg-slate-300';
    twRing = 'ring-slate-400';
  } else if (key.includes('black') || key.includes('dark')) {
    hex = '#0F172A';
    twBg = 'bg-slate-900';
    twRing = 'ring-slate-950';
  } else if (key.includes('white') || key.includes('ivory') || key.includes('pearl')) {
    hex = '#FFFFFF';
    twBg = 'bg-white';
    twRing = 'ring-slate-300';
  } else if (key.includes('grey') || key.includes('gray') || key.includes('slate') || key.includes('ash')) {
    hex = '#64748B';
    twBg = 'bg-slate-500';
    twRing = 'ring-slate-600';
  } else if (key.includes('wood') || key.includes('brown') || key.includes('teak') || key.includes('walnut')) {
    hex = '#78350F';
    twBg = 'bg-amber-900';
    twRing = 'ring-amber-950';
  } else if (key.includes('red') || key.includes('rose') || key.includes('maroon') || key.includes('crimson')) {
    hex = '#DC2626';
    twBg = 'bg-red-600';
    twRing = 'ring-red-600';
  } else if (key.includes('blue') || key.includes('navy') || key.includes('cyan')) {
    hex = '#2563EB';
    twBg = 'bg-blue-600';
    twRing = 'ring-blue-600';
  } else if (key.includes('green') || key.includes('mint') || key.includes('emerald')) {
    hex = '#16A34A';
    twBg = 'bg-green-600';
    twRing = 'ring-green-600';
  } else if (key.includes('yellow') || key.includes('amber')) {
    hex = '#EAB308';
    twBg = 'bg-yellow-500';
    twRing = 'ring-yellow-500';
  }

  return {
    name,
    label: name,
    shortRole: name,
    hex,
    twBg,
    twRing,
    description: `${name} finish`
  };
}

/**
 * Returns the relevant color options for any given product
 * Supports:
 * - Direct database `colors` / `colours` / `color_options` array set in backend app
 * - Explicit `specs['Available Colors']`
 * - Standard IS 694 Wire colors (for wire products)
 * - Standard IS 9537 Conduit colors (for pipe products)
 */
export function getProductColorOptions(product?: {
  name?: string;
  subCategory?: string;
  subcategory?: string;
  category?: string;
  tags?: string[];
  specs?: Record<string, any>;
  specifications?: Record<string, any>;
  colors?: string[] | any[];
  colours?: string[] | any[];
  color_options?: any[];
  colorOptions?: any[];
  available_colors?: any[];
  availableColors?: any[];
  color?: string;
}): ProductColorOption[] {
  if (!product) return [];

  // 1. Direct product.color_variants / colors / colours / color_options array or string set by backend app
  let rawColors: any[] = [];
  const prodAny = product as any;

  if (Array.isArray(prodAny.color_variants) && prodAny.color_variants.length > 0) {
    rawColors = prodAny.color_variants;
  } else if (Array.isArray(prodAny.colorVariants) && prodAny.colorVariants.length > 0) {
    rawColors = prodAny.colorVariants;
  } else if (Array.isArray(prodAny.color_options) && prodAny.color_options.length > 0) {
    rawColors = prodAny.color_options;
  } else if (Array.isArray(prodAny.colorOptions) && prodAny.colorOptions.length > 0) {
    rawColors = prodAny.colorOptions;
  } else if (Array.isArray(prodAny.colors) && prodAny.colors.length > 0) {
    rawColors = prodAny.colors;
  } else if (Array.isArray(prodAny.colours) && prodAny.colours.length > 0) {
    rawColors = prodAny.colours;
  } else if (Array.isArray(prodAny.available_colors) && prodAny.available_colors.length > 0) {
    rawColors = prodAny.available_colors;
  } else if (Array.isArray(prodAny.availableColors) && prodAny.availableColors.length > 0) {
    rawColors = prodAny.availableColors;
  } else if (typeof prodAny.color_variants === 'string' && prodAny.color_variants.trim()) {
    try {
      const parsed = JSON.parse(prodAny.color_variants);
      if (Array.isArray(parsed)) rawColors = parsed;
      else rawColors = prodAny.color_variants.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean);
    } catch {
      rawColors = prodAny.color_variants.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean);
    }
  } else if (typeof prodAny.colors === 'string' && prodAny.colors.trim()) {
    try {
      const parsed = JSON.parse(prodAny.colors);
      if (Array.isArray(parsed)) rawColors = parsed;
      else rawColors = prodAny.colors.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean);
    } catch {
      rawColors = prodAny.colors.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean);
    }
  } else if (typeof prodAny.colours === 'string' && prodAny.colours.trim()) {
    try {
      const parsed = JSON.parse(prodAny.colours);
      if (Array.isArray(parsed)) rawColors = parsed;
      else rawColors = prodAny.colours.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean);
    } catch {
      rawColors = prodAny.colours.split(/[,/|]+/).map((s: string) => s.trim()).filter(Boolean);
    }
  } else if (typeof prodAny.color === 'string' && prodAny.color.trim()) {
    rawColors = [prodAny.color.trim()];
  }

  // If explicit colors are set on the product (from the database / backend app), map and return them!
  if (rawColors.length > 0) {
    return rawColors.map(resolveColorOption);
  }

  // 2. Check if explicit colors are declared in specs
  const specs = product.specs || product.specifications || {};
  const explicitColorStr =
    specs['Available Colors'] ||
    specs['Available Colours'] ||
    specs['Colors'] ||
    specs['Colours'] ||
    specs['Color'] ||
    specs['Colour'] ||
    specs['Finish'] ||
    specs['Colour Option'] ||
    specs['Color Option'];

  if (typeof explicitColorStr === 'string' && explicitColorStr.trim()) {
    const rawNames = explicitColorStr.split(/[,/|]+/).map((s) => s.trim()).filter(Boolean);
    if (rawNames.length > 0) {
      return rawNames.map(resolveColorOption);
    }
  } else if (Array.isArray(explicitColorStr) && explicitColorStr.length > 0) {
    return explicitColorStr.map(resolveColorOption);
  }

  // 3. Fallbacks based on category/type
  if (isWireProduct(product)) {
    return INDIAN_STANDARD_WIRE_COLORS;
  }

  if (isPipeProduct(product)) {
    return PIPE_COLOR_OPTIONS;
  }

  return [];
}

export function getDefaultProductColor(product?: {
  name?: string;
  subCategory?: string;
  subcategory?: string;
  category?: string;
  tags?: string[];
  specs?: Record<string, any>;
  specifications?: Record<string, any>;
  colors?: string[] | any[];
  colours?: string[] | any[];
  color_options?: any[];
  selectedColor?: string;
  selected_color?: string;
}): string {
  if (product?.selectedColor) return product.selectedColor;
  if (product?.selected_color) return product.selected_color;
  const opts = getProductColorOptions(product);
  if (opts.length > 0) return opts[0].name;
  if (isWireProduct(product)) return 'Red';
  if (isPipeProduct(product)) return 'Ivory / White';
  return '';
}
