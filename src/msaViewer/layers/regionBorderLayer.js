/**
 * Region Border Layer Module
 * Creates border polygon layers for current and previous regions.
 */

import { PolygonLayer } from '@deck.gl/layers';

/**
 * Build region border data
 * @param {number} cellSize - Size of each cell
 * @param {Object} region - Region state {startCol, endCol}
 * @param {number} rows - Number of rows in the alignment
 * @param {number} cols - Number of columns in the alignment
 * @returns {Array} Border polygon data
 */
export function buildRegionBorder(cellSize, region, rows, cols) {
  if (!region || !rows || !cols) {
    return [];
  }

  const startCol = Math.max(1, Math.min(cols, region.startCol));
  const endCol = Math.max(1, Math.min(cols, region.endCol));

  // Convert to 0-based indices and adjust for inclusive end
  const startX = (startCol - 1) * cellSize;
  const endX = endCol * cellSize;
  const startY = 0; // Top of the alignment
  const endY = rows * cellSize; // Bottom of the alignment

  // Create a border rectangle around the selected region
  const borderWidth = 2; // Border thickness in pixels
  const borderData = [
    {
      polygon: [
        [startX - borderWidth, startY - borderWidth],
        [endX + borderWidth, startY - borderWidth],
        [endX + borderWidth, endY + borderWidth],
        [startX - borderWidth, endY + borderWidth],
      ],
    },
  ];

  return borderData;
}

/**
 * Creates the current region border polygon layer
 * @param {Array} borderData - The border data from buildRegionBorder
 * @returns {PolygonLayer} The current region border layer
 */
export function createCurrentRegionBorderLayer(borderData) {
  return new PolygonLayer({
    id: 'current-region-border',
    viewId: 'main',
    data: borderData,
    pickable: false,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 3,
    getPolygon: (d) => d.polygon,
    // High-contrast black for the active MSA region
    getLineColor: [0, 0, 0, 255],
  });
}

/**
 * Creates the previous region border polygon layer (behind current)
 * @param {Array} borderData - The border data from buildRegionBorder
 * @returns {PolygonLayer} The previous region border layer
 */
export function createPreviousRegionBorderLayer(borderData) {
  return new PolygonLayer({
    id: 'previous-region-border',
    viewId: 'main',
    data: borderData,
    pickable: false,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 2,
    getPolygon: (d) => d.polygon,
    getLineColor: [128, 128, 128, 180], // Gray with transparency
  });
}
