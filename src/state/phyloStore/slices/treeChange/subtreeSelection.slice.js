import {
  renderTreeControllers,
  toManualMarkedSets,
  getMovingSubtreeAtIndex,
  getSubtreeHistoryAtIndex,
  getSourceDestinationEdgesAtIndex,
  resolveMarkedSubtrees
} from '../../internal/changeTracking.helpers.js';

export const createSubtreeSelectionSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  markedSubtreeScope: 'current', // 'all' | 'current'
  manuallyMarkedNodes: [],

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  getCurrentPivotEdge: (indexOverride = null) => {
    const { frameIndex, pivotEdgeTracking } = get();
    const index = indexOverride ?? frameIndex;
    return pivotEdgeTracking[index] || [];
  },

  getMarkedSubtreeData: (indexOverride = null) => {
    return resolveMarkedSubtrees(get(), indexOverride);
  },

  getSubtreeHistoryData: (indexOverride = null) => {
    const { frameIndex } = get();
    const index = indexOverride ?? frameIndex;
    return getSubtreeHistoryAtIndex(get(), index);
  },

  getCurrentMovingSubtreeData: (indexOverride = null) => {
    const { frameIndex } = get();
    const index = indexOverride ?? frameIndex;
    return getMovingSubtreeAtIndex(get(), index);
  },

  getSourceDestinationEdgeData: (indexOverride = null) => {
    const { frameIndex } = get();
    const index = indexOverride ?? frameIndex;
    return getSourceDestinationEdgesAtIndex(get(), index);
  },

  setMarkedSubtreeScope: (scope) => {
    if (scope !== 'all' && scope !== 'current') return;
    set({ markedSubtreeScope: scope });
    const { markedSubtreesEnabled, getMarkedSubtreeData, updateColorManagerMarkedSubtrees, manuallyMarkedNodes } = get();
    if (markedSubtreesEnabled) {
      updateColorManagerMarkedSubtrees([...toManualMarkedSets(manuallyMarkedNodes), ...getMarkedSubtreeData()]);
    }
    renderTreeControllers(get());
  },

  setManuallyMarkedNodes: (nodeIds = []) => {
    const nodes = Array.isArray(nodeIds) ? nodeIds.filter(Boolean) : [];
    set({ manuallyMarkedNodes: nodes });
    const { getMarkedSubtreeData, updateColorManagerMarkedSubtrees } = get();
    const manual = toManualMarkedSets(nodes);
    updateColorManagerMarkedSubtrees([...manual, ...getMarkedSubtreeData()]);
    renderTreeControllers(get());
  },
});
