/**
 * Cells Layer Module
 * Creates the main cells polygon layer for MSA visualization
 */

import { PolygonLayer } from '@deck.gl/layers';
import { dnaColor, proteinColor } from '../utils/colorUtils.js';

/**
 * Build cell data for the MSA visualization
 * @param {number} cellSize - Size of each cell
 * @param {Array} sequences - Array of sequence objects
 * @param {Object} visibleRange - Visible range {r0, r1, c0, c1}
 * @param {number} maxCells - Maximum number of cells to render
 * @returns {Array} Cell data array
 */
export function buildCellData(cellSize, sequences, visibleRange, maxCells) {
  if (!sequences || sequences.length === 0) {
    return [];
  }

  const { r0, r1, c0, c1 } = visibleRange;
  const nR = r1 - r0 + 1;
  const nC = c1 - c0 + 1;
  const step = Math.max(1, Math.ceil(Math.sqrt(nR * nC / maxCells)));
  const data = [];

  for (let r = r0; r <= r1; r += step) {
    for (let c = c0; c <= c1; c += step) {
      if (r >= sequences.length) continue;
      const seq = sequences[r];
      if (!seq || !seq.seq) continue;

      const x = c * cellSize;
      const y = -r * cellSize;
      const w = cellSize * Math.min(step, (c1 - c + 1));
      const h = cellSize * Math.min(step, (r1 - r + 1));

      data.push({
        kind: 'cell',
        row: r,
        col: c,
        ch: seq.seq[c] || '-',
        polygon: [[x, y], [x + w, y], [x + w, y - h], [x, y - h]]
      });
    }
  }

  return data;
}

/**
 * Creates the cells polygon layer
 * @param {Array} cellData - The cell data from buildCellData
 * @param {string} sequenceType - Either 'dna' or 'protein'
 * @param {Object} selection - Current selection state
 * @returns {PolygonLayer} The cells layer
 */
export function createCellsLayer(cellData, sequenceType, selection) {
  return new PolygonLayer({
    id: 'cells',
    data: cellData,
    pickable: true,
    autoHighlight: true,
    extruded: false,
    stroked: false,
    filled: true,
    getPolygon: d => d.polygon,
    getFillColor: d => {
      const baseColor = (sequenceType === 'dna' ? dnaColor : proteinColor)(d.ch);
      // Dim colors outside the selection
      if (selection) {
        const { startCol, endCol } = selection;
        if (d.col < startCol - 1 || d.col > endCol - 1) {
          // Dim by reducing saturation and brightness
          return [
            baseColor[0] * 0.3 + 180,  // Blend with gray
            baseColor[1] * 0.3 + 180,
            baseColor[2] * 0.3 + 180,
            baseColor[3]
          ];
        }
      }
      return baseColor;
    },
  });
}
