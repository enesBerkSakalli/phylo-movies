import { useAppStore } from '../../state/phyloStore/store.js';
import { selectTreeMetadataAtIndex } from '../../state/phyloStore/selectors/treeSelectors.js';

// ===========================
// ANCHOR NAVIGATION UTILITIES
// ===========================

/**
 * Find the index (into anchorIndices array) of the last anchor tree at or before the given position.
 * @param {Array<number>} anchorIndices - Sorted sequence indices for anchor trees
 * @param {number} position - Current sequence position
 * @returns {number} Index into anchorIndices array (0 if none found before position)
 */
export function findPreviousAnchorIndex(anchorIndices, position) {
  if (!anchorIndices?.length) return 0;
  for (let i = anchorIndices.length - 1; i >= 0; i--) {
    if (anchorIndices[i] <= position) {
      return i;
    }
  }
  return 0;
}

/**
 * Find the sequence index of the previous anchor tree.
 * @param {Array<number>} anchorIndices - Sorted sequence indices for anchor trees
 * @param {number} position - Current sequence position
 * @returns {number} Sequence index of previous anchor tree
 */
export function findPreviousAnchorSequenceIndex(anchorIndices, position) {
  if (!anchorIndices?.length) return 0;
  const idx = findPreviousAnchorIndex(anchorIndices, position);
  return anchorIndices[idx] ?? 0;
}

/**
 * Find the sequence index of the next anchor tree after the given position.
 * @param {Array<number>} anchorIndices - Sorted sequence indices for anchor trees
 * @param {number} position - Current sequence position
 * @returns {number|null} Sequence index of next anchor, or null if none exists
 */
export function findNextAnchorSequenceIndex(anchorIndices, position) {
  if (!anchorIndices?.length) return null;
  for (const anchorIdx of anchorIndices) {
    if (anchorIdx > position) {
      return anchorIdx;
    }
  }
  return null;
}

// ===========================
// INDEX MAPPING FUNCTIONS
// ===========================

export function getIndexMappings(state = useAppStore.getState()) {
  const seqIndex = state.currentTreeIndex || 0;
  const resolver = state.transitionResolver;
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
    totalSequenceLength: state.treeList?.length || 0,
    totalFullTrees: fti.length,
  };
}

export function getPhaseMetadata(state = useAppStore.getState()) {
  const { sequenceIndex, fullTreeIndex } = getIndexMappings(state);
  // Use exact full-tree metadata when on a full tree; otherwise use current sequence index
  const targetSeqIndex = fullTreeIndex >= 0
    ? state.transitionResolver.fullTreeIndices[fullTreeIndex]
    : sequenceIndex;
  return selectTreeMetadataAtIndex(state, targetSeqIndex);
}

// MSA window index:
// - Anchor trees (pivotEdge: null) advance the active MSA window.
// - Transition frames (pivotEdge: array) stay on the source MSA window.
export function getMSAFrameIndex(state = useAppStore.getState()) {
  const { fullTreeIndex } = getIndexMappings(state);

  // If exactly on a full tree, use its index
  if (fullTreeIndex >= 0) {
    return fullTreeIndex;
  }

  // For interpolations, find the source full tree (last full tree before current position)
  const seqIndex = state.currentTreeIndex || 0;
  const resolver = state.transitionResolver;
  const fullTreeIndices = resolver?.fullTreeIndices || [];

  return findPreviousAnchorIndex(fullTreeIndices, seqIndex);
}
