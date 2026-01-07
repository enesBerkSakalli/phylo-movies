/**
 * Row Labels Layer Module
 * Creates the row labels text layer
 */

import { TextLayer } from '@deck.gl/layers';

/**
 * Build row labels data
 * @param {number} cellSize - Size of each cell
 * @param {Array} sequences - Array of sequence objects
 * @param {Object} visibleRange - Visible range {r0, r1}
 * @param {Object} viewState - Current view state with zoom
 * @param {number} zoomScale - Current zoom scale factor
 * @param {number} [viewWidth=120] - The width of the view in pixels.
 * @returns {Array} Row labels data array
 */
export function buildRowLabels(cellSize, sequences, visibleRange, viewState, zoomScale, viewWidth = 120) {
  if (!sequences || sequences.length === 0) {
    return [];
  }

  const { r0, r1 } = visibleRange;
  const data = [];

  // Calculate position: Right aligned in the view
  // View center is x=0. Right edge is viewWidth/2 (in screen pixels)
  // Convert to world units:
  const screenRightEdge = viewWidth / 2;
  const screenPad = 8;
  const worldX = (screenRightEdge - screenPad) / zoomScale;

  // No stepping/sparsity logic: Show all labels as requested.
  // Zoom clamping prevents them from becoming too small/overlapped.

  for (let r = r0; r <= r1; r++) {
    if (r >= sequences.length) continue;

    const seq = sequences[r];
    if (!seq) continue;

    data.push({
      kind: 'label',
      row: r,
      text: seq.id || `Seq ${r + 1}`,
      position: [worldX, -r * cellSize - cellSize / 2, 0]
    });
  }

  return data;
}

/**
 * Creates the row labels text layer
 * @param {Array} labelsData - The labels data from buildRowLabels
 * @returns {TextLayer} The row labels layer
 */
export function createRowLabelsLayer(labelsData) {
  return new TextLayer({
    id: 'rowLabels',
    data: labelsData,
    pickable: true,
    getText: d => d.text,
    getPosition: d => d.position,
    getSize: 12,
    sizeUnits: 'pixels',  // Use pixel units for consistent sizing
    getTextAnchor: 'end',
    getAlignmentBaseline: 'center',
    background: true,
    getBackgroundColor: [255, 255, 255, 200],
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'
  });
}
