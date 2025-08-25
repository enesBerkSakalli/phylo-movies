/**
 * ColorPalettes.js - Centralized color palette definitions for the application
 * 
 * These palettes are designed for:
 * - Accessibility (WCAG AA contrast ratios)
 * - Color-blind friendliness
 * - Visual distinctiveness in phylogenetic tree visualization
 */

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

export const TolVibrant = [
  "#EE7733", // Orange
  "#0077BB", // Blue
  "#33BBEE", // Cyan
  "#009988", // Teal
  "#CC3311", // Red
  "#EE3377", // Magenta
  "#BBBBBB", // Grey
  "#000000", // Black
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
 * Okabe-Ito palette - Universal design for color-blindness
 * Source: Okabe & Ito 2008
 */
export const OkabeIto = [
  "#E69F00", // Orange
  "#56B4E9", // Sky blue
  "#009E73", // Green
  "#F0E442", // Yellow
  "#0072B2", // Blue
  "#D55E00", // Vermillion
  "#CC79A7", // Pink
  "#000000", // Black
];

/**
 * Material Design 3 - Vibrant palette
 * Optimized for modern UI with good contrast
 */
export const MaterialVibrant = [
  "#6750A4", // Primary purple
  "#0061A4", // Blue
  "#006E2C", // Green
  "#B3261E", // Red
  "#9C4500", // Orange
  "#8E3A80", // Magenta
  "#006874", // Teal
  "#605D62", // Neutral
];

/**
 * IBM Design - Accessible palette
 * Tested for WCAG AA compliance
 */
export const IBMColorBlind = [
  "#648FFF", // Blue
  "#785EF0", // Purple
  "#DC267F", // Magenta
  "#FE6100", // Orange
  "#FFB000", // Gold
  "#61D836", // Green
  "#009473", // Teal
  "#C4C4C4", // Grey
];

// ============================================
// SEQUENTIAL PALETTES (for gradients)
// ============================================

/**
 * Viridis - Perceptually uniform and color-blind safe
 * Popular in scientific visualization
 */
export const Viridis = [
  "#440154", "#482777", "#3e4989", "#31688e", "#26828e",
  "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"
];

/**
 * Cividis - Color-blind optimized version of Viridis
 */
export const Cividis = [
  "#00204D", "#002D6C", "#16406C", "#3B496C", "#555068",
  "#6C5B5D", "#7F6850", "#958B43", "#B1B338", "#FFEA46"
];

/**
 * Turbo - Rainbow-like but perceptually uniform
 */
export const Turbo = [
  "#30123B", "#4662D7", "#36AAF9", "#1AE4B6", "#72FE5E",
  "#C7EF34", "#FBCA36", "#F66B19", "#CA2B1F", "#7A0403"
];

// ============================================
// DIVERGING PALETTES (for comparisons)
// ============================================

/**
 * Cool-Warm diverging palette
 * Good for showing differences/changes
 */
export const CoolWarm = [
  "#3B4CC0", "#6788EE", "#9ABBFF", "#C9DDFF", "#F0F0F0",
  "#FFDDAA", "#FF9A56", "#E65F2B", "#B40426"
];

/**
 * Purple-Green diverging (color-blind safe)
 */
export const PurpleGreen = [
  "#762A83", "#9970AB", "#C2A5CF", "#E7D4E8", "#F7F7F7",
  "#D9F0D3", "#ACD39E", "#5AAE61", "#1B7837"
];

// ============================================
// SPECIALIZED PALETTES
// ============================================

/**
 * Phylogenetic-optimized palette
 * Designed specifically for tree visualization with high contrast
 */
export const PhyloOptimized = [
  "#FF6B6B", // Coral red
  "#4ECDC4", // Teal
  "#45B7D1", // Sky blue
  "#FFA07A", // Light salmon
  "#98D8C8", // Mint
  "#6C5CE7", // Purple
  "#FDCB6E", // Yellow
  "#55A3FF", // Blue
  "#FD79A8", // Pink
  "#A29BFE", // Lavender
  "#00B894", // Green
  "#FF7675", // Red
];

/**
 * High contrast palette for maximum visibility
 */
export const HighContrast = [
  "#FF0000", // Red
  "#0000FF", // Blue
  "#00AA00", // Green
  "#FF00FF", // Magenta
  "#00FFFF", // Cyan
  "#FFAA00", // Orange
  "#AA00FF", // Purple
  "#000000", // Black
];

// ============================================
// PALETTE COLLECTIONS
// ============================================

/**
 * Categorical palettes for discrete groups
 */
export const CATEGORICAL_PALETTES = {
  TolBright,
  TolMuted,
  TolVibrant,
  WongPalette,
  OkabeIto,
  MaterialVibrant,
  IBMColorBlind,
  PhyloOptimized,
  HighContrast,
};

/**
 * Sequential palettes for continuous data
 */
export const SEQUENTIAL_PALETTES = {
  Viridis,
  Cividis,
  Turbo,
};

/**
 * Diverging palettes for comparative data
 */
export const DIVERGING_PALETTES = {
  CoolWarm,
  PurpleGreen,
};

/**
 * All palettes combined (for backward compatibility)
 */
export const ALL_PALETTES = {
  ...CATEGORICAL_PALETTES,
  ...SEQUENTIAL_PALETTES,
  ...DIVERGING_PALETTES,
};

/**
 * Get a color palette by name
 * @param {string} name - Palette name
 * @returns {string[]} Array of hex color codes
 */
export function getPalette(name) {
  return ALL_PALETTES[name] || TolBright;
}

/**
 * Get palette metadata
 * @param {string} name - Palette name
 * @returns {Object} Palette information
 */
export function getPaletteInfo(name) {
  const paletteMeta = {
    // Categorical
    TolBright: { type: 'categorical', colorBlindSafe: true, maxColors: 7, description: 'Bright, color-blind friendly' },
    TolMuted: { type: 'categorical', colorBlindSafe: true, maxColors: 9, description: 'Muted, color-blind friendly' },
    TolVibrant: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'Vibrant, color-blind friendly' },
    WongPalette: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'Nature-optimized for accessibility' },
    OkabeIto: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'Universal design standard' },
    MaterialVibrant: { type: 'categorical', colorBlindSafe: false, maxColors: 8, description: 'Material Design 3 colors' },
    IBMColorBlind: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'IBM accessible design' },
    PhyloOptimized: { type: 'categorical', colorBlindSafe: false, maxColors: 12, description: 'Optimized for tree visualization' },
    HighContrast: { type: 'categorical', colorBlindSafe: false, maxColors: 8, description: 'Maximum contrast' },
    
    // Sequential
    Viridis: { type: 'sequential', colorBlindSafe: true, maxColors: 10, description: 'Scientific standard, perceptually uniform' },
    Cividis: { type: 'sequential', colorBlindSafe: true, maxColors: 10, description: 'Color-blind optimized Viridis' },
    Turbo: { type: 'sequential', colorBlindSafe: false, maxColors: 10, description: 'Rainbow-like, perceptually uniform' },
    
    // Diverging
    CoolWarm: { type: 'diverging', colorBlindSafe: false, maxColors: 9, description: 'Blue to red diverging' },
    PurpleGreen: { type: 'diverging', colorBlindSafe: true, maxColors: 9, description: 'Color-blind safe diverging' },
  };
  
  return paletteMeta[name] || { type: 'unknown', colorBlindSafe: false, maxColors: 0, description: 'Unknown palette' };
}

/**
 * Get recommended palettes based on use case
 * @param {Object} options - { numColors, colorBlindSafe, type }
 * @returns {string[]} Array of recommended palette names
 */
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

// Export default for backward compatibility
export default ALL_PALETTES;