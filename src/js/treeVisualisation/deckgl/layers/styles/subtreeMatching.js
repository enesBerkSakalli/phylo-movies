/**
 * Subtree matching utilities
 * Checks if tree elements (links/nodes) belong to marked subtrees
 * using split index subset relationships
 */

/**
 * Check if a link's split indices are a subset of any marked subtree
 * @param {Object} linkData - Link data with target.data.split_indices or target.split_indices
 * @param {Array<Set|Array>} subtreeSets - Array of subtree sets to check against
 * @returns {boolean} True if link is within any subtree
 */
export function isLinkInSubtree(linkData, subtreeSets) {
  const splitIndices = linkData?.target?.data?.split_indices || linkData?.target?.split_indices;
  if (!splitIndices || !subtreeSets?.length) {
    return false;
  }

  for (const subtree of subtreeSets) {
    const subtreeSet = subtree instanceof Set ? subtree : new Set(subtree);
    const isSubset = splitIndices.every(leaf => subtreeSet.has(leaf));
    const isProperSubset = splitIndices.length <= subtreeSet.size && isSubset;
    if (isProperSubset) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a node's split indices are a subset of any marked subtree
 * @param {Object} nodeData - Node data with data.split_indices or split_indices
 * @param {Array<Set|Array>} subtreeSets - Array of subtree sets to check against
 * @returns {boolean} True if node is within any subtree
 */
export function isNodeInSubtree(nodeData, subtreeSets) {
  const splitIndices = nodeData?.data?.split_indices || nodeData?.split_indices;
  if (!splitIndices || !subtreeSets?.length) {
    return false;
  }

  for (const subtree of subtreeSets) {
    const subtreeSet = subtree instanceof Set ? subtree : new Set(subtree);
    const isSubset = splitIndices.every(leaf => subtreeSet.has(leaf));
    const isProperSubset = splitIndices.length <= subtreeSet.size && isSubset;
    if (isProperSubset) {
      return true;
    }
  }
  return false;
}

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

  // Check if link IS the active change edge (not downstream of it)
  // Only the specific edge being changed should be highlighted, not all descendants
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
  // This is the simplest and most reliable way - if the color differs, it's highlighted
  const baseColor = colorManager.getNodeBaseColor?.(nodeData);
  const highlightedColor = colorManager.getNodeColor?.(nodeData);
  const isActiveEdgeNode = baseColor !== highlightedColor;

  return isMarked || isActiveEdgeNode;
}

/**
 * Check if a node is the exact root of any subtree (split indices equal the subtree set)
 * @param {Object} nodeData - Node data with data.split_indices or split_indices
 * @param {Array<Set|Array>} subtreeSets - Array of subtree sets to check against
 * @returns {boolean} True if node matches any subtree root exactly
 */
export function isNodeSubtreeRoot(nodeData, subtreeSets) {
  const splitIndices = nodeData?.data?.split_indices || nodeData?.split_indices;
  if (!Array.isArray(splitIndices) || !subtreeSets?.length) {
    return false;
  }

  for (const subtree of subtreeSets) {
    const subtreeSet = subtree instanceof Set ? subtree : new Set(subtree);
    if (splitIndices.length !== subtreeSet.size) continue;
    const allMatch = splitIndices.every(idx => subtreeSet.has(idx));
    if (allMatch) {
      return true;
    }
  }
  return false;
}

/**
 * Flatten nested subtree entries into a single array, filtering out nulls.
 * Handles arbitrarily nested arrays but preserves "leaf arrays" (arrays of numbers)
 * which represent actual subtree node sets.
 *
 * @param {Array} entries - Potentially nested array of subtree entries
 * @returns {Array} Flattened array with null/undefined entries removed
 */
export function flattenSubtreeEntries(entries) {
  if (!Array.isArray(entries)) return [];

  const flattened = [];
  const recurse = (items) => {
    if (!Array.isArray(items)) return;

    items.forEach(item => {
      // If it's a leaf array (non-empty array of numbers) or a Set, keeps it
      if (item instanceof Set) {
        flattened.push(item);
      } else if (Array.isArray(item)) {
        if (item.length > 0 && typeof item[0] === 'number') {
          // It's a leaf array (list of node IDs), keep it
          flattened.push(item);
        } else {
          // It's a structural nesting array, recurse
          recurse(item);
        }
      } else if (item != null) {
        // Just in case there are single items that aren't arrays/sets (though likely unexpected)
        // flattened.push(item);
      }
    });
  };

  recurse(entries);
  return flattened;
}
