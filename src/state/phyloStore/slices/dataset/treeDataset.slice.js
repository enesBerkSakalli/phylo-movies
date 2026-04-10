export const createTreeDatasetSlice = () => ({
  // ==========================================================================
  // STATE: Core Data
  // ==========================================================================
  movieData: null,
  treeList: [],
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
});