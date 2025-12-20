// Synchronize group colors with current groups
export function syncGroupColors(colorManager, groups) {
  const currentGroupNames = new Set(groups.map(g => g.name));

  // Remove stale colors
  Object.keys(colorManager.groupColorMap)
    .filter(name => !currentGroupNames.has(name))
    .forEach(name => delete colorManager.groupColorMap[name]);

  // Assign colors to new groups
  groups.forEach(g => {
    if (!colorManager.groupColorMap[g.name]) {
      colorManager.groupColorMap[g.name] = colorManager.getRandomColor();
    }
  });
}

// Normalize separator value to null if empty/undefined
export function normalizeSeparator(separator) {
  return separator === null || separator === 'null' || separator === undefined ? null : separator;
}
