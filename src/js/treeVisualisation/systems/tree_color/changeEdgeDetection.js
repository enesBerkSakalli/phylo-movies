/**
 * Change edge detection utilities
 * Handles detection of active change edges during tree animation
 * Uses shared split matching utilities for core comparison logic
 */
import {
  splitsEqual,
  toSplitSet,
  getSplitIndices,
  isSubsetOfAny
} from '../../utils/splitMatching.js';

// Re-export shared functions for backward compatibility
export { splitsEqual, toSplitSet as resolveActiveEdgeSet };

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
  const splits = getSplitIndices(nodeData);
  if (!activeChangeEdge || !splits) return false;
  return splitsEqual(splits, activeChangeEdge);
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
      const childSplits = getSplitIndices(child);
      if (childSplits && splitsEqual(childSplits, activeChangeEdge)) {
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
    const edgeSet = toSplitSet(edge) || (edge instanceof Set ? edge : new Set(edge));
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
  return isSubsetOfAny(linkData?.target, activeChangeEdges);
}

/**
 * Check if a node is downstream of any active change edge
 * @param {Object} nodeData - Node data
 * @param {Array<Set<number>>} activeChangeEdges - Array of active change edge Sets
 * @returns {boolean} True if downstream
 */
export function isNodeDownstreamOfChangeEdge(nodeData, activeChangeEdges) {
  return isSubsetOfAny(nodeData, activeChangeEdges);
}
