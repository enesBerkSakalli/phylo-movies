// Default color for groups and taxa (black)
const DEFAULT_COLOR = [0, 0, 0];

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

  // Assign default color (black) to new groups
  // Users must explicitly apply a color scheme to get colors
  for (const g of groups) {
    if (!colorManager.groupColorMap[g.name]) {
      colorManager.groupColorMap[g.name] = DEFAULT_COLOR;
    }
  }
}

// Normalize separator value to null if empty/undefined
export function normalizeSeparator(separator) {
  return separator === null || separator === 'null' || separator === undefined ? null : separator;
}
