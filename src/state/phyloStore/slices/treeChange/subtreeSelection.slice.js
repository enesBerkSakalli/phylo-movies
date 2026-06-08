import {
  renderTreeControllers,
  toManualMarkedSets,
  getMovingSubtreeAtIndex,
  getSubtreeHistoryAtIndex,
  getSourceDestinationEdgesAtIndex,
  resolveSubtreeHighlights,
} from '../../internal/changeTracking.helpers.js';
import { selectPivotEdgeForFrame } from '../../selectors/treeSelectors.js';

export const createSubtreeSelectionSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  subtreeHighlightScope: 'current', // 'all' | 'current'
  manuallyMarkedNodes: [],

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  getCurrentPivotEdge: (indexOverride = null) => {
    const { frameIndex } = get();
    const index = indexOverride ?? frameIndex;
    return selectPivotEdgeForFrame(get(), index);
  },

  getSubtreeHighlightData: (indexOverride = null) => {
    return resolveSubtreeHighlights(get(), indexOverride);
  },

  getSubtreeHistoryData: (indexOverride = null) => {
    const { frameIndex } = get();
    const index = indexOverride ?? frameIndex;
    return getSubtreeHistoryAtIndex(get(), index);
  },

  getActiveMoverSubtreeData: (indexOverride = null) => {
    const { frameIndex } = get();
    const index = indexOverride ?? frameIndex;
    return getMovingSubtreeAtIndex(get(), index);
  },

  getSourceDestinationEdgeData: (indexOverride = null) => {
    const { frameIndex } = get();
    const index = indexOverride ?? frameIndex;
    return getSourceDestinationEdgesAtIndex(get(), index);
  },

  setSubtreeHighlightScope: (scope) => {
    if (scope !== 'all' && scope !== 'current') return;
    set({ subtreeHighlightScope: scope });
    const {
      subtreeHighlightsEnabled,
      getSubtreeHighlightData,
      updateColorManagerHighlightedSubtrees,
      manuallyMarkedNodes,
    } = get();
    if (subtreeHighlightsEnabled) {
      updateColorManagerHighlightedSubtrees([
        ...toManualMarkedSets(manuallyMarkedNodes),
        ...getSubtreeHighlightData(),
      ]);
    }
    renderTreeControllers(get());
  },

  setManuallyMarkedNodes: (nodeIds = []) => {
    const nodes = Array.isArray(nodeIds) ? nodeIds.filter(Number.isFinite) : [];
    set({ manuallyMarkedNodes: nodes });
    const { getSubtreeHighlightData, updateColorManagerHighlightedSubtrees } = get();
    const manual = toManualMarkedSets(nodes);
    updateColorManagerHighlightedSubtrees([...manual, ...getSubtreeHighlightData()]);
    renderTreeControllers(get());
  },
});
