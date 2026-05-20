import { isNodeInSubtree } from '../../../../../domain/tree/splits.js';
import { colorToRgb, getContrastingHighlightColor } from '../../../../../services/ui/colorUtils.js';
import { SYSTEM_TREE_COLORS } from '../../../../../constants/TreeColors.js';

/**
 * Checks if a node should be highlighted due to persistent subtree marking.
 */
export function shouldHighlightNode(nodeData, cached) {
  const { subtreeHighlightsEnabled, highlightedSubtreeData } = cached;

  return subtreeHighlightsEnabled !== false && highlightedSubtreeData && isNodeInSubtree(nodeData, highlightedSubtreeData);
}

/**
 * Checks if a node is part of the current pivot edge.
 * Used to apply the same blue highlighting as links.
 */
export function isNodePivotEdge(nodeData, cached) {
  const { colorManager } = cached;

  let isPivot = false;

  if (colorManager.isNodePivotEdge(nodeData)) {
    isPivot = true;
  }


  return isPivot;
}



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

export function isHistorySubtreeNode(nodeData, cached) {
  const { colorManager: cm, subtreeHighlightsEnabled } = cached;
  return subtreeHighlightsEnabled !== false && cm?.isNodeHistorySubtree?.(nodeData);
}
