/**
 * Row Split Divider Layer Module
 * Draws a horizontal line between two blocks of rows — the taxon groups a
 * selected tree branch separates (see Information-Scope's branch selection).
 * Mirrors regionBorderLayer.js's vertical column-region border, but for rows —
 * same stroked/lineWidthMinPixels pattern, so the line stays a fixed screen
 * width across zoom levels instead of a filled shape that shrinks with world
 * scale (and can end up sub-pixel at typical alignment zoom levels).
 */

import { PolygonLayer } from '@deck.gl/layers';

/**
 * @param {number} cellSize - Size of each cell
 * @param {number|null} rowSplitIndex - Row index (0-based) the divider sits above
 * @param {number} rows - Number of rows in the alignment
 * @param {number} cols - Number of columns in the alignment
 * @returns {Array} Divider polygon data
 */
export function buildRowSplitDivider(cellSize, rowSplitIndex, rows, cols) {
  if (!Number.isInteger(rowSplitIndex) || rowSplitIndex <= 0 || rowSplitIndex >= rows || !cols) {
    return [];
  }

  const y = rowSplitIndex * cellSize;
  const startX = 0;
  const endX = cols * cellSize;

  // A degenerate (zero-height) rectangle: stroked mode traces its top and
  // bottom edges, both sitting at y, each drawn at lineWidthMinPixels.
  return [
    {
      polygon: [
        [startX, y],
        [endX, y],
        [endX, y],
        [startX, y],
      ],
    },
  ];
}

/**
 * @param {Array} dividerData - The divider data from buildRowSplitDivider
 * @returns {PolygonLayer}
 */
export function createRowSplitDividerLayer(dividerData) {
  return new PolygonLayer({
    id: 'row-split-divider',
    viewId: 'main',
    data: dividerData,
    pickable: false,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 3,
    getPolygon: (d) => d.polygon,
    getLineColor: [0, 0, 0, 255],
  });
}
