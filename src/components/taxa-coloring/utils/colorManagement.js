import { colorToRgb } from '../../../services/ui/colorUtils.js';
import { SYSTEM_TREE_COLORS } from '../../../constants/TreeColors.js';

// Default color for groups and taxa, matching the app-wide system default.
const DEFAULT_COLOR = colorToRgb(SYSTEM_TREE_COLORS.defaultColor);

// Return a new group color map synchronized with the current groups: stale
// group entries are dropped and new groups get the default color. Pure so the
// hook can drive it through immutable setState instead of mutating a shared
// manager (rerender-derived-state-no-effect).
export function syncGroupColors(groupColorMap, groups) {
  const currentGroupNames = new Set();
  for (const g of groups) {
    currentGroupNames.add(g.name);
  }

  const next = {};
  // Keep only colors for groups that still exist.
  for (const name in groupColorMap) {
    if (currentGroupNames.has(name)) {
      next[name] = groupColorMap[name];
    }
  }

  // New groups start at the default color; users apply a scheme to change it.
  for (const g of groups) {
    if (!next[g.name]) {
      next[g.name] = DEFAULT_COLOR;
    }
  }

  return next;
}
