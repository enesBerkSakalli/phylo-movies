export const createTreeDatasetSlice = (_set, get) => ({
  // ==========================================================================
  // STATE: Core Data
  // ==========================================================================
  movieData: null,
  treeList: [],
  treeMetadata: [],
  fullTreeIndices: [],
  pairInterpolationRanges: [],
  treeIndexByPair: {},
  fileName: null,
  transitionResolver: null,

  // ==========================================================================
  // STATE: Distances & Scales
  // ==========================================================================
  distanceRfd: [],
  distanceWeightedRfd: [],
  scaleValues: [],

  // ==========================================================================
  // STATE: Change Tracking
  // ==========================================================================
  pairSolutions: {},
  pivotEdgeTracking: [],
  subtreeTracking: [],

  getTreeContext: (index) => {
    const state = get();
    const treeIndex = Number(index);
    if (!Number.isInteger(treeIndex) || treeIndex < 0) return null;

    const tree = state.treeList?.[treeIndex] ?? null;
    const metadata = state.treeMetadata?.[treeIndex] ?? null;
    if (!tree) return null;

    const pairKey = metadata?.tree_pair_key ?? null;
    const fullTreeIndices = Array.isArray(state.fullTreeIndices) ? state.fullTreeIndices : [];

    return {
      treeIndex,
      tree,
      metadata,
      pairKey,
      isOriginal: pairKey === null,
      isFullTree: fullTreeIndices.includes(treeIndex),
    };
  },
});
