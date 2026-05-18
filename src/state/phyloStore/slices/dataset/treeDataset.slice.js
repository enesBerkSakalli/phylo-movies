import { selectTreeContext } from '../../selectors/treeSelectors.js';

export const createTreeDatasetSlice = (_set, get) => ({
  // ==========================================================================
  // STATE: Core Data
  // ==========================================================================
  treeList: [],
  treeMetadata: [],
  leafNamesByIndex: [],
  fileName: null,
  datasetVersion: 0,
  transitionResolver: null,

  // ==========================================================================
  // STATE: Distances & Scales
  // ==========================================================================
  treeDistances: null,

  // ==========================================================================
  // STATE: Change Tracking
  // ==========================================================================
  pairSolutions: {},
  pivotEdgeTracking: [],
  subtreeHighlightTracking: [],
  splitChangeTimeline: [],

  getTreeContext: (index) => {
    return selectTreeContext(get(), index);
  },
});
