/**
 * Scale Utility Functions
 * Provides utilities for handling scale calculations, formatting, and visualization.
 */

/**
 * Get the current scale value for a given tree index
 * @param {Array} scaleList - Array of scale objects
 * @param {number} currentTreeIndex - Current tree index
 * @returns {number} Current scale value
 */
export function getCurrentScaleValue(scaleList, currentTreeIndex) {
  if (!scaleList || !Array.isArray(scaleList) || currentTreeIndex < 0) {
    return 0;
  }

  if (scaleList[currentTreeIndex] !== undefined) {
    const scaleItem = scaleList[currentTreeIndex];
    return typeof scaleItem === 'object' ? scaleItem.value : scaleItem;
  }

  return 0;
}

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
 * Calculate percentage of current scale relative to maximum
 * @param {number} currentScale - Current scale value
 * @param {number} maxScale - Maximum scale value
 * @returns {number} Percentage (0-100)
 */
export function calculateScalePercentage(currentScale, maxScale) {
  if (maxScale === 0) return 0;
  return Math.max(0, Math.min(100, (currentScale / maxScale) * 100));
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
  let scaleList = [];
  if (!Array.isArray(fullTreeIndices)) {
    // fallback: calculate for all trees if no indices provided
    for (let i = 0; i < treeList.length; i++) {
      const scale = _calculateScale(treeList[i]);
      scaleList.push({ value: scale, index: i });
    }
    return scaleList;
  }
  for (let i = 0; i < fullTreeIndices.length; i++) {
    const idx = fullTreeIndices[i];
    const scale = _calculateScale(treeList[idx]);
    scaleList.push({ value: scale, index: idx });
  }
  return scaleList;
}

function _calculateScale(node) {
  let maxRadius = 0;
  if (node.children) {
    node.children.forEach((child) => {
      let child_scale = _calculateScale(child);

      if (maxRadius < child_scale) {
        maxRadius = child_scale;
      }
    });
  }
  maxRadius = maxRadius + (parseFloat(node.length) || 0);
  return maxRadius;
}
