import { TREE_COLOR_CATEGORIES } from '../../constants/TreeColors.js';
import { TreeColorManager } from '../../treeVisualisation/systems/TreeColorManager.js';
import {
  renderTreeControllers,
  toManualMarkedSets,
  clearEdgePreviews,
  getSubtreeAtIndex,
  getMovingSubtreeAtIndex,
  getAllSubtreesForPivotEdge,
  getSubtreeHistoryAtIndex,
  getSourceDestinationEdgesAtIndex,
  toSubtreeSets,
  resolveMarkedSubtrees,
  calculateChangePreviews
} from './sliceHelpers.js';

// ============================================================================
// SLICE
// ============================================================================

export const createVisualisationChangeStateSlice = (set, get) => ({

  // ==========================================================================
  // STATE: Color Manager
  // ==========================================================================
  colorManager: null,

  // ==========================================================================
  // STATE: Taxa & Monophyletic Coloring
  // ==========================================================================
  monophyleticColoringEnabled: true,
  taxaGrouping: null,
  taxaColorVersion: 0,

  // ==========================================================================
  // STATE: Pivot Edges (blue)
  // ==========================================================================
  pivotEdgesEnabled: true,
  pivotEdgeColor: TREE_COLOR_CATEGORIES.pivotEdgeColor,

  // ==========================================================================
  // STATE: Marked Subtrees (highlight)
  // ==========================================================================
  markedSubtreesEnabled: true,
  markedColor: TREE_COLOR_CATEGORIES.markedColor,
  markedSubtreeMode: 'current', // 'all' | 'current'
  manuallyMarkedNodes: [],

  // ==========================================================================
  // STATE: Dimming
  // ==========================================================================
  dimmingEnabled: true,
  dimmingOpacity: 0.3,
  subtreeDimmingEnabled: false,
  subtreeDimmingOpacity: 0.3,

  // ==========================================================================
  // STATE: Shared
  // ==========================================================================
  colorVersion: 0,

  // ==========================================================================
  // STATE: Upcoming/Completed Changes Preview
  // ==========================================================================
  upcomingChangesEnabled: false,
  upcomingChangeEdges: [],
  completedChangeEdges: [],

  // ==========================================================================
  // STATE: Specific Source/Dest Highlighting
  // ==========================================================================
  highlightSourceEnabled: false,
  highlightDestinationEnabled: false,

  // ==========================================================================
  // STATE: Animation Phase Tracking
  // ==========================================================================
  currentAnimationStage: null, // 'COLLAPSE' | 'EXPAND' | 'REORDER' | null

  // ==========================================================================
  // ACTIONS: Animation Stage
  // ==========================================================================
  setAnimationStage: (stage) => set({ currentAnimationStage: stage }),

  // ==========================================================================
  // ACTIONS: ColorManager Access
  // ==========================================================================
  getColorManager: () => get().colorManager,

  // ==========================================================================
  // ACTIONS: Initialize Colors (called after data loads)
  // ==========================================================================
  initializeColors: () => {
    const colorManager = new TreeColorManager();
    const initialMonophyleticColoring = get().monophyleticColoringEnabled;
    colorManager.setMonophyleticColoring(initialMonophyleticColoring);

    set({
      colorManager,
      pivotEdgeColor: TREE_COLOR_CATEGORIES.pivotEdgeColor,
      markedColor: TREE_COLOR_CATEGORIES.markedColor,
      markedSubtreeMode: 'current',
      taxaGrouping: null,
    });

    // Sync color manager with initial state after a tick (data must be loaded)
    setTimeout(() => {
      const {
        getMarkedSubtreeData,
        updateColorManagerMarkedSubtrees,
        updateColorManagerPivotEdge,
        getCurrentPivotEdge
      } = get();

      updateColorManagerMarkedSubtrees(getMarkedSubtreeData());
      updateColorManagerPivotEdge(getCurrentPivotEdge());
    }, 0);
  },

  resetColors: () => {
    set({
      colorManager: null,
      colorVersion: 0,
      taxaColorVersion: 0,
      taxaGrouping: null,
      upcomingChangeEdges: [],
      completedChangeEdges: [],
    });
    // Persisted data is now preserved across resets to handle reloads/sessions correctly
  },

  // ==========================================================================
  // ACTIONS: Dimming
  // ==========================================================================
  // Dimming modes are mutually exclusive: only one can be active at a time,
  // but both can be deactivated. When activating one, deactivate the other.
  setDimmingEnabled: (enabled) => set((s) => ({
    dimmingEnabled: enabled,
    // If activating this mode, deactivate the other
    subtreeDimmingEnabled: enabled ? false : s.subtreeDimmingEnabled,
    colorVersion: s.colorVersion + 1
  })),

  setDimmingOpacity: (opacity) => set((s) => ({
    dimmingOpacity: Math.max(0, Math.min(1, opacity)),
    colorVersion: s.colorVersion + 1
  })),

  setSubtreeDimmingEnabled: (enabled) => set((s) => ({
    subtreeDimmingEnabled: enabled,
    // If activating this mode, deactivate the other
    dimmingEnabled: enabled ? false : s.dimmingEnabled,
    colorVersion: s.colorVersion + 1
  })),

  setSubtreeDimmingOpacity: (opacity) => set((s) => ({
    subtreeDimmingOpacity: Math.max(0, Math.min(1, opacity)),
    colorVersion: s.colorVersion + 1
  })),

  // ==========================================================================
  // ACTIONS: Taxa & Monophyletic Coloring
  // ==========================================================================
  setTaxaGrouping: (grouping) => {
    // Normalize Map to plain object for storage/legend rendering
    const normalizedGroupMap = grouping?.groupColorMap instanceof Map
      ? Object.fromEntries(grouping.groupColorMap)
      : grouping?.groupColorMap;

    const normalized = grouping
      ? { ...grouping, groupColorMap: normalizedGroupMap || {} }
      : null;

    set({ taxaGrouping: normalized });
  },

  setMonophyleticColoring: (enabled) => {
    set((s) => ({ monophyleticColoringEnabled: enabled, taxaColorVersion: s.taxaColorVersion + 1 }));
    const { colorManager, treeControllers } = get();
    colorManager?.setMonophyleticColoring(enabled);
    renderTreeControllers(treeControllers);
  },

  updateTaxaColors: (newColorMap) => {
    // DO NOT pollute TREE_COLOR_CATEGORIES with taxon names.
    // Taxon colors are handled via the taxaGrouping store slice and individual lookups.
    set((s) => ({ taxaColorVersion: s.taxaColorVersion + 1 }));
    const { colorManager, treeControllers } = get();
    colorManager?.refreshColorCategories?.();
    renderTreeControllers(treeControllers);
  },

  // ==========================================================================
  // ACTIONS: Change Colors
  // ==========================================================================
  updateChangeColor: (colorType, newColor) => {
    // Only allow updating known system color categories to prevent collisions
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

  // ==========================================================================
  // ACTIONS: Pivot Edges
  // ==========================================================================
  getCurrentPivotEdge: (indexOverride = null) => {
    const { currentTreeIndex, pivotEdgeTracking } = get();
    const index = indexOverride ?? currentTreeIndex;
    return pivotEdgeTracking?.[index] || [];
  },

  updateColorManagerPivotEdge: (edge) => {
    const { colorManager } = get();
    if (!colorManager?.updatePivotEdge) return;

    const normalized = Array.isArray(edge) || edge instanceof Set ? edge : [];
    colorManager.updatePivotEdge(normalized);
    set((s) => ({ colorVersion: s.colorVersion + 1 }));

    // Manage pulse animation
    const { changePulseEnabled, startPulseAnimation, stopPulseAnimation } = get();
    if (changePulseEnabled) {
      const hasChanges = normalized.length > 0 || colorManager.sharedMarkedJumpingSubtrees?.length > 0;
      hasChanges ? startPulseAnimation() : stopPulseAnimation();
    }
  },

  setPivotEdgesEnabled: (enabled) => {
    set({ pivotEdgesEnabled: enabled });
    const { updateColorManagerPivotEdge, getCurrentPivotEdge } = get();
    updateColorManagerPivotEdge(enabled ? getCurrentPivotEdge() : []);
  },

  // ==========================================================================
  // ACTIONS: Marked Subtrees
  // ==========================================================================
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

  updateColorManagerMarkedSubtrees: (subtrees) => {
    const { colorManager, colorVersion } = get();
    if (!colorManager?.updateMarkedSubtrees) return;
    const asSets = toSubtreeSets(subtrees);

    colorManager.updateMarkedSubtrees(asSets);

    // Force immediate render if available
    const { treeControllers } = get();
    renderTreeControllers(treeControllers);

    set((s) => ({ colorVersion: s.colorVersion + 1 }));
  },

  updateColorManagerHistorySubtrees: (subtrees) => {
    const { colorManager } = get();
    if (!colorManager?.updateHistorySubtrees) return;
    colorManager.updateHistorySubtrees(toSubtreeSets(subtrees));
    set((s) => ({ colorVersion: s.colorVersion + 1 }));
  },

  updateColorManagerSourceDestinationEdges: (sourceEdges, destEdges) => {
    const { colorManager } = get();
    if (!colorManager?.updateSourceEdgeLeaves || !colorManager?.updateDestinationEdgeLeaves) return;
    colorManager.updateSourceEdgeLeaves(toSubtreeSets(sourceEdges));
    colorManager.updateDestinationEdgeLeaves(toSubtreeSets(destEdges));
    set((s) => ({ colorVersion: s.colorVersion + 1 }));
  },

  updateColorManagerMovingSubtree: (subtree) => {
    const { colorManager } = get();
    if (!colorManager?.updateCurrentMovingSubtree) return;
    colorManager.updateCurrentMovingSubtree(subtree);
    set((s) => ({ colorVersion: s.colorVersion + 1 }));
  },

  setMarkedSubtreesEnabled: (enabled) => {
    set({ markedSubtreesEnabled: enabled });
    // Update ColorManager's coloring flag
    const { colorManager } = get();
    if (colorManager.setMarkedSubtreesColoring) {
      colorManager.setMarkedSubtreesColoring(enabled);
    }
    // Always keep subtree data in ColorManager for dimming purposes
    // The markedSubtreesEnabled flag controls coloring, not the data availability
    const { updateColorManagerMarkedSubtrees, getMarkedSubtreeData, manuallyMarkedNodes, updateColorManagerHistorySubtrees, getSubtreeHistoryData } = get();
    const manual = toManualMarkedSets(manuallyMarkedNodes);
    updateColorManagerMarkedSubtrees([...manual, ...getMarkedSubtreeData()]);
    updateColorManagerHistorySubtrees(enabled ? getSubtreeHistoryData() : []);
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
    // Always keep subtree data in ColorManager for dimming purposes
    // The markedSubtreesEnabled flag controls coloring, not the data availability
    const { getMarkedSubtreeData, updateColorManagerMarkedSubtrees, treeControllers } = get();
    const manual = toManualMarkedSets(nodes);
    updateColorManagerMarkedSubtrees([...manual, ...getMarkedSubtreeData()]);
    renderTreeControllers(treeControllers);
  },

  // ==========================================================================
  // ACTIONS: Sync ColorManager (called on tree index change)
  // ==========================================================================
  updateColorManagerForCurrentIndex: () => {
    const {
      pivotEdgesEnabled, currentTreeIndex,
      getMarkedSubtreeData, getCurrentPivotEdge,
      updateColorManagerMarkedSubtrees, updateColorManagerPivotEdge,
      updateColorManagerHistorySubtrees, getSubtreeHistoryData,
      updateColorManagerSourceDestinationEdges, getSourceDestinationEdgeData,
      updateColorManagerMovingSubtree, getCurrentMovingSubtreeData,
      updateUpcomingChanges, manuallyMarkedNodes
    } = get();

    // Always keep subtree data in ColorManager for dimming purposes
    // The markedSubtreesEnabled flag controls coloring, not the data availability
    const manual = toManualMarkedSets(manuallyMarkedNodes);
    const markedSubtreeData = getMarkedSubtreeData();

    updateColorManagerMarkedSubtrees([...manual, ...markedSubtreeData]);
    updateColorManagerPivotEdge(pivotEdgesEnabled ? getCurrentPivotEdge() : []);
    updateColorManagerHistorySubtrees(getSubtreeHistoryData());
    const { source, dest } = getSourceDestinationEdgeData();
    updateColorManagerSourceDestinationEdges(source, dest);
    updateColorManagerMovingSubtree(getCurrentMovingSubtreeData());
    updateUpcomingChanges();
  },

  // ==========================================================================
  // ACTIONS: Upcoming/Completed Changes Preview
  // ==========================================================================
  setUpcomingChangesEnabled: (enabled) => {
    set({ upcomingChangesEnabled: enabled });
    const { updateUpcomingChanges, treeControllers } = get();
    updateUpcomingChanges();
    renderTreeControllers(treeControllers);
  },

  updateUpcomingChanges: () => {
    const { upcomingChangesEnabled, colorManager } = get();
    // Using the helper to calculate data from current state
    const { upcoming, completed } = calculateChangePreviews(get());

    if (!upcomingChangesEnabled) {
      set({ upcomingChangeEdges: [], completedChangeEdges: [] });
      clearEdgePreviews(colorManager);
      return;
    }

    set({ upcomingChangeEdges: upcoming, completedChangeEdges: completed });
    colorManager?.updateCompletedChangeEdges?.(completed);
    colorManager?.updateUpcomingChangeEdges?.(upcoming);
  },


});


