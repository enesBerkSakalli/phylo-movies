import { getLabelHistoryZOffset } from '../../../utils/GeometryUtils.js';

// Reusable output buffers to avoid per-call array allocations
const _positionOut = [0, 0, 0];

// ─────────────────────────────────────────────────────────────────────────────
// Generic Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies a Z-offset to a position array.
 */
export function addZOffset(position, offset) {
  if (!offset) return position;
  // position is typically [x, y, z] or [x, y]
  _positionOut[0] = position[0];
  _positionOut[1] = position[1];
  _positionOut[2] = (position[2] || 0) + offset;
  return _positionOut;
}

/**
 * Get history/highlight Z-offset for a label
 */
export function getHistoryOffset(cached, label) {
  return getLabelHistoryZOffset(cached, label);
}

/**
 * Normalizes text anchor values to SVG-compatible values.
 */
export function normalizeTextAnchor(anchor) {
  switch (anchor) {
    case 'left':
      return 'start';
    case 'center':
      return 'middle';
    case 'right':
      return 'end';
    case 'start':
    case 'middle':
    case 'end':
      return anchor;
    default:
      return 'start';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// History Utilities
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Tree Side Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if all labels belong to the same tree side.
 * Optimization: Fails fast on the first mismatch.
 */
function getSingleTreeSide(labels) {
  if (!labels || labels.length === 0) return null;

  const firstSide = labels[0]?.treeSide;
  if (typeof firstSide !== 'string' || !firstSide) return null;

  for (let i = 1; i < labels.length; i++) {
    if (labels[i]?.treeSide !== firstSide) return null;
  }

  return firstSide;
}

/**
 * Appends the tree side as a suffix to an ID if all labels share the same side.
 */
export function withSideSuffix(id, labels) {
  const side = getSingleTreeSide(labels);
  return side ? `${id}-${side}` : id;
}
