/**
 * Scale Utility Functions
 * Provides utilities for handling scale calculations, formatting, and visualization.
 */

import { getReadableVisualBranchLength } from './branchTransform.js';

/**
 * Get the maximum scale value from the scale list
 * @param {Array} scaleList - Array of scale objects
 * @returns {number} Maximum scale value
 */
export function getMaxScaleValue(scaleList) {
  if (!scaleList || !Array.isArray(scaleList) || scaleList.length === 0) {
    return 1;
  }

  return Math.max(...scaleList.map((item) => (typeof item === 'object' ? item.value : item)));
}

/**
 * Format scale value for display
 * @param {number} value - Scale value to format
 * @param {number} decimals - Number of decimal places (default: 3)
 * @returns {string} Formatted scale value
 */
export function formatScaleValue(value, decimals = 3) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0.000';
  }
  return value.toFixed(decimals);
}

/**
 * Creates a lookup map from scale list entries for O(1) access by frame index.
 * @param {Array<{index?: number, value?: number} | number> | null | undefined} scaleList
 * @returns {Map<number, number>}
 */
export function buildScaleLookup(scaleList) {
  const map = new Map();

  if (!Array.isArray(scaleList)) return map;

  scaleList.forEach((item, index) => {
    const itemIndex =
      typeof item === 'object' && item !== null && 'index' in item ? item.index : index;
    const itemValue =
      typeof item === 'object' && item !== null && 'value' in item ? item.value : item;
    map.set(itemIndex, Number(itemValue) || 0);
  });

  return map;
}

export function getScaleValue(scaleList, sourceFrameIndex) {
  if (!Number.isInteger(sourceFrameIndex)) return null;

  const value = buildScaleLookup(scaleList).get(sourceFrameIndex);
  return Number.isFinite(value) ? value : null;
}

/**
 * Calculate scales only for input frame indices.
 * @param {Array} treeList - Array of tree objects
 * @param {Array} inputFrameIndices - Array of indices for input trees
 * @returns {Array} Array of scale objects for input trees
 */
export default function calculateScales(treeList, inputFrameIndices) {
  if (!Array.isArray(inputFrameIndices)) {
    throw new TypeError('calculateScales requires explicit inputFrameIndices');
  }

  const scaleList = [];
  for (let i = 0; i < inputFrameIndices.length; i++) {
    const idx = inputFrameIndices[i];
    const scale = _calculateScale(treeList[idx]);
    scaleList.push({ value: scale, index: idx });
  }
  return scaleList;
}

function _calculateScale(root) {
  if (!root) return 0;
  if (isBinaryTreeBlock(root)) return calculateBlockScale(root);

  // Iterative walk tracking each node's distance from the root; the root's own
  // branch length is excluded, as the recursive version excluded it.
  let max = 0;
  const stack = [[root, 0, true]];
  while (stack.length > 0) {
    const [node, distanceToParent, isRoot] = stack.pop();
    const distance = distanceToParent + (isRoot ? 0 : getScaleBranchLength(node));
    if (distance > max) max = distance;
    const children = getScaleChildren(node);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push([children[index], distance, false]);
    }
  }
  return max;
}

/** A PMB1 tree block, recognised by its typed parent and length columns. */
function isBinaryTreeBlock(node) {
  return (
    node !== null &&
    typeof node === 'object' &&
    node.parent instanceof Int32Array &&
    node.length instanceof Float64Array
  );
}

/**
 * One pass over the flat block: preorder guarantees a parent precedes its
 * children, so each node's root distance is its parent's plus its own branch
 * length. Negative or non-finite lengths count as zero, matching
 * getScaleBranchLength, and the root's length is excluded.
 */
function calculateBlockScale(block) {
  const { parent, length, nodeCount } = block;
  if (!nodeCount) return 0;

  const distances = new Float64Array(nodeCount);
  let max = 0;
  for (let index = 1; index < nodeCount; index += 1) {
    const raw = length[index];
    const branch = Number.isFinite(raw) && raw > 0 ? raw : 0;
    const distance = distances[parent[index]] + branch;
    distances[index] = distance;
    if (distance > max) max = distance;
  }
  return max;
}

function getScaleChildren(node) {
  if (Array.isArray(node)) {
    return Array.isArray(node[4]) ? node[4] : [];
  }

  return Array.isArray(node?.children) ? node.children : [];
}

function getScaleBranchLength(node) {
  if (!Array.isArray(node)) {
    return getReadableVisualBranchLength(node);
  }

  const value = Number(node[0]);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}
