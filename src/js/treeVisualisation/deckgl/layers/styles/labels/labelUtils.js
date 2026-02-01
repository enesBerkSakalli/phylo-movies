import { getLabelHistoryZOffset } from '../../../utils/GeometryUtils.js';

// ─────────────────────────────────────────────────────────────────────────────
// Generic Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies a Z-offset to a position array.
 */
export function addZOffset(position, offset) {
  if (!offset) return position;
  // position is typically [x, y, z] or [x, y]
  const z = (position[2] || 0) + offset;
  return [position[0], position[1], z];
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

  // Clone only when necessary
  const next = [...color];
  next[3] = Math.min(255, Math.round(next[3] * scale));
  return next;
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
