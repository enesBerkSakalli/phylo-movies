import { TREE_COLOR_CATEGORIES } from '../../../../constants/TreeColors.js';
import {
  clearEdgePreviews,
  renderTreeControllers,
  toManualMarkedSets
} from '../../internal/changeTracking.helpers.js';

export const createTreeHighlightStateSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  pivotEdgesEnabled: true,
  pivotEdgeColor: TREE_COLOR_CATEGORIES.pivotEdgeColor,
  markedSubtreesEnabled: true,
  markedColor: TREE_COLOR_CATEGORIES.markedColor,
  dimmingEnabled: true,
  dimmingOpacity: 0.3,
  subtreeDimmingEnabled: false,
  subtreeDimmingOpacity: 0.3,
  upcomingChangesEnabled: false,
  upcomingChangeEdges: [],
  completedChangeEdges: [],
  highlightSourceEnabled: false,
  highlightDestinationEnabled: false,
  changePulseEnabled: true,
  pivotEdgeDashingEnabled: true,
  highlightColorMode: 'solid', // 'contrast' | 'taxa' | 'solid'

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setDimmingEnabled: (enabled) => set((s) => ({
    dimmingEnabled: enabled,
    subtreeDimmingEnabled: enabled ? false : s.subtreeDimmingEnabled,
    colorVersion: s.colorVersion + 1
  })),

  setDimmingOpacity: (opacity) => set((s) => ({
    dimmingOpacity: Math.max(0, Math.min(1, opacity)),
    colorVersion: s.colorVersion + 1
  })),

  setSubtreeDimmingEnabled: (enabled) => set((s) => ({
    subtreeDimmingEnabled: enabled,
    dimmingEnabled: enabled ? false : s.dimmingEnabled,
    colorVersion: s.colorVersion + 1
  })),

  setSubtreeDimmingOpacity: (opacity) => set((s) => ({
    subtreeDimmingOpacity: Math.max(0, Math.min(1, opacity)),
    colorVersion: s.colorVersion + 1
  })),

  updateChangeColor: (colorType, newColor) => {
    const isSystemKey = colorType in TREE_COLOR_CATEGORIES ||
      ['pivotEdgeColor', 'markedColor', 'defaultColor', 'strokeColor'].includes(colorType);

    if (isSystemKey) {
      Object.assign(TREE_COLOR_CATEGORIES, { [colorType]: newColor });
      set({ [colorType]: newColor });
    }

    const { colorManager, treeControllers } = get();
    colorManager?.refreshColorCategories?.();
    renderTreeControllers(treeControllers);
  },

  setPivotEdgeColor: (color) => get().updateChangeColor('pivotEdgeColor', color),
  setMarkedColor: (color) => get().updateChangeColor('markedColor', color),

  setPivotEdgesEnabled: (enabled) => {
    set({ pivotEdgesEnabled: enabled });
    const { updateColorManagerPivotEdge, getCurrentPivotEdge } = get();
    updateColorManagerPivotEdge(enabled ? getCurrentPivotEdge() : []);
  },

  setMarkedSubtreesEnabled: (enabled) => {
    set({ markedSubtreesEnabled: enabled });
    const { colorManager } = get();
    if (colorManager.setMarkedSubtreesColoring) {
      colorManager.setMarkedSubtreesColoring(enabled);
    }
    const {
      updateColorManagerMarkedSubtrees,
      getMarkedSubtreeData,
      manuallyMarkedNodes,
      updateColorManagerHistorySubtrees,
      getSubtreeHistoryData
    } = get();
    const manual = toManualMarkedSets(manuallyMarkedNodes);
    updateColorManagerMarkedSubtrees([...manual, ...getMarkedSubtreeData()]);
    updateColorManagerHistorySubtrees(enabled ? getSubtreeHistoryData() : []);
  },

  setUpcomingChangesEnabled: (enabled) => {
    set({ upcomingChangesEnabled: enabled });
    const { updateUpcomingChanges, treeControllers } = get();
    updateUpcomingChanges();
    renderTreeControllers(treeControllers);
  },

  updateUpcomingChanges: () => {
    const { upcomingChangesEnabled, colorManager, calculateHighlightChangePreviews } = get();
    const { upcoming, completed } = calculateHighlightChangePreviews();

    if (!upcomingChangesEnabled) {
      set({ upcomingChangeEdges: [], completedChangeEdges: [] });
      clearEdgePreviews(colorManager);
      return;
    }

    set({ upcomingChangeEdges: upcoming, completedChangeEdges: completed });
    colorManager?.updateCompletedChangeEdges?.(completed);
    colorManager?.updateUpcomingChangeEdges?.(upcoming);
  },

  setHighlightColorMode: (mode) => {
    set((s) => ({ highlightColorMode: mode, colorVersion: s.colorVersion + 1 }));
    renderTreeControllers(get().treeControllers);
  },

  setChangePulseEnabled: (enabled) => {
    set((s) => ({ changePulseEnabled: enabled, colorVersion: s.colorVersion + 1 }));
    if (enabled) {
      get().startPulseAnimation();
    } else {
      get().stopPulseAnimation();
      renderTreeControllers(get().treeControllers);
    }
  },

  setPivotEdgeDashingEnabled: (enabled) => {
    set((s) => ({ pivotEdgeDashingEnabled: enabled, colorVersion: s.colorVersion + 1 }));
    renderTreeControllers(get().treeControllers);
  },
});
