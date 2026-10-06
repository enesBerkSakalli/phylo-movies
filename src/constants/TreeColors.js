import { rgbToHex, themeColor } from '../services/ui/colorUtils.js';

// Default system colors that shouldn't be overridden by taxon names. Moved and change are the
// theme's --moved and --change, read at boot; the literals are those tokens' values.
export const SYSTEM_COLOR_DEFAULTS = {
  defaultColor: '#000000',
  subtreeHighlightColor: rgbToHex(themeColor('--moved', '#10b981')),
  strokeColor: '#000000',
  pivotEdgeColor: rgbToHex(themeColor('--change', '#2196f3')),
};

// Runtime container for system-level tree colors only.
// Do not add individual taxon names to this object.
// Mutated by updateChangeColor(), which also writes the mirroring store fields - render code
// reads this object directly, so the two must be written together.
export const SYSTEM_TREE_COLORS = { ...SYSTEM_COLOR_DEFAULTS };
