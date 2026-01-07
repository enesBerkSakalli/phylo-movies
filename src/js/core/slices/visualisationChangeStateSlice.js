import { TREE_COLOR_CATEGORIES } from '../../constants/TreeColors.js';
import { persistColorCategories, loadPersistedColorCategories, loadPersistedTaxaGrouping, persistTaxaGrouping } from '../../services/storage/colorPersistence.js';
import { flattenSubtreeEntries } from '../../treeVisualisation/deckgl/layers/styles/subtreeMatching.js';
import { findPreviousAnchorSequenceIndex, findNextAnchorSequenceIndex } from '../../domain/indexing/IndexMapping.js';
import { renderTreeControllers } from './sliceHelpers.js';
import { TreeColorManager } from '../../treeVisualisation/systems/TreeColorManager.js';

// ============================================================================
// HELPERS
// ============================================================================

const persistCurrentColorCategories = () => persistColorCategories(TREE_COLOR_CATEGORIES);

const toManualMarkedSets = (nodes) =>
  Array.isArray(nodes) && nodes.length ? [new Set(nodes)] : [];

const clearEdgePreviews = (colorManager) => {
  colorManager?.updateUpcomingChangeEdges?.([]);
  colorManager?.updateCompletedChangeEdges?.([]);
};

const collectUniqueEdges = (tracking, start, end, excludeKey) => {
  const map = new Map();
  for (let i = start; i < end; i++) {
    const edge = tracking[i];
    if (Array.isArray(edge) && edge.length > 0) {
      const key = JSON.stringify(edge);
      if (key !== excludeKey && !map.has(key)) map.set(key, edge);
    }
  }
  return Array.from(map.values());
};

const toSubtreeKey = (subtree) => subtree.slice().sort((a, b) => a - b).join(',');

const collectUniqueSubtrees = (tracking, start, end, excludeKey) => {
  const map = new Map();
  for (let i = start; i < end; i++) {
    const subtree = tracking[i];
    if (Array.isArray(subtree) && subtree.length > 0) {
      const key = toSubtreeKey(subtree);
      if (key !== excludeKey && !map.has(key)) map.set(key, subtree);
    }
  }
  return Array.from(map.values());
};

const getSubtreeAtIndex = (state, index) => {
  const subtree = state.subtreeTracking?.[index];
  return Array.isArray(subtree) && subtree.length > 0 ? [subtree] : [];
};

const getAllSubtreesForActiveEdge = (state, index) => {
  const edge = state.activeChangeEdgeTracking?.[index];
  if (!Array.isArray(edge) || edge.length === 0) return [];

  const pairKey = state.movieData?.tree_metadata?.[index]?.tree_pair_key;
  const solutions = state.pairSolutions?.[pairKey]?.jumping_subtree_solutions;
  if (!solutions) return [];

  return flattenSubtreeEntries(solutions[`[${edge.join(', ')}]`]);
};

const getSubtreeHistoryAtIndex = (state, index) => {
  if (state.transitionResolver?.isFullTree?.(index)) return [];
  const tracking = state.subtreeTracking;
  if (!Array.isArray(tracking) || tracking.length === 0) return [];

  const anchors = state.movieData?.fullTreeIndices || state.transitionResolver?.fullTreeIndices || [];
  if (!anchors.length) return [];

  const prevAnchor = findPreviousAnchorSequenceIndex(anchors, index);
  const start = Math.max(prevAnchor + 1, 0);
  const end = Math.min(index, tracking.length);
  if (end <= start) return [];

  const current = tracking[index];
  const excludeKey = Array.isArray(current) && current.length > 0 ? toSubtreeKey(current) : null;
  return collectUniqueSubtrees(tracking, start, end, excludeKey);
};

const toSubtreeSets = (input) => {
  if (!Array.isArray(input)) return [];
  return input.map((s) => (s instanceof Set ? s : Array.isArray(s) ? new Set(s) : new Set()));
};



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
  // STATE: Active Change Edges (blue)
  // ==========================================================================
  activeChangeEdgesEnabled: true,
  activeChangeEdgeColor: TREE_COLOR_CATEGORIES.activeChangeEdgeColor,

  // ==========================================================================
  // STATE: Marked Subtrees (red)
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
  // ACTIONS: ColorManager Access
  // ==========================================================================
  getColorManager: () => get().colorManager,

  // ==========================================================================
  // ACTIONS: Initialize Colors (called after data loads)
  // ==========================================================================
  initializeColors: () => {
    applyPersistedColorPreferences();
    const persistedGrouping = loadPersistedTaxaGrouping();

    const colorManager = new TreeColorManager();
    const initialMonophyleticColoring = get().monophyleticColoringEnabled;
    colorManager.setMonophyleticColoring(initialMonophyleticColoring);

    set({
      colorManager,
      activeChangeEdgeColor: TREE_COLOR_CATEGORIES.activeChangeEdgeColor,
      markedColor: TREE_COLOR_CATEGORIES.markedColor,
      markedSubtreeMode: 'current',
      taxaGrouping: persistedGrouping || null,
    });

    // Sync color manager with initial state after a tick (data must be loaded)
    setTimeout(() => {
      const {
        getMarkedSubtreeData,
        updateColorManagerMarkedSubtrees,
        updateColorManagerActiveChangeEdge,
        getCurrentActiveChangeEdge
      } = get();

      updateColorManagerMarkedSubtrees(getMarkedSubtreeData());
      updateColorManagerActiveChangeEdge(getCurrentActiveChangeEdge());
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
    // Clear persisted data to prevent reload issues with different datasets
    persistTaxaGrouping(null);
    persistColorCategories({});  // Clear persisted color mappings
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
    persistTaxaGrouping(normalized);
  },

  setMonophyleticColoring: (enabled) => {
    set((s) => ({ monophyleticColoringEnabled: enabled, taxaColorVersion: s.taxaColorVersion + 1 }));
    const { colorManager, treeControllers } = get();
    colorManager?.setMonophyleticColoring(enabled);
    renderTreeControllers(treeControllers);
  },

  updateTaxaColors: (newColorMap) => {
    Object.assign(TREE_COLOR_CATEGORIES, { ...TREE_COLOR_CATEGORIES, ...newColorMap });
    set((s) => ({ taxaColorVersion: s.taxaColorVersion + 1 }));
    const { colorManager, treeControllers } = get();
    colorManager?.refreshColorCategories?.();
    renderTreeControllers(treeControllers);
    persistCurrentColorCategories();
  },

  // ==========================================================================
  // ACTIONS: Change Colors
  // ==========================================================================
  updateChangeColor: (colorType, newColor) => {
    Object.assign(TREE_COLOR_CATEGORIES, { [colorType]: newColor });
    set({ [colorType]: newColor });
    const { colorManager, treeControllers } = get();
    colorManager?.refreshColorCategories?.();
    renderTreeControllers(treeControllers);
    persistCurrentColorCategories();
  },

  setActiveChangeEdgeColor: (color) => get().updateChangeColor('activeChangeEdgeColor', color),
  setMarkedColor: (color) => get().updateChangeColor('markedColor', color),

  // ==========================================================================
  // ACTIONS: Active Change Edges
  // ==========================================================================
  getCurrentActiveChangeEdge: (indexOverride = null) => {
    const { currentTreeIndex, activeChangeEdgeTracking } = get();
    const index = indexOverride ?? currentTreeIndex;
    return activeChangeEdgeTracking?.[index] || [];
  },

  updateColorManagerActiveChangeEdge: (edge) => {
    const { colorManager } = get();
    if (!colorManager?.updateActiveChangeEdge) return;

    const normalized = Array.isArray(edge) || edge instanceof Set ? edge : [];
    colorManager.updateActiveChangeEdge(normalized);
    set((s) => ({ colorVersion: s.colorVersion + 1 }));

    // Manage pulse animation
    const { changePulseEnabled, startPulseAnimation, stopPulseAnimation } = get();
    if (changePulseEnabled) {
      const hasChanges = normalized.length > 0 || colorManager.sharedMarkedJumpingSubtrees?.length > 0;
      hasChanges ? startPulseAnimation() : stopPulseAnimation();
    }
  },

  setActiveChangeEdgesEnabled: (enabled) => {
    set({ activeChangeEdgesEnabled: enabled });
    const { updateColorManagerActiveChangeEdge, getCurrentActiveChangeEdge } = get();
    updateColorManagerActiveChangeEdge(enabled ? getCurrentActiveChangeEdge() : []);
  },

  // ==========================================================================
  // ACTIONS: Marked Subtrees
  // ==========================================================================
  getMarkedSubtreeData: (indexOverride = null) => {
    const { currentTreeIndex, transitionResolver, markedSubtreeMode } = get();
    const index = indexOverride ?? currentTreeIndex;

    if (transitionResolver?.isFullTree?.(index)) return [];
    return markedSubtreeMode === 'current'
      ? getSubtreeAtIndex(get(), index)
      : getAllSubtreesForActiveEdge(get(), index);
  },

  getSubtreeHistoryData: (indexOverride = null) => {
    const { currentTreeIndex } = get();
    const index = indexOverride ?? currentTreeIndex;
    return getSubtreeHistoryAtIndex(get(), index);
  },

  updateColorManagerMarkedSubtrees: (subtrees) => {
    const { colorManager } = get();
    if (!colorManager?.updateMarkedSubtrees) return;
    colorManager.updateMarkedSubtrees(toSubtreeSets(subtrees));
    set((s) => ({ colorVersion: s.colorVersion + 1 }));
  },

  updateColorManagerHistorySubtrees: (subtrees) => {
    const { colorManager } = get();
    if (!colorManager?.updateHistorySubtrees) return;
    colorManager.updateHistorySubtrees(toSubtreeSets(subtrees));
    set((s) => ({ colorVersion: s.colorVersion + 1 }));
  },

  setMarkedSubtreesEnabled: (enabled) => {
    set({ markedSubtreesEnabled: enabled });
    // Update ColorManager's coloring flag
    const { colorManager } = get();
    if (colorManager?.setMarkedSubtreesColoring) {
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
      activeChangeEdgesEnabled,
      getMarkedSubtreeData, getCurrentActiveChangeEdge,
      updateColorManagerMarkedSubtrees, updateColorManagerActiveChangeEdge,
      updateColorManagerHistorySubtrees, getSubtreeHistoryData,
      updateUpcomingChanges, manuallyMarkedNodes
    } = get();

    // Always keep subtree data in ColorManager for dimming purposes
    // The markedSubtreesEnabled flag controls coloring, not the data availability
    const manual = toManualMarkedSets(manuallyMarkedNodes);
    updateColorManagerMarkedSubtrees([...manual, ...getMarkedSubtreeData()]);
    updateColorManagerActiveChangeEdge(activeChangeEdgesEnabled ? getCurrentActiveChangeEdge() : []);
    updateColorManagerHistorySubtrees(getSubtreeHistoryData());
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
    const { upcomingChangesEnabled, currentTreeIndex, activeChangeEdgeTracking, movieData, colorManager } = get();

    if (!upcomingChangesEnabled) {
      set({ upcomingChangeEdges: [], completedChangeEdges: [] });
      clearEdgePreviews(colorManager);
      return;
    }

    const anchors = movieData?.fullTreeIndices || [];
    if (!anchors.length || !activeChangeEdgeTracking?.length) {
      set({ upcomingChangeEdges: [], completedChangeEdges: [] });
      clearEdgePreviews(colorManager);
      return;
    }

    const prevAnchor = findPreviousAnchorSequenceIndex(anchors, currentTreeIndex);
    const nextAnchor = findNextAnchorSequenceIndex(anchors, currentTreeIndex);
    const currentEdge = activeChangeEdgeTracking[currentTreeIndex];
    const currentKey = currentEdge?.length > 0 ? JSON.stringify(currentEdge) : null;

    const completed = collectUniqueEdges(activeChangeEdgeTracking, prevAnchor + 1, currentTreeIndex, currentKey);
    set({ completedChangeEdges: completed });
    colorManager?.updateCompletedChangeEdges?.(completed);



    if (nextAnchor === null) {
      set({ upcomingChangeEdges: [] });
      colorManager?.updateUpcomingChangeEdges?.([]);
      return;
    }

    const upcoming = collectUniqueEdges(activeChangeEdgeTracking, currentTreeIndex + 1, nextAnchor, currentKey);
    set({ upcomingChangeEdges: upcoming });
    colorManager?.updateUpcomingChangeEdges?.(upcoming);
  },
});

// ==========================================================================
// Private Helper Functions
// ==========================================================================

function applyPersistedColorPreferences() {
  try {
    const persisted = loadPersistedColorCategories();
    if (persisted) {
      Object.assign(TREE_COLOR_CATEGORIES, persisted);
    }
  } catch (_) {
    // Silently ignore errors
  }
}
