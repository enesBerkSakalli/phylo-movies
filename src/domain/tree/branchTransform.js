/**
 * Branch Length Transformation Utilities
 *
 * Provides various transformation functions to make phylogenetic trees more readable
 * by deriving visual branch lengths from metric backend branch lengths.
 *
 * The backend-provided `length` value is the metric branch length and must remain
 * unchanged. Geometry code should use `visualBranchLength`, which may be warped
 * for readability.
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
    if (Object.prototype.hasOwnProperty.call(node, key) && key !== 'parent') {
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
 * @param {Object} node - Tree node with children and length properties
 * @param {string} transformType - Type of transformation to apply
 * @returns {Object} Transformed tree node
 */
export function transformBranchLengths(node, transformType = 'none') {
  if (!node) return node;

  // Create a deep copy to avoid modifying original
  const transformedNode = _cloneTreeNode(node);
  const normalizedTransformType = normalizeTransformType(transformType);
  const baseTransformType = getBaseTransformType(normalizedTransformType);

  // Apply visual branch length transformation recursively
  _applyVisualBranchLengthRecursive(transformedNode, baseTransformType);

  if (isTreeNormalizedTransform(normalizedTransformType)) {
    _normalizeVisualRootToTip(transformedNode);
  }

  return transformedNode;
}

/**
 * Read the backend metric branch length from a tree node.
 * @param {Object} node - Tree node
 * @returns {number} Numeric metric branch length
 */
export function getMetricBranchLength(node) {
  const value = Number(node?.metricBranchLength ?? node?.length ?? 0);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Read the display branch length from a tree node.
 * Falls back to the metric length when no visual branch length has been derived.
 * @param {Object} node - Tree node
 * @returns {number} Numeric visual branch length
 */
export function getVisualBranchLength(node) {
  const rawValue = node?.visualBranchLength;
  if (rawValue === undefined || rawValue === null) {
    return getMetricBranchLength(node);
  }

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : getMetricBranchLength(node);
}

/**
 * Read the display branch length used for geometry.
 * Metric branch lengths remain untouched, but rendered radii cannot move inward.
 * Exact zero stays zero; tiny non-zero or negative artifacts can be lifted by a
 * caller-provided visual floor.
 * @param {Object} node - Tree node
 * @param {number} minVisualBranchLength - Optional display-only floor
 * @returns {number} Non-negative visual branch length for layout geometry
 */
export function getReadableVisualBranchLength(node, minVisualBranchLength = 0) {
  const rawValue = getVisualBranchLength(node);
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return 0;

  const floor = Number(minVisualBranchLength);
  const safeFloor = Number.isFinite(floor) && floor > 0 ? floor : 0;
  if (value < 0) return safeFloor;
  if (value === 0) return 0;

  return safeFloor > 0 ? Math.max(value, safeFloor) : value;
}

/**
 * Recursively derive visual branch lengths without mutating metric lengths.
 * @param {Object} node - Current node
 * @param {string} transformType - Type of transformation
 * @private
 */
function _applyVisualBranchLengthRecursive(node, transformType) {
  if (!node) return;

  const hasBranchLength = node.length !== undefined && node.length !== null;
  const hasMetricBranchLength = node.metricBranchLength !== undefined && node.metricBranchLength !== null;

  if (hasBranchLength || hasMetricBranchLength) {
    const metricBranchLength = getMetricBranchLength(node);
    node.metricBranchLength = metricBranchLength;
    node.visualBranchLength = transformType === 'none'
      ? metricBranchLength
      : _transformSingleValue(metricBranchLength, transformType);
  }

  // Recursively transform children
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      _applyVisualBranchLengthRecursive(child, transformType);
    });
  }
}

function normalizeTransformType(transformType) {
  return typeof transformType === 'string' && transformType.length > 0
    ? transformType
    : 'none';
}

function isTreeNormalizedTransform(transformType) {
  return transformType === 'normalized' ||
    transformType === 'normalized-sqrt' ||
    transformType === 'normalized-log';
}

function getBaseTransformType(transformType) {
  switch (transformType) {
    case 'normalized':
      return 'none';
    case 'normalized-sqrt':
      return 'sqrt';
    case 'normalized-log':
      return 'log';
    default:
      return transformType;
  }
}

function _normalizeVisualRootToTip(root) {
  const maxRootToTip = _calculateVisualRootToTipMax(root);
  if (!Number.isFinite(maxRootToTip) || maxRootToTip <= 0) return;

  _divideVisualBranchLengths(root, maxRootToTip);
}

function _calculateVisualRootToTipMax(node) {
  const children = Array.isArray(node?.children) ? node.children : [];
  if (children.length === 0) return 0;

  return children.reduce((maxRadius, child) => {
    const childLength = Math.max(0, getVisualBranchLength(child));
    const childRadius = childLength + _calculateVisualRootToTipMax(child);
    return Math.max(maxRadius, childRadius);
  }, 0);
}

function _divideVisualBranchLengths(node, divisor, isRoot = true) {
  if (!node || typeof node !== 'object') return;

  if (!isRoot && node.visualBranchLength !== undefined && node.visualBranchLength !== null) {
    const visualLength = Math.max(0, getVisualBranchLength(node));
    node.visualBranchLength = visualLength / divisor;
  }

  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach((child) => _divideVisualBranchLengths(child, divisor, false));
}

/**
 * Transform a single branch length value
 * @param {number} value - Original branch length
 * @param {string} transformType - Type of transformation
 * @returns {number} Transformed value
 * @private
 */
function _transformSingleValue(value, transformType) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  if (transformType === 'ignore') {
    return numericValue === 0 ? 0 : 1;
  }

  if (numericValue < 0) {
    return 0.001; // Force tiny positive for negative values
  }

  if (numericValue === 0) {
    // Zero is valid for most transforms, except log
    if (transformType === 'log') {
      return 0.001;
    }
    return 0;
  }

  let result;
  switch (transformType) {
    case 'none':
      result = numericValue;
      break;

    case 'log':
      // Log transformation - good for very small branch lengths
      // Use log10 and normalize to ensure positive values
      result = Math.log10(numericValue * 1000 + 1) * 0.1;
      break;

    case 'sqrt':
      // Square root transformation - gentle compression of large values
      result = Math.sqrt(numericValue);
      break;

    case 'power2':
      // Power transformation - emphasizes larger differences
      result = Math.pow(numericValue, 2);
      break;

    case 'linear-scale':
      // Linear scaling - makes all branches more visible
      result = numericValue * 2;
      break;

    default:
      console.warn(`[branchTransformUtils] Unknown transformation type: ${transformType}`);
      result = numericValue;
  }

  // Final safety check: ensure result is a non-negative finite number
  if (!Number.isFinite(result) || result < 0) {
    console.warn(`[branchTransformUtils] Transformation produced invalid result: ${result}, using fallback`);
    return Math.max(0.001, numericValue);
  }

  return result;
}
