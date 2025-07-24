/**
 * Branch Length Transformation Utilities
 *
 * Provides various transformation functions to make phylogenetic trees more readable
 * by transforming branch lengths to emphasize small differences or normalize ranges.
 */

/**
 * Apply branch length transformation to a tree node and all its descendants
 * @param {Object} node - Tree node with children and branch_length properties
 * @param {string} transformType - Type of transformation to apply
 * @returns {Object} Transformed tree node
 */
export function transformBranchLengths(node, transformType = 'none') {
  if (!node) return node;

  // If transformType is 'none', do not transform
  if (transformType === 'none') {
    return JSON.parse(JSON.stringify(node));
  }

  // If transformType is 'ignore', set all branch lengths to 1
  if (transformType === 'ignore') {
    const ignoredNode = JSON.parse(JSON.stringify(node));
    _applyIgnoreBranchLengthsRecursive(ignoredNode);
    return ignoredNode;
  }

  // Create a deep copy to avoid modifying original
  const transformedNode = JSON.parse(JSON.stringify(node));

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
export function getBranchLengthStats(node) {
  const lengths = [];

  function collectLengths(n) {
    if (!n) return;

    // Check both 'length' and 'branch_length' properties
    let branchLength = n.length !== undefined ? n.length : n.branch_length;
    if (branchLength !== undefined && branchLength !== null && branchLength > 0) {
      lengths.push(branchLength);
    }

    if (n.children && Array.isArray(n.children)) {
      n.children.forEach(collectLengths);
    }
  }

  collectLengths(node);

  if (lengths.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, count: 0 };
  }

  lengths.sort((a, b) => a - b);

  return {
    min: lengths[0],
    max: lengths[lengths.length - 1],
    mean: lengths.reduce((sum, val) => sum + val, 0) / lengths.length,
    median: lengths[Math.floor(lengths.length / 2)],
    count: lengths.length,
    range: lengths[lengths.length - 1] - lengths[0]
  };
}

/**
 * Recommend the best transformation based on branch length distribution
 * @param {Object} stats - Branch length statistics from getBranchLengthStats
 * @returns {string} Recommended transformation type
 */
export function recommendTransformation(stats) {
  if (!stats || stats.count === 0) {
    return 'none';
  }

  const { min, max, range, mean } = stats;

  // If very small values dominate
  if (max < 0.01) {
    return 'linear-scale';
  }

  // If there's a huge range (orders of magnitude difference)
  if (max / min > 1000) {
    return 'log';
  }

  // If small values are hard to see
  if (min < 0.001 && max > 0.1) {
    return 'sqrt';
  }

  // If range is very compressed
  if (range < mean * 0.1) {
    return 'power2';
  }

  return 'none';
}

/**
 * Get human-readable description of transformation types
 * @returns {Object} Mapping of transformation types to descriptions
 */
export function getTransformationDescriptions() {
  return {
    'none': 'Original branch lengths unchanged',
    'log': 'Logarithmic - good for very small or wide-ranging values',
    'sqrt': 'Square root - gentle compression of large values',
    'power2': 'Power (x²) - emphasizes larger differences',
    'linear-scale': 'Linear scaling (2x) - makes all branches more visible'
  };
}
