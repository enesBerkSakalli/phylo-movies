import { selectTreeContext } from '../../selectors/treeSelectors.js';
import { hydrateMovieTreeAtIndex } from '../../../../domain/backend/treeHydration.js';

const EMPTY_PAIR_METRICS = Object.freeze({
  rows: Object.freeze([]),
  semantics: Object.freeze({}),
});

export const createTreeDatasetSlice = (set, get) => ({
  // ==========================================================================
  // STATE: Core Data
  // ==========================================================================
  treeList: [],
  treePayloadList: [],
  treeHydrationSource: null,
  treeHydrationVersion: 0,
  timelineFrames: [],
  leafNamesByIndex: [],
  fileName: null,
  datasetProvenance: null,
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

  ensureTreeHydrated: (index) => {
    const treeIndex = Number(index);
    if (!Number.isInteger(treeIndex) || treeIndex < 0) return null;

    const state = get();
    const existingTree = state.treeList?.[treeIndex];
    if (existingTree) return existingTree;
    if (!state.treeHydrationSource || treeIndex >= state.treePayloadList.length) return null;

    const hydratedTree = hydrateMovieTreeAtIndex(state.treeHydrationSource, treeIndex);
    state.treeList[treeIndex] = hydratedTree;
    set((currentState) => ({
      treeHydrationVersion: (currentState.treeHydrationVersion ?? 0) + 1,
    }));
    return hydratedTree;
  },

  ensureTreesHydrated: (indices) => {
    if (!Array.isArray(indices)) return [];
    const { ensureTreeHydrated } = get();
    return indices.map((index) => ensureTreeHydrated(index));
  },

  prefetchTreeHydrationWindow: (centerIndex, radius = 1) => {
    const treeIndex = Number(centerIndex);
    const windowRadius = Number(radius);
    if (!Number.isInteger(treeIndex) || treeIndex < 0) return [];
    if (!Number.isInteger(windowRadius) || windowRadius < 0) return [];

    const state = get();
    const totalTrees = state.treeList?.length ?? 0;
    const indices = [];
    for (
      let index = Math.max(0, treeIndex - windowRadius);
      index <= Math.min(totalTrees - 1, treeIndex + windowRadius);
      index += 1
    ) {
      indices.push(index);
    }
    return state.ensureTreesHydrated(indices);
  },

  getTreeContext: (index) => {
    get().ensureTreeHydrated?.(index);
    return selectTreeContext(get(), index);
  },
});
