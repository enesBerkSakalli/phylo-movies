import Color from 'colorjs.io';

// Synchronize group colors with current groups
export function syncGroupColors(colorManager, groups) {
  // Optimization: avoid `new Set(groups.map(g => g.name))` allocation
  const currentGroupNames = new Set();
  for (const g of groups) {
    currentGroupNames.add(g.name);
  }

  // Remove stale colors
  // Optimization: Loop keys directly instead of creating intermediate arrays
  for (const name in colorManager.groupColorMap) {
    if (!currentGroupNames.has(name)) {
      delete colorManager.groupColorMap[name];
    }
  }

  // Assign colors to new groups
  // Optimization: Max-Min strategy for distinctness
  for (const g of groups) {
    if (!colorManager.groupColorMap[g.name]) {
      // Collect existing colors as Color objects for distance checking
      const existingColors = [];
      for (const key in colorManager.groupColorMap) {
        const rgb = colorManager.groupColorMap[key];
        // Defensive: clamp values to 0-255 range before normalizing
        const r = Math.max(0, Math.min(255, rgb[0] || 0)) / 255;
        const g = Math.max(0, Math.min(255, rgb[1] || 0)) / 255;
        const b = Math.max(0, Math.min(255, rgb[2] || 0)) / 255;
        existingColors.push(new Color("srgb", [r, g, b]));
      }

      // Generate 10 candidates and pick the one with max min-distance to existing
      let bestCandidate = null;
      let maxMinDist = -Infinity;

      // If no existing colors, just take the first valid random
      if (existingColors.length === 0) {
        colorManager.groupColorMap[g.name] = colorManager.getRandomColor();
        continue;
      }

      for (let i = 0; i < 10; i++) {
        const candRgb = colorManager.getRandomColor();
        const candColor = new Color("srgb", [candRgb[0] / 255, candRgb[1] / 255, candRgb[2] / 255]);

        let minDist = Infinity;
        for (const existing of existingColors) {
          const d = candColor.deltaE(existing, "2000");
          if (d < minDist) minDist = d;
        }

        if (minDist > maxMinDist) {
          maxMinDist = minDist;
          bestCandidate = candRgb;
        }
      }

      // If something went wrong or no candidates better, fallback
      colorManager.groupColorMap[g.name] = bestCandidate || colorManager.getRandomColor();
    }
  }
}

// Normalize separator value to null if empty/undefined
export function normalizeSeparator(separator) {
  return separator === null || separator === 'null' || separator === undefined ? null : separator;
}
