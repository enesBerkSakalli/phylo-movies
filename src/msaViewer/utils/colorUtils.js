/**
 * Color utilities for MSA visualization
 * Provides color schemes for DNA and protein sequences
 * Ported from react-alignment-viewer and other standard schemes
 */

/**
 * Creates an RGBA color array
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @param {number} a - Alpha component (0-255), defaults to 255
 * @returns {number[]} RGBA color array for deck.gl
 */
export function rgba(r, g, b, a = 255) {
  return [r, g, b, a];
}

/**
 * Creates a grayscale color array
 * @param {number} v - Gray value (0-255)
 * @param {number} a - Alpha component (0-255), defaults to 255
 * @returns {number[]} RGBA color array for deck.gl
 */
export function gray(v, a = 255) {
  return [v, v, v, a];
}

// Helper to convert hex to rgb array
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
    255
  ] : [180, 180, 180, 255];
}

// Color definitions
const COLORS = {
  orange: "#ffa500",
  red: "#ff0000",
  blue: "#0000ff",
  green: "#008000",
  magenta: "#ff00ff",
  grey: "#808080",
  yellow: "#ffff00",
  brown: "#a52a2a",
  white: "#ffffff",
  cyan: "#00ffff"
};

// Color maps from react-alignment-viewer
const SCHEMES = {
  zappo: {
    A: "#ffafaf", R: "#6464ff", N: "#00ff00", D: "#ff0000", C: "#ffff00",
    Q: "#00ff00", E: "#ff0000", G: "#ff00ff", H: "#6464ff", I: "#ffafaf",
    L: "#ffafaf", K: "#6464ff", M: "#ffafaf", F: "#ffc800", P: "#ff00ff",
    S: "#00ff00", T: "#00ff00", W: "#ffc800", Y: "#ffc800", V: "#ffafaf",
    B: "#fff", X: "#fff", Z: "#fff"
  },
  taylor: {
    A: "#ccff00", R: "#0000ff", N: "#cc00ff", D: "#ff0000", C: "#ffff00",
    Q: "#ff00cc", E: "#ff0066", G: "#ff9900", H: "#0066ff", I: "#66ff00",
    L: "#33ff00", K: "#6600ff", M: "#00ff00", F: "#00ff66", P: "#ffcc00",
    S: "#ff3300", T: "#ff6600", W: "#00ccff", Y: "#00ffcc", V: "#99ff00",
    B: "#fff", X: "#fff", Z: "#fff"
  },
  hydrophobicity: {
    A: "#ad0052", B: "#0c00f3", C: "#c2003d", D: "#0c00f3", E: "#0c00f3",
    F: "#cb0034", G: "#6a0095", H: "#1500ea", I: "#ff0000", J: "#fff",
    K: "#0000ff", L: "#ea0015", M: "#b0004f", N: "#0c00f3", O: "#fff",
    P: "#4600b9", Q: "#0c00f3", R: "#0000ff", S: "#5e00a1", T: "#61009e",
    U: "#fff", V: "#f60009", W: "#5b00a4", X: "#680097", Y: "#4f00b0",
    Z: "#0c00f3"
  },
  clustal: {
    A: "orange", B: "#fff", C: "green", D: "red", E: "red", F: "blue",
    G: "orange", H: "red", I: "green", J: "#fff", K: "red", L: "green",
    M: "green", N: "#fff", O: "#fff", P: "orange", Q: "#fff", R: "red",
    S: "orange", T: "orange", U: "#fff", V: "green", W: "blue", X: "#fff",
    Y: "blue", Z: "#fff"
  },
  clustal2: {
    A: "#80a0f0", R: "#f01505", N: "#00ff00", D: "#c048c0", C: "#f08080",
    Q: "#00ff00", E: "#c048c0", G: "#f09048", H: "#15a4a4", I: "#80a0f0",
    L: "#80a0f0", K: "#f01505", M: "#80a0f0", F: "#80a0f0", P: "#ffff00",
    S: "#00ff00", T: "#00ff00", W: "#80a0f0", Y: "#15a4a4", V: "#80a0f0",
    B: "#fff", X: "#fff", Z: "#fff"
  },
  buried: {
    A: "#00a35c", R: "#00fc03", N: "#00eb14", D: "#00eb14", C: "#0000ff",
    Q: "#00f10e", E: "#00f10e", G: "#009d62", H: "#00d52a", I: "#0054ab",
    L: "#007b84", K: "#00ff00", M: "#009768", F: "#008778", P: "#00e01f",
    S: "#00d52a", T: "#00db24", W: "#00a857", Y: "#00e619", V: "#005fa0",
    B: "#00eb14", X: "#00b649", Z: "#00f10e"
  },
  cinema: {
    A: "#BBBBBB", B: "grey", C: "yellow", D: "red", E: "red", F: "magenta",
    G: "brown", H: "#00FFFF", I: "#BBBBBB", J: "#fff", K: "#00FFFF",
    L: "#BBBBBB", M: "#BBBBBB", N: "green", O: "#fff", P: "brown",
    Q: "green", R: "#00FFFF", S: "green", T: "green", U: "#fff",
    V: "#BBBBBB", W: "magenta", X: "grey", Y: "magenta", Z: "grey",
    '-': "grey"
  },
  helix: {
    A: "#e718e7", R: "#6f906f", N: "#1be41b", D: "#778877", C: "#23dc23",
    Q: "#926d92", E: "#ff00ff", G: "#00ff00", H: "#758a75", I: "#8a758a",
    L: "#ae51ae", K: "#a05fa0", M: "#ef10ef", F: "#986798", P: "#00ff00",
    S: "#36c936", T: "#47b847", W: "#8a758a", Y: "#21de21", V: "#857a85",
    B: "#49b649", X: "#758a75", Z: "#c936c9"
  },
  lesk: {
    A: "orange", B: "#fff", C: "green", D: "red", E: "red", F: "green",
    G: "orange", H: "magenta", I: "green", J: "#fff", K: "red", L: "green",
    M: "green", N: "magenta", O: "#fff", P: "green", Q: "magenta",
    R: "red", S: "orange", T: "orange", U: "#fff", V: "green", W: "green",
    X: "#fff", Y: "green", Z: "#fff"
  },
  mae: {
    A: "#77dd88", B: "#fff", C: "#99ee66", D: "#55bb33", E: "#55bb33",
    F: "#9999ff", G: "#77dd88", H: "#5555ff", I: "#66bbff", J: "#fff",
    K: "#ffcc77", L: "#66bbff", M: "#66bbff", N: "#55bb33", O: "#fff",
    P: "#eeaaaa", Q: "#55bb33", R: "#ffcc77", S: "#ff4455", T: "#ff4455",
    U: "#fff", V: "#66bbff", W: "#9999ff", X: "#fff", Y: "#9999ff",
    Z: "#fff"
  },
  strand: {
    A: "#5858a7", R: "#6b6b94", N: "#64649b", D: "#2121de", C: "#9d9d62",
    Q: "#8c8c73", E: "#0000ff", G: "#4949b6", H: "#60609f", I: "#ecec13",
    L: "#b2b24d", K: "#4747b8", M: "#82827d", F: "#c2c23d", P: "#2323dc",
    S: "#4949b6", T: "#9d9d62", W: "#c0c03f", Y: "#d3d32c", V: "#ffff00",
    B: "#4343bc", X: "#797986", Z: "#4747b8"
  },
  turn: {
    A: "#2cd3d3", R: "#708f8f", N: "#ff0000", D: "#e81717", C: "#a85757",
    Q: "#3fc0c0", E: "#778888", G: "#ff0000", H: "#708f8f", I: "#00ffff",
    L: "#1ce3e3", K: "#7e8181", M: "#1ee1e1", F: "#1ee1e1", P: "#f60909",
    S: "#e11e1e", T: "#738c8c", W: "#738c8c", Y: "#9d6262", V: "#07f8f8",
    B: "#f30c0c", X: "#7c8383", Z: "#5ba4a4"
  },
  nucleotide: {
    A: "#64F73F", C: "#FFB340", G: "#EB413C", T: "#3C88EE", U: "#3C88EE"
  },
  purine: {
    A: "#FF83FA", C: "#40E0D0", G: "#FF83FA", R: "#FF83FA", T: "#40E0D0",
    U: "#40E0D0", Y: "#40E0D0"
  }
};

// Pre-calculate RGBA maps
const RGBA_MAPS = {};
Object.keys(SCHEMES).forEach(scheme => {
  RGBA_MAPS[scheme] = {};
  Object.keys(SCHEMES[scheme]).forEach(key => {
    let val = SCHEMES[scheme][key];
    // Handle named colors
    if (COLORS[val]) val = COLORS[val];
    // Handle spaces in hex strings from the repo (e.g. " #fff")
    val = val.trim();

    RGBA_MAPS[scheme][key] = hexToRgb(val);
  });
});

/**
 * Returns the color for a DNA nucleotide (Default)
 * @param {string} ch - Single nucleotide character
 * @returns {number[]} RGBA color array
 */
export function dnaColor(ch) {
  switch (ch) {
    case 'A': return rgba(0, 200, 0);      // Bright green
    case 'C': return rgba(0, 100, 255);    // Bright blue
    case 'G': return rgba(255, 165, 0);    // Orange
    case 'T':
    case 'U': return rgba(255, 0, 0);     // Red
    case '-': return gray(220);            // Light gray for gaps
    default: return gray(180);             // Default gray
  }
}

/**
 * Returns the color for an amino acid (Default)
 * @param {string} ch - Single amino acid character
 * @returns {number[]} RGBA color array
 */
export function proteinColor(ch) {
  // Amino acid classification sets
  const hydrophobic = new Set(['A', 'V', 'I', 'L', 'M', 'F', 'W', 'Y', 'P']);
  const polar = new Set(['S', 'T', 'N', 'Q', 'C', 'G']);
  const positive = new Set(['K', 'R', 'H']);
  const negative = new Set(['D', 'E']);

  if (ch === '-') return gray(220);            // Light gray for gaps
  if (hydrophobic.has(ch)) return rgba(255, 200, 0);   // Yellow/gold - hydrophobic
  if (polar.has(ch)) return rgba(0, 150, 255);        // Light blue - polar
  if (positive.has(ch)) return rgba(0, 0, 255);       // Dark blue - positive
  if (negative.has(ch)) return rgba(255, 0, 0);       // Red - negative
  return gray(180);                                   // Default gray
}

/**
 * Returns a grayscale color
 * @param {string} ch - Single character
 * @returns {number[]} RGBA color array
 */
export function grayscaleColor(ch) {
  if (ch === '-') return gray(240);
  return gray(150);
}

/**
 * Get the color function based on scheme name
 * @param {string} scheme - Scheme name
 * @param {string} type - Sequence type ('dna', 'protein')
 * @returns {Function} Color function
 */
export function getColorScheme(scheme, type) {
  if (scheme === 'none') {
    return () => [255, 255, 255, 0]; // Transparent/White
  }
  if (scheme === 'grayscale') return grayscaleColor;

  // Check if scheme exists in our new maps
  if (RGBA_MAPS[scheme]) {
    const map = RGBA_MAPS[scheme];
    return (ch) => {
      if (ch === '-') return gray(220);
      return map[ch] || gray(180);
    };
  }

  if (type === 'dna') {
    return dnaColor;
  }

  // Default Protein
  return proteinColor;
}
