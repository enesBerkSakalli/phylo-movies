import { selectTreeContext } from '../../selectors/treeSelectors.js';

export const createTreeDatasetSlice = (_set, get) => ({
  // ==========================================================================
  // STATE: Core Data
  // ==========================================================================
  movieData: null,
  treeList: [],
  treeMetadata: [],
  leafNamesByIndex: [],
  fullTreeIndices: [],
  pairInterpolationRanges: [],
  treeIndexByPair: {},
  fileName: null,
  datasetVersion: 0,
  transitionResolver: null,

  // ==========================================================================
  // STATE: Distances & Scales
  // ==========================================================================
  distanceRfd: [],
  distanceWeightedRfd: [],
  scaleList: [],
  maxScale: 0,
  scaleValues: [],

  // ==========================================================================
  // STATE: Change Tracking
  // ==========================================================================
  pairSolutions: {},
  pivotEdgeTracking: [],
  subtreeTracking: [],

  getTreeContext: (index) => {
    return selectTreeContext(get(), index);
  },
});
