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
  if (!link || !link.target) {
    return "link-unknown";
  }

  // Detect root link robustly
  const isRoot = !link.source || !link.source.parent || (link.target && link.target.parent == null);
  const targetId = getNodeId(link.target);

  return isRoot
    ? `link-root-${targetId}`
    : `link-${targetId}`;
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
