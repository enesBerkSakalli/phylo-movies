/**
 * Split index matching utilities
 * Core functions for comparing tree elements based on their split_indices
 * (arrays of leaf indices that define subtrees)
 */

/**
 * Get split indices from an element (node or link target)
 * Handles various data shapes from D3 hierarchy and deck.gl converters
 * @param {Object} element - Node or link data
 * @returns {Array<number>|null} Split indices array or null
 */
export function getSplitIndices(element) {
  return element.data.split_indices || element?.split_indices || null;
}

/**
 * Get split indices from a link's target node
 * @param {Object} linkData - Link data with target property
 * @returns {Array<number>|null} Split indices array or null
 */
export function getLinkSplitIndices(linkData) {
  return getSplitIndices(linkData?.target);
}

/**
 * Normalize a split set input to a Set
 * @param {Set|Array|null} input - Input to normalize
 * @param {Set|null} fallback - Fallback if input is invalid
 * @returns {Set|null} Normalized Set
 */
export function toSplitSet(input, fallback = null) {
  if (input instanceof Set) return input;
  if (Array.isArray(input) && input.length > 0 && typeof input[0] === 'number') {
    return new Set(input);
  }
  return fallback;
}

/**
 * Check if two split index collections are equal
 * @param {Array<number>} splitArray - Array of split indices
 * @param {Set<number>} splitSet - Set of split indices
 * @returns {boolean} True if they contain the same elements
 */
export function splitsEqual(splitArray, splitSet) {
  if (!Array.isArray(splitArray) || !(splitSet instanceof Set)) return false;
  if (splitArray.length !== splitSet.size) return false;
  return splitArray.every(el => splitSet.has(el));
}

/**
 * Check if one split set is a proper subset of another
 * (smaller is contained within larger, including equal size)
 * @param {Array<number>} smaller - Potential subset as array
 * @param {Set|Array} larger - Potential superset
 * @returns {boolean} True if smaller ⊆ larger
 */
export function isSubset(smaller, larger) {
  if (!Array.isArray(smaller) || smaller.length === 0) return false;
  const largerSet = larger instanceof Set ? larger : new Set(larger);
  return smaller.length <= largerSet.size && smaller.every(x => largerSet.has(x));
}

/**
 * Check if an element's splits match any target set exactly
 * @param {Object} element - Node or link target with split_indices
 * @param {Set<number>} targetSet - Target split set to match
 * @returns {boolean} True if exact match
 */
export function isExactMatch(element, targetSet) {
  const splits = getSplitIndices(element);
  if (!splits || !targetSet) return false;
  return splitsEqual(splits, targetSet);
}

/**
 * Check if an element's splits are a subset of any target set
 * @param {Object} element - Node or link target with split_indices
 * @param {Array<Set|Array>} targetSets - Array of target sets
 * @returns {boolean} True if element is subset of any target
 */
export function isSubsetOfAny(element, targetSets) {
  const splits = getSplitIndices(element);
  if (!splits || !targetSets?.length) return false;

  for (const target of targetSets) {
    if (isSubset(splits, target)) return true;
  }
  return false;
}

/**
 * Check if a link's target splits are a subset of any target set
 * @param {Object} linkData - Link data with target.data.split_indices
 * @param {Array<Set|Array>} targetSets - Array of target sets
 * @returns {boolean} True if link target is subset of any target
 */
export function isLinkSubsetOfAny(linkData, targetSets) {
  const splits = getLinkSplitIndices(linkData);
  if (!splits || !targetSets?.length) return false;

  for (const target of targetSets) {
    if (isSubset(splits, target)) return true;
  }
  return false;
}

/**
 * Flatten nested subtree entries into a single array
 * Handles arbitrarily nested arrays but preserves "leaf arrays" (arrays of numbers)
 * @param {Array} entries - Potentially nested array of subtree entries
 * @returns {Array} Flattened array with null/undefined removed
 */
export function flattenSplitSets(entries) {
  if (!Array.isArray(entries)) return [];

  const flattened = [];
  const recurse = (items) => {
    if (!Array.isArray(items)) return;

    items.forEach(item => {
      if (item instanceof Set) {
        flattened.push(item);
      } else if (Array.isArray(item)) {
        if (item.length > 0 && typeof item[0] === 'number') {
          flattened.push(item);
        } else {
          recurse(item);
        }
      }
    });
  };

  recurse(entries);
  return flattened;
}

// Alias for backward compatibility
export const flattenSubtreeEntries = flattenSplitSets;

/**
 * Check if a link's split indices are a subset of any marked subtree
 * @param {Object} linkData - Link data with target.data.split_indices
 * @param {Array<Set|Array>} subtreeSets - Array of subtree sets to check against
 * @returns {boolean} True if link is within any subtree
 */
export function isLinkInSubtree(linkData, subtreeSets) {
  return isSubsetOfAny(linkData?.target, subtreeSets);
}

/**
 * Check if a node's split indices are a subset of any marked subtree
 * @param {Object} nodeData - Node data with data.split_indices
 * @param {Array<Set|Array>} subtreeSets - Array of subtree sets to check against
 * @returns {boolean} True if node is within any subtree
 */
export function isNodeInSubtree(nodeData, subtreeSets) {
  return isSubsetOfAny(nodeData, subtreeSets);
}

/**
 * Check if a node is precisely the root of any marked subtree (exact match)
 * @param {Object} nodeData - Node data
 * @param {Array<Set|Array>} subtreeSets - Array of subtree sets
 * @returns {boolean} True if node is the root of a subtree
 */
export function isNodeSubtreeRoot(nodeData, subtreeSets) {
  const splitIndices = getSplitIndices(nodeData);
  if (!splitIndices || !subtreeSets?.length) return false;

  for (const subtree of subtreeSets) {
    const subtreeSet = subtree instanceof Set ? subtree : new Set(subtree);
    if (splitIndices.length === subtreeSet.size && splitsEqual(splitIndices, subtreeSet)) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a consistent string key for a subtree.
 * Uses an order-independent hash for performance (O(N)) and short key length.
 * @param {Set|Array} subtree - Subtree to generate key for
 * @returns {string} String hash
 */
export function toSubtreeKey(subtree) {
  let indices;
  if (subtree instanceof Set) {
    indices = subtree; // getSplitHash handles Set iteration
  } else if (Array.isArray(subtree)) {
    // Handle nested structure if passed by accident, though we should be passing leaves
    indices = subtree.flat(Infinity);
  } else {
    return String(subtree);
  }

  return getSplitHash(indices);
}

/**
 * Computes an order-independent hash for a collection of indices.
 * Uses Zobrist-style hashing with 64-bit precision (simulated).
 *
 * "Better" because:
 * 1. Order Independent: {A, B} == {B, A} (commutative XOR)
 * 2. Low Collision: 64-bit space (~1.8e19 values) makes unwanted collisions impossible for tree data.
 * 3. Fast: O(N) integer math, no sorting or string allocation loop.
 *
 * @param {Array<number>|Set<number>} indices
 * @returns {string} 16-char Hex string hash (64-bit)
 */
export function getSplitHash(indices) {
  let hLow = 0;
  let hHigh = 0;

  for (const index of indices) {
    // High-quality integer mixer (32-bit) with Seed 1 (Low bits)
    let v1 = index;
    v1 = ((v1 >> 16) ^ v1) * 0x45d9f3b;
    v1 = ((v1 >> 16) ^ v1) * 0x45d9f3b;
    v1 = (v1 >> 16) ^ v1;

    // High-quality integer mixer (32-bit) with Seed 2 (High bits)
    // Using a different multiplier/seed to decorrelate
    let v2 = index ^ 0xDEADBEEF; // Salt
    v2 = ((v2 >> 16) ^ v2) * 0x119de1f3;
    v2 = ((v2 >> 16) ^ v2) * 0x119de1f3;
    v2 = (v2 >> 16) ^ v2;

    hLow ^= v1;
    hHigh ^= v2;
  }

  // Combine into 16-char hex string
  // Use >>> 0 to ensure unsigned 32-bit integer display
  const lowStr = (hLow >>> 0).toString(16).padStart(8, '0');
  const highStr = (hHigh >>> 0).toString(16).padStart(8, '0');

  return highStr + lowStr;
}

/**
 * PARSER for Subtree Tracking Entries
 *
 * Rules:
 * 1. [1, 2, 3] (All numbers) -> ONE subtree: {1, 2, 3}
 * 2. [[1, 2], [3]] (All arrays) -> TWO subtrees: {1, 2} and {3}
 * 3. [1, [2, 3], 4] (Mixed) -> THREE subtrees: {1}, {2, 3}, {4}
 *
 * Returns Array of Arrays (normalized subtrees)
 * @param {Array} entry - Raw tracking entry
 * @returns {Array<Array<number>>} Array of normalized subtree arrays
 */
export function parseSubtreeTrackingEntry(entry) {
  if (!Array.isArray(entry) || entry.length === 0) return [];

  // Rule 1: Pure Flat Array -> Single Subtree
  const isPureFlat = entry.every(item => typeof item === 'number');
  if (isPureFlat) {
    return [entry];
  }

  // Rule 2 & 3: Mixed/Nested -> Multiple Independent Subtrees
  return entry.map(item => {
    if (typeof item === 'number') return [item]; // Naked number becomes isolated subtree
    if (Array.isArray(item)) return item;        // Array remains subtree
    if (item instanceof Set) return Array.from(item);
    return null;
  }).filter(item => Array.isArray(item) && item.length > 0);
}

/**
 * Collect unique edges from a tracking array range
 * @param {Array} tracking - Timeline tracking array
 * @param {number} start - Start index (inclusive)
 * @param {number} end - End index (exclusive)
 * @param {string|null} excludeKey - Key to exclude
 * @returns {Array} Array of unique edge structures
 */
export function collectUniqueEdges(tracking, start, end, excludeKey) {
  const map = new Map();
  for (let i = start; i < end; i++) {
    const edge = tracking[i];
    if (Array.isArray(edge) && edge.length > 0) {
      // Use toSubtreeKey for consistent sorting/stringification
      const key = toSubtreeKey(edge);
      if (key !== excludeKey && !map.has(key)) map.set(key, edge);
    }
  }
  return Array.from(map.values());
}

/**
 * Collect unique subtrees from tracking array.
 * Uses robust parsing to handle flat vs mixed/nested structures.
 * @param {Array} tracking - Timeline tracking array
 * @param {number} start - Start index (inclusive)
 * @param {number} end - End index (exclusive)
 * @param {Set} excludeKeys - Set of keys to exclude
 * @returns {Array} Array of unique subtree sets/arrays
 */
export function collectUniqueSubtrees(tracking, start, end, excludeKeys = new Set()) {
  const map = new Map();

  for (let i = start; i < end; i++) {
    const entry = tracking[i];
    if (!Array.isArray(entry) || entry.length === 0) continue;

    // Normalize entry to list of subtrees using the parser
    const subtrees = parseSubtreeTrackingEntry(entry);

    for (const subtree of subtrees) {
        const key = toSubtreeKey(subtree);
        if (!excludeKeys.has(key) && !map.has(key)) {
          map.set(key, subtree);
        }
    }
  }
  return Array.from(map.values());
}
