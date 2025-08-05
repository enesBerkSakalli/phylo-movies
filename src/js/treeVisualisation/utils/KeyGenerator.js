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
  if (node && node.data && Array.isArray(node.data.split_indices)) {
    return `node-${node.data.split_indices.join("-")}`;
  }

  // Fallback: use name if available, otherwise "unknown"
  const fallbackId = (node && node.data && node.data.name)
    ? node.data.name.toString().replace(/[^a-zA-Z0-9-_]/g, "_")
    : "unknown";

  return `node-${fallbackId}`;
}

/**
 * Generates a robust, unique key for tree labels
 * @param {Object} leaf - D3 hierarchy leaf node with data.split_indices
 * @returns {string} Unique label key (e.g., "label-0-1-2" or "label-unknown")
 */
export function getLabelKey(leaf) {
  if (leaf && leaf.data && Array.isArray(leaf.data.split_indices)) {
    return `label-${leaf.data.split_indices.join("-")}`;
  }

  // Fallback: use name if available, otherwise "unknown"
  const fallbackId = (leaf && leaf.data && leaf.data.name)
    ? leaf.data.name.toString().replace(/[^a-zA-Z0-9-_]/g, "_")
    : "unknown";

  return `label-${fallbackId}`;
}

/**
 * Internal helper to generate node ID from split indices
 * @param {Object} node - D3 hierarchy node
 * @returns {string} Node ID without prefix
 */
const getNodeId = (node) => {
  if (node && node.data && Array.isArray(node.data.split_indices)) {
    return node.data.split_indices.join("-");
  }
  return "unknown";
};


/**
 * Generates a robust, unique key for tree links (branches)
 * @param {Object} link - D3 link object with source and target nodes
 * @returns {string} Unique link key (e.g., "link-0-1-2", "link-root-0-1-2")
 */
export function getLinkKey(link) {
  if (!link || !link.source || !link.target) {
    throw new Error('Invalid link object');
  }

  const sourceId = getNodeId(link.source);
  const targetId = getNodeId(link.target);

  // Handle the root case where source might not have a conventional ID
  if (sourceId === "unknown" || link.source.parent === null) {
    return `link-root-${targetId}`;
  }

  return `link-to-${targetId}`;
}

/**
 * Generates a robust, unique key for link extensions (dashed lines to labels)
 * @param {Object} leaf - D3 leaf node
 * @returns {string} Unique extension key (e.g., "ext-0-1-2")
 */
export function getExtensionKey(leaf) {
  if (leaf && leaf.data && Array.isArray(leaf.data.split_indices)) {
    return `ext-${leaf.data.split_indices.join("-")}`;
  }

  // Fallback: use name if available
  const fallbackId = (leaf && leaf.data && leaf.data.name)
    ? leaf.data.name.toString().replace(/[^a-zA-Z0-9-_]/g, "_")
    : "unknown";

  return `ext-${fallbackId}`;
}

/**
 * Generates SVG id attribute for nodes
 * @param {Object} node - D3 hierarchy node
 * @param {string} prefix - Prefix for the ID (e.g., "circle", "internal")
 * @returns {string} SVG-safe ID string
 */
export function getNodeSvgId(node, prefix = "node") {
  if (node && node.data && Array.isArray(node.data.split_indices)) {
    return `${prefix}-${node.data.split_indices.join("-")}`;
  }

  const fallbackId = (node && node.data && node.data.name)
    ? node.data.name.toString().replace(/[^a-zA-Z0-9-_]/g, "_")
    : "unknown";

  return `${prefix}-${fallbackId}`;
}

/**
 * Generates SVG id attribute for links
 * @param {Object} link - D3 link object
 * @returns {string} SVG-safe ID string
 */
export function getLinkSvgId(link) {
  return getLinkKey(link); // Same logic for consistency
}

/**
 * Generates SVG id attribute for extensions
 * @param {Object} leaf - D3 leaf node
 * @returns {string} SVG-safe ID string
 */
export function getExtensionSvgId(leaf) {
  return getExtensionKey(leaf); // Same logic for consistency
}

/**
 * Generates a stable, identity-based key for tree data structures
 * Uses the first leaf node as the tree's identity representative
 *
 * @param {Object} treeData - D3 hierarchy tree data
 * @returns {string} Unique tree identity key
 */
export function getTreeKey(treeData) {
  if (!treeData) return 'tree-empty';

  // Use tree ID if explicitly provided
  if (treeData.id) {
    return `tree-${treeData.id}`;
  }

  // Use tree name if available
  if (treeData.name) {
    return `tree-${treeData.name.toString().replace(/[^a-zA-Z0-9-_]/g, "_")}`;
  }

  // Use first leaf as identity representative
  const leaves = treeData.leaves();
  if (leaves.length > 0) {
    const firstLeafKey = getNodeKey(leaves[0]);
    // Strip 'node-' prefix to get pure identity
    return firstLeafKey.replace('node-', 'tree-');
  }

  // Fallback: use root node identity
  const root = treeData.descendants()?.[0];
  if (root) {
    const rootKey = getNodeKey(root);
    return rootKey.replace('node-', 'tree-');
  }

  // Ultimate fallback: structural identity (rare)
  return `tree-${treeData.descendants().length}-${treeData.links().length}`;
}
