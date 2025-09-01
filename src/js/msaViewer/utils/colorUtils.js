/**
 * Color utilities for MSA visualization
 * Provides color schemes for DNA and protein sequences
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

/**
 * Returns the color for a DNA nucleotide
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
 * Returns the color for an amino acid based on its chemical properties
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
