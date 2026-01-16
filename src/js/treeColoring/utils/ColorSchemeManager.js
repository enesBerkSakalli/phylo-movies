import { getPalette } from '../../constants/ColorPalettes.js';
import { colorToRgb } from '../../services/ui/colorUtils.js';

export class ColorSchemeManager {
  constructor(originalColorMap = {}) {
    this.originalColorMap = this._normalizeMap(originalColorMap);
    this.taxaColorMap = { ...this.originalColorMap };
    this.groupColorMap = {};
  }

  /**
   * Normalize an input map to ensure all values are [r, g, b] arrays
   */
  _normalizeMap(map) {
    const normalized = {};
    for (const [key, value] of Object.entries(map)) {
      normalized[key] = this._ensureRgb(value);
    }
    return normalized;
  }

  /**
   * Ensure a color is a valid [r, g, b] array (check vs array/string)
   */
  _ensureRgb(color) {
    if (Array.isArray(color) && color.length >= 3) {
      return color.slice(0, 3); // Strip alpha if present, or keep it? DeckGL usually handles [r,g,b] faster
    }
    return colorToRgb(color);
  }

  applyColorScheme(schemeName, targets, isGroup) {
    // Get palette as Hex strings or whatever stored
    const baseScheme = getPalette(schemeName);

    // For groups, maximize perceptual distance between successive colors
    // Note: _orderPaletteForMaxDistance now needs to handle the conversion internally
    // or we convert first. Let's convert first.
    const rgbScheme = baseScheme.map(c => this._ensureRgb(c));

    const scheme = isGroup
      ? this._orderPaletteForMaxDistance(rgbScheme, targets.length)
      : rgbScheme;

    targets.forEach((target, index) => {
      const color = scheme[index % scheme.length];
      const name = isGroup ? target.name : target;
      const map = isGroup ? this.groupColorMap : this.taxaColorMap;
      map[name] = color;
    });
  }

  // =====================
  // Palette ordering utils
  // =====================
  _orderPaletteForMaxDistance(palette, k, backgroundHex = '#ffffff') {
    // Palette is now Array of [r,g,b]
    // Filter duplicates based on string representation
    const uniquePalette = [];
    const seen = new Set();
    for(const c of palette) {
        const s = c.join(',');
        if(!seen.has(s)) {
            seen.add(s);
            uniquePalette.push(c);
        }
    }

    const labs = uniquePalette.map(c => this._rgbToLab(c[0], c[1], c[2]));
    const whiteLab = this._rgbToLab(255, 255, 255); // Assume white bg

    const n = uniquePalette.length;
    if (n === 0) return [];

    // Filter out colors with very poor contrast against background (L distance < 20)
    let validIndices = [];
    const minLDiff = 20;

    for(let i=0; i<n; i++) {
        const dist = this._labDistance(labs[i], whiteLab);
        const lDiff = Math.abs(labs[i].L - whiteLab.L);

        // Penalize very light colors on white background
        if (lDiff > minLDiff && dist > 25) {
            validIndices.push(i);
        }
    }

    // Fallback
    if (validIndices.length < Math.min(k, n)) {
        validIndices = Array.from({ length: n }, (_, i) => i);
    }

    // Seed: color with max distance from BG
    let seedIndex = validIndices[0];
    let bestBgDist = -Infinity;

    for (const i of validIndices) {
      const d = this._labDistance(labs[i], whiteLab);
      if (d > bestBgDist) { bestBgDist = d; seedIndex = i; }
    }

    const chosen = [seedIndex];
    const remaining = new Set(validIndices.filter(i => i !== seedIndex));
    const targetCount = Math.min(k, validIndices.length);

    while (chosen.length < targetCount && remaining.size > 0) {
      let bestIdx = null;
      let bestScore = -Infinity;

      for (const idx of remaining) {
        // Distance to already chosen colors
        const minPeerDist = Math.min(...chosen.map(ci => this._labDistance(labs[idx], labs[ci])));
        // Distance to background
        const bgDist = this._labDistance(labs[idx], whiteLab);
        // Score
        const score = Math.min(minPeerDist, bgDist);

        if (score > bestScore) { bestScore = score; bestIdx = idx; }
      }

      if (bestIdx !== null) {
          chosen.push(bestIdx);
          remaining.delete(bestIdx);
      } else {
          break;
      }
    }

    // Fill remaining if k > chosen
    if (k > chosen.length && remaining.size > 0) {
       while (chosen.length < k && remaining.size > 0) {
          let bestIdx = null; // Just pick logical next
          let bestScore = -Infinity;
          for (const idx of remaining) {
               // Just maximize distance to existing chosen
               const minPeerDist = Math.min(...chosen.map(ci => this._labDistance(labs[idx], labs[ci])));
               if(minPeerDist > bestScore) { bestScore = minPeerDist; bestIdx = idx; }
          }
          chosen.push(bestIdx);
          remaining.delete(bestIdx);
       }
    }

    // If still need more (palettes exhausted), we recycle in outer loop, so just return distinct
    return chosen.map(i => uniquePalette[i]);
  }


  // =====================
  // Color Systems
  // =====================
  // _hexToLab removed - we work in RGB now

  _rgbToLab(r, g, b) {
    const xyz = this._rgbToXyz(r, g, b);
    return this._xyzToLab(xyz.x, xyz.y, xyz.z);
  }


  _rgbToXyz(r, g, b) {
    // Normalize to [0,1]
    let [rs, gs, bs] = [r, g, b].map(v => v / 255);
    // Inverse companding (sRGB to linear)
    [rs, gs, bs] = [rs, gs, bs].map(v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    // sRGB D65 matrix
    const x = rs * 0.4124564 + gs * 0.3575761 + bs * 0.1804375;
    const y = rs * 0.2126729 + gs * 0.7151522 + bs * 0.0721750;
    const z = rs * 0.0193339 + gs * 0.1191920 + bs * 0.9503041;
    return { x, y, z };
  }

  _xyzToLab(x, y, z) {
    // D65 reference white
    const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;
    let fx = this._fxyz(x / Xn);
    let fy = this._fxyz(y / Yn);
    let fz = this._fxyz(z / Zn);
    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    return { L, a, b };
  }

  _fxyz(t) {
    const delta = 6 / 29;
    return t > Math.pow(delta, 3) ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
  }

  _labDistance(l1, l2) {
    const dL = l1.L - l2.L;
    const da = l1.a - l2.a;
    const db = l1.b - l2.b;
    return Math.sqrt(dL * dL + da * da + db * db); // CIE76
  }

  /**
   * Generates a "Professional" random color.
   * Avoids neon/super-bright colors by constraining Saturation and Lightness.
   * Returns [r, g, b]
   */
  getRandomColor() {
    // Hue: 0-360 (Random)
    const h = Math.floor(Math.random() * 360);

    // Saturation: 45-65% (avoid <40% grey, avoid >80% neon)
    const s = 45 + Math.floor(Math.random() * 20);

    // Lightness: 40-55% (Darker/Rich for White Background visibility)
    // Avoid >60% (Pastel) and <30% (Black)
    const l = 40 + Math.floor(Math.random() * 15);

    const hslString = `hsl(${h}, ${s}%, ${l}%)`;
    return colorToRgb(hslString);
  }

  reset() {
    this.taxaColorMap = { ...this.originalColorMap };
    this.groupColorMap = {};
  }
}
