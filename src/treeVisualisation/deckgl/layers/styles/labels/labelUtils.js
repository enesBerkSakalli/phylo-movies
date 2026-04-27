import { getLabelHistoryZOffset } from '../../../utils/GeometryUtils.js';

// Reusable output buffers to avoid per-call array allocations
const _positionOut = [0, 0, 0];
const _alphaOut = [0, 0, 0, 0];

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
 * Boosts the alpha channel of a color.
 * Optimization: Returns original reference if scale is 1 to avoid allocation.
 */
export function boostAlpha(color, scale) {
  if (!scale || scale === 1) return color;

  // Write into reusable buffer instead of cloning
  _alphaOut[0] = color[0];
  _alphaOut[1] = color[1];
  _alphaOut[2] = color[2];
  _alphaOut[3] = Math.min(255, Math.round(color[3] * scale));
  return _alphaOut;
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
export function getSingleTreeSide(labels) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Source/Destination Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal helper to validate if a label is a valid target helper (Source/Destination).
 * Consolidates duplicated logic from isLabelSource/Destination.
 * @returns {boolean} True if the label is potentially a source/dest candidate
 */
function isValidTargetNode(cached, label) {
  const cm = cached?.colorManager;
  if (!cm) return false;

  // Exclude right-side comparison tree and clipboard items
  const side = label?.treeSide;
  if (side === 'right' || side === 'clipboard') return false;

  const node = label?.leaf || label;
  // Exclude moving subtrees (drag-and-drop ghosts)
  if (cm.isNodeMovingSubtree?.(node)) return false;

  return true;
}

/**
 * Checks if a label represents a source edge.
 */
export function isLabelSource(cached, label) {
  if (!isValidTargetNode(cached, label)) return false;
  const node = label.leaf || label;
  return !!cached.colorManager.isNodeSourceEdge?.(node);
}

/**
 * Checks if a label represents a destination edge.
 */
export function isLabelDestination(cached, label) {
  if (!isValidTargetNode(cached, label)) return false;
  const node = label.leaf || label;
  return !!cached.colorManager.isNodeDestinationEdge?.(node);
}

/**
 * Checks if a label is either a source or destination edge.
 */
export function isSourceOrDestinationLabel(cached, label) {
  return isLabelSource(cached, label) || isLabelDestination(cached, label);
}
