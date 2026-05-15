/**
 * Service for calculating scale values from tree data
 */

import calculateScales, { getMaxScaleValue } from './scaleUtils.js';

/**
 * Calculates scale metadata for tree list.
 * @param {Array} interpolatedTrees - List of interpolated trees
 * @param {Array} fullTreeIndices - Indices of full (non-interpolated) trees
 * @returns {Object} Scale metadata { scaleList, maxScale }
 */
export function calculateTreeScales(interpolatedTrees, fullTreeIndices) {
  const scaleList = interpolatedTrees.length
    ? calculateScales(interpolatedTrees, fullTreeIndices)
    : [];
  const maxScale = getMaxScaleValue(scaleList);

  return {
    scaleList,
    maxScale
  };
}
