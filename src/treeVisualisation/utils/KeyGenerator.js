import { getSplitKey } from '../../domain/tree/splits.js';

/**
 * KeyGenerator - Centralized, robust key generation for D3 data binding
 *
 * Provides consistent, stable keys for nodes, links, and extensions across
 * all tree visualization components. Ensures animation correspondence integrity.
 */

/**
 * Generates a robust, unique key for tree nodes (leaves and internal nodes)
 * @param {Object} node - Tree node or render datum with split indices
 * @returns {string|null} Unique node key, or null when split indices are missing
 */
export function getNodeKey(node) {
  const splitKey = normalizeSplitIndices(node);
  if (splitKey) return `node-${splitKey}`;
  return null;
}


/**
 * Generates a robust, unique key for tree labels
 * @param {Object} leaf - Tree leaf or render datum with split indices
 * @returns {string|null} Unique label key, or null when split indices are missing
 */
export function getLabelKey(leaf) {
  const splitKey = normalizeSplitIndices(leaf);
  if (splitKey) return `label-${splitKey}`;
  return null;
}

/**
 * Internal helper to generate node ID from split indices
 * @param {Object} node - Tree node or render datum
 * @returns {string} Node ID without prefix
 */
const getNodeId = (node) => {
  const splitKey = normalizeSplitIndices(node);
  if (splitKey) return splitKey;
  return null;
};


/**
 * Generates a robust, unique key for normalized tree links (branches)
 * @param {Object} link - Normalized link datum with split indices
 * @returns {string} Unique link key (e.g., "link-0-1-2")
 */
export function getLinkKey(link) {
  if (!link) {
    throw new Error('Invalid link object');
  }

  const targetId = getNodeId(link);
  if (!targetId) return null;

  return `link-${targetId}`;
}

/**
 * Generates a robust, unique key for link extensions (dashed lines to labels)
 * @param {Object} leaf - Tree leaf or render datum with split indices
 * @returns {string|null} Unique extension key, or null when split indices are missing
 */
export function getExtensionKey(leaf) {
  const splitKey = normalizeSplitIndices(leaf);
  if (splitKey) return `ext-${splitKey}`;
  return null;
}

/**
 * Convert split_indices array to a stable key string.
 * Uses an order-independent hash for performance (O(N)) and short key length.
 * @param {Array<number>} splitIndices
 * @returns {string|null}
 */
const normalizeSplitIndices = (splitIndices) => {
  return getSplitKey(splitIndices);
};
