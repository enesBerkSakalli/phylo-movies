/**
 * Visual highlight detection utilities
 * Determines if tree elements are visually highlighted based on ColorManager state
 */

/**
 * Check if a link has different color when highlighted vs base
 * (i.e., is visually distinguished)
 * @param {Object} link - Link data
 * @param {Object} colorManager - ColorManager instance
 * @param {boolean} subtreeHighlightsEnabled - Whether subtree highlight coloring is enabled
 * @returns {boolean} True if link appears highlighted
 */
export function isLinkVisuallyHighlighted(link, colorManager, subtreeHighlightsEnabled = true) {
  if (!colorManager) return false;

  // Check if link is in a highlighted subtree using fast path (only if coloring is enabled)
  const isHighlightedSubtree =
    subtreeHighlightsEnabled !== false && colorManager.isLinkInHighlightedSubtreeFast?.(link);

  // Check if link IS the pivot edge
  const isPivotEdge = colorManager.isPivotEdge?.(link);

  return isHighlightedSubtree || isPivotEdge;
}

/**
 * Check if a node is visually highlighted (subtree highlight or active edge)
 * @param {Object} nodeData - Node data
 * @param {Object} colorManager - ColorManager instance
 * @param {boolean} subtreeHighlightsEnabled - Whether subtree highlight coloring is enabled
 * @returns {boolean} True if node appears highlighted
 */
export function isNodeVisuallyHighlighted(nodeData, colorManager, subtreeHighlightsEnabled = true) {
  if (!colorManager) return false;

  // Use fast path for subtree highlight check (only if coloring is enabled)
  const isHighlightedSubtree =
    subtreeHighlightsEnabled !== false && colorManager.isNodeInHighlightedSubtreeFast?.(nodeData);

  // Check if node IS the pivot edge by comparing colors
  const baseColor = colorManager.getNodeBaseColor?.(nodeData);
  const highlightedColor = colorManager.getNodeColor?.(nodeData);
  const isPivotEdgeNode = baseColor !== highlightedColor;

  return isHighlightedSubtree || isPivotEdgeNode;
}
