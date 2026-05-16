/**
 * Scale Utility Functions
 * Provides utilities for handling scale calculations, formatting, and visualization.
 */

/**
 * Get the maximum scale value from the scale list
 * @param {Array} scaleList - Array of scale objects
 * @returns {number} Maximum scale value
 */
export function getMaxScaleValue(scaleList) {
  if (!scaleList || !Array.isArray(scaleList) || scaleList.length === 0) {
    return 1;
  }

  return Math.max(...scaleList.map((item) =>
    typeof item === 'object' ? item.value : item
  ));
}

/**
 * Format scale value for display
 * @param {number} value - Scale value to format
 * @param {number} decimals - Number of decimal places (default: 3)
 * @returns {string} Formatted scale value
 */
export function formatScaleValue(value, decimals = 3) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0.000';
  }
  return value.toFixed(decimals);
}

/**
 * Calculate scales only for full tree indices.
 * @param {Array} treeList - Array of tree objects
 * @param {Array} fullTreeIndices - Array of indices for full trees
 * @returns {Array} Array of scale objects for full trees
 */
export default function calculateScales(treeList, fullTreeIndices) {
  if (!Array.isArray(fullTreeIndices)) {
    throw new TypeError('calculateScales requires explicit fullTreeIndices');
  }

  let scaleList = [];
  for (let i = 0; i < fullTreeIndices.length; i++) {
    const idx = fullTreeIndices[i];
    const scale = _calculateScale(treeList[idx]);
    scaleList.push({ value: scale, index: idx });
  }
  return scaleList;
}

function _calculateScale(node, isRoot = true) {
  let maxRadius = 0;
  if (node.children) {
    node.children.forEach((child) => {
      let child_scale = _calculateScale(child, false);

      if (maxRadius < child_scale) {
        maxRadius = child_scale;
      }
    });
  }
  maxRadius = maxRadius + (isRoot ? 0 : (parseFloat(node.length) || 0));
  return maxRadius;
}
