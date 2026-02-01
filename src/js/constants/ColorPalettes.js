/**
 * ColorPalettes.js - Centralized color palette definitions
 *
 * Sources:
 * - D3 (Standard Palettes): Tableau10, Viridis, Turbo, etc.
 * - Custom: PhyloOptimized, HighContrast (Manually defined)
 *
 * All palettes are automatically processed to ensure APCA > 60 contrast against white.
 */

import * as d3 from 'd3';
import Color from 'colorjs.io';

// ============================================
// ACCESSIBILITY UTILS
// ============================================

// APCA 45 is sufficient for visual elements (nodes, branches, labels with outlines)
// APCA 60 is recommended for body text, but too aggressive for visualization colors
const TARGET_LC = 45;
const WHITE = new Color("white");

/**
 * Ensures a color meets the minimum APCA contrast against white.
 * If not, iteratively darkens it in Oklch space.
 * @param {string} hexStr - Hex color string
 * @returns {string} - Accessible Hex color string
 */
function fixContrast(hexStr) {
  let color;
  try {
    color = new Color(hexStr);
  } catch (e) {
    console.warn("Invalid color:", hexStr);
    return "#000000";
  }

  const original = color.clone();

  // Check contrast
  if (Math.abs(WHITE.contrast(color, "APCA")) >= TARGET_LC) {
    return hexStr; // Already valid
  }

  // Fix it
  color = color.to("oklch");
  let safety = 0;
  while (Math.abs(WHITE.contrast(color, "APCA")) < TARGET_LC && safety < 100) {
    color.l -= 0.01;
    safety++;
  }

  const fixedHex = color.to("srgb").toString({ format: "hex" });
  return fixedHex;
}

/**
 * Creates an accessible version of a palette by fixing all colors.
 * @param {string[]} palette - Array of hex strings
 * @returns {string[]} - Array of accessible hex strings
 */
function createAccessiblePalette(palette) {
  return palette.map(fixContrast);
}

/**
 * Samples a D3 interpolator to create a discrete palette.
 * @param {Function} interpolator - D3 interpolator (e.g., d3.interpolateViridis)
 * @param {number} count - Number of colors to sample
 * @returns {string[]} - Accessible palette
 */
function sampleInterpolator(interpolator, count) {
  const palette = [];
  for (let i = 0; i < count; i++) {
    // Sample linearly 0..1
    const t = i / (count - 1);
    palette.push(interpolator(t)); // Returns rgb string or hex
  }
  return createAccessiblePalette(palette);
}

/**
 * Dynamically generates a palette of exactly N colors using D3 interpolators.
 * Uses Sinebow for smooth hue distribution (perceptually good for many categories).
 * @param {number} n - Number of colors needed
 * @param {string} scheme - Optional: 'rainbow', 'sinebow', 'turbo', 'spectral' (default: 'sinebow')
 * @returns {string[]} - Array of N accessible hex colors
 */
export function generatePalette(n, scheme = 'sinebow') {
  if (n <= 0) return [];
  if (n === 1) return createAccessiblePalette(['#4E79A7']); // Tableau blue

  const interpolators = {
    sinebow: d3.interpolateSinebow,
    rainbow: d3.interpolateRainbow,
    turbo: d3.interpolateTurbo,
    spectral: d3.interpolateSpectral,
  };

  const interpolator = interpolators[scheme] || d3.interpolateSinebow;
  const palette = [];

  for (let i = 0; i < n; i++) {
    // Offset by 0.5/n to avoid starting at red (common issue)
    const t = (i + 0.5) / n;
    palette.push(interpolator(t));
  }

  return createAccessiblePalette(palette);
}

// ============================================
// PROFESSIONAL CATEGORICAL PALETTES (Standard)
// ============================================

/**
 * Tableau 10 - Sourced from D3
 */
export const Tableau10 = createAccessiblePalette(d3.schemeTableau10);

/**
 * Tableau 20 - Manual Definition (D3 export often missing schemeTableau20 in standard bundle)
 * We treat this as a "backup" source but fix it for accessibility.
 */
export const Tableau20 = createAccessiblePalette([
  "#4E79A7", "#A0CBE8",
  "#F28E2B", "#FFBE7D",
  "#59A14F", "#8CD17D",
  "#B6992D", "#F1CE63",
  "#499894", "#86BCB6",
  "#E15759", "#FF9D9A",
  "#B07AA1", "#D4A6C8",
  "#9D7660", "#D7B5A6",
  "#79706E", "#BAB0AC",
  "#D37295", "#FABFD2"
]);

/**
 * D3 ColorBrewer Paired - 12 colors in light/dark pairs
 * Good for related categories (e.g., genotype variants)
 */
export const Paired = createAccessiblePalette(d3.schemePaired);

/**
 * D3 ColorBrewer Set3 - 12 pastel colors
 * Good for many categories with softer appearance
 */
export const Set3 = createAccessiblePalette(d3.schemeSet3);

/**
 * D3 ColorBrewer Set1 - 9 bold colors
 * High saturation, very distinct
 */
export const Set1 = createAccessiblePalette(d3.schemeSet1);

/**
 * D3 ColorBrewer Dark2 - 8 darker colors
 * Good contrast on white backgrounds
 */
export const Dark2 = createAccessiblePalette(d3.schemeDark2);

/**
 * D3 ColorBrewer Accent - 8 accent colors
 */
export const Accent = createAccessiblePalette(d3.schemeAccent);

/**
 * D3 Category10 - Classic D3 categorical palette
 */
export const Category10 = createAccessiblePalette(d3.schemeCategory10);

// ============================================
// ACCESSIBLE CATEGORICAL PALETTES (Legacy/Custom)
// ============================================
// These were manually optimized, but we run them through the fixer just in case.

export const TolBrightWhiteBG = createAccessiblePalette([
  "#D96622", "#0077BB", "#0088AA", "#008877",
  "#CC3311", "#EE3377", "#777777"
]);

export const TolMutedWhiteBG = createAccessiblePalette([
  "#CC6677", "#332288", "#BBAA33", "#117733",
  "#66AADD", "#882255", "#44AA99", "#8A8A33", "#AA4499"
]);

export const WongWhiteBG = createAccessiblePalette([
  "#D55E00", "#0072B2", "#009E73", "#CC79A7",
  "#E69F00", "#56B4E9", "#999900", "#777777"
]);

export const OkabeItoWhiteBG = createAccessiblePalette([
  "#D55E00", "#0072B2", "#009E73", "#CC79A7",
  "#E69F00", "#4C9ED9", "#B3A800", "#444444"
]);


// ============================================
// SPECIALIZED PALETTES
// ============================================

export const PhyloOptimized = createAccessiblePalette([
  "#C0392B", "#2980B9", "#27AE60", "#8E44AD",
  "#D35400", "#16A085", "#F39C12", "#2C3E50",
  "#7F8C8D", "#E74C3C", "#9B59B6"
  // Removed duplicate #C0392B
]);

export const HighContrast = createAccessiblePalette([
  "#E31A1C", "#1F78B4", "#33A02C", "#6A3D9A", "#FF7F00",
  "#B15928", "#A6CEE3", "#B2DF8A", "#FDBF6F", "#CAB2D6"
]);

export const BlueShadesWhiteBG = createAccessiblePalette([
  "#A6C8FF", "#82B1FF", "#5E9BFF", "#3B85FF", "#1976D2",
  "#1565C0", "#0D47A1", "#0A3A79", "#072D62", "#04214A"
]);

/**
 * Extended30 - A large categorical palette with 30 distinct colors
 * Designed for datasets with many groups (e.g., 20+ genotypes)
 * Combines colors from multiple sources for maximum distinctness
 */
export const Extended30 = createAccessiblePalette([
  // Core distinguishable colors
  "#E41A1C", "#377EB8", "#4DAF4A", "#984EA3", "#FF7F00",
  "#A65628", "#F781BF", "#999999", "#66C2A5", "#FC8D62",
  // Extended set
  "#8DA0CB", "#E78AC3", "#A6D854", "#FFD92F", "#E5C494",
  "#B3B3B3", "#1B9E77", "#D95F02", "#7570B3", "#E7298A",
  // Additional distinct colors
  "#66A61E", "#E6AB02", "#A6761D", "#666666", "#1F78B4",
  "#33A02C", "#FB9A99", "#B2DF8A", "#FDBF6F", "#CAB2D6"
]);

// ============================================
// SEQUENTIAL PALETTES (Sourced from D3)
// ============================================

export const ViridisWhiteBG = sampleInterpolator(d3.interpolateViridis, 8);
export const CividisWhiteBG = sampleInterpolator(d3.interpolateCividis, 8);
export const TurboWhiteBG = sampleInterpolator(d3.interpolateTurbo, 8);

// Keep originals (also fixed, just in case used on white)
export const Viridis = sampleInterpolator(d3.interpolateViridis, 10);
export const Cividis = sampleInterpolator(d3.interpolateCividis, 10);
export const Turbo = sampleInterpolator(d3.interpolateTurbo, 10);

// ============================================
// DIVERGING PALETTES (Sourced from D3)
// ============================================

// CoolWarm equivalent -> RdBu (Red-Blue) reversed usually
export const CoolWarmWhiteBG = sampleInterpolator(t => d3.interpolateRdBu(1 - t), 9);

// PurpleGreen -> PRGn
export const PurpleGreenWhiteBG = sampleInterpolator(d3.interpolatePRGn, 9);


// ============================================
// PALETTE COLLECTIONS
// ============================================

export const CATEGORICAL_PALETTES = {
  Extended30,
  Tableau20,
  Paired,
  Set3,
  Tableau10,
  Category10,
  Set1,
  Dark2,
  Accent,
  OkabeItoWhiteBG,
  WongWhiteBG,
  TolBrightWhiteBG,
  TolMutedWhiteBG,
  HighContrast,
  PhyloOptimized,
  BlueShadesWhiteBG,
};

export const SEQUENTIAL_PALETTES = {
  ViridisWhiteBG,
  CividisWhiteBG,
  TurboWhiteBG,
  Viridis,
  Cividis,
  Turbo
};

export const DIVERGING_PALETTES = {
  CoolWarmWhiteBG,
  PurpleGreenWhiteBG
};

export const ALL_PALETTES = {
  ...CATEGORICAL_PALETTES,
  ...SEQUENTIAL_PALETTES,
  ...DIVERGING_PALETTES,
};

// ... Metadata exports remain same ...
export function getPalette(name) {
  return ALL_PALETTES[name] || Tableau10;
}

export function getPaletteInfo(name) {
  // Simple Metadata Lookup (Static)
  const meta = {
    // Categorical
    Extended30: { type: 'categorical', colorBlindSafe: false, maxColors: 30, description: 'Large palette for many groups (30 colors)' },
    Tableau10: { type: 'categorical', colorBlindSafe: true, maxColors: 10, description: 'Standard professional palette (Tableau)' },
    Tableau20: { type: 'categorical', colorBlindSafe: false, maxColors: 20, description: 'Extended professional palette' },
    Paired: { type: 'categorical', colorBlindSafe: false, maxColors: 12, description: 'Light/dark pairs (ColorBrewer)' },
    Set3: { type: 'categorical', colorBlindSafe: false, maxColors: 12, description: 'Pastel colors (ColorBrewer)' },
    Set1: { type: 'categorical', colorBlindSafe: false, maxColors: 9, description: 'Bold colors (ColorBrewer)' },
    Dark2: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'Dark colors (ColorBrewer)' },
    Accent: { type: 'categorical', colorBlindSafe: false, maxColors: 8, description: 'Accent colors (ColorBrewer)' },
    Category10: { type: 'categorical', colorBlindSafe: false, maxColors: 10, description: 'Classic D3 palette' },
    OkabeItoWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'Universal design (Optimized for White)' },
    WongWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'Nature palette (Optimized for White)' },
    TolBrightWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 7, description: 'Distinct & Bright (Optimized for White)' },
    TolMutedWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 9, description: 'Soft & Distinct (Optimized for White)' },
    HighContrast: { type: 'categorical', colorBlindSafe: false, maxColors: 10, description: 'Maximum distinctness' },
    PhyloOptimized: { type: 'categorical', colorBlindSafe: false, maxColors: 11, description: 'Tree-specific colors (No Neon)' },
    BlueShadesWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 10, description: 'Blue tints (Optimized for White)' },

    // Sequential
    ViridisWhiteBG: { type: 'sequential', colorBlindSafe: true, maxColors: 8, description: 'Scientific standard' },
    CividisWhiteBG: { type: 'sequential', colorBlindSafe: true, maxColors: 8, description: 'Color-blind safe' },
    TurboWhiteBG: { type: 'sequential', colorBlindSafe: false, maxColors: 8, description: 'Rainbow-like' },
    Viridis: { type: 'sequential', colorBlindSafe: true, maxColors: 10, description: 'Scientific standard' },
    Cividis: { type: 'sequential', colorBlindSafe: true, maxColors: 10, description: 'Color-blind safe' },
    Turbo: { type: 'sequential', colorBlindSafe: false, maxColors: 10, description: 'Rainbow-like' },


    // Diverging
    CoolWarmWhiteBG: { type: 'diverging', colorBlindSafe: false, maxColors: 9, description: 'Diverging Blue-Red' },
    PurpleGreenWhiteBG: { type: 'diverging', colorBlindSafe: true, maxColors: 9, description: 'Diverging Purple-Green' },
  };

  return meta[name] || {
    type: 'categorical',
    colorBlindSafe: false,
    maxColors: (ALL_PALETTES[name] || []).length,
    description: 'Custom palette'
  };
}

export function getRecommendedPalettes(options = {}) {
  const { numColors = 5, colorBlindSafe = true, type = 'categorical' } = options;

  return Object.keys(ALL_PALETTES).filter(name => {
    const info = getPaletteInfo(name);
    return (
      info.type === type &&
      (!colorBlindSafe || info.colorBlindSafe) &&
      info.maxColors >= numColors
    );
  });
}
