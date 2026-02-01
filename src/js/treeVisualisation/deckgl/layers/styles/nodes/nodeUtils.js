import { isNodeInSubtree } from '../../../../utils/splitMatching.js';
import { colorToRgb, getContrastingHighlightColor } from '../../../../../services/ui/colorUtils.js';
import { TREE_COLOR_CATEGORIES } from '../../../../../constants/TreeColors.js';


export function toColorManagerNode(node) {
  if (node?.leaf) {
    return node.leaf;
  }

  // If the node has an originalNode reference (from NodeConverter), use that
  if (node?.originalNode) {
    return node.originalNode;
  }

  // Fallback for direct D3 hierarchy nodes
  return node;
}

/**
 * Checks if a node should be highlighted due to active interaction or persistent marking.
 * Combines ephemeral highlights (source/dest) and persistent marked subtrees.
 */
export function shouldHighlightNode(nodeData, cached) {
  const { markedSubtreesEnabled, highlightSourceEnabled, highlightDestinationEnabled, markedSubtreeData, colorManager } = cached;

  // Ephemeral Highlights (Interaction)
  if (highlightSourceEnabled && colorManager.isNodeSourceEdge(nodeData)) return true;
  if (highlightDestinationEnabled && colorManager.isNodeDestinationEdge(nodeData)) return true;

  // Persistent Highlights (Marked Subtrees)
  return markedSubtreesEnabled !== false && markedSubtreeData && isNodeInSubtree(nodeData, markedSubtreeData);
}

/**
 * Checks if a node is part of the current active change edge.
 * Used to apply the same blue highlighting as links.
 */
export function isNodeActiveEdge(nodeData, cached) {
  const { colorManager } = cached;

  let isActive = false;

  if (colorManager.isNodeActiveChangeEdge(nodeData)) {
    isActive = true;
  }


  return isActive;
}



/**
 * Gets the active change edge color (blue) for nodes.
 */
export function getActiveEdgeColor() {
  return colorToRgb(TREE_COLOR_CATEGORIES.activeChangeEdgeColor);
}

/**
 * Resolves the highlight color based on the current mode.
 * @param {Object} nodeData - The node data object
 * @param {Object} cached - The cached state object containing highlightColorMode, colorManager, etc.
 * @returns {Array} [r, g, b] color array
 */
export function getHighlightColor(nodeData, cached) {
  const { highlightColorMode, colorManager: cm, markedColor } = cached;
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
  return colorToRgb(markedColor || TREE_COLOR_CATEGORIES.markedColor);
}

export function isHistorySubtreeNode(nodeData, cached) {
  const { colorManager: cm, markedSubtreesEnabled } = cached;
  return markedSubtreesEnabled !== false && cm?.isNodeHistorySubtree?.(nodeData);
}
