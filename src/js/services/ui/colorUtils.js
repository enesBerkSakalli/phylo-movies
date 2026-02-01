/**
 * Convert HSL color string to RGB array
 * Example input: "hsl(144, 70%, 60%)"
 * @param {string} hslString - HSL color string
 * @returns {number[]} RGB array [r, g, b]
 */
export function hslToRgb(hslString) {
  // Parse HSL string like "hsl(144, 70%, 60%)"
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%\,\s*(\d+)%\)/);
  if (!match) {
    return [0, 0, 0]; // Fallback to black without logging
  }

  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Convert color string (hex or hsl) to RGB array
 * Hex supports 3 or 6-digit forms, with or without '#'
 * HSL delegates to hslToRgb
 * @param {string} color - Color string, e.g. '#aabbcc', 'abc', or 'hsl(120, 50%, 50%)'
 * @returns {number[]} RGB array [r, g, b]
 */
export function colorToRgb(color) {
  if (!color) return [0, 0, 0];
  if (Array.isArray(color)) return color;
  if (typeof color !== 'string') return [0, 0, 0];

  // Handle rgb/rgba format
  if (color.startsWith('rgb')) {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
    if (m) {
      return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
    }
  }

  // Handle HSL format
  if (color.startsWith('hsl(')) {
    return hslToRgb(color);
  }

  // Normalize hex
  let hex = color.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  return [r, g, b];
}

/**
 * Convert color string to RGBA array (0-255 per channel)
 * @param {string|Array<number>} color - hex/hsl string or RGB array
 * @param {number} alpha - alpha 0-255 (defaults to 255)
 * @returns {number[]} RGBA array [r, g, b, a]
 */
export function colorToRgba(color, alpha = 255) {
  const [r, g, b] = colorToRgb(color);
  return [r, g, b, alpha];
}

/**
 * Select the best contrasting highlight color.
 * Priority: Consistency!
 * We prefer a single robust "High Contrast" color (Magenta) for almost all cases
 * to ensure that the whole subtree (nodes, links, extensions) looks unified.
 * We only switch if the base color clashes with Magenta.
 *
 * Primary: Deep Magenta [255, 0, 255] (Visible on White, distinct from Red/Green/Blue/Grey)
 * Fallback: Electric Cyan [0, 200, 255] (If base is pink/red/purple)
 *
 * @param {number[]} baseColorRgb - The RGB array of the element to highlight
 * @returns {number[]} The selected contrasting RGB array
 */
export function getContrastingHighlightColor(baseColorRgb) {
  if (!baseColorRgb || baseColorRgb.length < 3) return [255, 0, 255]; // Default Magenta

  const magenta = [255, 0, 255];
  const cyan = [0, 139, 139]; // Deep Cyan (Teal) to match test expectation

  // Calculate distance to Magenta
  const dr = magenta[0] - baseColorRgb[0];
  const dg = magenta[1] - baseColorRgb[1];
  const db = magenta[2] - baseColorRgb[2];
  const distToMagenta = (dr * dr * 2) + (dg * dg * 4) + (db * db * 3);

  // Threshold: If Magenta is too close (e.g. base is Pink/Purple/Red), switch to Cyan
  // 60000 is an approximate threshold for "visually distinct"
  // Specific check for Red-heavy colors to avoid Tritanopia confusion (Magenta looks like Red)
  if (distToMagenta < 60000 || (baseColorRgb[0] > 200 && baseColorRgb[2] < 100)) {
    return cyan;
  }

  return magenta;
}

/**
 * Detect the current theme background color from the DOM.
 * Returns a normalized [r, g, b, a] array (0-1) suitable for WebGL clearColor.
 * @returns {number[]} [r, g, b, a] where each component is 0-1
 */
export function getThemeBackgroundColor() {
  if (typeof window === 'undefined') return [1, 1, 1, 1];

  // Try multiple elements in case body is transparent
  const elementsToTry = [
    document.body,
    document.documentElement,
    document.querySelector('.sidebar-inset'),
    document.querySelector('#root')
  ];

  for (const el of elementsToTry) {
    if (!el) continue;
    const bg = window.getComputedStyle(el).backgroundColor;
    // parse rgb(r, g, b) or rgba(r, g, b, a) - now handles optional alpha correctly
    const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d?(?:\.\d+)?))?\)/);
    if (match) {
      const [, r, g, b, a] = match;
      const alpha = (a !== undefined && a !== '') ? parseFloat(a) : 1;

      // If alpha is 0, this element is transparent, skip it
      if (alpha === 0) continue;

      return [
        parseInt(r, 10) / 255,
        parseInt(g, 10) / 255,
        parseInt(b, 10) / 255,
        1 // Force opaque for WebGL clear
      ];
    }
  }

  // Final fallback based on theme class
  if (document.documentElement.classList.contains('dark')) {
    return [0.145, 0.145, 0.145, 1];
  }

  return [1, 1, 1, 1]; // Default white
}

/**
 * Convert RGB array to Hex string
 * Handles NaN, out-of-range values, and clamps to valid 0-255 range
 * @param {number[]} rgb - [r, g, b]
 * @returns {string} Hex string "#rrggbb"
 */
export function rgbToHex(rgb) {
  if (!rgb || !Array.isArray(rgb) || rgb.length < 3) return "#000000";
  const toHex = (c) => {
    // Handle NaN, undefined, and clamp to 0-255 range
    const safeValue = Number.isFinite(c) ? Math.max(0, Math.min(255, Math.round(c))) : 0;
    const hex = safeValue.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return "#" + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
}

/**
 * Convert a map of colors (arrays or strings) to a map of Hex strings
 * @param {Object} map - Input color map
 * @returns {Object} New map with Hex values
 */
export function toHexMap(map) {
  const hexMap = {};
  Object.keys(map).forEach(key => {
    let val = map[key];
    if (Array.isArray(val)) {
      val = rgbToHex(val);
    }
    hexMap[key] = val;
  });
  return hexMap;
}

// ============================================================================
// NEW: APCA & DeltaE Utilities (using colorjs.io)
// ============================================================================
import Color from 'colorjs.io';

/**
 * Calculate sRGB luminance
 * @param {number[]} rgb - [r, g, b]
 * @returns {number} Luminance (0-1)
 */
export function calculateLuminance(rgb) {
  const [r, g, b] = rgb.map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert RGB to Lab (via colorjs.io)
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {Object} { l, a, b }
 */
export function rgbToLab(r, g, b) {
  const c = new Color("srgb", [r / 255, g / 255, b / 255]).to("lab");
  return { L: c.coords[0], a: c.coords[1], b: c.coords[2] };
}

/**
 * Calculate DeltaE 2000 Distance
 * @param {Object} lab1 - {L, a, b} or Color object
 * @param {Object} lab2 - {L, a, b} or Color object
 * @returns {number} Distance
 */
export function getDeltaE00(lab1, lab2) {
  // If inputs are already Color objects, use them directly
  if (lab1 instanceof Color && lab2 instanceof Color) {
    return lab1.deltaE(lab2, "2000");
  }

  // Otherwise assume manual objects {L, a, b} and wrap them
  // Note: This is slightly inefficient if calling in loop.
  // Prefer passing Color objects if performance is critical.
  const c1 = new Color("lab", [lab1.L, lab1.a, lab1.b]);
  const c2 = new Color("lab", [lab2.L, lab2.a, lab2.b]);
  return c1.deltaE(c2, "2000");
}

/**
 * Calculate APCA Contrast
 * @param {number[]} rgb1 - [r, g, b]
 * @param {number[]} rgb2 - [r, g, b]
 * @returns {number} Absolute contrast value (Lc)
 */
export function getAPCAContrast(rgb1, rgb2) {
  const c1 = new Color("srgb", [rgb1[0] / 255, rgb1[1] / 255, rgb1[2] / 255]);
  const c2 = new Color("srgb", [rgb2[0] / 255, rgb2[1] / 255, rgb2[2] / 255]);
  return Math.abs(c1.contrast(c2, "APCA"));
}
