/**
 * Scale Utility Functions
 * Provides utilities for handling scale calculations, formatting, and visualization.
 */

import { getReadableVisualBranchLength } from './branchTransform.js';

/**
 * Get the maximum scale value from the scale list
 * @param {Array} scaleList - Array of scale objects
 * @returns {number} Maximum scale value
 */
export function getMaxScaleValue(scaleList) {
  if (!scaleList || !Array.isArray(scaleList) || scaleList.length === 0) {
    return 1;
  }

  return Math.max(...scaleList.map((item) => (typeof item === 'object' ? item.value : item)));
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
 * Creates a lookup map from scale list entries for O(1) access by frame index.
 */
export function buildScaleLookup(scaleList) {
  const map = new Map();

  if (!Array.isArray(scaleList)) return map;

  scaleList.forEach((item, index) => {
    const itemIndex =
      typeof item === 'object' && item !== null && 'index' in item ? item.index : index;
    const itemValue =
      typeof item === 'object' && item !== null && 'value' in item ? item.value : item;
    map.set(itemIndex, Number(itemValue) || 0);
  });

  return map;
}

export function getScaleValue(scaleList, sourceFrameIndex) {
  if (!Number.isInteger(sourceFrameIndex)) return null;

  const value = buildScaleLookup(scaleList).get(sourceFrameIndex);
  return Number.isFinite(value) ? value : null;
}

/**
 * Calculate scales only for input frame indices.
 * @param {Array} treeList - Array of tree objects
 * @param {Array} inputFrameIndices - Array of indices for input trees
 * @returns {Array} Array of scale objects for input trees
 */
export default function calculateScales(treeList, inputFrameIndices) {
  if (!Array.isArray(inputFrameIndices)) {
    throw new TypeError('calculateScales requires explicit inputFrameIndices');
  }

  let scaleList = [];
  for (let i = 0; i < inputFrameIndices.length; i++) {
    const idx = inputFrameIndices[i];
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
  maxRadius = maxRadius + (isRoot ? 0 : getReadableVisualBranchLength(node));
  return maxRadius;
}
