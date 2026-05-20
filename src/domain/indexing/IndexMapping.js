import { resolveMsaSourceFrameIndex } from './treeIndexSemantics.js';

// ===========================
// INPUT-TREE NAVIGATION UTILITIES
// ===========================

/**
 * Find the ordinal position of the last input tree at or before the given sequence position.
 * @param {Array<number>} inputTreeIndices - Sorted sequence indices for input trees
 * @param {number} position - Current sequence position
 * @returns {number} Index into inputTreeIndices array (0 if none found before position)
 */
export function findPreviousInputTreeOrdinal(inputTreeIndices, position) {
  return resolveMsaSourceFrameIndex(inputTreeIndices, position);
}

/**
 * Find the sequence index of the previous input tree.
 * @param {Array<number>} inputTreeIndices - Sorted sequence indices for input trees
 * @param {number} position - Current sequence position
 * @returns {number} Sequence index of previous input tree
 */
export function findPreviousInputTreeSequenceIndex(inputTreeIndices, position) {
  if (!inputTreeIndices?.length) return 0;
  const idx = findPreviousInputTreeOrdinal(inputTreeIndices, position);
  return inputTreeIndices[idx] ?? 0;
}

/**
 * Find the sequence index of the next input tree after the given position.
 * @param {Array<number>} inputTreeIndices - Sorted sequence indices for input trees
 * @param {number} position - Current sequence position
 * @returns {number|null} Sequence index of next input tree, or null if none exists
 */
export function findNextInputTreeSequenceIndex(inputTreeIndices, position) {
  if (!inputTreeIndices?.length) return null;
  for (const inputTreeIndex of inputTreeIndices) {
    if (inputTreeIndex > position) {
      return inputTreeIndex;
    }
  }
  return null;
}
