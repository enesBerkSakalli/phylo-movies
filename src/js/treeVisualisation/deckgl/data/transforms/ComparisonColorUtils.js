import { colorToRgb } from '../../../../services/ui/colorUtils.js';
import { getBaseNodeColor } from '../../../systems/tree_color/index.js';
import { TREE_COLOR_CATEGORIES } from '../../../../constants/TreeColors.js';

/**
 * Compute RGBA color for a connector based on movement state and colorManager.
 */
export function computeConnectionColor(nodeForColor, isMoving, colorManager, markedSubtreesEnabled, linkConnectionOpacity) {
  const monophyleticEnabled = colorManager?.isMonophyleticColoringEnabled?.() ?? true;
  const fallbackHex = TREE_COLOR_CATEGORIES.activeChangeEdgeColor || '#2196f3';
  const colorHex = isMoving && markedSubtreesEnabled
    ? colorManager?.getNodeColor?.(nodeForColor)
    : getBaseNodeColor(nodeForColor, monophyleticEnabled);
  const [r, g, b] = colorToRgb(colorHex || fallbackHex);
  const alpha = isMoving ? 255 : Math.round(linkConnectionOpacity * 255);
  return [r, g, b, alpha];
}
