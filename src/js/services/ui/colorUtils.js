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
  if (!color || typeof color !== 'string') return [0, 0, 0];

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
  const distToMagenta = (dr*dr*2) + (dg*dg*4) + (db*db*3);

  // Threshold: If Magenta is too close (e.g. base is Pink/Purple/Red), switch to Cyan
  // 60000 is an approximate threshold for "visually distinct"
  // Specific check for Red-heavy colors to avoid Tritanopia confusion (Magenta looks like Red)
  if (distToMagenta < 60000 || (baseColorRgb[0] > 200 && baseColorRgb[2] < 100)) {
    return cyan;
  }

  return magenta;
}
