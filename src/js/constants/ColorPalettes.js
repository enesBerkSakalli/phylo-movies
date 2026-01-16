/**
 * ColorPalettes.js - Centralized color palette definitions for the application
 *
 * These palettes are designed for:
 * - Accessibility (WCAG AA contrast ratios)
 * - Color-blind friendliness
 * - Visual distinctiveness in phylogenetic tree visualization
 * - Professional aesthetics (Tableau-style) sans "neon" vibration
 */

// ============================================
// PROFESSIONAL CATEGORICAL PALETTES (Standard)
// ============================================

/**
 * Tableau 10 - The Gold Standard for data visualization.
 * Distinct, not neon, perfectly balanced.
 */
export const Tableau10 = [
  "#4E79A7", // Blue
  "#F28E2B", // Orange
  "#E15759", // Red
  "#76B7B2", // Teal
  "#59A14F", // Green
  "#EDC948", // Yellow
  "#B07AA1", // Purple
  "#FF9DA7", // Pink
  "#9C755F", // Brown
  "#BAB0AC"  // Grey
];

/**
 * Tableau 20 - Extended version for high-cardinality data.
 * Pairs light/dark versions of 10 hues.
 */
export const Tableau20 = [
  "#4E79A7", "#A0CBE8",
  "#F28E2B", "#FFBE7D",
  "#59A14F", "#8CD17D",
  "#B6992D", "#F1CE63", // Yellow-Green replacement for pure yellow
  "#499894", "#86BCB6",
  "#E15759", "#FF9D9A",
  "#B07AA1", "#D4A6C8",
  "#9D7660", "#D7B5A6",
  "#79706E", "#BAB0AC",
  "#D37295", "#FABFD2"
];

// ============================================
// ACCESSIBLE CATEGORICAL PALETTES
// ============================================

/**
 * Paul Tol's color schemes - Optimized for color-blind accessibility
 * Source: https://personal.sron.nl/~pault/
 */
export const TolBright = [
  "#EE7733", // Orange
  "#0077BB", // Blue
  "#33BBEE", // Cyan
  "#009988", // Teal
  "#CC3311", // Red
  "#EE3377", // Magenta
  "#BBBBBB", // Grey
];

/**
 * Tol Bright (white-bg optimized)
 * Adjusted to increase contrast on white (darker grey)
 */
export const TolBrightWhiteBG = [
  "#D96622", // darkened from #EE7733
  "#0077BB",
  "#0088AA", // darkened from #33BBEE
  "#008877", // darkened
  "#CC3311",
  "#EE3377",
  "#777777", // darkened from #BBBBBB
];

export const TolMuted = [
  "#CC6677", // Rose
  "#332288", // Indigo
  "#DDCC77", // Sand
  "#117733", // Green
  "#88CCEE", // Sky blue
  "#882255", // Wine
  "#44AA99", // Teal
  "#999933", // Olive
  "#AA4499", // Purple
];

/**
 * Tol Muted (white-bg optimized)
 * Slightly darkened sand to read better on white
 */
export const TolMutedWhiteBG = [
  "#CC6677",
  "#332288",
  "#BBAA33", // darker sand
  "#117733",
  "#66AADD", // darker sky blue
  "#882255",
  "#44AA99",
  "#8A8A33", // slightly darker olive
  "#AA4499",
];

/**
 * Wong's color palette - Nature-optimized for color-blindness
 * Source: Wong, B. Nature Methods 2011
 */
export const WongPalette = [
  "#E69F00", // Orange
  "#56B4E9", // Sky blue
  "#009E73", // Bluish green
  "#F0E442", // Yellow
  "#0072B2", // Blue
  "#D55E00", // Vermillion
  "#CC79A7", // Reddish purple
  "#999999", // Grey
];

/**
 * Wong (white-bg optimized)
 * Darkened yellow and grey for better stroke visibility on white
 */
export const WongWhiteBG = [
  "#D55E00", // Vermil
  "#0072B2", // Blue
  "#009E73", // Green
  "#CC79A7", // Purple
  "#E69F00", // Orange
  "#56B4E9", // Sky
  "#999900", // Darkened Yellow
  "#777777", // Darkened Grey
];

/**
 * Okabe-Ito - Universal design for color-blindness
 */
export const OkabeIto = [
  "#E69F00", // Orange
  "#56B4E9", // Sky blue
  "#009E73", // Green
  "#F0E442", // Yellow
  "#0072B2", // Blue
  "#D55E00", // Vermillion
  "#CC79A7", // Pink
  "#333333", // Dark Grey replacement for black
];

export const OkabeItoWhiteBG = [
  "#D55E00",
  "#0072B2",
  "#009E73",
  "#CC79A7",
  "#E69F00",
  "#4C9ED9", // darker sky
  "#B3A800", // darker yellow
  "#444444",
];


// ============================================
// SPECIALIZED PALETTES
// ============================================

/**
 * Phylogenetic-optimized palette (REFACTORED)
 * Removed neons. Used Glasbey-style distinct colors but with constrained lightness.
 */
export const PhyloOptimized = [
  "#C0392B", // Deep Red
  "#2980B9", // Strong Blue
  "#27AE60", // Green
  "#8E44AD", // Purple
  "#D35400", // Pumpkin
  "#16A085", // Teal
  "#F39C12", // Orange
  "#2C3E50", // Midnight
  "#7F8C8D", // Asbestos
  "#C0392B", // Pomegranate
  "#E74C3C", // Alizarin
  "#9B59B6"  // Amethyst
];

/**
 * High contrast palette - Professional Edition
 * No #FF00FF or #00FFFF.
 */
export const HighContrast = [
  "#E31A1C", // Red
  "#1F78B4", // Blue
  "#33A02C", // Green
  "#6A3D9A", // Purple
  "#FF7F00", // Orange
  "#B15928", // Brown
  "#A6CEE3", // Light Blue
  "#B2DF8A", // Light Green
  "#FDBF6F", // Light Orange
  "#CAB2D6"  // Light Purple
];

// ============================================
// BLUE-FOCUSED PALETTES
// ============================================

export const BlueShades = [
  "#E3F2FD",
  "#BBDEFB",
  "#90CAF9",
  "#64B5F6",
  "#42A5F5",
  "#2196F3",
  "#1E88E5",
  "#1976D2",
  "#1565C0",
  "#0D47A1"
];

export const BlueShadesWhiteBG = [
  "#A6C8FF",
  "#82B1FF",
  "#5E9BFF",
  "#3B85FF",
  "#1976D2",
  "#1565C0",
  "#0D47A1",
  "#0A3A79",
  "#072D62",
  "#04214A"
];

// ============================================
// SEQUENTIAL PALETTES
// ============================================

export const Viridis = [
  "#440154", "#482777", "#3e4989", "#31688e", "#26828e",
  "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"
];

export const ViridisWhiteBG = [
  "#440154", "#482777", "#3e4989", "#31688e", "#26828e",
  "#1f9e89", "#35b779", "#6ece58" // Clipped yellow
];

export const Cividis = [
  "#00204D", "#002D6C", "#16406C", "#3B496C", "#555068",
  "#6C5B5D", "#7F6850", "#958B43", "#B1B338", "#FFEA46"
];

export const CividisWhiteBG = [
  "#00204D", "#002D6C", "#16406C", "#3B496C", "#555068",
  "#6C5B5D", "#7F6850", "#958B43"
];

export const Turbo = [
  "#30123B", "#4662D7", "#36AAF9", "#1AE4B6", "#72FE5E",
  "#C7EF34", "#FBCA36", "#F66B19", "#CA2B1F", "#7A0403"
];

export const TurboWhiteBG = [
  "#30123B", "#4662D7", "#36AAF9", "#1AE4B6", "#62D650",
  "#D9B22F", "#D65A12", "#A82218"
];

// ============================================
// DIVERGING PALETTES
// ============================================

export const CoolWarm = [
  "#3B4CC0", "#6788EE", "#9ABBFF", "#C9DDFF", "#F0F0F0",
  "#FFDDAA", "#FF9A56", "#E65F2B", "#B40426"
];

export const CoolWarmWhiteBG = [
  "#3B4CC0", "#5F80E6", "#8FB3F7", "#B5CFFF", "#BFBFBF",
  "#FFC27A", "#FF8A40", "#D55224", "#B40426"
];

export const PurpleGreen = [
  "#762A83", "#9970AB", "#C2A5CF", "#E7D4E8", "#F7F7F7",
  "#D9F0D3", "#ACD39E", "#5AAE61", "#1B7837"
];

export const PurpleGreenWhiteBG = [
  "#762A83", "#8E66A2", "#B896C6", "#D7BEDC", "#BFBFBF",
  "#BEE5B8", "#93C98E", "#4C9D58", "#1B7837"
];

// ============================================
// PALETTE COLLECTIONS
// ============================================

export const CATEGORICAL_PALETTES = {
  // New Standards
  Tableau10,
  Tableau20,

  // Optimized for White Background
  OkabeItoWhiteBG,
  WongWhiteBG,
  TolBrightWhiteBG,
  TolMutedWhiteBG,
  HighContrast, // Updated to be safe
  PhyloOptimized, // Updated to be safe

  // Legacy/Contextual
  BlueShadesWhiteBG,
};

export const SEQUENTIAL_PALETTES = {
  ViridisWhiteBG,
  CividisWhiteBG,
  TurboWhiteBG,
  // Keep originals accessible
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

/**
 * Get a color palette by name
 */
export function getPalette(name) {
  return ALL_PALETTES[name] || Tableau10;
}

/**
 * Get palette metadata
 */
export function getPaletteInfo(name) {
  const meta = {
    // Categorical
    Tableau10: { type: 'categorical', colorBlindSafe: true, maxColors: 10, description: 'Standard professional palette (Tableau)' },
    Tableau20: { type: 'categorical', colorBlindSafe: false, maxColors: 20, description: 'Extended professional palette for many groups' },
    OkabeItoWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'Universal design (Optimized for White)' },
    WongWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'Nature palette (Optimized for White)' },
    TolBrightWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 7, description: 'Distinct & Bright (Optimized for White)' },
    TolMutedWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 9, description: 'Soft & Distinct (Optimized for White)' },
    HighContrast: { type: 'categorical', colorBlindSafe: false, maxColors: 10, description: 'Maximum distinctness without neon vibration' },
    PhyloOptimized: { type: 'categorical', colorBlindSafe: false, maxColors: 12, description: 'Tree-specific colors (No Neon)' },
    BlueShadesWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 10, description: 'Blue tints (Optimized for White)' },

    // Sequential
    ViridisWhiteBG: { type: 'sequential', colorBlindSafe: true, maxColors: 8, description: 'Scientific standard (White BG)' },
    CividisWhiteBG: { type: 'sequential', colorBlindSafe: true, maxColors: 8, description: 'Color-blind safe (White BG)' },
    TurboWhiteBG: { type: 'sequential', colorBlindSafe: false, maxColors: 8, description: 'Rainbow-like (White BG)' },

    // Diverging
    CoolWarmWhiteBG: { type: 'diverging', colorBlindSafe: false, maxColors: 9, description: 'Diverging Blue-Red (White BG)' },
    PurpleGreenWhiteBG: { type: 'diverging', colorBlindSafe: true, maxColors: 9, description: 'Diverging Purple-Green (White BG)' },
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
