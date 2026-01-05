/**
 * Utility functions for reconstructing data from tree topology
 */

/**
 * Reconstructs the sorted_leaves array (index -> name map) from a tree object.
 * This is necessary when the server-provided sorted_leaves is alphabetically sorted
 * but the tree indices rely on a different (original) ordering.
 *
 * @param {Object} tree - The root node of the tree (usually interpolated_trees[0])
 * @returns {Array<string>} An array of leaf names where array index corresponds to leaf ID
 */
export function reconstructSortedLeavesFromTree(tree) {
  if (!tree) return [];

  const indexToNameMap = new Map();
  let maxIndex = -1;

  function traverse(node) {
    if (!node) return;

    // Check if it's a leaf
    // Leaves usually don't have children or have empty children array
    // And they must have split_indices
    const isLeaf = !node.children || node.children.length === 0;

    if (isLeaf && node.split_indices && Array.isArray(node.split_indices)) {
      // In the movie data model, each leaf usually has one index
      // representing its ID in the global leaf list.
      // Sometimes split_indices might have multiple if it's a collapsed node,
      // but for the base tree (fully resolved), it should be 1-to-1?
      // We'll iterate all indices just in case.
      for (const idx of node.split_indices) {
        if (typeof idx === 'number') {
          if (node.name) {
            indexToNameMap.set(idx, node.name);
            if (idx > maxIndex) maxIndex = idx;
          }
        }
      }
    }

    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(tree);

  // Convert map to array
  // We allocate size based on maxIndex we found to handle potential gaps (though unlikely)
  if (maxIndex === -1) return [];

  const reconstructed = new Array(maxIndex + 1).fill('');
  for (const [idx, name] of indexToNameMap.entries()) {
    reconstructed[idx] = name;
  }

  // Fallback: If map is empty or something went wrong, return empty array
  // alerting the caller might be good but for now we return what we have.

  return reconstructed;
}
