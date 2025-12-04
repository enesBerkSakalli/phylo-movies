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
