/**
 * Realistic vector SVG generator for Indian Electrical Wire Coils & Conduit Pipes
 * Provides authentic, crisp product images for each color option so that selecting
 * Red, Black, Green, Yellow, Blue, White, etc. immediately updates the image preview.
 */

interface WireColorPalette {
  body: string;
  dark: string;
  light: string;
  ring: string;
}

const WIRE_PALETTES: Record<string, WireColorPalette> = {
  Red: { body: '#DC2626', dark: '#991B1B', light: '#EF4444', ring: '#F87171' },
  Black: { body: '#1E293B', dark: '#0F172A', light: '#334155', ring: '#475569' },
  Green: { body: '#16A34A', dark: '#15803D', light: '#22C55E', ring: '#4ADE80' },
  Yellow: { body: '#EAB308', dark: '#A16207', light: '#FDE047', ring: '#FACC15' },
  Blue: { body: '#2563EB', dark: '#1D4ED8', light: '#60A5FA', ring: '#93C5FD' },
  White: { body: '#F1F5F9', dark: '#CBD5E1', light: '#FFFFFF', ring: '#E2E8F0' },
};

const PIPE_PALETTES: Record<string, WireColorPalette> = {
  'Ivory / White': { body: '#F8FAFC', dark: '#CBD5E1', light: '#FFFFFF', ring: '#E2E8F0' },
  'White': { body: '#F8FAFC', dark: '#CBD5E1', light: '#FFFFFF', ring: '#E2E8F0' },
  'Black': { body: '#1E293B', dark: '#0F172A', light: '#334155', ring: '#475569' },
  'Grey': { body: '#64748B', dark: '#334155', light: '#94A3B8', ring: '#CBD5E1' },
  'Blue': { body: '#2563EB', dark: '#1D4ED8', light: '#60A5FA', ring: '#93C5FD' },
  'Red / Orange': { body: '#EA580C', dark: '#9A3412', light: '#FB923C', ring: '#FDBA74' },
  'Yellow': { body: '#EAB308', dark: '#A16207', light: '#FDE047', ring: '#FACC15' }
};

/**
 * Generates an SVG data URI for a realistic rolled electrical wire coil of the specified color.
 */
export function generateWireCoilSvg(colorName: string, hex?: string, brandName = 'RR Kabel'): string {
  const normKey = Object.keys(WIRE_PALETTES).find(
    (k) => k.toLowerCase() === colorName.toLowerCase() || colorName.toLowerCase().includes(k.toLowerCase())
  ) || 'Red';

  const c = WIRE_PALETTES[normKey] || {
    body: hex || '#DC2626',
    dark: '#0F172A',
    light: '#F8FAFC',
    ring: hex || '#DC2626'
  };

  const brand = (brandName || 'RR Kabel').toUpperCase();
  const textColor = normKey === 'White' || normKey === 'Yellow' ? '#0f172a' : '#ffffff';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </radialGradient>
    <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c.light}"/>
      <stop offset="40%" stop-color="${c.body}"/>
      <stop offset="100%" stop-color="${c.dark}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.16"/>
    </filter>
  </defs>

  <rect width="600" height="600" fill="url(#bg)"/>

  <!-- Outer Coil Rings (Detailed concentric loops) -->
  <g filter="url(#shadow)">
    <ellipse cx="300" cy="315" rx="224" ry="162" fill="none" stroke="${c.dark}" stroke-width="44" opacity="0.95"/>
    <ellipse cx="300" cy="308" rx="212" ry="152" fill="none" stroke="url(#wireGrad)" stroke-width="40"/>
    <ellipse cx="300" cy="302" rx="196" ry="140" fill="none" stroke="${c.body}" stroke-width="36"/>
    <ellipse cx="300" cy="296" rx="180" ry="128" fill="none" stroke="url(#wireGrad)" stroke-width="34"/>
    <ellipse cx="300" cy="291" rx="164" ry="115" fill="none" stroke="${c.dark}" stroke-width="30" opacity="0.9"/>
    <ellipse cx="300" cy="286" rx="148" ry="102" fill="none" stroke="${c.light}" stroke-width="26" opacity="0.85"/>
  </g>

  <!-- Industrial Packaging Tape / Binding Band -->
  <g transform="rotate(-25 300 295)">
    <rect x="258" y="110" width="84" height="370" rx="8" fill="#ffffff" opacity="0.94" stroke="#cbd5e1" stroke-width="1.5" filter="url(#shadow)"/>
    <rect x="263" y="115" width="74" height="360" rx="6" fill="#f8fafc"/>
    <rect x="270" y="130" width="60" height="15" rx="3" fill="#e11d48"/>
    <text x="300" y="141" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">ORIGINAL</text>
    <text x="300" y="185" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="1.2">${brand}</text>
    <text x="300" y="204" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#475569" text-anchor="middle">FR-LS COPPER</text>
    <rect x="277" y="224" width="46" height="46" rx="8" fill="${c.body}" stroke="#ffffff" stroke-width="2"/>
    <text x="300" y="252" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" fill="${textColor}" text-anchor="middle">${colorName.toUpperCase()}</text>
    <text x="300" y="308" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" fill="#64748b" text-anchor="middle">IS 694 : 2010</text>
    <text x="300" y="324" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#94a3b8" text-anchor="middle">100% ELECTROLYTIC</text>
    <text x="300" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#94a3b8" text-anchor="middle">90 MTR / 200 MTR</text>
  </g>

  <!-- Free Wire Conductor Tail Poking Out with Stripped Copper Tip -->
  <g>
    <path d="M 470 280 Q 520 250 535 210 Q 545 180 525 150" fill="none" stroke="url(#wireGrad)" stroke-width="22" stroke-linecap="round" filter="url(#shadow)"/>
    <path d="M 525 150 Q 520 140 512 130" fill="none" stroke="#b45309" stroke-width="13" stroke-linecap="round"/>
    <path d="M 525 150 Q 520 140 512 130" fill="none" stroke="#f59e0b" stroke-width="9" stroke-linecap="round"/>
    <circle cx="510" cy="128" r="5" fill="#fbbf24"/>
  </g>

  <!-- Color Variant Stamp Badge at Top Left -->
  <g transform="translate(28, 32)">
    <rect width="165" height="42" rx="21" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" filter="url(#shadow)"/>
    <circle cx="24" cy="21" r="13" fill="${c.body}" stroke="#ffffff" stroke-width="2.5"/>
    <text x="48" y="26" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#0f172a">${colorName} Coil</text>
  </g>
</svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/**
 * Generates an SVG data URI for electrical conduit pipes of the specified color.
 */
export function generatePipeSvg(colorName: string, hex?: string, brandName = 'Precision'): string {
  const normKey = Object.keys(PIPE_PALETTES).find(
    (k) => k.toLowerCase() === colorName.toLowerCase() || colorName.toLowerCase().includes(k.toLowerCase())
  ) || 'Ivory / White';

  const c = PIPE_PALETTES[normKey] || {
    body: hex || '#64748B',
    dark: '#334155',
    light: '#94A3B8',
    ring: hex || '#64748B'
  };

  const brand = (brandName || 'Precision').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </radialGradient>
    <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c.light}"/>
      <stop offset="50%" stop-color="${c.body}"/>
      <stop offset="100%" stop-color="${c.dark}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.16"/>
    </filter>
  </defs>

  <rect width="600" height="600" fill="url(#bg)"/>

  <!-- Bundle of 3 Conduit Pipes Laid Diagonally -->
  <g filter="url(#shadow)" transform="rotate(-30 300 300)">
    <!-- Pipe 1 (Top) -->
    <rect x="50" y="190" width="500" height="64" rx="10" fill="url(#pipeGrad)" stroke="${c.dark}" stroke-width="2"/>
    <ellipse cx="550" cy="222" rx="12" ry="32" fill="${c.dark}"/>
    <!-- Pipe 2 (Middle) -->
    <rect x="30" y="268" width="540" height="64" rx="10" fill="url(#pipeGrad)" stroke="${c.dark}" stroke-width="2"/>
    <ellipse cx="570" cy="300" rx="12" ry="32" fill="${c.dark}"/>
    <!-- Pipe 3 (Bottom) -->
    <rect x="60" y="346" width="480" height="64" rx="10" fill="url(#pipeGrad)" stroke="${c.dark}" stroke-width="2"/>
    <ellipse cx="540" cy="378" rx="12" ry="32" fill="${c.dark}"/>

    <!-- Embossed Brand & Standards Stamp on Middle Pipe -->
    <text x="300" y="306" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#ffffff" opacity="0.85" text-anchor="middle" letter-spacing="2">${brand} CONDUIT • IS 9537 PART 3 • ${colorName.toUpperCase()}</text>
  </g>

  <!-- Color Variant Stamp Badge at Top Left -->
  <g transform="translate(28, 32)">
    <rect width="180" height="42" rx="21" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" filter="url(#shadow)"/>
    <circle cx="24" cy="21" r="13" fill="${c.body}" stroke="#ffffff" stroke-width="2.5"/>
    <text x="48" y="26" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#0f172a">${colorName} Pipe</text>
  </g>
</svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
