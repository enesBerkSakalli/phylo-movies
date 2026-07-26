import { colorToRgb } from '../../../services/ui/colorUtils.js';
import { SYSTEM_TREE_COLORS } from '../../../constants/TreeColors.js';

// Default color for groups and taxa, matching the app-wide system default.
const DEFAULT_COLOR = colorToRgb(SYSTEM_TREE_COLORS.defaultColor);

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
