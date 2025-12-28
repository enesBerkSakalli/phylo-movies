/**
 * Change edge detection utilities
 * Handles detection of active change edges during tree animation
 */

/**
 * Compare split array with an active edge Set for equality
 * @param {Array<number>} splitArray - Array of split indices
 * @param {Set<number>} activeEdgeSet - Set of active edge indices
 * @returns {boolean} True if they match
 */
export function splitsEqual(splitArray, activeEdgeSet) {
  if (!Array.isArray(splitArray) || !(activeEdgeSet instanceof Set)) return false;
  if (splitArray.length !== activeEdgeSet.size) return false;
  for (const el of splitArray) {
    if (!activeEdgeSet.has(el)) return false;
  }
  return true;
}

/**
 * Normalize active edge input to a Set
 * @param {Set|Array|null} activeChangeEdges - Input to normalize
 * @param {Set|null} fallback - Fallback Set if input is invalid
 * @returns {Set|null} Normalized Set
 */
export function resolveActiveEdgeSet(activeChangeEdges, fallback = null) {
  if (activeChangeEdges instanceof Set) return activeChangeEdges;
  if (Array.isArray(activeChangeEdges) && activeChangeEdges.length > 0 && typeof activeChangeEdges[0] === 'number') {
    return new Set(activeChangeEdges);
  }
  return fallback;
}

/**
 * Check if branch matches current active change edge
 * @param {Object} linkData - D3 link data
 * @param {Set<number>} activeChangeEdge - Active change edge Set
 * @returns {boolean} True if this is the active change edge
 */
export function isLinkActiveChangeEdge(linkData, activeChangeEdge) {
  if (!activeChangeEdge || !linkData?.target?.data?.split_indices) return false;
  return splitsEqual(linkData.target.data.split_indices, activeChangeEdge);
}

/**
 * Check if node matches any active change edge
 * @param {Object} nodeData - Node data
 * @param {Set<number>} activeChangeEdge - Active change edge Set
 * @returns {boolean} True if node is the active change edge
 */
export function isNodeActiveChangeEdge(nodeData, activeChangeEdge) {
  if (!activeChangeEdge || !nodeData?.data?.split_indices) return false;
  return splitsEqual(nodeData.data.split_indices, activeChangeEdge);
}

/**
 * Check if a node is either the active edge, or the parent of a child that is the active edge
 * @param {Object} nodeData - Node data
 * @param {Set<number>} activeChangeEdge - Active change edge Set
 * @returns {boolean} True if node or its child matches
 */
export function nodeOrParentMatchesActiveEdge(nodeData, activeChangeEdge) {
  if (!activeChangeEdge) return false;

  // Exact match on the node itself
  if (isNodeActiveChangeEdge(nodeData, activeChangeEdge)) return true;

  // Immediate child match (parent highlight)
  if (Array.isArray(nodeData?.children) && nodeData.children.length > 0) {
    for (const child of nodeData.children) {
      if (child?.data?.split_indices && splitsEqual(child.data.split_indices, activeChangeEdge)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if a node matches any edge in a list, or is the parent of a matching child.
 * @param {Object} nodeData - Node data
 * @param {Array<Set<number>|Array<number>>} edgeSets - Edge sets to compare
 * @returns {boolean} True if node or its child matches any edge
 */
export function nodeOrParentMatchesAnyEdge(nodeData, edgeSets) {
  if (!Array.isArray(edgeSets) || edgeSets.length === 0) return false;

  for (const edge of edgeSets) {
    const edgeSet = edge instanceof Set ? edge : new Set(edge);
    if (nodeOrParentMatchesActiveEdge(nodeData, edgeSet)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a branch is downstream of any active change edge
 * @param {Object} linkData - D3 link data
 * @param {Array<Set<number>>} activeChangeEdges - Array of active change edge Sets
 * @returns {boolean} True if downstream
 */
export function isLinkDownstreamOfChangeEdge(linkData, activeChangeEdges) {
  if (!linkData?.target?.data?.split_indices) return false;

  const treeSplit = new Set(linkData.target.data.split_indices);

  for (const edge of activeChangeEdges) {
    const edgeSet = edge instanceof Set ? edge : new Set(edge);
    const isSubset = [...treeSplit].every(leaf => edgeSet.has(leaf));
    const isProperSubset = treeSplit.size <= edgeSet.size && isSubset;
    if (isProperSubset) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a node is downstream of any active change edge
 * @param {Object} nodeData - Node data
 * @param {Array<Set<number>>} activeChangeEdges - Array of active change edge Sets
 * @returns {boolean} True if downstream
 */
export function isNodeDownstreamOfChangeEdge(nodeData, activeChangeEdges) {
  if (!activeChangeEdges || activeChangeEdges.length === 0 || !nodeData?.data?.split_indices) {
    return false;
  }

  const nodeSplit = new Set(nodeData.data.split_indices);

  for (const edge of activeChangeEdges) {
    const edgeSet = edge instanceof Set ? edge : new Set(edge);
    const isSubset = [...nodeSplit].every(leaf => edgeSet.has(leaf));
    const isProperSubset = nodeSplit.size <= edgeSet.size && isSubset;
    if (isProperSubset) {
      return true;
    }
  }

  return false;
}
