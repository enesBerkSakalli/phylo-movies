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
 * Returns a stable, cross-tree node id for the same biological leaf.
 * Priority:
 * 1) Explicit stable field if present (guid/id)
 * 2) Taxon name
 * 3) Fallback to split_indices-based key
 */
export function getStableNodeId(node) {
  const guid = node?.data?.guid || node?.data?.id;
  if (guid) return `stable-${String(guid)}`;
  const name = node?.data?.name ? String(node.data.name).replace(/[^a-zA-Z0-9-_]/g, "_") : null;
  if (name) return `stable-${name}`;
  return getNodeKey(node);
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
