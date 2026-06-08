import { colorToRgb } from '../../../../../services/ui/colorUtils.js';
import { SYSTEM_TREE_COLORS } from '../../../../../constants/TreeColors.js';
import { resolveSubtreeHighlightRgb } from '../highlightColorResolver.js';

/**
 * Gets the pivot edge color (blue) for nodes.
 */
export function getPivotEdgeColor() {
  return colorToRgb(SYSTEM_TREE_COLORS.pivotEdgeColor);
}

/**
 * Resolves the highlight color based on the current mode.
 * @param {Object} nodeData - The node data object
 * @param {Object} cached - The cached state object containing highlightColorMode, colorManager, etc.
 * @returns {Array} [r, g, b] color array
 */
export function getHighlightColor(nodeData, cached) {
  const { highlightColorMode, colorManager: cm, subtreeHighlightColor } = cached;
  const mode = highlightColorMode || 'solid';
  const baseHex = cm?.getNodeBaseColor?.(nodeData) || SYSTEM_TREE_COLORS.defaultColor;

  return resolveSubtreeHighlightRgb({
    baseColor: baseHex,
    mode,
    subtreeHighlightColor,
  });
}
