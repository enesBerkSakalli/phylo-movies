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
  // if (viewState.zoom <= -2) return []; // Removed to ensure no info lost

  const { c0, c1 } = visibleRange;
  const data = [];

  // Position axis centered in the top view (AXIS_HEIGHT is 20)
  const axisY = 10;

  const pixelsPerCell = optionsCellSize * zoomScale;

  // Calculate step to prevent overlapping labels
  // Approximate label width is ~50px for large numbers
  const labelWidth = 50;
  let step = Math.ceil(labelWidth / Math.max(0.01, pixelsPerCell));

  // Round up to nice intervals
  const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  step = niceSteps.find(n => n >= step) || niceSteps[niceSteps.length - 1];

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
    getSize: 10,
    sizeUnits: 'pixels',  // Use pixel units for consistent sizing
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    background: true,
    getBackgroundColor: [255, 255, 255, 180],
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'
  });
}
