/**
 * Row Labels Layer Module
 * Creates the row labels text layer
 */

import { TextLayer } from '@deck.gl/layers';
import { colorToRgb, colorToRgba } from '../../services/ui/colorUtils.js';

/**
 * Pick contrasting text color based on background luminance
 * @param {number[]} bg - [r,g,b] or [r,g,b,a]
 * @returns {number[]} RGBA text color
 */
function textColorFor(bg) {
  const [r, g, b] = bg;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 140 ? [255, 255, 255, 255] : [40, 40, 40, 255];
}

/**
 * Build row labels data
 * @param {number} cellSize - Size of each cell
 * @param {Array} sequences - Array of sequence objects
 * @param {Object} visibleRange - Visible range {r0, r1}
 * @param {Object} viewState - Current view state with zoom
 * @param {number} zoomScale - Current zoom scale factor
 * @param {number} [viewWidth=120] - The width of the view in pixels.
 * @param {Object} rowColorMap - Optional map of taxon id -> color string
 * @returns {Array} Row labels data array
 */
export function buildRowLabels(cellSize, sequences, visibleRange, viewState, zoomScale, viewWidth = 120, rowColorMap = {}) {
  if (!sequences || sequences.length === 0) {
    return [];
  }

  const { r0, r1 } = visibleRange;
  const data = [];

  // Round to nice intervals for rows
  // Calculate position: Right aligned in the view (labels view has target [0, y, 0])
  // The center of the view is at X=0 in world space.
  // The right edge of the view in world space is (viewWidth / 2) / zoomScale.
  // Scale padding so it shrinks when zooming out (avoids huge relative gaps)
  const basePadPx = 4;
  const screenPad = basePadPx * Math.min(1, zoomScale || 1);
  const worldX = (viewWidth - screenPad) / zoomScale;

  for (let r = r0; r <= r1; r++) {
    if (r >= sequences.length) continue;

    const seq = sequences[r];
    if (!seq) continue;

    const baseColor = rowColorMap[seq.id];
    const rgb = baseColor ? colorToRgb(baseColor) : [255, 255, 255];
    // Slight brightness boost to match node render intensity (UI contrast)
    const boosted = baseColor ? rgb.map(v => Math.min(255, Math.round(v * 1.08))) : rgb;
    const bg = baseColor ? [...boosted, 255] : [255, 255, 255, 255]; // full opacity
    const fg = baseColor ? textColorFor(bg) : [0, 0, 0, 255]; // default black

    data.push({
      kind: 'label',
      row: r,
      text: seq.id || `Seq ${r + 1}`,
      position: [worldX, r * cellSize + cellSize / 2, 0],
      cellSize, // Pass cellSize for getSize in 'common' units
      backgroundColor: bg,
      textColor: fg,
      paddingPx: screenPad / 2
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
    getSize: d => d.cellSize * 0.65, // 65% of row height
    sizeUnits: 'common',  // Use common units to scale with world space (zoom)
    getTextAnchor: 'end',
    getAlignmentBaseline: 'center',
    background: true,
    padding: 0,
    // Use per-datum padding that scales with zoom (set in buildRowLabels)
    getBackgroundPadding: d => {
      const p = d.paddingPx ?? 2;
      return [0, p, 0, p];
    },
    getBackgroundColor: d => d.backgroundColor || [255, 255, 255, 255],
    getColor: d => d.textColor || [0, 0, 0, 255],
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'
  });
}
