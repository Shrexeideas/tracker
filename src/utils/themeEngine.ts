import {
  BuiltInThemeId,
  ThemeBorderStyle,
  ThemeCardSpacing,
  ThemeColors,
  ThemeCornerStyle,
  ThemeDecorationLevel,
  ThemeDefinition,
  ThemeEffects,
  ThemeFontId,
  ThemeFontSize,
  ThemeFontWeight,
  ThemeLayout,
  ThemeMotionLevel,
  ThemeOverrides,
  ThemeSettings,
  ThemeSidebarStyle,
  ThemeStyleCategory,
  ThemeTypography,
} from '../types/clearspace';
import { clampString, generateId, sanitizeId } from './logic';

export const THEME_STYLE_CATEGORIES: { id: ThemeStyleCategory; label: string; description: string }[] = [
  { id: 'minimal-clean', label: 'Minimal & Clean', description: 'Crisp space, quiet borders, zero visual noise' },
  { id: 'professional-corporate', label: 'Professional & Corporate', description: 'Structured clarity, slate precision, executive polish' },
  { id: 'playful-creative', label: 'Playful & Creative', description: 'Expressive accents, lively rhythm, studio energy' },
  { id: 'pastel-cute', label: 'Pastel & Cute', description: 'Soft tinted washes, gentle corners, calm warmth' },
  { id: 'dark-futuristic', label: 'Dark & Futuristic', description: 'Deep dark canvases, high-contrast telemetry highlights' },
  { id: 'earthy-natural', label: 'Earthy & Natural', description: 'Botanical greens, clay warmth, organic balance' },
  { id: 'editorial-classic', label: 'Editorial & Classic', description: 'Broadsheet serif craft, ivory rag, timeless proportion' },
  { id: 'monochrome', label: 'Monochrome', description: 'Pure neutral grayscale with distraction-free contrast' },
  { id: 'warm-cosy', label: 'Warm & Cosy', description: 'Sunlit amber, espresso cocoa, inviting comfort' },
  { id: 'vibrant-colourful', label: 'Vibrant & Colourful', description: 'Energetic hues balanced against legible surfaces' },
];

export const FONT_CATALOG: Record<ThemeFontId, { label: string; stack: string; kind: 'sans' | 'serif' | 'mono' }> = {
  'plus-jakarta': {
    label: 'Plus Jakarta Sans',
    stack: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    kind: 'sans',
  },
  'dm-sans': {
    label: 'DM Sans',
    stack: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    kind: 'sans',
  },
  manrope: {
    label: 'Manrope',
    stack: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
    kind: 'sans',
  },
  outfit: {
    label: 'Outfit',
    stack: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    kind: 'sans',
  },
  fraunces: {
    label: 'Fraunces (Editorial Serif)',
    stack: "'Fraunces', Georgia, serif",
    kind: 'serif',
  },
  playfair: {
    label: 'Playfair Display (Classic Serif)',
    stack: "'Playfair Display', Georgia, serif",
    kind: 'serif',
  },
  lora: {
    label: 'Lora (Book Serif)',
    stack: "'Lora', Georgia, serif",
    kind: 'serif',
  },
  'jetbrains-mono': {
    label: 'JetBrains Mono',
    stack: "'JetBrains Mono', ui-monospace, monospace",
    kind: 'mono',
  },
  'space-mono': {
    label: 'Space Mono',
    stack: "'Space Mono', ui-monospace, monospace",
    kind: 'mono',
  },
  'system-ui': {
    label: 'System UI (Native)',
    stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    kind: 'sans',
  },
};

export const FONT_PAIRING_PRESETS: {
  id: ThemeTypography['fontPreset'];
  label: string;
  headingFont: ThemeFontId;
  bodyFont: ThemeFontId;
}[] = [
  { id: 'editorial-serif', label: 'Editorial Serif + Clean Sans', headingFont: 'fraunces', bodyFont: 'plus-jakarta' },
  { id: 'modern-sans', label: 'Modern Corporate Sans', headingFont: 'manrope', bodyFont: 'dm-sans' },
  { id: 'geometric-sans', label: 'Geometric Studio Sans', headingFont: 'outfit', bodyFont: 'plus-jakarta' },
  { id: 'warm-humanist', label: 'Classic Broadsheet Serif', headingFont: 'playfair', bodyFont: 'lora' },
  { id: 'tech-mono', label: 'Futuristic Display + Mono', headingFont: 'outfit', bodyFont: 'manrope' },
  { id: 'system-clean', label: 'Pure System Native', headingFont: 'system-ui', bodyFont: 'system-ui' },
];

// ============================================================
// COLOR & ACCESSIBILITY CONTRAST UTILITIES
// ============================================================

export function normalizeHex(hex: string, fallback = '#334155'): string {
  const cleaned = (hex || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = cleaned[1];
    const g = cleaned[2];
    const b = cleaned[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const norm = normalizeHex(hex);
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16),
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

export function mixHexColors(hexA: string, hexB: string, weightB: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.max(0, Math.min(1, weightB));
  const r = Math.round(a.r * (1 - w) + b.r * w);
  const g = Math.round(a.g * (1 - w) + b.g * w);
  const bl = Math.round(a.b * (1 - w) + b.b * w);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const l1 = getRelativeLuminance(hexA);
  const l2 = getRelativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function pickReadableInk(bgHex: string): string {
  const darkInk = '#111827';
  const lightInk = '#FFFFFF';
  return getContrastRatio(bgHex, lightInk) >= getContrastRatio(bgHex, darkInk) ? lightInk : darkInk;
}

// ============================================================
// BUILT-IN UNIVERSAL DESIGN SYSTEM THEMES
// Retains ALL 6 original IDs & aesthetics + adds 11 new presets across all 10 categories
// ============================================================

const DEFAULT_TYPOGRAPHY_EDITORIAL: ThemeTypography = {
  fontPreset: 'editorial-serif',
  headingFont: 'fraunces',
  bodyFont: 'plus-jakarta',
  fontSize: 'md',
  fontWeight: 'regular',
};

const DEFAULT_TYPOGRAPHY_CORPORATE: ThemeTypography = {
  fontPreset: 'modern-sans',
  headingFont: 'manrope',
  bodyFont: 'dm-sans',
  fontSize: 'md',
  fontWeight: 'regular',
};

const DEFAULT_TYPOGRAPHY_STUDIO: ThemeTypography = {
  fontPreset: 'geometric-sans',
  headingFont: 'outfit',
  bodyFont: 'plus-jakarta',
  fontSize: 'md',
  fontWeight: 'regular',
};

const DEFAULT_TYPOGRAPHY_CLASSIC: ThemeTypography = {
  fontPreset: 'warm-humanist',
  headingFont: 'playfair',
  bodyFont: 'lora',
  fontSize: 'md',
  fontWeight: 'regular',
};

export const BUILTIN_THEMES: Record<BuiltInThemeId, ThemeDefinition> = {
  // === 1. EXISTING 6 LEGACY THEMES (RETAINED IDS, UPGRADED TOKENS) ===
  'strawberry-milk': {
    id: 'strawberry-milk',
    name: 'Strawberry Milk',
    tagline: 'Warm cream & soft berry blush',
    category: 'pastel-cute',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#FDF7F8',
      bgSecondary: '#F8EAEE',
      surface: '#FFFFFF',
      surfaceMuted: '#F9ECEF',
      border: '#ECD5DC',
      text: '#2E1F24',
      textMuted: '#6E555E',
      accent: '#C94D6D',
      accentSecondary: '#7B68A6',
      accentSoft: '#FCE8EE',
      accentInk: '#FFFFFF',
      success: '#2E7D5B',
      warning: '#C7772E',
      danger: '#C83E4D',
      washi: 'rgba(232, 162, 182, 0.42)',
    },
    typography: DEFAULT_TYPOGRAPHY_EDITORIAL,
    layout: {
      cornerStyle: 'rounded',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'solid',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'soft', gradients: 'subtle', texture: 'paper', pattern: 'none' },
    motion: 'subtle',
    decorations: 'expressive',
    swatches: ['#C94D6D', '#E88DA4', '#D97757', '#6B8E6E', '#7B68A6'],
  },
  'matcha-garden': {
    id: 'matcha-garden',
    name: 'Matcha Garden',
    tagline: 'Botanical sage & sunlit linen',
    category: 'earthy-natural',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#F7F9F5',
      bgSecondary: '#ECF2E7',
      surface: '#FFFFFF',
      surfaceMuted: '#EDF3E8',
      border: '#D5E2CC',
      text: '#1F2A1E',
      textMuted: '#536350',
      accent: '#4B7B4A',
      accentSecondary: '#C48B52',
      accentSoft: '#E6F1E3',
      accentInk: '#FFFFFF',
      success: '#2F7D4E',
      warning: '#B8762C',
      danger: '#C04444',
      washi: 'rgba(153, 190, 141, 0.42)',
    },
    typography: DEFAULT_TYPOGRAPHY_EDITORIAL,
    layout: {
      cornerStyle: 'rounded',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'solid',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'soft', gradients: 'subtle', texture: 'linen', pattern: 'none' },
    motion: 'subtle',
    decorations: 'expressive',
    swatches: ['#4B7B4A', '#7DA26E', '#C48B52', '#5B7C8D', '#8C6D62'],
  },
  'lavender-dreams': {
    id: 'lavender-dreams',
    name: 'Lavender Dreams',
    tagline: 'Airy lilac mist & plum ink',
    category: 'pastel-cute',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#F9F7FC',
      bgSecondary: '#EFE9F9',
      surface: '#FFFFFF',
      surfaceMuted: '#F0EBF8',
      border: '#DFD4EE',
      text: '#251E33',
      textMuted: '#625678',
      accent: '#6E54A3',
      accentSecondary: '#C86D8E',
      accentSoft: '#EFEAF9',
      accentInk: '#FFFFFF',
      success: '#347D61',
      warning: '#C57B32',
      danger: '#C6465B',
      washi: 'rgba(181, 161, 224, 0.42)',
    },
    typography: DEFAULT_TYPOGRAPHY_EDITORIAL,
    layout: {
      cornerStyle: 'rounded',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'solid',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'soft', gradients: 'subtle', texture: 'paper', pattern: 'none' },
    motion: 'subtle',
    decorations: 'expressive',
    swatches: ['#6E54A3', '#967BB6', '#C86D8E', '#578796', '#678C6F'],
  },
  'peach-picnic': {
    id: 'peach-picnic',
    name: 'Peach Picnic',
    tagline: 'Warm apricot & soft linen',
    category: 'warm-cosy',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#FDF8F4',
      bgSecondary: '#F8ECE1',
      surface: '#FFFFFF',
      surfaceMuted: '#FAF0E6',
      border: '#EDD9C8',
      text: '#332219',
      textMuted: '#72594B',
      accent: '#C9633B',
      accentSecondary: '#678C6E',
      accentSoft: '#FDECE3',
      accentInk: '#FFFFFF',
      success: '#3D7A58',
      warning: '#C67B24',
      danger: '#C44343',
      washi: 'rgba(235, 169, 131, 0.42)',
    },
    typography: DEFAULT_TYPOGRAPHY_EDITORIAL,
    layout: {
      cornerStyle: 'rounded',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'solid',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'soft', gradients: 'subtle', texture: 'linen', pattern: 'none' },
    motion: 'subtle',
    decorations: 'expressive',
    swatches: ['#C9633B', '#E38D66', '#678C6E', '#B5637A', '#5C7C99'],
  },
  'seaside-diary': {
    id: 'seaside-diary',
    name: 'Seaside Diary',
    tagline: 'Sea-salt mist & coastal slate',
    category: 'minimal-clean',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#F5F9FB',
      bgSecondary: '#E8F1F6',
      surface: '#FFFFFF',
      surfaceMuted: '#E9F2F7',
      border: '#CFE0EB',
      text: '#1B2832',
      textMuted: '#506472',
      accent: '#2D6F95',
      accentSecondary: '#528A73',
      accentSoft: '#E3F1F8',
      accentInk: '#FFFFFF',
      success: '#2E7D5E',
      warning: '#C1772D',
      danger: '#C2454D',
      washi: 'rgba(135, 186, 214, 0.42)',
    },
    typography: DEFAULT_TYPOGRAPHY_CORPORATE,
    layout: {
      cornerStyle: 'balanced',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'solid',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'soft', gradients: 'subtle', texture: 'none', pattern: 'none' },
    motion: 'subtle',
    decorations: 'minimal',
    swatches: ['#2D6F95', '#5897B8', '#D17B62', '#528A73', '#7A6D9E'],
  },
  'moonlit-journal': {
    id: 'moonlit-journal',
    name: 'Moonlit Journal',
    tagline: 'Midnight ink & warm starlight',
    category: 'dark-futuristic',
    builtIn: true,
    isDark: true,
    colors: {
      bg: '#121521',
      bgSecondary: '#171C2C',
      surface: '#1A1F30',
      surfaceMuted: '#22283D',
      border: '#313954',
      text: '#F2EDE6',
      textMuted: '#B3B9CE',
      accent: '#A98FE8',
      accentSecondary: '#7BA7CE',
      accentSoft: '#2A2546',
      accentInk: '#121521',
      success: '#5EC296',
      warning: '#E3B474',
      danger: '#EB6D78',
      washi: 'rgba(169, 143, 232, 0.30)',
    },
    typography: DEFAULT_TYPOGRAPHY_EDITORIAL,
    layout: {
      cornerStyle: 'rounded',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'solid',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'elevated', gradients: 'subtle', texture: 'none', pattern: 'none' },
    motion: 'subtle',
    decorations: 'minimal',
    swatches: ['#A98FE8', '#E5989B', '#80B89E', '#E3B474', '#7BA7CE'],
  },

  // === 2. NEW UNIVERSAL THEMES ACROSS ALL 10 STYLES ===
  'nordic-paper': {
    id: 'nordic-paper',
    name: 'Nordic Paper',
    tagline: 'Pure daylight canvas, Swiss sans, zero clutter',
    category: 'minimal-clean',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#FAFAFA',
      bgSecondary: '#F1F2F4',
      surface: '#FFFFFF',
      surfaceMuted: '#F4F4F5',
      border: '#E4E4E7',
      text: '#18181B',
      textMuted: '#52525B',
      accent: '#18181B',
      accentSecondary: '#4F46E5',
      accentSoft: '#F4F4F5',
      accentInk: '#FFFFFF',
      success: '#15803D',
      warning: '#B45309',
      danger: '#B91C1C',
      washi: 'rgba(24, 24, 27, 0.08)',
    },
    typography: DEFAULT_TYPOGRAPHY_STUDIO,
    layout: {
      cornerStyle: 'balanced',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'minimal',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'none', gradients: 'none', texture: 'none', pattern: 'none' },
    motion: 'subtle',
    decorations: 'none',
    swatches: ['#18181B', '#4F46E5', '#71717A', '#15803D', '#B45309'],
  },
  'executive-slate': {
    id: 'executive-slate',
    name: 'Executive Slate',
    tagline: 'Structured cool slate & crisp cobalt precision',
    category: 'professional-corporate',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#F4F6F9',
      bgSecondary: '#E9EEF5',
      surface: '#FFFFFF',
      surfaceMuted: '#F1F5F9',
      border: '#CBD5E1',
      text: '#0F172A',
      textMuted: '#475569',
      accent: '#1D4ED8',
      accentSecondary: '#0F766E',
      accentSoft: '#DBEAFE',
      accentInk: '#FFFFFF',
      success: '#15803D',
      warning: '#B45309',
      danger: '#DC2626',
      washi: 'rgba(29, 78, 216, 0.14)',
    },
    typography: DEFAULT_TYPOGRAPHY_CORPORATE,
    layout: {
      cornerStyle: 'balanced',
      cardSpacing: 'compact',
      density: 'compact',
      sidebarStyle: 'solid',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'soft', gradients: 'none', texture: 'none', pattern: 'none' },
    motion: 'subtle',
    decorations: 'none',
    swatches: ['#1D4ED8', '#0F766E', '#334155', '#15803D', '#B45309'],
  },
  'midnight-executive': {
    id: 'midnight-executive',
    name: 'Midnight Executive',
    tagline: 'Deep slate command surface & steel blue',
    category: 'professional-corporate',
    builtIn: true,
    isDark: true,
    colors: {
      bg: '#0B1120',
      bgSecondary: '#11192C',
      surface: '#151E32',
      surfaceMuted: '#1E293B',
      border: '#2D3A52',
      text: '#F1F5F9',
      textMuted: '#94A3B8',
      accent: '#3B82F6',
      accentSecondary: '#14B8A6',
      accentSoft: '#1E3A5F',
      accentInk: '#FFFFFF',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      washi: 'rgba(59, 130, 246, 0.22)',
    },
    typography: DEFAULT_TYPOGRAPHY_CORPORATE,
    layout: {
      cornerStyle: 'balanced',
      cardSpacing: 'compact',
      density: 'compact',
      sidebarStyle: 'solid',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'elevated', gradients: 'none', texture: 'none', pattern: 'none' },
    motion: 'subtle',
    decorations: 'none',
    swatches: ['#3B82F6', '#14B8A6', '#64748B', '#22C55E', '#F59E0B'],
  },
  'studio-pop': {
    id: 'studio-pop',
    name: 'Studio Pop',
    tagline: 'Playful cobalt, sunny tangerine & tactile bounce',
    category: 'playful-creative',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#FFFDF7',
      bgSecondary: '#FEF6E4',
      surface: '#FFFFFF',
      surfaceMuted: '#F5F3FF',
      border: '#DDD6FE',
      text: '#1E1B4B',
      textMuted: '#5B567D',
      accent: '#4F46E5',
      accentSecondary: '#EA580C',
      accentSoft: '#EEF2FF',
      accentInk: '#FFFFFF',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#E11D48',
      washi: 'rgba(234, 88, 12, 0.24)',
    },
    typography: DEFAULT_TYPOGRAPHY_STUDIO,
    layout: {
      cornerStyle: 'pill',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'tinted',
      borderStyle: 'crisp',
    },
    effects: { shadows: 'crisp-offset', gradients: 'subtle', texture: 'none', pattern: 'dots' },
    motion: 'playful',
    decorations: 'expressive',
    swatches: ['#4F46E5', '#EA580C', '#0D9488', '#DB2777', '#D97706'],
  },
  'obsidian-pulse': {
    id: 'obsidian-pulse',
    name: 'Obsidian Pulse',
    tagline: 'Deep carbon dark canvas with crisp electric cyan',
    category: 'dark-futuristic',
    builtIn: true,
    isDark: true,
    colors: {
      bg: '#090D16',
      bgSecondary: '#0F1524',
      surface: '#111827',
      surfaceMuted: '#1A2336',
      border: '#26334D',
      text: '#E6F1FF',
      textMuted: '#8B9DC3',
      accent: '#06B6D4',
      accentSecondary: '#818CF8',
      accentSoft: '#103445',
      accentInk: '#06131A',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
      washi: 'rgba(6, 182, 212, 0.22)',
    },
    typography: {
      fontPreset: 'tech-mono',
      headingFont: 'outfit',
      bodyFont: 'manrope',
      fontSize: 'md',
      fontWeight: 'regular',
    },
    layout: {
      cornerStyle: 'sharp',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'glass',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'elevated', gradients: 'subtle', texture: 'none', pattern: 'grid' },
    motion: 'subtle',
    decorations: 'minimal',
    swatches: ['#06B6D4', '#818CF8', '#34D399', '#FBBF24', '#F472B6'],
  },
  'terracotta-grove': {
    id: 'terracotta-grove',
    name: 'Terracotta Grove',
    tagline: 'Sunbaked clay, olive moss & unbleached stone',
    category: 'earthy-natural',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#F7F4EE',
      bgSecondary: '#ECE5D8',
      surface: '#FCFBF8',
      surfaceMuted: '#EFEAE0',
      border: '#D9CFC0',
      text: '#2B241E',
      textMuted: '#685B4F',
      accent: '#B45339',
      accentSecondary: '#586F4E',
      accentSoft: '#F5E4DE',
      accentInk: '#FFFFFF',
      success: '#4B7447',
      warning: '#B87223',
      danger: '#B83B3B',
      washi: 'rgba(180, 83, 57, 0.26)',
    },
    typography: DEFAULT_TYPOGRAPHY_EDITORIAL,
    layout: {
      cornerStyle: 'balanced',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'tinted',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'soft', gradients: 'none', texture: 'linen', pattern: 'none' },
    motion: 'subtle',
    decorations: 'minimal',
    swatches: ['#B45339', '#586F4E', '#8F6A48', '#4A6E78', '#A27B5C'],
  },
  'broadsheet-classic': {
    id: 'broadsheet-classic',
    name: 'Broadsheet Classic',
    tagline: 'Archival ivory paper, serif display & sharp rules',
    category: 'editorial-classic',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#F6F3EB',
      bgSecondary: '#EAE5D9',
      surface: '#FFFDF8',
      surfaceMuted: '#EFECE2',
      border: '#CFC8B8',
      text: '#1C1917',
      textMuted: '#57534E',
      accent: '#8C2D2D',
      accentSecondary: '#2C4A5E',
      accentSoft: '#F4E5E5',
      accentInk: '#FFFFFF',
      success: '#2F6F4E',
      warning: '#9A631D',
      danger: '#A62B2B',
      washi: 'rgba(140, 45, 45, 0.16)',
    },
    typography: DEFAULT_TYPOGRAPHY_CLASSIC,
    layout: {
      cornerStyle: 'sharp',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'solid',
      borderStyle: 'crisp',
    },
    effects: { shadows: 'none', gradients: 'none', texture: 'paper', pattern: 'none' },
    motion: 'none',
    decorations: 'minimal',
    swatches: ['#8C2D2D', '#2C4A5E', '#44403C', '#2F6F4E', '#9A631D'],
  },
  'monochrome-ink': {
    id: 'monochrome-ink',
    name: 'Monochrome Ink',
    tagline: 'Pure alabaster & carbon ink with zero hue noise',
    category: 'monochrome',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#F5F5F5',
      bgSecondary: '#E5E5E5',
      surface: '#FFFFFF',
      surfaceMuted: '#EFEFEF',
      border: '#D4D4D4',
      text: '#111111',
      textMuted: '#525252',
      accent: '#171717',
      accentSecondary: '#525252',
      accentSoft: '#E5E5E5',
      accentInk: '#FFFFFF',
      success: '#262626',
      warning: '#525252',
      danger: '#171717',
      washi: 'rgba(23, 23, 23, 0.12)',
    },
    typography: DEFAULT_TYPOGRAPHY_CORPORATE,
    layout: {
      cornerStyle: 'sharp',
      cardSpacing: 'compact',
      density: 'compact',
      sidebarStyle: 'solid',
      borderStyle: 'crisp',
    },
    effects: { shadows: 'none', gradients: 'none', texture: 'none', pattern: 'none' },
    motion: 'none',
    decorations: 'none',
    swatches: ['#171717', '#404040', '#737373', '#A3A3A3', '#E5E5E5'],
  },
  'monochrome-carbon': {
    id: 'monochrome-carbon',
    name: 'Monochrome Carbon',
    tagline: 'Deep matte charcoal & crisp chalk contrast',
    category: 'monochrome',
    builtIn: true,
    isDark: true,
    colors: {
      bg: '#0C0C0C',
      bgSecondary: '#141414',
      surface: '#161616',
      surfaceMuted: '#212121',
      border: '#303030',
      text: '#F5F5F5',
      textMuted: '#A3A3A3',
      accent: '#F5F5F5',
      accentSecondary: '#A3A3A3',
      accentSoft: '#262626',
      accentInk: '#0C0C0C',
      success: '#D4D4D4',
      warning: '#A3A3A3',
      danger: '#F87171',
      washi: 'rgba(245, 245, 245, 0.14)',
    },
    typography: DEFAULT_TYPOGRAPHY_CORPORATE,
    layout: {
      cornerStyle: 'sharp',
      cardSpacing: 'compact',
      density: 'compact',
      sidebarStyle: 'solid',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'none', gradients: 'none', texture: 'noise', pattern: 'none' },
    motion: 'none',
    decorations: 'none',
    swatches: ['#F5F5F5', '#A3A3A3', '#525252', '#262626', '#161616'],
  },
  'fireside-espresso': {
    id: 'fireside-espresso',
    name: 'Fireside Espresso',
    tagline: 'Rich roasted umber, warm amber & evening calm',
    category: 'warm-cosy',
    builtIn: true,
    isDark: true,
    colors: {
      bg: '#181311',
      bgSecondary: '#211A16',
      surface: '#241C18',
      surfaceMuted: '#2E241F',
      border: '#44352E',
      text: '#F5ECE6',
      textMuted: '#C4B0A4',
      accent: '#E08E55',
      accentSecondary: '#9AB88A',
      accentSoft: '#3A281D',
      accentInk: '#1A110C',
      success: '#7EB88A',
      warning: '#E5B05A',
      danger: '#E36B6B',
      washi: 'rgba(224, 142, 85, 0.25)',
    },
    typography: DEFAULT_TYPOGRAPHY_EDITORIAL,
    layout: {
      cornerStyle: 'rounded',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'tinted',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'soft', gradients: 'subtle', texture: 'linen', pattern: 'none' },
    motion: 'subtle',
    decorations: 'minimal',
    swatches: ['#E08E55', '#9AB88A', '#D97B8A', '#E5B05A', '#7A9CB5'],
  },
  'prism-studio': {
    id: 'prism-studio',
    name: 'Prism Studio',
    tagline: 'Crisp canvas lifted by vibrant magenta & teal energy',
    category: 'vibrant-colourful',
    builtIn: true,
    isDark: false,
    colors: {
      bg: '#F8FAFF',
      bgSecondary: '#EEF2FF',
      surface: '#FFFFFF',
      surfaceMuted: '#F3F6FD',
      border: '#D6DDF5',
      text: '#141B33',
      textMuted: '#4C5678',
      accent: '#D92672',
      accentSecondary: '#0891B2',
      accentSoft: '#FCE7F3',
      accentInk: '#FFFFFF',
      success: '#059669',
      warning: '#D97706',
      danger: '#E11D48',
      washi: 'rgba(8, 145, 178, 0.22)',
    },
    typography: DEFAULT_TYPOGRAPHY_STUDIO,
    layout: {
      cornerStyle: 'rounded',
      cardSpacing: 'comfortable',
      density: 'spacious',
      sidebarStyle: 'tinted',
      borderStyle: 'hairline',
    },
    effects: { shadows: 'elevated', gradients: 'vivid', texture: 'none', pattern: 'diagonal' },
    motion: 'playful',
    decorations: 'minimal',
    swatches: ['#D92672', '#0891B2', '#7C3AED', '#059669', '#D97706'],
  },
};

export const BUILTIN_THEME_IDS = new Set<string>(Object.keys(BUILTIN_THEMES));

// ============================================================
// RESOLUTION, SANITIZATION & CSS VARIABLE BUILDER
// ============================================================

export function getAllAvailableThemes(customThemes: ThemeDefinition[] = []): ThemeDefinition[] {
  return [...Object.values(BUILTIN_THEMES), ...customThemes];
}

export function findThemeById(themeId: string, customThemes: ThemeDefinition[] = []): ThemeDefinition {
  if (themeId in BUILTIN_THEMES) {
    return BUILTIN_THEMES[themeId as BuiltInThemeId];
  }
  const found = customThemes.find((t) => t.id === themeId);
  return found || BUILTIN_THEMES['strawberry-milk'];
}

export function resolveEffectiveTheme(settings: Partial<ThemeSettings>): ThemeDefinition {
  const customThemes = Array.isArray(settings.customThemes) ? settings.customThemes : [];
  const base = findThemeById(settings.activeTheme || 'strawberry-milk', customThemes);
  const ov: ThemeOverrides = settings.overrides || {};

  const legacyAccent = settings.customAccent && settings.customAccent.trim() ? settings.customAccent.trim() : '';
  const mergedColors: ThemeColors = {
    ...base.colors,
    ...(ov.colors || {}),
  };

  if (legacyAccent && !ov.colors?.accent) {
    mergedColors.accent = legacyAccent;
    mergedColors.accentInk = pickReadableInk(legacyAccent);
    mergedColors.accentSoft = mixHexColors(
      ov.isDark ?? base.isDark ? mergedColors.surface : '#FFFFFF',
      legacyAccent,
      ov.isDark ?? base.isDark ? 0.22 : 0.14
    );
  } else if (ov.colors?.accent && !ov.colors?.accentInk) {
    mergedColors.accentInk = pickReadableInk(ov.colors.accent);
  }

  const isDark = ov.isDark ?? base.isDark;
  const typography: ThemeTypography = { ...base.typography, ...(ov.typography || {}) };
  const layout: ThemeLayout = {
    ...base.layout,
    ...(ov.layout || {}),
    density: ov.layout?.density ?? (settings.compactMode ? 'compact' : base.layout.density),
  };
  const effects: ThemeEffects = { ...base.effects, ...(ov.effects || {}) };
  const motion: ThemeMotionLevel = ov.motion ?? base.motion;
  const decorations: ThemeDecorationLevel =
    ov.decorations ?? (settings.decorativeStickers === false ? 'none' : base.decorations);

  return {
    ...base,
    isDark,
    colors: mergedColors,
    typography,
    layout,
    effects,
    motion,
    decorations,
  };
}

function getCornerRadii(corner: ThemeCornerStyle) {
  switch (corner) {
    case 'sharp':
      return { card: '0.375rem', control: '0.25rem', sm: '0.1875rem' };
    case 'balanced':
      return { card: '0.875rem', control: '0.5rem', sm: '0.375rem' };
    case 'pill':
      return { card: '1.75rem', control: '1.125rem', sm: '0.75rem' };
    case 'rounded':
    default:
      return { card: '1.5rem', control: '0.75rem', sm: '0.5rem' };
  }
}

function getSpacingTokens(spacing: ThemeCardSpacing, density: 'compact' | 'spacious') {
  const effective = density === 'compact' && spacing === 'comfortable' ? 'compact' : spacing;
  switch (effective) {
    case 'compact':
      return { cardPad: '1rem', sectionGap: '1rem' };
    case 'spacious':
      return { cardPad: '2rem', sectionGap: '1.75rem' };
    case 'comfortable':
    default:
      return { cardPad: '1.5rem', sectionGap: '1.5rem' };
  }
}

function getBorderTokens(style: ThemeBorderStyle) {
  switch (style) {
    case 'none':
      return { width: '0px', style: 'solid' };
    case 'crisp':
      return { width: '1.5px', style: 'solid' };
    case 'dashed':
      return { width: '1.5px', style: 'dashed' };
    case 'hairline':
    default:
      return { width: '1px', style: 'solid' };
  }
}

function getShadowToken(level: ThemeEffects['shadows'], isDark: boolean, borderHex: string): string {
  switch (level) {
    case 'none':
      return 'none';
    case 'elevated':
      return isDark
        ? '0 12px 30px -10px rgba(0, 0, 0, 0.65)'
        : '0 10px 30px -10px rgba(15, 23, 42, 0.14)';
    case 'crisp-offset':
      return `3px 3px 0px 0px ${borderHex}`;
    case 'soft':
    default:
      return isDark
        ? '0 8px 24px -8px rgba(0, 0, 0, 0.45)'
        : '0 4px 20px -6px rgba(15, 23, 42, 0.08)';
  }
}

function getGradientBackground(level: ThemeEffects['gradients'], colors: ThemeColors): string {
  if (level === 'none') return 'none';
  if (level === 'vivid') {
    return `radial-gradient(circle at 12% 10%, ${hexToRgba(colors.accent, 0.14)} 0%, transparent 45%), radial-gradient(circle at 88% 18%, ${hexToRgba(colors.accentSecondary, 0.14)} 0%, transparent 45%), linear-gradient(180deg, ${colors.bg} 0%, ${colors.bgSecondary} 100%)`;
  }
  return `radial-gradient(circle at 15% 8%, ${hexToRgba(colors.accent, 0.07)} 0%, transparent 48%), linear-gradient(180deg, ${colors.bg} 0%, ${colors.bgSecondary} 100%)`;
}

function getPatternTokens(pattern: ThemeEffects['pattern'], borderHex: string) {
  const dotColor = hexToRgba(borderHex, 0.55);
  switch (pattern) {
    case 'dots':
      return {
        image: `radial-gradient(${dotColor} 1px, transparent 1px)`,
        size: '18px 18px',
      };
    case 'grid':
      return {
        image: `linear-gradient(to right, ${hexToRgba(borderHex, 0.32)} 1px, transparent 1px), linear-gradient(to bottom, ${hexToRgba(borderHex, 0.32)} 1px, transparent 1px)`,
        size: '28px 28px',
      };
    case 'diagonal':
      return {
        image: `repeating-linear-gradient(-45deg, ${hexToRgba(borderHex, 0.24)} 0, ${hexToRgba(borderHex, 0.24)} 1px, transparent 1px, transparent 12px)`,
        size: 'auto',
      };
    case 'none':
    default:
      return { image: 'none', size: 'auto' };
  }
}

function getFontSizeValue(size: ThemeFontSize): string {
  switch (size) {
    case 'sm':
      return '14px';
    case 'lg':
      return '16.5px';
    case 'md':
    default:
      return '15px';
  }
}

function getFontWeightValues(weight: ThemeFontWeight) {
  switch (weight) {
    case 'light':
      return { body: '400', heading: '500' };
    case 'bold':
      return { body: '500', heading: '700' };
    case 'regular':
    default:
      return { body: '400', heading: '600' };
  }
}

function getSidebarBackground(sidebarStyle: ThemeSidebarStyle, colors: ThemeColors): string {
  switch (sidebarStyle) {
    case 'tinted':
      return colors.bgSecondary;
    case 'glass':
      return hexToRgba(colors.surface, 0.84);
    case 'minimal':
      return colors.bg;
    case 'solid':
    default:
      return colors.surface;
  }
}

export function buildThemeCssVariables(theme: ThemeDefinition): Record<string, string> {
  const { colors, typography, layout, effects, motion, isDark } = theme;
  const radii = getCornerRadii(layout.cornerStyle);
  const spacing = getSpacingTokens(layout.cardSpacing, layout.density);
  const border = getBorderTokens(layout.borderStyle);
  const shadow = getShadowToken(effects.shadows, isDark, colors.border);
  const bgGradient = getGradientBackground(effects.gradients, colors);
  const pattern = getPatternTokens(effects.pattern, colors.border);
  const weights = getFontWeightValues(typography.fontWeight);
  const headingStack = FONT_CATALOG[typography.headingFont]?.stack || FONT_CATALOG.fraunces.stack;
  const bodyStack = FONT_CATALOG[typography.bodyFont]?.stack || FONT_CATALOG['plus-jakarta'].stack;
  const transitionMs = motion === 'none' ? '0ms' : motion === 'playful' ? '260ms' : '180ms';

  return {
    '--cs-bg': colors.bg,
    '--cs-bg-secondary': colors.bgSecondary,
    '--cs-surface': colors.surface,
    '--cs-surface-muted': colors.surfaceMuted,
    '--cs-border': colors.border,
    '--cs-text': colors.text,
    '--cs-text-muted': colors.textMuted,
    '--cs-accent': colors.accent,
    '--cs-accent-secondary': colors.accentSecondary,
    '--cs-accent-soft': colors.accentSoft,
    '--cs-accent-ink': colors.accentInk,
    '--cs-success': colors.success,
    '--cs-success-soft': hexToRgba(colors.success, isDark ? 0.18 : 0.12),
    '--cs-warning': colors.warning,
    '--cs-warning-soft': hexToRgba(colors.warning, isDark ? 0.18 : 0.12),
    '--cs-danger': colors.danger,
    '--cs-danger-soft': hexToRgba(colors.danger, isDark ? 0.18 : 0.12),
    '--cs-washi': colors.washi,
    '--cs-shadow': shadow,
    '--cs-sidebar-bg': getSidebarBackground(layout.sidebarStyle, colors),
    '--font-display': headingStack,
    '--font-sans': bodyStack,
    '--cs-font-size-base': getFontSizeValue(typography.fontSize),
    '--cs-weight-heading': weights.heading,
    '--cs-weight-body': weights.body,
    '--cs-radius-card': radii.card,
    '--cs-radius-control': radii.control,
    '--cs-radius-sm': radii.sm,
    '--cs-card-pad': spacing.cardPad,
    '--cs-section-gap': spacing.sectionGap,
    '--cs-border-width': border.width,
    '--cs-border-style': border.style,
    '--cs-bg-image': bgGradient,
    '--cs-pattern-image': pattern.image,
    '--cs-pattern-size': pattern.size,
    '--cs-texture-mode': effects.texture,
    '--cs-transition-ms': transitionMs,
  };
}

export function applyThemeDefinitionToDocument(theme: ThemeDefinition): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.dataset.csTheme = String(theme.id);
  root.dataset.csMotion = theme.motion;
  root.dataset.csDecorations = theme.decorations;
  root.dataset.csSidebar = theme.layout.sidebarStyle;
  root.dataset.csDensity = theme.layout.density;
  root.dataset.csTexture = theme.effects.texture;

  const vars = buildThemeCssVariables(theme);
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
}

// ============================================================
// CUSTOM THEME CREATION, SANITIZATION & JSON IMPORT/EXPORT
// ============================================================

export function sanitizeThemeDefinition(raw: any, forceCustom = true): ThemeDefinition {
  const base = BUILTIN_THEMES['nordic-paper'];
  const rawId = clampString(raw?.id, 80);
  const safeId =
    forceCustom && (!rawId || BUILTIN_THEME_IDS.has(rawId))
      ? generateId('thm')
      : sanitizeId(rawId || generateId('thm'), 'thm');

  const isDark = Boolean(raw?.isDark);
  const colorsRaw = raw?.colors && typeof raw.colors === 'object' ? raw.colors : {};
  const colors: ThemeColors = {
    bg: normalizeHex(colorsRaw.bg, isDark ? '#111827' : base.colors.bg),
    bgSecondary: normalizeHex(colorsRaw.bgSecondary, isDark ? '#172033' : base.colors.bgSecondary),
    surface: normalizeHex(colorsRaw.surface, isDark ? '#1B2436' : base.colors.surface),
    surfaceMuted: normalizeHex(colorsRaw.surfaceMuted, isDark ? '#243047' : base.colors.surfaceMuted),
    border: normalizeHex(colorsRaw.border, isDark ? '#334155' : base.colors.border),
    text: normalizeHex(colorsRaw.text, isDark ? '#F1F5F9' : base.colors.text),
    textMuted: normalizeHex(colorsRaw.textMuted, isDark ? '#94A3B8' : base.colors.textMuted),
    accent: normalizeHex(colorsRaw.accent, base.colors.accent),
    accentSecondary: normalizeHex(colorsRaw.accentSecondary, base.colors.accentSecondary),
    accentSoft: normalizeHex(colorsRaw.accentSoft, isDark ? '#1E293B' : base.colors.accentSoft),
    accentInk: normalizeHex(colorsRaw.accentInk, pickReadableInk(normalizeHex(colorsRaw.accent, base.colors.accent))),
    success: normalizeHex(colorsRaw.success, base.colors.success),
    warning: normalizeHex(colorsRaw.warning, base.colors.warning),
    danger: normalizeHex(colorsRaw.danger, base.colors.danger),
    washi: clampString(colorsRaw.washi, 64, base.colors.washi) || base.colors.washi,
  };

  const validCats = new Set(THEME_STYLE_CATEGORIES.map((c) => c.id));
  const category: ThemeStyleCategory = validCats.has(raw?.category) ? raw.category : 'minimal-clean';
  const validFonts = new Set(Object.keys(FONT_CATALOG));
  const typoRaw = raw?.typography && typeof raw.typography === 'object' ? raw.typography : {};
  const typography: ThemeTypography = {
    fontPreset:
      ['editorial-serif', 'modern-sans', 'geometric-sans', 'warm-humanist', 'tech-mono', 'system-clean', 'custom'].includes(
        typoRaw.fontPreset
      )
        ? typoRaw.fontPreset
        : 'custom',
    headingFont: validFonts.has(typoRaw.headingFont) ? typoRaw.headingFont : 'manrope',
    bodyFont: validFonts.has(typoRaw.bodyFont) ? typoRaw.bodyFont : 'dm-sans',
    fontSize: ['sm', 'md', 'lg'].includes(typoRaw.fontSize) ? typoRaw.fontSize : 'md',
    fontWeight: ['light', 'regular', 'bold'].includes(typoRaw.fontWeight) ? typoRaw.fontWeight : 'regular',
  };

  const layoutRaw = raw?.layout && typeof raw.layout === 'object' ? raw.layout : {};
  const layout: ThemeLayout = {
    cornerStyle: ['sharp', 'balanced', 'rounded', 'pill'].includes(layoutRaw.cornerStyle)
      ? layoutRaw.cornerStyle
      : 'balanced',
    cardSpacing: ['compact', 'comfortable', 'spacious'].includes(layoutRaw.cardSpacing)
      ? layoutRaw.cardSpacing
      : 'comfortable',
    density: layoutRaw.density === 'compact' ? 'compact' : 'spacious',
    sidebarStyle: ['solid', 'tinted', 'glass', 'minimal'].includes(layoutRaw.sidebarStyle)
      ? layoutRaw.sidebarStyle
      : 'solid',
    borderStyle: ['hairline', 'crisp', 'dashed', 'none'].includes(layoutRaw.borderStyle)
      ? layoutRaw.borderStyle
      : 'hairline',
  };

  const effRaw = raw?.effects && typeof raw.effects === 'object' ? raw.effects : {};
  const effects: ThemeEffects = {
    shadows: ['none', 'soft', 'elevated', 'crisp-offset'].includes(effRaw.shadows) ? effRaw.shadows : 'soft',
    gradients: ['none', 'subtle', 'vivid'].includes(effRaw.gradients) ? effRaw.gradients : 'none',
    texture: ['none', 'paper', 'noise', 'linen'].includes(effRaw.texture) ? effRaw.texture : 'none',
    pattern: ['none', 'dots', 'grid', 'diagonal'].includes(effRaw.pattern) ? effRaw.pattern : 'none',
  };

  return {
    id: safeId,
    name: clampString(raw?.name, 80, 'Custom Theme') || 'Custom Theme',
    tagline: clampString(raw?.tagline, 140, 'Personal custom design') || 'Personal custom design',
    category,
    builtIn: !forceCustom && BUILTIN_THEME_IDS.has(safeId),
    isDark,
    colors,
    typography,
    layout,
    effects,
    motion: ['none', 'subtle', 'playful'].includes(raw?.motion) ? raw.motion : 'subtle',
    decorations: ['none', 'minimal', 'expressive'].includes(raw?.decorations) ? raw.decorations : 'minimal',
    swatches: Array.isArray(raw?.swatches) && raw.swatches.length > 0
      ? raw.swatches.slice(0, 6).map((s: unknown) => normalizeHex(String(s), colors.accent))
      : [colors.accent, colors.accentSecondary, colors.success, colors.warning, colors.surfaceMuted],
    createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createCustomThemeFromBase(source: ThemeDefinition, customName?: string): ThemeDefinition {
  const now = new Date().toISOString();
  return {
    ...structuredClone(source),
    id: generateId('thm'),
    name: clampString(customName || `${source.name} Copy`, 80, 'Custom Theme'),
    builtIn: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createBlankCustomTheme(name = 'Untitled Custom Theme', isDark = false): ThemeDefinition {
  const seed = isDark ? BUILTIN_THEMES['midnight-executive'] : BUILTIN_THEMES['nordic-paper'];
  return createCustomThemeFromBase(
    {
      ...seed,
      tagline: 'Created from scratch',
    },
    name
  );
}

export interface ThemeExportEnvelope {
  schema: 'clearspace-theme-v1';
  exportedAt: string;
  theme: ThemeDefinition;
}

export function exportThemeConfigJson(theme: ThemeDefinition): ThemeExportEnvelope {
  return {
    schema: 'clearspace-theme-v1',
    exportedAt: new Date().toISOString(),
    theme: {
      ...structuredClone(theme),
      builtIn: false,
    },
  };
}

export function validateAndParseThemeImport(input: unknown): {
  valid: boolean;
  error: string | null;
  theme: ThemeDefinition | null;
} {
  let obj: any = input;
  if (typeof input === 'string') {
    try {
      obj = JSON.parse(input);
    } catch {
      return { valid: false, error: 'Invalid JSON syntax in theme file.', theme: null };
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { valid: false, error: 'Theme file must be a JSON object.', theme: null };
  }
  const candidate = obj.theme && typeof obj.theme === 'object' ? obj.theme : obj;
  if (!candidate.colors || typeof candidate.colors !== 'object' || !candidate.colors.bg || !candidate.colors.accent) {
    return {
      valid: false,
      error: 'Unrecognized theme structure: missing required color tokens (bg, accent).',
      theme: null,
    };
  }
  const sanitized = sanitizeThemeDefinition({ ...candidate, id: generateId('thm') }, true);
  return { valid: true, error: null, theme: sanitized };
}
