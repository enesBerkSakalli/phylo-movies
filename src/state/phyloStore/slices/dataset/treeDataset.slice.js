import { selectTreeContext } from '../../selectors/treeSelectors.js';

const EMPTY_PAIR_METRICS = Object.freeze({
  rows: Object.freeze([]),
  semantics: Object.freeze({}),
});

export const createTreeDatasetSlice = (_set, get) => ({
  // ==========================================================================
  // STATE: Core Data
  // ==========================================================================
  treeList: [],
  timelineFrames: [],
  leafNamesByIndex: [],
  fileName: null,
  datasetVersion: 0,

  // ==========================================================================
  // STATE: Distances & Scales
  // ==========================================================================
  pairMetrics: EMPTY_PAIR_METRICS,

  // ==========================================================================
  // STATE: Change Tracking
  // ==========================================================================
  pairs: [],
  subtreeHighlightTracking: [],
  temporalEvents: [],

  getTreeContext: (index) => {
    return selectTreeContext(get(), index);
  },
});
