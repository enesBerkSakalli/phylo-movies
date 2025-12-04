// Synchronize group colors with current groups
export function syncGroupColors(colorManager, groups) {
  const currentGroupNames = new Set(groups.map(g => g.name));

  // Remove stale colors
  Array.from(colorManager.groupColorMap.keys())
    .filter(name => !currentGroupNames.has(name))
    .forEach(name => colorManager.groupColorMap.delete(name));

  // Assign colors to new groups
  groups.forEach(g => {
    if (!colorManager.groupColorMap.has(g.name)) {
      colorManager.groupColorMap.set(g.name, colorManager.getRandomColor());
    }
  });
}

// Normalize separator value to null if empty/undefined
export function normalizeSeparator(separator) {
  return separator === null || separator === 'null' || separator === undefined ? null : separator;
}
