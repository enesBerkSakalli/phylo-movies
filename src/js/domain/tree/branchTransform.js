/**
 * Branch Length Transformation Utilities
 *
 * Provides various transformation functions to make phylogenetic trees more readable
 * by transforming branch lengths to emphasize small differences or normalize ranges.
 */

/**
 * Deep clone a tree node structure while handling circular references
 * @param {Object} node - Tree node to clone
 * @param {WeakMap} cloneMap - Map to track already cloned nodes (prevents infinite recursion)
 * @returns {Object} Cloned tree node
 * @private
 */
function _cloneTreeNode(node, cloneMap = new WeakMap()) {
  if (!node || typeof node !== 'object') return node;

  // If we've already cloned this node, return the clone
  if (cloneMap.has(node)) {
    return cloneMap.get(node);
  }

  // Create new node object and add to map immediately to handle circular refs
  const cloned = {};
  cloneMap.set(node, cloned);

  // Copy all properties except parent (to avoid circular references)
  for (const key in node) {
    if (node.hasOwnProperty(key) && key !== 'parent') {
      const value = node[key];

      if (Array.isArray(value)) {
        // Recursively clone arrays (like children)
        cloned[key] = value.map(item => _cloneTreeNode(item, cloneMap));
      } else if (value && typeof value === 'object') {
        // Recursively clone objects
        cloned[key] = _cloneTreeNode(value, cloneMap);
      } else {
        // Copy primitive values directly
        cloned[key] = value;
      }
    }
  }

  return cloned;
}

/**
 * Apply branch length transformation to a tree node and all its descendants
 * @param {Object} node - Tree node with children and branch_length properties
 * @param {string} transformType - Type of transformation to apply
 * @returns {Object} Transformed tree node
 */
export function transformBranchLengths(node, transformType = 'none') {
  if (!node) return node;

  // If transformType is 'none', return a clean copy
  if (transformType === 'none') {
    return _cloneTreeNode(node);
  }

  // If transformType is 'ignore', set all branch lengths to 1
  if (transformType === 'ignore') {
    const ignoredNode = _cloneTreeNode(node);
    _applyIgnoreBranchLengthsRecursive(ignoredNode);
    return ignoredNode;
  }

  // Create a deep copy to avoid modifying original
  const transformedNode = _cloneTreeNode(node);

  // Apply transformation recursively
  _applyTransformationRecursive(transformedNode, transformType);

  return transformedNode;
}
/**
 * Recursively set all branch lengths to 1 (for 'ignore' mode)
 * Exception: branches with length 0 should remain 0
 * @param {Object} node - Current node
 * @private
 */
function _applyIgnoreBranchLengthsRecursive(node) {
  if (!node) return;

  // Only set to 1 if the original length is not 0
  if (node.length !== undefined && node.length !== null && node.length !== 0) {
    node.length = 1;
  }
  if (node.branch_length !== undefined && node.branch_length !== null && node.branch_length !== 0) {
    node.branch_length = 1;
  }

  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      _applyIgnoreBranchLengthsRecursive(child);
    });
  }
}

/**
 * Recursively apply transformation to all nodes in the tree
 * @param {Object} node - Current node
 * @param {string} transformType - Type of transformation
 * @private
 */
function _applyTransformationRecursive(node, transformType) {
  if (!node) return;

  // Transform this node's branch length
  // Support both 'length' (used by LayoutCalculator) and 'branch_length' (for compatibility)
  if (node.length !== undefined && node.length !== null) {
    node.length = _transformSingleValue(node.length, transformType);
  }
  if (node.branch_length !== undefined && node.branch_length !== null) {
    node.branch_length = _transformSingleValue(node.branch_length, transformType);
  }

  // Recursively transform children
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      _applyTransformationRecursive(child, transformType);
    });
  }
}

/**
 * Transform a single branch length value
 * @param {number} value - Original branch length
 * @param {string} transformType - Type of transformation
 * @returns {number} Transformed value
 * @private
 */
function _transformSingleValue(value, transformType) {
  if (value <= 0) {
    // Handle zero or negative values safely
    switch (transformType) {
      case 'log':
        return 0.001; // Small positive value for log
      default:
        return Math.max(0.001, value);
    }
  }

  let result;
  switch (transformType) {
    case 'none':
      result = value;
      break;

    case 'log':
      // Log transformation - good for very small branch lengths
      // Use log10 and normalize to ensure positive values
      result = Math.log10(value * 1000 + 1) * 0.1;
      break;

    case 'sqrt':
      // Square root transformation - gentle compression of large values
      result = Math.sqrt(value);
      break;

    case 'power2':
      // Power transformation - emphasizes larger differences
      result = Math.pow(value, 2);
      break;

    case 'linear-scale':
      // Linear scaling - makes all branches more visible
      result = value * 2;
      break;

    default:
      console.warn(`[branchTransformUtils] Unknown transformation type: ${transformType}`);
      result = value;
  }

  // Final safety check: ensure result is a positive finite number
  if (!isFinite(result) || isNaN(result) || result <= 0) {
    console.warn(`[branchTransformUtils] Transformation produced invalid result: ${result}, using fallback`);
    return Math.max(0.001, value);
  }

  return result;
}

/**
 * Get statistical information about branch lengths in a tree
 * @param {Object} node - Tree root node
 * @returns {Object} Statistics about branch lengths
 */
// Removed unused helper: getBranchLengthStats
