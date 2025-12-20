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

/**
 * Tol Bright (white-bg optimized)
 * Adjusted to increase contrast on white (darker grey)
 */
export const TolBrightWhiteBG = [
  "#EE7733",
  "#0077BB",
  "#33BBEE",
  "#009988",
  "#CC3311",
  "#EE3377",
  "#6E6E6E", // darker grey for white backgrounds
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
  "#88CCEE",
  "#882255",
  "#44AA99",
  "#8A8A33", // slightly darker olive
  "#AA4499",
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
 * Tol Vibrant (white-bg optimized)
 * Darker grey, rest unchanged
 */
export const TolVibrantWhiteBG = [
  "#EE7733",
  "#0077BB",
  "#33BBEE",
  "#009988",
  "#CC3311",
  "#EE3377",
  "#6E6E6E", // darker grey
  "#000000",
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
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#B59F00", // darker yellow
  "#0072B2",
  "#D55E00",
  "#CC79A7",
  "#666666", // darker grey
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
 * Okabe-Ito (white-bg optimized)
 * Darkened yellow for white background
 */
export const OkabeItoWhiteBG = [
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#B3A800", // darker yellow
  "#0072B2",
  "#D55E00",
  "#CC79A7",
  "#000000",
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

/**
 * IBM (white-bg optimized)
 * Darker neutral; keep strong category colors
 */
export const IBMColorBlindWhiteBG = [
  "#648FFF",
  "#785EF0",
  "#DC267F",
  "#FE6100",
  "#D99000", // slightly darker gold
  "#3DBA1E", // slightly darker green to reduce brightness on white
  "#007E61", // slightly darker teal
  "#6F6F6F", // darker grey
];

// ============================================
// BLUE-FOCUSED PALETTES
// ============================================

/**
 * Blue Shades (categorical) – distinct tints/tones of blue
 * Useful where a single-hue family is preferred (e.g., blue-themed projects)
 */
export const BlueShades = [
  "#E3F2FD", // very light
  "#BBDEFB",
  "#90CAF9",
  "#64B5F6",
  "#42A5F5",
  "#2196F3",
  "#1E88E5",
  "#1976D2",
  "#1565C0",
  "#0D47A1"  // very dark
];

/**
 * Blue Shades (white-bg optimized) – avoid very light tints on white
 */
export const BlueShadesWhiteBG = [
  "#BBD9FF",
  "#90BDF9",
  "#6CA9F4",
  "#4D9AF2",
  "#2E8AEF",
  "#1976D2",
  "#1565C0",
  "#1152A6",
  "#0E468F",
  "#0A3A79"
];

/**
 * Blue Sequential – perceptual light→dark blue ramp
 */
export const BlueSequential = [
  "#E7F0FA", "#CFE2F3", "#B7D3ED", "#9EC5E6", "#86B7DF",
  "#6EA9D9", "#559BD2", "#3D8DCB", "#257FC5", "#0D71BE"
];

/**
 * Blue Sequential (white-bg optimized) – clip near-white bins
 */
export const BlueSequentialWhiteBG = [
  "#B7D3ED", "#9EC5E6", "#86B7DF", "#6EA9D9",
  "#559BD2", "#3D8DCB", "#257FC5", "#0D71BE"
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
 * Viridis (white-bg optimized)
 * Clip the two lightest bins to avoid near-white yellows on white
 */
export const ViridisWhiteBG = [
  "#440154", "#482777", "#3e4989", "#31688e", "#26828e",
  "#1f9e89", "#35b779", "#6ece58"
];

/**
 * Cividis - Color-blind optimized version of Viridis
 */
export const Cividis = [
  "#00204D", "#002D6C", "#16406C", "#3B496C", "#555068",
  "#6C5B5D", "#7F6850", "#958B43", "#B1B338", "#FFEA46"
];

/**
 * Cividis (white-bg optimized)
 * Clip the brightest yellows to improve contrast on white
 */
export const CividisWhiteBG = [
  "#00204D", "#002D6C", "#16406C", "#3B496C", "#555068",
  "#6C5B5D", "#7F6850", "#958B43"
];

/**
 * Turbo - Rainbow-like but perceptually uniform
 */
export const Turbo = [
  "#30123B", "#4662D7", "#36AAF9", "#1AE4B6", "#72FE5E",
  "#C7EF34", "#FBCA36", "#F66B19", "#CA2B1F", "#7A0403"
];

/**
 * Turbo (white-bg optimized)
 * Remove the brightest yellow/orange bins
 */
export const TurboWhiteBG = [
  "#30123B", "#4662D7", "#36AAF9", "#1AE4B6", "#72FE5E",
  "#F66B19", "#CA2B1F", "#7A0403"
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
 * CoolWarm (white-bg optimized)
 * Darken the center neutral and adjacent lights for visibility on white
 */
export const CoolWarmWhiteBG = [
  "#3B4CC0", "#5F80E6", "#8FB3F7", "#B5CFFF", "#D9D9D9",
  "#FFC27A", "#FF8A40", "#D55224", "#B40426"
];

/**
 * Purple-Green diverging (color-blind safe)
 */
export const PurpleGreen = [
  "#762A83", "#9970AB", "#C2A5CF", "#E7D4E8", "#F7F7F7",
  "#D9F0D3", "#ACD39E", "#5AAE61", "#1B7837"
];

/**
 * Purple-Green (white-bg optimized)
 * Darken the neutral midpoint and adjacent tints
 */
export const PurpleGreenWhiteBG = [
  "#762A83", "#8E66A2", "#B896C6", "#D7BEDC", "#D9D9D9",
  "#BEE5B8", "#93C98E", "#4C9D58", "#1B7837"
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
 * Phylo-Optimized (white-bg optimized)
 * Reduce very light tints for better small-stroke visibility
 */
export const PhyloOptimizedWhiteBG = [
  "#E95A5A", // darker coral red
  "#3FB8B0", // darker teal
  "#349CC0", // darker sky blue
  "#E26D5A", // darker salmon
  "#63B7A8", // darker mint
  "#5A4DD1", // darker purple
  "#D99A00", // darker yellow
  "#2979FF", // deeper blue
  "#E06398", // darker pink
  "#6F6AF2", // darker lavender
  "#00A07F", // darker green
  "#E95F5E", // darker red
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
  // White-background optimized first
  BlueShadesWhiteBG,
  OkabeItoWhiteBG,
  WongWhiteBG,
  TolBrightWhiteBG,
  TolMutedWhiteBG,
  TolVibrantWhiteBG,
  IBMColorBlindWhiteBG,
  PhyloOptimizedWhiteBG,

  // Originals
  BlueShades,
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
  BlueSequentialWhiteBG,
  ViridisWhiteBG,
  CividisWhiteBG,
  TurboWhiteBG,
  BlueSequential,
  Viridis,
  Cividis,
  Turbo,
};

/**
 * Diverging palettes for comparative data
 */
export const DIVERGING_PALETTES = {
  CoolWarmWhiteBG,
  PurpleGreenWhiteBG,
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
  // Default to a white-background friendly categorical palette
  return ALL_PALETTES[name] || OkabeItoWhiteBG;
}

/**
 * Get palette metadata
 * @param {string} name - Palette name
 * @returns {Object} Palette information
 */
export function getPaletteInfo(name) {
  const paletteMeta = {
    // Categorical
    BlueShadesWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 10, description: 'Blue tints/tones tuned for white background' },
    OkabeItoWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'Okabe-Ito tuned for white background' },
    WongWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'Wong palette tuned for white background' },
    TolBrightWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 7, description: 'Tol Bright tuned for white background' },
    TolMutedWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 9, description: 'Tol Muted tuned for white background' },
    TolVibrantWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'Tol Vibrant tuned for white background' },
    IBMColorBlindWhiteBG: { type: 'categorical', colorBlindSafe: true, maxColors: 8, description: 'IBM accessible palette tuned for white background' },
    PhyloOptimizedWhiteBG: { type: 'categorical', colorBlindSafe: false, maxColors: 12, description: 'Tree-optimized palette tuned for white background' },
    BlueShades: { type: 'categorical', colorBlindSafe: true, maxColors: 10, description: 'Blue tints/tones (single-hue categorical)' },
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
    BlueSequentialWhiteBG: { type: 'sequential', colorBlindSafe: true, maxColors: 8, description: 'Blue ramp clipped for white background' },
    ViridisWhiteBG: { type: 'sequential', colorBlindSafe: true, maxColors: 8, description: 'Viridis clipped for white background' },
    CividisWhiteBG: { type: 'sequential', colorBlindSafe: true, maxColors: 8, description: 'Cividis clipped for white background' },
    TurboWhiteBG: { type: 'sequential', colorBlindSafe: false, maxColors: 8, description: 'Turbo clipped for white background' },
    BlueSequential: { type: 'sequential', colorBlindSafe: true, maxColors: 10, description: 'Perceptual light→dark blue ramp' },
    Viridis: { type: 'sequential', colorBlindSafe: true, maxColors: 10, description: 'Scientific standard, perceptually uniform' },
    Cividis: { type: 'sequential', colorBlindSafe: true, maxColors: 10, description: 'Color-blind optimized Viridis' },
    Turbo: { type: 'sequential', colorBlindSafe: false, maxColors: 10, description: 'Rainbow-like, perceptually uniform' },

    // Diverging
    CoolWarmWhiteBG: { type: 'diverging', colorBlindSafe: false, maxColors: 9, description: 'Cool-Warm tuned for white background' },
    PurpleGreenWhiteBG: { type: 'diverging', colorBlindSafe: true, maxColors: 9, description: 'Purple-Green tuned for white background' },
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

// Default export removed for clarity — use named exports (`getPalette`, `CATEGORICAL_PALETTES`, etc.)
