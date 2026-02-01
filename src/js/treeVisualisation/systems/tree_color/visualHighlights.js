/**
 * Visual highlight detection utilities
 * Determines if tree elements are visually highlighted based on ColorManager state
 */
import { isLinkInSubtree, isNodeInSubtree } from '../../utils/splitMatching.js';

/**
 * Check if a link has different color when highlighted vs base
 * (i.e., is visually distinguished)
 * @param {Object} link - Link data
 * @param {Object} colorManager - ColorManager instance
 * @param {boolean} markedSubtreesEnabled - Whether marked subtree coloring is enabled
 * @returns {boolean} True if link appears highlighted
 */
export function isLinkVisuallyHighlighted(link, colorManager, markedSubtreesEnabled = true) {
  if (!colorManager) return false;

  // Check if link is in a marked subtree (only if coloring is enabled)
  const isMarked = markedSubtreesEnabled !== false && isLinkInSubtree(link, colorManager.sharedMarkedJumpingSubtrees);

  // Check if link IS the active change edge
  const isActiveEdge = colorManager.isActiveChangeEdge?.(link);

  return isMarked || isActiveEdge;
}

/**
 * Check if a node is visually highlighted (marked or active edge)
 * @param {Object} nodeData - Node data
 * @param {Object} colorManager - ColorManager instance
 * @param {boolean} markedSubtreesEnabled - Whether marked subtree coloring is enabled
 * @returns {boolean} True if node appears highlighted
 */
export function isNodeVisuallyHighlighted(nodeData, colorManager, markedSubtreesEnabled = true) {
  if (!colorManager) return false;

  // Only check marked subtrees if coloring is enabled
  const isMarked = markedSubtreesEnabled !== false && isNodeInSubtree(nodeData, colorManager.sharedMarkedJumpingSubtrees);

  // Check if node IS the active change edge by comparing colors
  const baseColor = colorManager.getNodeBaseColor?.(nodeData);
  const highlightedColor = colorManager.getNodeColor?.(nodeData);
  const isActiveEdgeNode = baseColor !== highlightedColor;

  return isMarked || isActiveEdgeNode;
}
