/**
 * Cells Layer Module
 * Creates the main cells polygon layer for MSA visualization
 */

import { PolygonLayer } from '@deck.gl/layers';
import { getColorScheme } from '../utils/colorUtils.js';
import { colorToRgb } from '../../services/ui/colorUtils.js';

/**
 * Build cell data for the MSA visualization
 * @param {number} cellSize - Size of each cell
 * @param {Array} sequences - Array of sequence objects
 * @param {Object} visibleRange - Visible range {r0, r1, c0, c1}
 * @param {number} maxCells - Maximum number of cells to render
 * @param {Object} options - Optional rendering options
 * @returns {Array} Cell data array
 */
export function buildCellData(cellSize, sequences, visibleRange, maxCells, options = {}) {
  if (!sequences || sequences.length === 0) {
    return [];
  }

  const { r0, r1, c0, c1 } = visibleRange;
  const nR = r1 - r0 + 1;
  const nC = c1 - c0 + 1;
  const step = Math.max(1, Math.ceil(Math.sqrt((nR * nC) / maxCells)));
  const rowStep = options.preserveRows ? 1 : step;
  const colStep = options.preserveRows ? Math.max(1, Math.ceil((nR * nC) / maxCells)) : step;
  const data = [];

  for (let r = r0; r <= r1; r += rowStep) {
    for (let c = c0; c <= c1; c += colStep) {
      if (r >= sequences.length) continue;
      const seq = sequences[r];
      if (!seq || !seq.seq) continue;

      const x = c * cellSize;
      const y = r * cellSize;
      const w = cellSize * Math.min(colStep, c1 - c + 1);
      const h = cellSize * Math.min(rowStep, r1 - r + 1);

      data.push({
        kind: 'cell',
        row: r,
        col: c,
        seqId: seq.id,
        ch:
          rowStep === 1 && colStep === 1
            ? seq.seq[c] || '-'
            : getDominantResidue(sequences, r, c, rowStep, colStep, r1, c1),
        polygon: [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ],
      });
    }
  }

  return data;
}

function getDominantResidue(sequences, startRow, startCol, rowStep, colStep, maxRow, maxCol) {
  const counts = new Map();
  let bestChar = '-';
  let bestCount = 0;

  for (let r = startRow; r <= Math.min(maxRow, startRow + rowStep - 1); r++) {
    const seq = sequences[r]?.seq;
    if (!seq) continue;

    for (let c = startCol; c <= Math.min(maxCol, startCol + colStep - 1); c++) {
      const ch = seq[c] || '-';
      const count = (counts.get(ch) || 0) + 1;
      counts.set(ch, count);
      if (count > bestCount) {
        bestChar = ch;
        bestCount = count;
      }
    }
  }

  return bestChar;
}

export function getTaxaCellColor(seqId, rowColorMap = {}) {
  const rowColor = rowColorMap[seqId];
  return rowColor ? [...colorToRgb(rowColor), 255] : [255, 255, 255, 255];
}

export function applySelectionTint(baseColor, col, selection, previousSelection) {
  const inCurrentSelection =
    selection && col >= selection.startCol - 1 && col <= selection.endCol - 1;

  const inPreviousSelection =
    previousSelection &&
    col >= previousSelection.startCol - 1 &&
    col <= previousSelection.endCol - 1;

  if ((selection || previousSelection) && !inCurrentSelection && !inPreviousSelection) {
    return [
      baseColor[0] * 0.3 + 180,
      baseColor[1] * 0.3 + 180,
      baseColor[2] * 0.3 + 180,
      baseColor[3],
    ];
  }

  if (inPreviousSelection && !inCurrentSelection) {
    return [
      baseColor[0] * 0.7 + 60,
      baseColor[1] * 0.7 + 60,
      baseColor[2] * 0.7 + 60,
      baseColor[3],
    ];
  }

  return baseColor;
}

/**
 * Creates the cells polygon layer
 * @param {Array} cellData - The cell data from buildCellData
 * @param {string} sequenceType - Either 'dna' or 'protein'
 * @param {Object} selection - Current selection state
 * @param {string} colorScheme - Color scheme name
 * @param {string} consensus - The consensus sequence (optional)
 * @param {Object} previousSelection - Previous selection state (optional)
 * @param {Object} rowColorMap - Optional map of taxon id -> color string
 * @returns {PolygonLayer} The cells layer
 */
export function createCellsLayer(
  cellData,
  sequenceType,
  selection,
  colorScheme = 'default',
  consensus = null,
  previousSelection = null,
  rowColorMap = {}
) {
  const colorFn = getColorScheme(colorScheme, sequenceType);

  return new PolygonLayer({
    id: 'cells',
    data: cellData,
    pickable: true,
    autoHighlight: true,
    extruded: false,
    stroked: false,
    filled: true,
    getPolygon: (d) => d.polygon,
    getFillColor: (d) => {
      let baseColor;

      if (colorScheme === 'taxa') {
        baseColor = getTaxaCellColor(d.seqId, rowColorMap);
      } else if (colorScheme === 'identity' && consensus) {
        const consensusChar = consensus[d.col];
        // Dark blue for match, white for mismatch
        if (d.ch === consensusChar && d.ch !== '-' && d.ch !== ' ') {
          baseColor = [0, 0, 180, 255];
        } else {
          baseColor = [255, 255, 255, 255];
        }
      } else if (colorScheme === 'similarity' && consensus) {
        // Simple similarity: Match = Dark Blue, Mismatch = White
        // Ideally this would use BLOSUM scores, but for now we'll use Identity as a base
        // and maybe expand later.
        const consensusChar = consensus[d.col];
        if (d.ch === consensusChar && d.ch !== '-' && d.ch !== ' ') {
          baseColor = [0, 0, 180, 255];
        } else {
          baseColor = [255, 255, 255, 255];
        }
      } else {
        baseColor = colorFn(d.ch);
      }

      return applySelectionTint(baseColor, d.col, selection, previousSelection);
    },
    updateTriggers: {
      getFillColor: [colorScheme, selection, previousSelection, consensus, rowColorMap],
    },
  });
}
