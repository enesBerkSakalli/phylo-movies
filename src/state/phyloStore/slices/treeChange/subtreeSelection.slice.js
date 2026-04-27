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
  markedSubtreeMode: 'current', // 'all' | 'current'
  manuallyMarkedNodes: [],

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  getCurrentPivotEdge: (indexOverride = null) => {
    const { currentTreeIndex, pivotEdgeTracking } = get();
    const index = indexOverride ?? currentTreeIndex;
    return pivotEdgeTracking?.[index] || [];
  },

  getMarkedSubtreeData: (indexOverride = null) => {
    return resolveMarkedSubtrees(get(), indexOverride);
  },

  getSubtreeHistoryData: (indexOverride = null) => {
    const { currentTreeIndex } = get();
    const index = indexOverride ?? currentTreeIndex;
    return getSubtreeHistoryAtIndex(get(), index);
  },

  getCurrentMovingSubtreeData: (indexOverride = null) => {
    const { currentTreeIndex } = get();
    const index = indexOverride ?? currentTreeIndex;
    return getMovingSubtreeAtIndex(get(), index);
  },

  getSourceDestinationEdgeData: (indexOverride = null) => {
    const { currentTreeIndex } = get();
    const index = indexOverride ?? currentTreeIndex;
    return getSourceDestinationEdgesAtIndex(get(), index);
  },

  setMarkedSubtreeMode: (mode) => {
    if (mode !== 'all' && mode !== 'current') return;
    set({ markedSubtreeMode: mode });
    const { markedSubtreesEnabled, getMarkedSubtreeData, updateColorManagerMarkedSubtrees, manuallyMarkedNodes, treeControllers } = get();
    if (markedSubtreesEnabled) {
      updateColorManagerMarkedSubtrees([...toManualMarkedSets(manuallyMarkedNodes), ...getMarkedSubtreeData()]);
    }
    renderTreeControllers(treeControllers);
  },

  setManuallyMarkedNodes: (nodeIds = []) => {
    const nodes = Array.isArray(nodeIds) ? nodeIds.filter(Boolean) : [];
    set({ manuallyMarkedNodes: nodes });
    const { getMarkedSubtreeData, updateColorManagerMarkedSubtrees, treeControllers } = get();
    const manual = toManualMarkedSets(nodes);
    updateColorManagerMarkedSubtrees([...manual, ...getMarkedSubtreeData()]);
    renderTreeControllers(treeControllers);
  },
});
