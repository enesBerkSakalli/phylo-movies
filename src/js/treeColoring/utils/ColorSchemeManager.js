import { getPalette } from '../../constants/ColorPalettes.js';
import { colorToRgb } from '../../services/ui/colorUtils.js';

export class ColorSchemeManager {
  constructor(originalColorMap = {}) {
    this.originalColorMap = originalColorMap;
    this.taxaColorMap = { ...originalColorMap };
    this.groupColorMap = {};
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
      map[name] = color;
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

    // Filter out colors with very poor contrast against background (L distance < 20)
    // Only if we have enough colors remaining.
    let validIndices = [];
    const minLDiff = 20;

    for(let i=0; i<n; i++) {
        // Simple lightness check: L ranges 0-100. White is ~100.
        // We want colors that are not too close to 100.
        // Or just use the full Lab distance.
        const dist = this._labDistance(labs[i], whiteLab);
        // Also check raw Lightness to avoid pale yellows even if a/b make them "distant"
        const lDiff = Math.abs(labs[i].L - whiteLab.L);

        // Penalize very light colors on white background
        // Keep index if it has decent contrast
        if (lDiff > minLDiff && dist > 25) {
            validIndices.push(i);
        }
    }

    // Fallback: if filtering removed too many, revert to all
    if (validIndices.length < Math.min(k, n)) {
        validIndices = Array.from({ length: n }, (_, i) => i);
    }

    // Helper to get effective distance including background penalty
    const getBgPenalty = (idx) => {
        // Higher distance from BG is better
        // We can just use the raw distance as a factor
        const d = this._labDistance(labs[idx], whiteLab);
        // Normalize to some range or just use it.
        // Prefer darker colors on white (higher distance)
        return d;
    };

    // Seed: color with max hybrid score (distance from BG + some bias)
    // Actually, let's stick to the Maximim approach but consider BG as a "chosen" color with a weight
    // Or just pick the one farthest from white as seed.
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

        // Distance to background (treat background as a permanent existing peer, but maybe with less weight?)
        // If we strictly treat BG as a peer, we might avoid colors 'near' white.
        // Let's enforce a minimum "visibility" score.
        const bgDist = this._labDistance(labs[idx], whiteLab);

        // Score = min(peer distances, bgDistance)
        // This ensures the new color is distinct from peers AND distinguishable from background
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

    // If we need more colors than validIndices provided (and k > validIndices.length),
    // we might need to dip into the excluded ones if k < n but k > validIndices.length?
    // The fallback above ensures validIndices has enough if possible.
    // If k > n, we just handle the loop below.

    // If more groups than palette, return full ordered palette and let caller cycle
    // Note: 'chosen' contains indices from 'uniquePalette'

    // ... logic for cycling handled by caller or filling rest
    if (k > chosen.length && remaining.size > 0) {
         // Should calculate for remaining valid indices
          while (chosen.length < k && remaining.size > 0) {
             let bestIdx = null;
             let bestScore = -Infinity;
             for (const idx of remaining) {
               const bgDist = this._labDistance(labs[idx], whiteLab);
               const minPeerDist = Math.min(...chosen.map(ci => this._labDistance(labs[idx], labs[ci])));
               const score = Math.min(minPeerDist, bgDist);
               if (score > bestScore) { bestScore = score; bestIdx = idx; }
             }
             chosen.push(bestIdx);
             remaining.delete(bestIdx);
          }
    }

    // If we still need more and we excluded some, we should probably add them back at the end?
    // But the requirements usually imply we just recycle the palette if k > n
    // So we just return what we have (up to n)

    // If we filtered out some indices but k > validIndices.length, we might want to append the "bad" colors
    // rather than cycling the "good" ones immediately?
    // For now, let's keep it simple: return the chosen "good" ones. Caller cycles.
    // BUT! if n > chosen.length (meaning we have unused "bad" colors), we should probably append them
    // strictly for coverage, just in case the user REALLY needs 20 colors and we responsible for 7 good ones.

    if (chosen.length < n) {
        const usedSet = new Set(chosen);
        const unused = Array.from({length: n}, (_, i) => i).filter(i => !usedSet.has(i));
        // simple sort by contrast for the rest
        unused.sort((a,b) => this._labDistance(labs[b], whiteLab) - this._labDistance(labs[a], whiteLab));
        chosen.push(...unused);
    }

    return chosen.map(i => uniquePalette[i]);
  }

  _hexToLab(hex) {
    const [r, g, b] = colorToRgb(hex);
    const { x, y, z } = this._rgbToXyz(r, g, b);
    return this._xyzToLab(x, y, z);
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
    this.taxaColorMap = { ...this.originalColorMap };
    this.groupColorMap = {};
  }
}
