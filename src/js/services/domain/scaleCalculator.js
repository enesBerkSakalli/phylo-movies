/**
 * Service for calculating scale values from tree data
 */

import calculateScales, { getMaxScaleValue } from '../../utils/scaleUtils.js';

/**
 * Calculates scale values and metadata for tree list
 * @param {Array} interpolatedTrees - List of interpolated trees
 * @param {Array} fullTreeIndices - Indices of full (non-interpolated) trees
 * @returns {Object} Scale metadata { scaleList, maxScale, scaleValues }
 */
export function calculateTreeScales(interpolatedTrees, fullTreeIndices) {
  const scaleList = interpolatedTrees.length
    ? calculateScales(interpolatedTrees, fullTreeIndices)
    : [];
  const maxScale = getMaxScaleValue(scaleList);
  const scaleValues = scaleList.map((s) => (Number.isFinite(s?.value) ? s.value : 0));

  return {
    scaleList,
    maxScale,
    scaleValues
  };
}
