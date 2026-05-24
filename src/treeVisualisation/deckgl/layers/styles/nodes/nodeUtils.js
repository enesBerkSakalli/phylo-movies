import { colorToRgb, getContrastingHighlightColor } from '../../../../../services/ui/colorUtils.js';
import { SYSTEM_TREE_COLORS } from '../../../../../constants/TreeColors.js';

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

  if (mode === 'contrast') {
    const baseHex = cm?.getNodeBaseColor?.(nodeData) || '#000000';
    return getContrastingHighlightColor(colorToRgb(baseHex));
  }

  if (mode === 'taxa') {
    const baseHex = cm?.getNodeBaseColor?.(nodeData) || '#000000';
    return colorToRgb(baseHex);
  }

  // 'solid' mode or default
  return colorToRgb(subtreeHighlightColor || SYSTEM_TREE_COLORS.subtreeHighlightColor);
}
