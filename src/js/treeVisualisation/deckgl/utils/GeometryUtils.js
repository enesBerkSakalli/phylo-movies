/**
 * Geometry manipulation utilities for DeckGL layers.
 * Provides optimized methods for path transformation and coordinate manipulation.
 */
import { HISTORY_NODE_Z_OFFSET, HISTORY_LINK_Z_OFFSET, HISTORY_LABEL_Z_OFFSET } from '../layers/config/layerConfigs.js';

/**
 * Returns the history Z-offset for a node if applicable.
 *
 * @param {Object} cached - The cached layer state
 * @param {Object} node - The node data
 * @returns {number} The Z offset to apply
 */
export function getNodeHistoryZOffset(cached, node) {
  return cached?.colorManager?.isNodeHistorySubtree?.(node) ? HISTORY_NODE_Z_OFFSET : 0;
}

/**
 * Returns the history Z-offset for a link if applicable.
 *
 * @param {Object} cached - The cached layer state
 * @param {Object} link - The link data
 * @returns {number} The Z offset to apply
 */
export function getLinkHistoryZOffset(cached, link) {
  // History layer deactivated
  return 0;
  // return cached?.colorManager?.isLinkHistorySubtree?.(link) ? HISTORY_LINK_Z_OFFSET : 0;
}

/**
 * Returns the history Z-offset for a label if applicable (proxy for node).
 *
 * @param {Object} cached - The cached layer state
 * @param {Object} label - The label data
 * @returns {number} The Z offset to apply
 */
export function getLabelHistoryZOffset(cached, label) {
  // Labels often wrap the actual node data in a 'leaf' property
  const node = label?.leaf || label;
  return cached?.colorManager?.isNodeHistorySubtree?.(node) ? HISTORY_LABEL_Z_OFFSET : 0;
}


/**
 * Checks if a value is a TypedArray (e.g., Float32Array).
 *
 * @param {any} value - The value to check
 * @returns {boolean} True if value is a TypedArray view
 */
function isTypedArray(value) {
  return ArrayBuffer.isView(value) && typeof value?.BYTES_PER_ELEMENT === 'number';
}

/**
 * Adds a Z-offset to a single coordinate.
 * Transforms [x, y] or [x, y, z] into [x, y, z + offset].
 *
 * @param {Array<number>} position - The input position [x, y] or [x, y, z]
 * @param {number} offset - The Z offset to add
 * @returns {Array<number>} New position array with Z offset applied
 */
function addZOffset(position, offset) {
  if (!offset) return position;
  return [position[0], position[1], (position[2] || 0) + offset];
}

/**
 * Adds Z-offset to a flat path array (TypedArray only).
 * Optimized for performance by reusing the constructor type.
 *
 * @param {TypedArray} path - Flat array of coordinates
 * @param {number} offset - The Z offset to apply
 * @returns {TypedArray} New flat path with Z offset applied
 */
function addZOffsetToFlatPath(path, offset) {
  const length = path?.length ?? 0;
  if (!length) return path;

  // Use same constructor as input (e.g. Float32Array) for performance
  const Constructor = path.constructor;
  const isXYZ = length % 3 === 0;

  if (isXYZ) {
    const next = new Constructor(length);
    for (let i = 0; i < length; i += 3) {
      next[i] = path[i];
      next[i + 1] = path[i + 1];
      next[i + 2] = (path[i + 2] || 0) + offset;
    }
    return next;
  }

  // Handle XY flat path -> XYZ flat path conversion
  if (length % 2 === 0) {
    const next = new Constructor((length / 2) * 3);
    for (let i = 0, j = 0; i < length; i += 2, j += 3) {
      next[j] = path[i];
      next[j + 1] = path[i + 1];
      next[j + 2] = offset;
    }
    return next;
  }

  return path;
}

/**
 * Applies a Z-offset to a path.
 * Supports:
 * - Nested Point Arrays: [[x,y], [x,y]] (Standard)
 * - Typed Arrays: Float32Array([x,y, ...]) (Optimized/GPU)
 *
 * @param {Array|TypedArray} path - The path to transform
 * @param {number} offset - The Z offset to apply
 * @returns {Array|TypedArray} The transformed path or original if offset is 0
 */
export function addZOffsetToPath(path, offset) {
  if (!offset || !path) return path;

  // Handle Nested Arrays (Standard format)
  if (Array.isArray(path)) {
    if (!path.length) return path;
    if (Array.isArray(path[0])) {
      return path.map((point) => addZOffset(point, offset));
    }
    // Note: Legacy flat JS arrays (e.g. [x,y,x,y]) are no longer supported here
    // as they are not produced by the current interpolate/converter pipeline.
    return path;
  }

  // Handle Typed Arrays (Optimized format)
  if (isTypedArray(path)) {
    return addZOffsetToFlatPath(path, offset);
  }

  return path;
}
