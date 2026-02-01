import { getSplitHash } from './splitMatching.js';

/**
 * KeyGenerator - Centralized, robust key generation for D3 data binding
 *
 * Provides consistent, stable keys for nodes, links, and extensions across
 * all tree visualization components. Ensures animation correspondence integrity.
 */

/**
 * Generates a robust, unique key for tree nodes (leaves and internal nodes)
 * @param {Object} node - D3 hierarchy node with data.split_indices
 * @returns {string} Unique node key (e.g., "node-0-1-2" or "node-unknown")
 */
export function getNodeKey(node) {
  const splitKey = normalizeSplitIndices(node?.data?.split_indices);
  if (splitKey) return `node-${splitKey}`;

  const fallbackId = getFallbackId(node?.data);
  return `node-${fallbackId}`;
}


/**
 * Generates a robust, unique key for tree labels
 * @param {Object} leaf - D3 hierarchy leaf node with data.split_indices
 * @returns {string} Unique label key (e.g., "label-0-1-2" or "label-unknown")
 */
export function getLabelKey(leaf) {
  const splitKey = normalizeSplitIndices(leaf?.data?.split_indices);
  if (splitKey) return `label-${splitKey}`;

  // Fallback: use name if available, otherwise "unknown"
  const fallbackId = getFallbackId(leaf?.data);

  return `label-${fallbackId}`;
}

/**
 * Internal helper to generate node ID from split indices
 * @param {Object} node - D3 hierarchy node
 * @returns {string} Node ID without prefix
 */
const getNodeId = (node) => {
  const splitKey = normalizeSplitIndices(node?.data?.split_indices);
  if (splitKey) return splitKey;
  return getFallbackId(node?.data);
};


/**
 * Generates a robust, unique key for tree links (branches)
 * @param {Object} link - D3 link object with source and target nodes
 * @returns {string} Unique link key (e.g., "link-0-1-2")
 */
export function getLinkKey(link) {
  if (!link || !link.source || !link.target) {
    throw new Error('Invalid link object');
  }

  const targetId = getNodeId(link.target);

  return `link-${targetId}`;
}

/**
 * Generates a robust, unique key for link extensions (dashed lines to labels)
 * @param {Object} leaf - D3 leaf node
 * @returns {string} Unique extension key (e.g., "ext-0-1-2")
 */
export function getExtensionKey(leaf) {
  const splitKey = normalizeSplitIndices(leaf?.data?.split_indices);
  if (splitKey) return `ext-${splitKey}`;

  // Fallback: use name if available
  const fallbackId = getFallbackId(leaf?.data);

  return `ext-${fallbackId}`;
}

/**
 * Convert split_indices array to a stable key string.
 * Uses an order-independent hash for performance (O(N)) and short key length.
 * @param {Array<number>} splitIndices
 * @returns {string|null}
 */
const normalizeSplitIndices = (splitIndices) => {
  if (!Array.isArray(splitIndices) || splitIndices.length === 0) return null;
  return getSplitHash(splitIndices);
};

/**
 * Build a sanitized fallback id from node data.
 * @param {Object} data
 * @returns {string}
 */
const getFallbackId = (data) => {
  const raw = data?.guid ?? data?.id ?? data?.name ?? "unknown";
  return raw.toString().replace(/[^a-zA-Z0-9-_]/g, "_");
};
