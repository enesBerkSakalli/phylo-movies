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
export { splitsEqual, toSplitSet as resolvePivotEdgeSet };

/**
 * Check if branch matches current pivot edge
 * @param {Object} linkData - D3 link data
 * @param {Set<number>} pivotEdge - Pivot edge Set
 * @returns {boolean} True if this is the pivot edge
 */
export function isLinkPivotEdge(linkData, pivotEdge) {
  if (!pivotEdge || !linkData?.target?.data?.split_indices) return false;
  return splitsEqual(linkData.target.data.split_indices, pivotEdge);
}

/**
 * Check if node matches any pivot edge
 * @param {Object} nodeData - Node data
 * @param {Set<number>} pivotEdge - Pivot edge Set
 * @returns {boolean} True if node is the pivot edge
 */
export function isNodePivotEdge(nodeData, pivotEdge) {
  const splits = getSplitIndices(nodeData);
  if (!pivotEdge || !splits) return false;
  return splitsEqual(splits, pivotEdge);
}

/**
 * Check if a node is either the pivot edge, or the parent of a child that is the pivot edge
 * @param {Object} nodeData - Node data
 * @param {Set<number>} pivotEdge - Pivot edge Set
 * @returns {boolean} True if node or its child matches
 */
export function nodeOrParentMatchesPivotEdge(nodeData, pivotEdge) {
  if (!pivotEdge) return false;

  // Exact match on the node itself
  if (isNodePivotEdge(nodeData, pivotEdge)) return true;

  // Immediate child match (parent highlight)
  if (Array.isArray(nodeData?.children) && nodeData.children.length > 0) {
    for (const child of nodeData.children) {
      const childSplits = getSplitIndices(child);
      if (childSplits && splitsEqual(childSplits, pivotEdge)) {
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
    if (nodeOrParentMatchesPivotEdge(nodeData, edgeSet)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a branch is downstream of any pivot edge
 * @param {Object} linkData - D3 link data
 * @param {Array<Set<number>>} pivotEdges - Array of pivot edge Sets
 * @returns {boolean} True if downstream
 */
export function isLinkDownstreamOfChangeEdge(linkData, pivotEdges) {
  return isSubsetOfAny(linkData?.target, pivotEdges);
}

/**
 * Check if a node is downstream of any pivot edge
 * @param {Object} nodeData - Node data
 * @param {Array<Set<number>>} pivotEdges - Array of pivot edge Sets
 * @returns {boolean} True if downstream
 */
export function isNodeDownstreamOfChangeEdge(nodeData, pivotEdges) {
  return isSubsetOfAny(nodeData, pivotEdges);
}
