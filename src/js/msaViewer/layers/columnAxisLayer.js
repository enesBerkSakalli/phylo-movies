/**
 * Column Axis Layer Module
 * Creates the column axis text layer
 */

import { TextLayer } from '@deck.gl/layers';

/**
 * Build column axis data
 * @param {number} cellSize - Size of each cell
 * @param {Object} viewState - Current view state with zoom
 * @param {Object} visibleRange - Visible range {c0, c1}
 * @param {number} rows - Number of rows in the alignment
 * @param {number} zoomScale - Current zoom scale factor
 * @param {number} optionsCellSize - Cell size from options
 * @returns {Array} Column axis data
 */
export function buildColumnAxis(cellSize, viewState, visibleRange, rows, zoomScale, optionsCellSize) {
  if (viewState.zoom <= -2) return [];

  const { c0, c1 } = visibleRange;
  const data = [];

  // Scale padding with zoom level - smaller when zoomed out, larger when zoomed in
  const basePad = 16;
  const zoomFactor = zoomScale;
  const pad = Math.max(basePad, basePad * zoomFactor * 0.5);

  // Position axis below the data (negative Y since flipY is true)
  const axisY = -(rows * cellSize) - pad;

  const pixelsPerCell = optionsCellSize * zoomScale;
  let step = 1;
  if (pixelsPerCell < 5) step = 10;
  else if (pixelsPerCell < 2) step = 50;
  else if (pixelsPerCell < 0.5) step = 200;
  else if (pixelsPerCell < 0.1) step = 1000;

  for (let c = c0; c <= c1; c++) {
    if ((c + 1) % step === 0) {
      data.push({
        text: `${c + 1}`,
        position: [c * cellSize + cellSize / 2, axisY, 0]
      });
    }
  }

  return data;
}

/**
 * Creates the column axis text layer
 * @param {Array} axisData - The axis data from buildColumnAxis
 * @param {number} zoomScale - The current zoom scale factor
 * @returns {TextLayer} The column axis layer
 */
export function createColumnAxisLayer(axisData, zoomScale) {
  return new TextLayer({
    id: 'columnAxis',
    data: axisData,
    pickable: false,
    getText: d => d.text,
    getPosition: d => d.position,
    getSize: Math.max(10, Math.min(14, 12 * zoomScale * 0.1)),
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'top',
    background: true,
    getBackgroundColor: [255, 255, 255, 180],  // Semi-transparent white background
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'
  });
}
