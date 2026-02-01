/**
 * CommonAncestorBuilder - Utilities for finding Lowest Common Ancestors (LCA) in phylogenetic trees.
 * Used for Hierarchical Edge Bundling to group connections by their shared ancestry.
 */

/**
 * Finds the Lowest Common Ancestor (LCA) for a set of nodes.
 * @param {Array<Object>} nodes - Array of tree node objects. Each node must have a `parent` reference.
 * @returns {Object|null} The LCA node, or null if no common ancestor found.
 */
export function findLowestCommonAncestor(nodes) {
  if (!nodes || nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];

  // Get lineage (path to root) for the first node
  const firstNodeLineage = getLineage(nodes[0]);

  // Intersect with lineages of all other nodes
  // We can optimize by walking up from each other node until we hit the firstNodeLineage
  let lca = null;

  // A simple approach: find the "deepest" node that is in everyone's lineage.
  // Since we have a specialized case (subtrees), it's likely they share a relatively recent ancestor.

  // Set for O(1) lookup
  const lineageSet = new Set(firstNodeLineage);

  // Start with the intersection being the first lineage.
  // We'll effectively find the first node in 'firstNodeLineage' that covers all others.
  // Actually, standard LCA of N nodes:
  // 1. Find depth of all nodes (or just use the path).
  // 2. Or, simpler for JS:
  //    intersection of all lineages. The "last" (deepest) element in the intersection is the LCA.

  let commonAncestors = firstNodeLineage;

  for (let i = 1; i < nodes.length; i++) {
    const currentLineage = getLineage(nodes[i]);
    // Intersect ensuring order (root -> leaf)
    commonAncestors = commonAncestors.filter(ancestor => currentLineage.includes(ancestor));
    if (commonAncestors.length === 0) return null; // Disconnected trees?
  }

  // The last element is the deepest common ancestor
  return commonAncestors[commonAncestors.length - 1];
}

/**
 * Returns the path from root to this node (inclusive).
 * @param {Object} node
 * @returns {Array<Object>} [root, child, ..., node]
 */
function getLineage(node) {
  const lineage = [];
  let current = node;
  while (current) {
    lineage.unshift(current); // Add to front to get root -> leaf order
    current = current.parent;
  }
  return lineage;
}
