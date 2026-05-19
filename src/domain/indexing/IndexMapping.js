import { useAppStore } from '../../state/phyloStore/store.js';
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

// ===========================
// INDEX MAPPING FUNCTIONS
// ===========================

export function getIndexMappingValues(sequenceIndex = 0, totalSequenceLength = 0, transitionResolver = null) {
  const seqIndex = sequenceIndex || 0;
  const resolver = transitionResolver;
  const fti = resolver?.fullTreeIndices || [];
  const sourceGlobalIndex = resolver ? resolver.getSourceGlobalIndex(seqIndex) : 0;
  // Check if current position is exactly on a full tree
  const fullTreeIndex = fti.indexOf(seqIndex);
  const fullTreeSeqIndex = fullTreeIndex >= 0 ? (fti[fullTreeIndex] ?? -1) : -1;
  return {
    sequenceIndex: seqIndex,
    sourceGlobalIndex,
    fullTreeIndex,            // index into fullTreeIndices (0..N-1) or -1 if not exactly on full tree
    fullTreeSeqIndex,         // sequence index of that full tree or -1
    totalSequenceLength,
    totalFullTrees: fti.length,
  };
}

export function getIndexMappings(state = useAppStore.getState()) {
  return getIndexMappingValues(
    state.frameIndex || 0,
    state.treeList?.length || 0,
    state.transitionResolver
  );
}

// MSA window index:
// - Input trees (pivotEdge: null) advance the active MSA window.
// - Transition frames (pivotEdge: array) stay on the source MSA window.
export function getMSAFrameIndexForTimelineIndex(sequenceIndex = 0, transitionResolver = null) {
  return resolveMsaSourceFrameIndex(transitionResolver?.fullTreeIndices || [], sequenceIndex);
}

export function getMSAFrameIndex(state = useAppStore.getState()) {
  return getMSAFrameIndexForTimelineIndex(
    state.frameIndex || 0,
    state.transitionResolver
  );
}
