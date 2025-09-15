import { getPalette } from '../../constants/ColorPalettes.js';

export class ColorSchemeManager {
  constructor(originalColorMap = {}) {
    this.originalColorMap = originalColorMap;
    this.taxaColorMap = new Map(Object.entries(originalColorMap));
    this.groupColorMap = new Map();
  }

  applyColorScheme(schemeName, targets, isGroup) {
    const baseScheme = getPalette(schemeName);

    // For groups, maximize perceptual distance between successive colors
    const scheme = isGroup
      ? this._orderPaletteForMaxDistance(baseScheme, targets.length)
      : baseScheme;

    targets.forEach((target, index) => {
      const color = scheme[index % scheme.length];
      const name = isGroup ? target.name : target;
      const map = isGroup ? this.groupColorMap : this.taxaColorMap;
      map.set(name, color);
    });
  }

  // =====================
  // Palette ordering utils
  // =====================
  _orderPaletteForMaxDistance(palette, k, backgroundHex = '#ffffff') {
    const uniquePalette = Array.from(new Set(palette));
    const labs = uniquePalette.map(c => this._hexToLab(c));
    const whiteLab = this._hexToLab(backgroundHex);

    const n = uniquePalette.length;
    if (n === 0) return [];

    // Seed: color with max distance from background (white)
    let seedIndex = 0;
    let bestBgDist = -Infinity;
    for (let i = 0; i < n; i++) {
      const d = this._labDistance(labs[i], whiteLab);
      if (d > bestBgDist) { bestBgDist = d; seedIndex = i; }
    }

    const chosen = [seedIndex];
    const remaining = new Set(Array.from({ length: n }, (_, i) => i).filter(i => i !== seedIndex));
    const targetCount = Math.min(k, n);

    while (chosen.length < targetCount && remaining.size > 0) {
      let bestIdx = null;
      let bestScore = -Infinity;
      for (const idx of remaining) {
        // Score by maximin distance to already chosen
        const score = Math.min(...chosen.map(ci => this._labDistance(labs[idx], labs[ci])));
        if (score > bestScore) { bestScore = score; bestIdx = idx; }
      }
      chosen.push(bestIdx);
      remaining.delete(bestIdx);
    }

    // If more groups than palette, return full ordered palette and let caller cycle
    if (k > n) {
      // Fill rest (if any) with remaining indices by farthest-first until exhausted
      while (chosen.length < n && remaining.size > 0) {
        let bestIdx = null;
        let bestScore = -Infinity;
        for (const idx of remaining) {
          const score = Math.min(...chosen.map(ci => this._labDistance(labs[idx], labs[ci])));
          if (score > bestScore) { bestScore = score; bestIdx = idx; }
        }
        chosen.push(bestIdx);
        remaining.delete(bestIdx);
      }
    }

    return chosen.map(i => uniquePalette[i]);
  }

  _hexToLab(hex) {
    const { r, g, b } = this._hexToRgb(hex);
    const { x, y, z } = this._rgbToXyz(r, g, b);
    return this._xyzToLab(x, y, z);
  }

  _hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    const num = parseInt(h, 16);
    return {
      r: (num >> 16) & 0xff,
      g: (num >> 8) & 0xff,
      b: num & 0xff,
    };
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

  getRandomColor() {
    return `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
  }

  reset() {
    this.taxaColorMap = new Map(Object.entries(this.originalColorMap));
    this.groupColorMap.clear();
  }
}
