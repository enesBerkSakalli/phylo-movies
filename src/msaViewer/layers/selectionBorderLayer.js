/**
 * Selection Border Layer Module
 * Creates the selection border polygon layers for current and previous regions
 */

import { PolygonLayer } from '@deck.gl/layers';

/**
 * Build selection border data
 * @param {number} cellSize - Size of each cell
 * @param {Object} selection - Current selection state {startCol, endCol}
 * @param {number} rows - Number of rows in the alignment
 * @param {number} cols - Number of columns in the alignment
 * @returns {Array} Border polygon data
 */
export function buildSelectionBorder(cellSize, selection, rows, cols) {
  if (!selection || !rows || !cols) {
    return [];
  }

  // Clamp selection to valid column range
  const startCol = Math.max(1, Math.min(cols, selection.startCol));
  const endCol = Math.max(1, Math.min(cols, selection.endCol));

  // Convert to 0-based indices and adjust for inclusive end
  const startX = (startCol - 1) * cellSize;
  const endX = endCol * cellSize;
  const startY = 0;  // Top of the alignment
  const endY = rows * cellSize;  // Bottom of the alignment

  // Create a border rectangle around the selected region
  const borderWidth = 2;  // Border thickness in pixels
  const borderData = [{
    polygon: [
      [startX - borderWidth, startY - borderWidth],
      [endX + borderWidth, startY - borderWidth],
      [endX + borderWidth, endY + borderWidth],
      [startX - borderWidth, endY + borderWidth]
    ]
  }];

  return borderData;
}

/**
 * Creates the selection border polygon layer
 * @param {Array} borderData - The border data from buildSelectionBorder
 * @returns {PolygonLayer} The selection border layer
 */
export function createSelectionBorderLayer(borderData) {
  return new PolygonLayer({
    id: 'selection-border',
    data: borderData,
    pickable: false,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 3,
    getPolygon: d => d.polygon,
    // High-contrast black for the active MSA selection box
    getLineColor: [0, 0, 0, 255],
  });
}

/**
 * Creates the previous selection border polygon layer (behind current)
 * @param {Array} borderData - The border data from buildSelectionBorder
 * @returns {PolygonLayer} The previous selection border layer
 */
export function createPreviousSelectionBorderLayer(borderData) {
  return new PolygonLayer({
    id: 'previous-selection-border',
    data: borderData,
    pickable: false,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 2,
    getPolygon: d => d.polygon,
    getLineColor: [128, 128, 128, 180],  // Gray with transparency
  });
}
