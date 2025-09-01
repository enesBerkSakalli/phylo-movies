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
 * @returns {Array} Row labels data array
 */
export function buildRowLabels(cellSize, sequences, visibleRange, viewState, zoomScale) {
  if (viewState.zoom <= -2 || !sequences || sequences.length === 0) {
    return [];
  }

  const { r0, r1 } = visibleRange;
  const data = [];

  // Scale padding with zoom level for better visibility
  const basePad = 8;
  const zoomFactor = zoomScale;
  const pad = Math.max(basePad, basePad * zoomFactor * 0.3);

  for (let r = r0; r <= r1; r++) {
    if (r >= sequences.length) continue;
    const seq = sequences[r];
    if (!seq) continue;

    data.push({
      kind: 'label',
      row: r,
      text: seq.id || `Seq ${r + 1}`,
      position: [-pad, -r * cellSize - cellSize / 2, 0]
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
    getTextAnchor: 'end',
    getAlignmentBaseline: 'center',
    background: true,
    getBackgroundColor: [255, 255, 255, 200],  // Semi-transparent white background
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'
  });
}
