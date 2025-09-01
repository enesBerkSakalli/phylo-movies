/**
 * Letters Layer Module
 * Creates the sequence letters text layer
 */

import { TextLayer } from '@deck.gl/layers';

/**
 * Build text data for sequence letters
 * @param {number} cellSize - Size of each cell
 * @param {Array} sequences - Array of sequence objects
 * @param {Object} visibleRange - Visible range {r0, r1, c0, c1}
 * @param {boolean} showLetters - Whether to show letters
 * @param {number} optionsCellSize - Cell size from options
 * @param {number} zoomScale - Current zoom scale factor
 * @returns {Array} Text data array
 */
export function buildTextData(cellSize, sequences, visibleRange, showLetters, optionsCellSize, zoomScale) {
  if (!showLetters ||
      (optionsCellSize * zoomScale < 12) ||
      !sequences || sequences.length === 0) {
    return [];
  }

  const { r0, r1, c0, c1 } = visibleRange;
  const data = [];

  for (let r = r0; r <= r1; r++) {
    if (r >= sequences.length) continue;
    const seq = sequences[r];
    if (!seq || !seq.seq) continue;

    for (let c = c0; c <= c1; c++) {
      const ch = seq.seq[c] || '-';
      if (ch !== '-') {
        data.push({
          kind: 'text',
          position: [c * cellSize + cellSize / 2, -r * cellSize - cellSize / 2, 0],
          text: ch
        });
      }
    }
  }

  return data;
}

/**
 * Creates the letters text layer
 * @param {Array} textData - The text data from buildTextData
 * @returns {TextLayer} The letters layer
 */
export function createLettersLayer(textData) {
  return new TextLayer({
    id: 'letters',
    data: textData,
    pickable: false,
    getText: d => d.text,
    getPosition: d => d.position,
    getSize: 14,
    getColor: [0, 0, 0, 255],  // Black text for good contrast
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  });
}
