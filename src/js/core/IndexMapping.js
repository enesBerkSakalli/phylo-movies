import { useAppStore } from './store.js';

function nearestFullTreeIndexForSeq(seqIndex, fullTreeIndices) {
  if (!fullTreeIndices || fullTreeIndices.length === 0) return { chartIndex: 0, seqIndex: 0 };
  let k = 0;
  for (let i = fullTreeIndices.length - 1; i >= 0; i--) {
    if (fullTreeIndices[i] <= seqIndex) { k = i; break; }
  }
  if (k + 1 < fullTreeIndices.length) {
    const left = Math.abs(seqIndex - fullTreeIndices[k]);
    const right = Math.abs(fullTreeIndices[k + 1] - seqIndex);
    if (right < left) k = k + 1;
  }
  return { chartIndex: k, seqIndex: fullTreeIndices[k] };
}

export function getIndexMappings(state = useAppStore.getState()) {
  const seqIndex = state.currentTreeIndex || 0;
  const resolver = state.transitionResolver;
  const fti = resolver?.fullTreeIndices || [];
  const distanceIndex = resolver ? resolver.getDistanceIndex(seqIndex) : 0;
  const fullTreeIndex = resolver?.getFullTreeIndex ? resolver.getFullTreeIndex(seqIndex) : -1;
  const fullTreeSeqIndex = fullTreeIndex >= 0 ? (fti[fullTreeIndex] ?? -1) : -1;
  const nearest = nearestFullTreeIndexForSeq(seqIndex, fti);

  return {
    sequenceIndex: seqIndex,
    distanceIndex,
    fullTreeIndex,            // index into fullTreeIndices (0..N-1) or -1 if not exactly on full tree
    fullTreeSeqIndex,         // sequence index of that full tree or -1
    nearestFullTreeChartIndex: nearest.chartIndex, // 0..N-1
    nearestFullTreeSeqIndex: nearest.seqIndex,     // sequence index of nearest full tree
    totalSequenceLength: state.treeList?.length || 0,
    totalFullTrees: fti.length,
  };
}

export function getPhaseMetadata(state = useAppStore.getState()) {
  const { sequenceIndex } = getIndexMappings(state);
  // Prefer the exact full-tree metadata when on a full tree; otherwise fall back to nearest full tree sequence index
  const fullTreeSeqIndex = state.transitionResolver?.getFullTreeIndex?.(sequenceIndex) >= 0
    ? state.transitionResolver.fullTreeIndices[state.transitionResolver.getFullTreeIndex(sequenceIndex)]
    : getIndexMappings(state).nearestFullTreeSeqIndex;
  return state.movieData?.tree_metadata?.[fullTreeSeqIndex] ?? null;
}

// Preferred frame index for MSA anchoring:
// - If exactly on a full tree → use that full tree's index (0..N-1)
// - Otherwise → use the distance/transition index between trees
export function getMSAFrameIndex(state = useAppStore.getState()) {
  const { distanceIndex, fullTreeIndex } = getIndexMappings(state);
  return fullTreeIndex >= 0 ? fullTreeIndex : distanceIndex;
}
