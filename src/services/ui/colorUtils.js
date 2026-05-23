const NUMBER_TOKEN_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

function clampByte(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(255, Math.round(number)));
}

function clampUnit(value) {
  const number = parseNumberToken(value);
  if (number === null) return null;
  return Math.max(0, Math.min(100, number)) / 100;
}

function parseNumberToken(token) {
  const normalized = token.trim();
  return NUMBER_TOKEN_PATTERN.test(normalized) ? Number(normalized) : null;
}

function parseAlphaToken(token) {
  const normalized = token.trim();
  if (normalized.endsWith('%')) {
    return parseNumberToken(normalized.slice(0, -1)) !== null;
  }
  return parseNumberToken(normalized) !== null;
}

function parseRgbChannel(token) {
  const normalized = token.trim();
  if (normalized.endsWith('%')) {
    const percent = parseNumberToken(normalized.slice(0, -1));
    return percent === null ? null : clampByte((percent / 100) * 255);
  }

  const value = parseNumberToken(normalized);
  return value === null ? null : clampByte(value);
}

function parsePercentageToken(token) {
  const normalized = token.trim();
  if (!normalized.endsWith('%')) return null;
  return clampUnit(normalized.slice(0, -1));
}

function parseHueToken(token) {
  const match = token.trim().match(/^([+-]?(?:\d+\.?\d*|\.\d+))(deg|grad|rad|turn)?$/i);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;

  const unit = (match[2] || 'deg').toLowerCase();
  let degrees = value;
  if (unit === 'turn') degrees = value * 360;
  if (unit === 'grad') degrees = value * 0.9;
  if (unit === 'rad') degrees = (value * 180) / Math.PI;

  return ((degrees % 360) + 360) % 360;
}

function splitColorFunctionArgs(body) {
  const alphaSplit = body.trim().split('/');
  if (alphaSplit.length > 2) return null;

  const channels = alphaSplit[0].trim();
  if (!channels) return null;

  const usesCommas = channels.includes(',');
  const parts = usesCommas ? channels.split(',').map((part) => part.trim()) : channels.split(/\s+/);

  if (usesCommas) {
    if (parts.length !== 3 && parts.length !== 4) return null;
    if (parts.length === 4 && !parseAlphaToken(parts[3])) return null;
  } else if (parts.length !== 3) {
    return null;
  }

  if (alphaSplit.length === 2 && !parseAlphaToken(alphaSplit[1])) {
    return null;
  }

  return parts.slice(0, 3);
}

function parseRgbString(rgbString) {
  const match = rgbString.match(/^rgba?\(\s*(.*?)\s*\)$/i);
  if (!match) return null;

  const parts = splitColorFunctionArgs(match[1]);
  if (!parts) return null;

  const rgb = parts.map(parseRgbChannel);
  return rgb.every((channel) => channel !== null) ? rgb : null;
}

function parseHslString(hslString) {
  const match = hslString.match(/^hsla?\(\s*(.*?)\s*\)$/i);
  if (!match) return null;

  const parts = splitColorFunctionArgs(match[1]);
  if (!parts) return null;

  const h = parseHueToken(parts[0]);
  const s = parsePercentageToken(parts[1]);
  const l = parsePercentageToken(parts[2]);

  if (h === null || s === null || l === null) return null;
  return { h, s, l };
}

/**
 * Convert HSL color string to RGB array
 * Supports comma and modern space-separated CSS syntax.
 * @param {string} hslString - HSL color string
 * @returns {number[]} RGB array [r, g, b]
 */
function hslToRgb(hslString) {
  const parsed = parseHslString(hslString);
  if (!parsed) {
    return [0, 0, 0];
  }

  const h = parsed.h / 360;
  const s = parsed.s;
  const l = parsed.l;

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
 * Convert color string (hex, rgb, or hsl) to RGB array
 * Hex supports 3 or 6-digit forms, with or without '#'
 * HSL delegates to hslToRgb.
 * @param {string|number[]} color - Color string, e.g. '#aabbcc', 'abc', or 'hsl(120, 50%, 50%)'
 * @returns {number[]} RGB array [r, g, b]
 */
export function colorToRgb(color) {
  if (!color) return [0, 0, 0];
  if (Array.isArray(color)) {
    return color.length >= 3 ? color.slice(0, 3).map(clampByte) : [0, 0, 0];
  }
  if (typeof color !== 'string') return [0, 0, 0];

  const normalized = color.trim();
  if (!normalized) return [0, 0, 0];

  // Handle rgb/rgba format
  if (/^rgba?\(/i.test(normalized)) {
    return parseRgbString(normalized) || [0, 0, 0];
  }

  // Handle HSL format
  if (/^hsla?\(/i.test(normalized)) {
    return hslToRgb(normalized);
  }

  // Normalize hex
  let hex = normalized.replace(/^#/, '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
    return [0, 0, 0];
  }

  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
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
 * Fallback: Deep Cyan [0, 139, 139] (If base is pink/red/purple)
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
  const distToMagenta = dr * dr * 2 + dg * dg * 4 + db * db * 3;

  // Threshold: If Magenta is too close (e.g. base is Pink/Purple/Red), switch to Cyan
  // 60000 is an approximate threshold for "visually distinct"
  // Specific check for Red-heavy colors to avoid Tritanopia confusion (Magenta looks like Red)
  if (distToMagenta < 60000 || (baseColorRgb[0] > 200 && baseColorRgb[2] < 100)) {
    return cyan;
  }

  return magenta;
}

/**
 * Convert RGB array to Hex string
 * Handles NaN, out-of-range values, and clamps to valid 0-255 range
 * @param {number[]} rgb - [r, g, b]
 * @returns {string} Hex string "#rrggbb"
 */
export function rgbToHex(rgb) {
  if (!rgb || !Array.isArray(rgb) || rgb.length < 3) return '#000000';
  const toHex = (c) => {
    // Handle NaN, undefined, and clamp to 0-255 range
    const safeValue = Number.isFinite(c) ? Math.max(0, Math.min(255, Math.round(c))) : 0;
    const hex = safeValue.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
}

/**
 * Convert a map of colors (arrays or strings) to a map of Hex strings
 * @param {Object} map - Input color map
 * @returns {Object} New map with Hex values
 */
export function toHexMap(map) {
  if (!map || typeof map !== 'object') {
    return {};
  }
  const hexMap = {};
  Object.keys(map).forEach((key) => {
    const val = map[key];
    if (Array.isArray(val)) {
      hexMap[key] = rgbToHex(val);
    } else if (typeof val === 'string') {
      hexMap[key] = rgbToHex(colorToRgb(val));
    } else {
      hexMap[key] = val;
    }
  });
  return hexMap;
}
