import { getPalette, generatePalette } from '../../constants/ColorPalettes.js';
import { colorToRgb } from '../../services/ui/colorUtils.js';
import Color from 'colorjs.io';

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
    const numTargets = targets.length;
    if (numTargets === 0) return;

    // Get base palette
    let baseScheme = getPalette(schemeName);

    // If we have more targets than colors in the palette, dynamically generate exactly enough
    if (numTargets > baseScheme.length) {
      console.log(`[ColorSchemeManager] Palette "${schemeName}" has ${baseScheme.length} colors but need ${numTargets}. Generating dynamic palette.`);
      baseScheme = generatePalette(numTargets, 'sinebow');
    }

    // Convert to RGB arrays
    const rgbScheme = baseScheme.map(c => this._ensureRgb(c));

    // For groups, maximize perceptual distance between successive colors
    // For taxa, use the palette order directly
    let scheme = isGroup
      ? this._orderPaletteForMaxDistance(rgbScheme, numTargets)
      : rgbScheme;

    // Ensure we always have a valid scheme with enough colors
    if (!scheme || scheme.length === 0) {
      console.warn(`[ColorSchemeManager] Scheme "${schemeName}" returned empty, using fallback`);
      scheme = rgbScheme;
    }

    // If scheme still has fewer colors than targets after ordering (due to duplicates),
    // supplement with dynamically generated colors to ensure every target gets a unique color
    if (scheme.length < numTargets) {
      console.log(`[ColorSchemeManager] Ordered scheme has ${scheme.length} colors but need ${numTargets}. Supplementing.`);
      const supplemental = generatePalette(numTargets - scheme.length, 'sinebow');
      const supplementalRgb = supplemental.map(c => this._ensureRgb(c));
      scheme = [...scheme, ...supplementalRgb];
    }

    targets.forEach((target, index) => {
      const color = scheme[index] ?? scheme[index % scheme.length];
      const name = isGroup ? target.name : target;
      const map = isGroup ? this.groupColorMap : this.taxaColorMap;
      map[name] = color;
    });
  }

  // =====================
  // Palette ordering utils
  // =====================
  _orderPaletteForMaxDistance(palette, k, backgroundHex = '#ffffff') {
    // Filter duplicates based on string representation
    const uniquePalette = [];
    const seen = new Set();
    for (const c of palette) {
      const s = c.join(',');
      if (!seen.has(s)) {
        seen.add(s);
        uniquePalette.push(c);
      }
    }

    const n = uniquePalette.length;
    if (n === 0) return [];

    // Pre-convert to Color objects for Perf (avoid re-parsing in loops)
    const colorObjs = uniquePalette.map(c => new Color("srgb", [c[0] / 255, c[1] / 255, c[2] / 255]));
    const white = new Color("white");

    // APCA 45 is sufficient for visual elements (nodes, branches) with outlined labels
    // 60 was too aggressive and caused colors to be over-darkened (washed out/muddy)
    const validIndices = new Set();
    const minLc = 45;

    for (let i = 0; i < n; i++) {
      let color = colorObjs[i];
      const contrast = Math.abs(white.contrast(color, "APCA"));

      if (contrast < minLc) {
        // Fix it by darkening
        // Convert to Oklch for perceptual darkening
        let fixed = color.to("oklch");
        let safety = 0;
        // Loop until it passes or safety break
        while (Math.abs(white.contrast(fixed, "APCA")) < minLc && safety < 50) {
          fixed.l -= 0.01;
          safety++;
        }
        // Update the color object used for distance calc
        colorObjs[i] = fixed;
      }
      validIndices.add(i);
    }

    // Fallback if too few valid checks
    // Fallback block removed - we fix colors instead of dropping them

    // Convert Set to Array for indexing
    const validIdxArray = Array.from(validIndices);

    // Seed: color with max distance from BG (usually darkest)
    let seedIndex = validIdxArray[0];
    let bestBgDist = -Infinity;

    for (const i of validIdxArray) {
      const d = colorObjs[i].deltaE(white, "2000");
      if (d > bestBgDist) { bestBgDist = d; seedIndex = i; }
    }

    const chosenIndices = [seedIndex];
    // Remove seed from remaining set.
    // Optimization: We use a Set for remaining logic to avoid .filter() array allocs
    const remainingIndices = new Set(validIdxArray);
    remainingIndices.delete(seedIndex);

    const targetCount = Math.min(k, validIdxArray.length);

    while (chosenIndices.length < targetCount && remainingIndices.size > 0) {
      let bestIdx = null;
      let bestScore = -Infinity;

      // "Soup" Fix: Use simple loop instead of map/min
      for (const idx of remainingIndices) {
        const candidateColor = colorObjs[idx];

        // Find min distance to ANY already chosen color
        let minPeerDist = Infinity;
        for (const chosenIdx of chosenIndices) {
          const d = candidateColor.deltaE(colorObjs[chosenIdx], "2000");
          if (d < minPeerDist) minPeerDist = d;
        }

        // Distance to background (ensure it stays distinct from BG too)
        const bgDist = candidateColor.deltaE(white, "2000");

        // Score: We want to maximize the MIN distance (Maximin)
        const score = Math.min(minPeerDist, bgDist);

        if (score > bestScore) { bestScore = score; bestIdx = idx; }
      }

      if (bestIdx !== null) {
        chosenIndices.push(bestIdx);
        remainingIndices.delete(bestIdx);
      } else {
        break;
      }
    }

    // If we need more colors than available in valid set (should refer to original palette rotation/handling in caller)
    // The caller rotates: scheme[index % scheme.length]
    // So we just return the ordered subset.

    // Return the chosen colors (converted back to [r,g,b] from potentially modified Color objects)
    // Use toGamut to clamp out-of-gamut colors to valid sRGB range
    return chosenIndices.map(i => {
      const srgb = colorObjs[i].to("srgb").toGamut({ space: "srgb" });
      return [
        Math.max(0, Math.min(255, Math.round(srgb.coords[0] * 255))),
        Math.max(0, Math.min(255, Math.round(srgb.coords[1] * 255))),
        Math.max(0, Math.min(255, Math.round(srgb.coords[2] * 255)))
      ];
    });
  }


  // =====================
  // Color Systems
  // =====================
  // Legacy conversion helpers removed in favor of colorUtils / colorjs.io

  /**
   * Generates a vibrant random color using OKLCH space.
   * Ensures APCA contrast > 45 against white (sufficient for visual elements).
   * Returns [r, g, b]
   */
  getRandomColor() {
    // We try to generate a valid color.
    // If we fail after N attempts, we force adjustment.
    const white = new Color("white");
    const targetLc = 45;

    // Random Oklch parameters - optimized for vibrant, readable colors
    // L: 0.35 - 0.65 (Lightness) - Wider range for more variety
    // C: 0.15 - 0.35 (Chroma) - Higher range for more vibrant/saturated colors
    // H: 0 - 360 (Hue)

    // Oklch is perceptually uniform.
    // With APCA 45 threshold, we can allow brighter colors while maintaining readability.

    let color;
    let attempts = 0;
    while (attempts < 10) {
      const h = Math.random() * 360;
      const c = 0.15 + Math.random() * 0.20; // 0.15 - 0.35 (More vibrant colors)
      let l = 0.35 + Math.random() * 0.30; // 0.35 - 0.65 (Wider lightness range)

      color = new Color("oklch", [l, c, h]);
      const contrast = Math.abs(white.contrast(color, "APCA"));

      if (contrast >= targetLc) {
        // Clamp to sRGB gamut to avoid out-of-range values
        const srgb = color.to("srgb").toGamut({ space: "srgb" });
        return [
          Math.max(0, Math.min(255, Math.round(srgb.coords[0] * 255))),
          Math.max(0, Math.min(255, Math.round(srgb.coords[1] * 255))),
          Math.max(0, Math.min(255, Math.round(srgb.coords[2] * 255)))
        ];
      }

      // Decrease L to increase contrast against white
      l -= 0.05;
      if (l < 0.2) l = 0.2; // Don't go too black
      attempts++;
    }

    // If loop fails, force darkened version of last color
    // Reduce L until it passes
    if (color) {
      let safety = 0;
      while (Math.abs(white.contrast(color, "APCA")) < targetLc && safety < 20) {
        color.oklch.l -= 0.02;
        safety++;
      }
    } else {
      color = new Color("black");
    }

    // Clamp to sRGB gamut to avoid out-of-range values
    const srgb = color.to("srgb").toGamut({ space: "srgb" });
    return [
      Math.max(0, Math.min(255, Math.round(srgb.coords[0] * 255))),
      Math.max(0, Math.min(255, Math.round(srgb.coords[1] * 255))),
      Math.max(0, Math.min(255, Math.round(srgb.coords[2] * 255)))
    ];
  }

  reset() {
    this.taxaColorMap = { ...this.originalColorMap };
    this.groupColorMap = {};
  }
}
