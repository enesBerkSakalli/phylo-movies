/**
 * Cells Layer Module
 * Creates the main instanced cell layers for MSA visualization
 */

import { ColumnLayer } from '@deck.gl/layers';
import { getColorScheme } from '../utils/colorUtils.js';
import { colorToRgb } from '../../services/ui/colorUtils.js';

export function getCellSampling(visibleRange, maxCells, { preserveRows = false } = {}) {
  const { r0, r1, c0, c1 } = visibleRange;
  const rowCount = Math.max(0, r1 - r0 + 1);
  const columnCount = Math.max(0, c1 - c0 + 1);
  const step = Math.max(1, Math.ceil(Math.sqrt((rowCount * columnCount) / maxCells)));

  return {
    rowStep: preserveRows ? 1 : step,
    colStep: preserveRows ? Math.max(1, Math.ceil((rowCount * columnCount) / maxCells)) : step,
  };
}

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
  const sampling =
    options.sampling ||
    getCellSampling(visibleRange, maxCells, { preserveRows: options.preserveRows });
  const { rowStep, colStep } = sampling;
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

      const isAggregate = rowStep > 1 || colStep > 1;
      const aggregate = isAggregate
        ? summarizeBlock(sequences, r, c, rowStep, colStep, r1, c1, options.consensus)
        : null;

      data.push({
        kind: 'cell',
        row: r,
        col: c,
        seqId: seq.id,
        ch: aggregate?.dominantResidue ?? seq.seq[c] ?? '-',
        identityMatchFraction: aggregate?.identityMatchFraction ?? null,
        position: [x + w / 2, y + h / 2, 0],
        width: w,
        height: h,
      });
    }
  }

  return data;
}

export function groupCellDataBySize(cellData) {
  const groups = new Map();

  for (const cell of cellData) {
    const key = `${cell.width}:${cell.height}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        width: cell.width,
        height: cell.height,
        data: [],
      };
      groups.set(key, group);
    }
    group.data.push(cell);
  }

  return [...groups.values()];
}

function summarizeBlock(
  sequences,
  startRow,
  startCol,
  rowStep,
  colStep,
  maxRow,
  maxCol,
  consensus
) {
  const counts = new Map();
  let bestChar = '-';
  let bestCount = 0;
  let identityMatches = 0;
  let comparableResidues = 0;

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

      const consensusChar = consensus?.[c];
      if (isComparableResidue(ch) && isComparableResidue(consensusChar)) {
        comparableResidues++;
        if (ch === consensusChar) {
          identityMatches++;
        }
      }
    }
  }

  return {
    dominantResidue: bestChar,
    identityMatchFraction: comparableResidues > 0 ? identityMatches / comparableResidues : 0,
  };
}

function isComparableResidue(residue) {
  return Boolean(residue && residue !== '-' && residue !== ' ');
}

function getTaxaCellColor(seqId, rowColorMap = {}) {
  const rowColor = rowColorMap[seqId];
  return rowColor ? [...colorToRgb(rowColor), 255] : [255, 255, 255, 255];
}

function applyRegionTint(baseColor, col, currentRegion, previousRegion) {
  const inCurrentRegion =
    currentRegion && col >= currentRegion.startCol - 1 && col <= currentRegion.endCol - 1;

  const inPreviousRegion =
    previousRegion && col >= previousRegion.startCol - 1 && col <= previousRegion.endCol - 1;

  if ((currentRegion || previousRegion) && !inCurrentRegion && !inPreviousRegion) {
    return [
      baseColor[0] * 0.3 + 180,
      baseColor[1] * 0.3 + 180,
      baseColor[2] * 0.3 + 180,
      baseColor[3],
    ];
  }

  if (inPreviousRegion && !inCurrentRegion) {
    return [
      baseColor[0] * 0.7 + 60,
      baseColor[1] * 0.7 + 60,
      baseColor[2] * 0.7 + 60,
      baseColor[3],
    ];
  }

  return baseColor;
}

export function getCellBackgroundColor(
  datum,
  {
    sequenceType,
    currentRegion = null,
    colorScheme = 'default',
    consensus = null,
    previousRegion = null,
    rowColorMap = {},
  }
) {
  let baseColor;

  if (colorScheme === 'taxa') {
    baseColor = getTaxaCellColor(datum.seqId, rowColorMap);
  } else if (colorScheme === 'identity' && consensus) {
    const exactMatch = datum.ch === consensus[datum.col] && isComparableResidue(datum.ch);
    const matchFraction = Number.isFinite(datum.identityMatchFraction)
      ? datum.identityMatchFraction
      : exactMatch
        ? 1
        : 0;
    baseColor = identityColor(matchFraction);
  } else {
    baseColor = getColorScheme(colorScheme, sequenceType)(datum.ch);
  }

  return applyRegionTint(baseColor, datum.col, currentRegion, previousRegion);
}

function identityColor(matchFraction) {
  const ratio = Math.max(0, Math.min(1, matchFraction));
  return [
    Math.round(255 * (1 - ratio)),
    Math.round(255 * (1 - ratio)),
    Math.round(255 - 75 * ratio),
    255,
  ];
}

/**
 * Creates instanced rectangle layers grouped by cell dimensions.
 * Aggregated edge cells may have smaller dimensions, so each size uses one shared mesh.
 * @param {Array} cellGroups - The groups from groupCellDataBySize
 * @param {string} sequenceType - Either 'dna' or 'protein'
 * @param {Object} currentRegion - Current region state
 * @param {string} colorScheme - Color scheme name
 * @param {string} consensus - The consensus sequence (optional)
 * @param {Object} previousRegion - Previous region state (optional)
 * @param {Object} rowColorMap - Optional map of taxon id -> color string
 * @returns {ColumnLayer[]} The cell layers
 */
export function createCellsLayers(
  cellGroups,
  sequenceType,
  currentRegion,
  colorScheme = 'default',
  consensus = null,
  previousRegion = null,
  rowColorMap = {}
) {
  return cellGroups.map(
    ({ key, width, height, data }) =>
      new ColumnLayer({
        id: `cells-${key}`,
        viewId: 'main',
        data,
        pickable: true,
        autoHighlight: true,
        diskResolution: 4,
        vertices: [
          [-width / 2, -height / 2],
          [width / 2, -height / 2],
          [width / 2, height / 2],
          [-width / 2, height / 2],
        ],
        radius: 1,
        radiusUnits: 'common',
        offset: [0, 0],
        extruded: false,
        stroked: false,
        filled: true,
        material: false,
        getPosition: (datum) => datum.position,
        getElevation: 0,
        getFillColor: (datum) =>
          getCellBackgroundColor(datum, {
            sequenceType,
            currentRegion,
            colorScheme,
            consensus,
            previousRegion,
            rowColorMap,
          }),
        updateTriggers: {
          getFillColor: [colorScheme, currentRegion, previousRegion, consensus, rowColorMap],
        },
      })
  );
}
