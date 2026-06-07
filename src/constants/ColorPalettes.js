/**
 * ColorPalettes.js - Centralized color palette definitions
 *
 * Sources:
 * - D3 (Standard Palettes): Tableau10, Viridis, Turbo, etc.
 * - Custom: PhyloOptimized, HighContrast (Manually defined)
 *
 * All palettes are automatically processed to ensure APCA >= 45 contrast against white.
 */

import {
  interpolateCividis,
  interpolatePRGn,
  interpolateRainbow,
  interpolateRdBu,
  interpolateSinebow,
  interpolateSpectral,
  interpolateTurbo,
  interpolateViridis,
  schemeAccent,
  schemeCategory10,
  schemeDark2,
  schemePaired,
  schemeSet1,
  schemeSet3,
  schemeTableau10,
} from 'd3-scale-chromatic';
import Color from 'colorjs.io';

// ============================================
// ACCESSIBILITY UTILS
// ============================================

// APCA 45 is sufficient for visual elements (nodes, branches, labels with outlines)
// APCA 60 is recommended for body text, but too aggressive for visualization colors
const TARGET_LC = 45;
const WHITE = new Color('white');
const OKLCH_CATEGORICAL_LIGHTNESSES = [0.42, 0.5, 0.58, 0.66];
const OKLCH_CATEGORICAL_CHROMAS = [0.14, 0.2, 0.26];
const OKLCH_CATEGORICAL_HUE_STEP = 8;
const OKLCH_MIN_CHROMA = 0.08;
let oklchCategoricalCandidatesCache = null;

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbArrayToHex(rgb) {
  return `#${rgb.map((channel) => clampByte(channel).toString(16).padStart(2, '0')).join('')}`;
}

function srgbColorToRgbArray(color) {
  const srgb = color.to('srgb').toGamut({ space: 'srgb' });
  return srgb.coords.map((coord) => clampByte(coord * 255));
}

function colorToHex(color) {
  return rgbArrayToHex(srgbColorToRgbArray(color));
}

function toAccessibleSrgbColor(color) {
  let fixed = color.to('oklch');
  let safety = 0;

  while (
    Math.abs(WHITE.contrast(fixed.to('srgb').toGamut({ space: 'srgb' }), 'APCA')) < TARGET_LC &&
    safety < 100
  ) {
    fixed.l -= 0.01;
    safety++;
  }

  return fixed.to('srgb').toGamut({ space: 'srgb' });
}

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
  } catch (_error) {
    console.warn('Invalid color:', hexStr);
    return '#000000';
  }

  if (Math.abs(WHITE.contrast(color, 'APCA')) >= TARGET_LC) {
    return hexStr; // Already valid
  }

  return colorToHex(toAccessibleSrgbColor(color));
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

function buildOklchCategoricalCandidates() {
  if (oklchCategoricalCandidatesCache) {
    return oklchCategoricalCandidatesCache;
  }

  const candidatesByHex = new Map();

  for (const l of OKLCH_CATEGORICAL_LIGHTNESSES) {
    for (const c of OKLCH_CATEGORICAL_CHROMAS) {
      for (let h = 0; h < 360; h += OKLCH_CATEGORICAL_HUE_STEP) {
        const srgb = toAccessibleSrgbColor(new Color('oklch', [l, c, h]));
        const rgb = srgbColorToRgbArray(srgb);
        const candidate = new Color(
          'srgb',
          rgb.map((channel) => channel / 255)
        );
        const [, chroma] = candidate.to('oklch').coords;

        if (!Number.isFinite(chroma) || chroma < OKLCH_MIN_CHROMA) {
          continue;
        }

        if (Math.abs(WHITE.contrast(candidate, 'APCA')) < TARGET_LC - 0.1) {
          continue;
        }

        const hex = rgbArrayToHex(rgb);
        if (!candidatesByHex.has(hex)) {
          candidatesByHex.set(hex, { hex, color: candidate });
        }
      }
    }
  }

  oklchCategoricalCandidatesCache = [...candidatesByHex.values()];
  return oklchCategoricalCandidatesCache;
}

function selectMaximinPalette(candidates, count) {
  if (count <= 0) return [];
  if (candidates.length === 0) return [];

  const seed = new Color('#E41A1C');
  let seedIndex = 0;
  let closestSeedDistance = Infinity;

  for (let i = 0; i < candidates.length; i++) {
    const distance = candidates[i].color.deltaE(seed, '2000');
    if (distance < closestSeedDistance) {
      closestSeedDistance = distance;
      seedIndex = i;
    }
  }

  const chosen = [seedIndex];
  const remaining = new Set(candidates.map((_, index) => index));
  remaining.delete(seedIndex);

  while (chosen.length < count && remaining.size > 0) {
    let bestIndex = null;
    let bestScore = -Infinity;

    for (const candidateIndex of remaining) {
      const candidate = candidates[candidateIndex].color;
      let minPeerDistance = Infinity;

      for (const chosenIndex of chosen) {
        const distance = candidate.deltaE(candidates[chosenIndex].color, '2000');
        if (distance < minPeerDistance) {
          minPeerDistance = distance;
        }
      }

      const backgroundDistance = candidate.deltaE(WHITE, '2000');
      const score = Math.min(minPeerDistance, backgroundDistance * 0.65);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = candidateIndex;
      }
    }

    if (bestIndex == null) break;
    chosen.push(bestIndex);
    remaining.delete(bestIndex);
  }

  return chosen.map((index) => candidates[index].hex);
}

function generateOklchCategoricalPalette(n) {
  if (n <= 0) return [];
  if (n === 1) return createAccessiblePalette(['#4E79A7']); // Tableau blue

  return selectMaximinPalette(buildOklchCategoricalCandidates(), n);
}

/**
 * Dynamically generates a palette of exactly N colors.
 * The default categorical generator samples OKLCH candidates and greedily maximizes
 * CIEDE2000 distance while enforcing contrast on the white tree canvas.
 * D3 interpolator names are still supported for explicit legacy/sequential use.
 * @param {number} n - Number of colors needed
 * @param {string} scheme - Optional: 'categorical', 'oklch', 'rainbow', 'sinebow', 'turbo', 'spectral'
 * @returns {string[]} - Array of N accessible hex colors
 */
export function generatePalette(n, scheme = 'categorical') {
  if (n <= 0) return [];
  if (n === 1) return createAccessiblePalette(['#4E79A7']); // Tableau blue

  if (scheme === 'categorical' || scheme === 'oklch') {
    return generateOklchCategoricalPalette(n);
  }

  const interpolators = {
    sinebow: interpolateSinebow,
    rainbow: interpolateRainbow,
    turbo: interpolateTurbo,
    spectral: interpolateSpectral,
  };

  const interpolator = interpolators[scheme];
  if (!interpolator) {
    return generateOklchCategoricalPalette(n);
  }

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
export const Tableau10 = createAccessiblePalette(schemeTableau10);

/**
 * Tableau 20 - Manual Definition (D3 export often missing schemeTableau20 in standard bundle)
 * We treat this as a "backup" source but fix it for accessibility.
 */
export const Tableau20 = createAccessiblePalette([
  '#4E79A7',
  '#A0CBE8',
  '#F28E2B',
  '#FFBE7D',
  '#59A14F',
  '#8CD17D',
  '#B6992D',
  '#F1CE63',
  '#499894',
  '#86BCB6',
  '#E15759',
  '#FF9D9A',
  '#B07AA1',
  '#D4A6C8',
  '#9D7660',
  '#D7B5A6',
  '#79706E',
  '#BAB0AC',
  '#D37295',
  '#FABFD2',
]);

/**
 * D3 ColorBrewer Paired - 12 colors in light/dark pairs
 * Good for related categories (e.g., genotype variants)
 */
export const Paired = createAccessiblePalette(schemePaired);

/**
 * D3 ColorBrewer Set3 - 12 pastel colors
 * Good for many categories with softer appearance
 */
export const Set3 = createAccessiblePalette(schemeSet3);

/**
 * D3 ColorBrewer Set1 - 9 bold colors
 * High saturation, very distinct
 */
export const Set1 = createAccessiblePalette(schemeSet1);

/**
 * D3 ColorBrewer Dark2 - 8 darker colors
 * Good contrast on white backgrounds
 */
export const Dark2 = createAccessiblePalette(schemeDark2);

/**
 * D3 ColorBrewer Accent - 8 accent colors
 */
export const Accent = createAccessiblePalette(schemeAccent);

/**
 * D3 Category10 - Classic D3 categorical palette
 */
export const Category10 = createAccessiblePalette(schemeCategory10);

// ============================================
// ACCESSIBLE CATEGORICAL PALETTES (Legacy/Custom)
// ============================================
// These were manually optimized, but we run them through the fixer just in case.

export const TolBrightWhiteBG = createAccessiblePalette([
  '#D96622',
  '#0077BB',
  '#0088AA',
  '#008877',
  '#CC3311',
  '#EE3377',
  '#777777',
]);

export const TolMutedWhiteBG = createAccessiblePalette([
  '#CC6677',
  '#332288',
  '#BBAA33',
  '#117733',
  '#66AADD',
  '#882255',
  '#44AA99',
  '#8A8A33',
  '#AA4499',
]);

export const WongWhiteBG = createAccessiblePalette([
  '#D55E00',
  '#0072B2',
  '#009E73',
  '#CC79A7',
  '#E69F00',
  '#56B4E9',
  '#999900',
  '#777777',
]);

export const OkabeItoWhiteBG = createAccessiblePalette([
  '#D55E00',
  '#0072B2',
  '#009E73',
  '#CC79A7',
  '#E69F00',
  '#4C9ED9',
  '#B3A800',
  '#444444',
]);

// ============================================
// SPECIALIZED PALETTES
// ============================================

export const PhyloOptimized = createAccessiblePalette([
  '#C0392B',
  '#2980B9',
  '#27AE60',
  '#8E44AD',
  '#D35400',
  '#16A085',
  '#F39C12',
  '#2C3E50',
  '#7F8C8D',
  '#E74C3C',
  '#9B59B6',
  // Removed duplicate #C0392B
]);

export const HighContrast = createAccessiblePalette([
  '#E31A1C',
  '#1F78B4',
  '#33A02C',
  '#6A3D9A',
  '#FF7F00',
  '#B15928',
  '#A6CEE3',
  '#B2DF8A',
  '#FDBF6F',
  '#CAB2D6',
]);

export const BlueShadesWhiteBG = createAccessiblePalette([
  '#A6C8FF',
  '#82B1FF',
  '#5E9BFF',
  '#3B85FF',
  '#1976D2',
  '#1565C0',
  '#0D47A1',
  '#0A3A79',
  '#072D62',
  '#04214A',
]);

/**
 * Extended30 - A large categorical palette with 30 distinct colors
 * Designed for datasets with many taxa or groups (e.g., 20+ genotypes).
 * Generated in OKLCH and maximin-ordered for contrast on the white tree canvas.
 */
export const Extended30 = generateOklchCategoricalPalette(30);

// ============================================
// SEQUENTIAL PALETTES (Sourced from D3)
// ============================================

export const ViridisWhiteBG = sampleInterpolator(interpolateViridis, 8);
export const CividisWhiteBG = sampleInterpolator(interpolateCividis, 8);
export const TurboWhiteBG = sampleInterpolator(interpolateTurbo, 8);

// Keep originals (also fixed, just in case used on white)
export const Viridis = sampleInterpolator(interpolateViridis, 10);
export const Cividis = sampleInterpolator(interpolateCividis, 10);
export const Turbo = sampleInterpolator(interpolateTurbo, 10);

// ============================================
// DIVERGING PALETTES (Sourced from D3)
// ============================================

// CoolWarm equivalent -> RdBu (Red-Blue) reversed usually
export const CoolWarmWhiteBG = sampleInterpolator((t) => interpolateRdBu(1 - t), 9);

// PurpleGreen -> PRGn
export const PurpleGreenWhiteBG = sampleInterpolator(interpolatePRGn, 9);

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
  Turbo,
};

export const DIVERGING_PALETTES = {
  CoolWarmWhiteBG,
  PurpleGreenWhiteBG,
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
    Extended30: {
      type: 'categorical',
      colorBlindSafe: false,
      maxColors: 30,
      description: 'Large palette for many groups (30 colors)',
    },
    Tableau10: {
      type: 'categorical',
      colorBlindSafe: true,
      maxColors: 10,
      description: 'Standard professional palette (Tableau)',
    },
    Tableau20: {
      type: 'categorical',
      colorBlindSafe: false,
      maxColors: 20,
      description: 'Extended professional palette',
    },
    Paired: {
      type: 'categorical',
      colorBlindSafe: false,
      maxColors: 12,
      description: 'Light/dark pairs (ColorBrewer)',
    },
    Set3: {
      type: 'categorical',
      colorBlindSafe: false,
      maxColors: 12,
      description: 'Pastel colors (ColorBrewer)',
    },
    Set1: {
      type: 'categorical',
      colorBlindSafe: false,
      maxColors: 9,
      description: 'Bold colors (ColorBrewer)',
    },
    Dark2: {
      type: 'categorical',
      colorBlindSafe: true,
      maxColors: 8,
      description: 'Dark colors (ColorBrewer)',
    },
    Accent: {
      type: 'categorical',
      colorBlindSafe: false,
      maxColors: 8,
      description: 'Accent colors (ColorBrewer)',
    },
    Category10: {
      type: 'categorical',
      colorBlindSafe: false,
      maxColors: 10,
      description: 'Classic D3 palette',
    },
    OkabeItoWhiteBG: {
      type: 'categorical',
      colorBlindSafe: true,
      maxColors: 8,
      description: 'Universal design (Optimized for White)',
    },
    WongWhiteBG: {
      type: 'categorical',
      colorBlindSafe: true,
      maxColors: 8,
      description: 'Nature palette (Optimized for White)',
    },
    TolBrightWhiteBG: {
      type: 'categorical',
      colorBlindSafe: true,
      maxColors: 7,
      description: 'Distinct & Bright (Optimized for White)',
    },
    TolMutedWhiteBG: {
      type: 'categorical',
      colorBlindSafe: true,
      maxColors: 9,
      description: 'Soft & Distinct (Optimized for White)',
    },
    HighContrast: {
      type: 'categorical',
      colorBlindSafe: false,
      maxColors: 10,
      description: 'Maximum distinctness',
    },
    PhyloOptimized: {
      type: 'categorical',
      colorBlindSafe: false,
      maxColors: 11,
      description: 'Tree-specific colors (No Neon)',
    },
    BlueShadesWhiteBG: {
      type: 'categorical',
      colorBlindSafe: true,
      maxColors: 10,
      description: 'Blue tints (Optimized for White)',
    },

    // Sequential
    ViridisWhiteBG: {
      type: 'sequential',
      colorBlindSafe: true,
      maxColors: 8,
      description: 'Scientific standard',
    },
    CividisWhiteBG: {
      type: 'sequential',
      colorBlindSafe: true,
      maxColors: 8,
      description: 'Color-blind safe',
    },
    TurboWhiteBG: {
      type: 'sequential',
      colorBlindSafe: false,
      maxColors: 8,
      description: 'Rainbow-like',
    },
    Viridis: {
      type: 'sequential',
      colorBlindSafe: true,
      maxColors: 10,
      description: 'Scientific standard',
    },
    Cividis: {
      type: 'sequential',
      colorBlindSafe: true,
      maxColors: 10,
      description: 'Color-blind safe',
    },
    Turbo: {
      type: 'sequential',
      colorBlindSafe: false,
      maxColors: 10,
      description: 'Rainbow-like',
    },

    // Diverging
    CoolWarmWhiteBG: {
      type: 'diverging',
      colorBlindSafe: false,
      maxColors: 9,
      description: 'Diverging Blue-Red',
    },
    PurpleGreenWhiteBG: {
      type: 'diverging',
      colorBlindSafe: true,
      maxColors: 9,
      description: 'Diverging Purple-Green',
    },
  };

  return (
    meta[name] || {
      type: 'categorical',
      colorBlindSafe: false,
      maxColors: (ALL_PALETTES[name] || []).length,
      description: 'Custom palette',
    }
  );
}
